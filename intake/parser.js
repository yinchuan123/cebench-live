// All parsing occurs in the browser. File contents are never uploaded by this module.
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_CHARACTERS = 300000;
const MAX_PDF_PAGES = 40;
const MAX_OCR_PAGES = 5;
const MAX_ZIP_EXPANSION = 64 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const plainExtensions = new Set(['txt','md','markdown','csv','tsv','json','jsonl','html','htm','xml','ris','bib','rtf','log']);
const imageExtensions = new Set(['png','jpg','jpeg','webp','bmp']);

function normalizedText(text) {
  return String(text || '').replace(/\u0000/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

function xmlText(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('文件中的 XML 内容无法解析。');
  return doc.documentElement.textContent || '';
}

function htmlText(html) {
  // Parse in a detached document, remove non-content nodes and never attach it to the page.
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  fragment.querySelectorAll('script,style,noscript,iframe,object,embed,link,meta,template,svg,form,img,video,audio,source').forEach(node => node.remove());
  fragment.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  fragment.querySelectorAll('p,div,section,article,h1,h2,h3,h4,li,tr').forEach(node => node.append('\n'));
  return fragment.textContent || '';
}

function resultFor(file, type, rawUnits, settings = {}) {
  const warnings = [...(settings.warnings || [])];
  let characters = 0, line = 1, truncated = false;
  const units = [];
  for (const unit of rawUnits) {
    if (characters >= MAX_CHARACTERS) { truncated = true; break; }
    let text = normalizedText(unit.text);
    if (!text) continue;
    const heading = `【${unit.label}】\n`;
    const remaining = MAX_CHARACTERS - characters - heading.length - 2;
    if (remaining <= 0) { truncated = true; break; }
    if (text.length > remaining) { text = text.slice(0, remaining); truncated = true; }
    const block = `${heading}${text}`;
    const lineCount = block.split('\n').length;
    units.push({ ...unit, text, startLine: line, endLine: line + lineCount - 1 });
    line += lineCount + 1;
    characters += block.length + 2;
  }
  const text = units.map(unit => `【${unit.label}】\n${unit.text}`).join('\n\n');
  if (!text) throw new Error('没有提取到可评价的文字。请提供清晰原件，或粘贴对应文字。');
  if (truncated) warnings.push('文字超过单次 300,000 字符上限，末尾未读部分需要分批提供。');
  const totalUnits = settings.totalUnits ?? rawUnits.length;
  const partial = Boolean(settings.partial || truncated || units.length < totalUnits);
  return {
    name: file.name || '未命名材料', type, text, units,
    coverage: {
      status: partial ? 'partial' : 'complete', partial,
      totalUnits, readUnits: units.length, omittedUnits: Math.max(0, totalUnits - units.length),
      characters: text.length, method: settings.method || 'text', ocrUsed: Boolean(settings.ocrUsed),
      description: settings.description || (partial ? `已读取 ${units.length}/${totalUnits} 个单元，存在未读或截断内容。` : `已读取 ${units.length} 个文本单元。`)
    }, warnings
  };
}

async function inspectArchive(bytes) {
  const {unzipSync} = await import('fflate');
  let expanded = 0, entries = 0;
  // Central-directory lengths are checked before any Office library decompresses entries.
  unzipSync(bytes, {filter(entry) {
    entries += 1;
    expanded += entry.originalSize;
    if (!Number.isFinite(expanded) || entry.originalSize > 16 * 1024 * 1024 || expanded > MAX_ZIP_EXPANSION || entries > 5000) {
      throw new Error('文件展开后过大，请精简为较小的文档或分批提供。');
    }
    return false;
  }});
  return {unzipSync, expanded};
}

async function makeOCR(onProgress) {
  const {createWorker} = await import('tesseract.js');
  let worker;
  try {
    onProgress({stage:'ocr',message:'正在准备本机中英文文字识别…',progress:0});
    worker = await createWorker('eng+chi_sim', 1, {
      workerPath: '/benchmark/ocr/worker.min.js',
      corePath: '/benchmark/ocr/core/',
      langPath: '/benchmark/ocr/lang',
      workerBlobURL: false, cacheMethod:'none', gzip:true,
      logger: update => onProgress({stage:'ocr',message:'正在识别图片文字，请稍候…',progress:Number(update.progress) || 0})
    });
  } catch (_) {
    throw new Error('文字识别资源暂不可用，图片或扫描页尚未读取。请重试，或粘贴图片中的文字。');
  }
  return {
    async recognize(image) {
      let timer;
      try {
        const result = await Promise.race([
          worker.recognize(image),
          new Promise((_,reject) => {timer=setTimeout(()=>reject(new Error('文字识别超时，请降低图片分辨率或分批提供。')),120000);})
        ]);
        return {text:normalizedText(result.data.text),confidence:result.data.confidence};
      } finally {clearTimeout(timer);}
    },
    async close() { await worker.terminate(); }
  };
}

async function parsePDF(file, bytes, onProgress) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:true,
    cMapUrl:'/benchmark/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/benchmark/pdfjs/standard_fonts/',wasmUrl:'/benchmark/pdfjs/wasm/'});
  let doc, ocr, ocrPages = 0, ocrUsed = false, partial = false;
  const units = [], warnings = ['PDF 的表格、脚注和多栏顺序可能变化；请对照页码核对原件。', '含可读文字的 PDF 页只提取其文字层；页内图表、图片和视觉关系未完整读取。'];
  try {
    doc = await task.promise;
    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);
    if (doc.numPages > pageCount) {partial = true;warnings.push(`本次仅处理前 ${pageCount} 页，其余 ${doc.numPages-pageCount} 页未读取。`);}
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      onProgress({stage:'parse',message:`正在读取 PDF 第 ${pageNumber}/${doc.numPages} 页…`,progress:pageNumber/doc.numPages});
      const page = await doc.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        let text = content.items.filter(item => 'str' in item).map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
        if (normalizedText(text).length < 20) {
          if (ocrPages >= MAX_OCR_PAGES) {partial = true;warnings.push(`第 ${pageNumber} 页未读取：单次扫描识别上限为 ${MAX_OCR_PAGES} 页。`);continue;}
          ocrPages += 1;
          if (!ocrUsed) warnings.push('扫描页经中英文 OCR 识别，数字、符号和表格顺序需对照原件核对。');
          ocrUsed = true;
          if (!ocr) ocr = await makeOCR(onProgress);
          const base = page.getViewport({scale:1});
          const scale = Math.min(2,2400/Math.max(base.width,base.height));
          const viewport = page.getViewport({scale});
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('当前浏览器无法读取扫描页图片，请粘贴文字。');
          await page.render({canvasContext:context,canvas,viewport}).promise;
          const recognized = await ocr.recognize(canvas);
          text = recognized.text;
          if (recognized.confidence < 70) warnings.push(`第 ${pageNumber} 页识别置信度较低，请逐项核对数字与符号。`);
          canvas.width=canvas.height=0;
        }
        if (normalizedText(text)) units.push({label:`${file.name} · 第 ${pageNumber} 页`,page:pageNumber,text});
        else {partial=true;warnings.push(`第 ${pageNumber} 页未提取到文字。`);}
      } finally {page.cleanup();}
    }
    return resultFor(file,'pdf',units,{totalUnits:doc.numPages,partial,method:ocrUsed?'pdf-text-and-ocr':'pdf-text',ocrUsed,warnings});
  } catch (error) {
    if (error.name === 'PasswordException') throw new Error('PDF 有密码保护，请先提供可读取的解锁副本。');
    if (units.length) {
      warnings.push('读取在中途失败，后续页未完成；请分批补充。');
      return resultFor(file,'pdf',units,{totalUnits:doc?.numPages || units.length+1,partial:true,method:'pdf-partial',ocrUsed,warnings});
    }
    throw error;
  } finally {
    if (ocr) await ocr.close();
    await task.destroy();
  }
}

function imageDimensions(bytes) {
  const view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if (bytes.length>=24 && view.getUint32(0)===0x89504e47 && view.getUint32(4)===0x0d0a1a0a) {
    return [view.getUint32(16),view.getUint32(20)];
  }
  if (bytes.length>=4 && bytes[0]===0xff && bytes[1]===0xd8) {
    let offset=2;
    while (offset+4<bytes.length) {
      if (bytes[offset]!==0xff) {offset+=1;continue;}
      while (offset<bytes.length && bytes[offset]===0xff) offset+=1;
      const marker=bytes[offset++];
      if (marker===0xd9 || marker===0xda) break;
      if (marker===0x01 || (marker>=0xd0 && marker<=0xd7)) continue;
      if (offset+2>bytes.length) break;
      const length=view.getUint16(offset);
      if (length<2 || offset+length>bytes.length) break;
      if (length>=7 && [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        return [view.getUint16(offset+5),view.getUint16(offset+3)];
      }
      offset+=length;
    }
  }
  if (bytes.length>=30 && view.getUint32(0)===0x52494646 && view.getUint32(8)===0x57454250) {
    const kind=view.getUint32(12);
    if (kind===0x56503858) {
      return [1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)];
    }
    if (kind===0x5650384c && bytes[20]===0x2f) {
      return [1+bytes[21]+((bytes[22]&0x3f)<<8),1+(bytes[22]>>6)+(bytes[23]<<2)+((bytes[24]&0xf)<<10)];
    }
    if (kind===0x56503820 && bytes[23]===0x9d && bytes[24]===0x01 && bytes[25]===0x2a) {
      return [view.getUint16(26,true)&0x3fff,view.getUint16(28,true)&0x3fff];
    }
  }
  if (bytes.length>=26 && bytes[0]===0x42 && bytes[1]===0x4d) {
    const header=view.getUint32(14,true);
    if (header===12) return [view.getUint16(18,true),view.getUint16(20,true)];
    if (header>=40) return [Math.abs(view.getInt32(18,true)),Math.abs(view.getInt32(22,true))];
  }
  return null;
}

async function parseImage(file, bytes, onProgress) {
  const dimensions=imageDimensions(bytes);
  // Check encoded dimensions before allocating a decoded image/canvas on mobile devices.
  if (dimensions && dimensions[0]*dimensions[1]>MAX_IMAGE_PIXELS) throw new Error('图片像素过多，请缩小至 4000 万像素以内。');
  const image = await createImageBitmap(file);
  let ocr;
  try {
    if (image.width*image.height > MAX_IMAGE_PIXELS) throw new Error('图片像素过多，请缩小至 4000 万像素以内。');
    const scale = Math.min(1,3000/Math.max(image.width,image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(image.width*scale));canvas.height = Math.max(1,Math.round(image.height*scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器无法读取图片，请粘贴文字。');
    context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    ocr = await makeOCR(onProgress);
    const recognized = await ocr.recognize(canvas);
    canvas.width=canvas.height=0;
    const warnings=['图片经中英文 OCR 提取，图表形状、箭头和视觉关系未评价；数字与符号需对照原件。'];
    if (recognized.confidence < 70) warnings.push('图片文字识别置信度较低，请核对或改用清晰原图。');
    return resultFor(file,'image',[{label:`${file.name} · 图片文字`,text:recognized.text}],{method:'ocr',ocrUsed:true,warnings});
  } finally {image.close();if (ocr) await ocr.close();}
}

async function parseDOCX(file, bytes) {
  await inspectArchive(bytes);
  const module = await import('mammoth/mammoth.browser.js');
  const mammoth = module.default || module;
  const result = await mammoth.extractRawText({arrayBuffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  return resultFor(file,'docx',[{label:`${file.name} · 正文`,text:result.value}],{
    method:'docx-text',warnings:['只提取文档文字；嵌入图片、批注、修订与排版未完整读取。',...(result.messages || []).map(item=>`文档读取提示：${item.message}`)]
  });
}

async function parsePPTX(file, bytes) {
  const {unzipSync} = await inspectArchive(bytes);
  const files = unzipSync(bytes,{filter:entry=>/^ppt\/slides\/slide\d+\.xml$/.test(entry.name)});
  const names = Object.keys(files).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
  const units = names.slice(0,100).map(name=>{
    const slide = Number(name.match(/slide(\d+)/)[1]);
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(files[name]),'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('幻灯片文字无法读取。');
    const text = [...doc.getElementsByTagNameNS('*','p')].map(p=>[...p.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('')).join('\n');
    return {label:`${file.name} · 幻灯片 ${slide}`,slide,text};
  });
  return resultFor(file,'pptx',units,{totalUnits:names.length,partial:names.length>100,method:'pptx-text',warnings:['仅提取前 100 张幻灯片中的文字框；图片、图形关系、图表数值和讲者备注未读取。']});
}

function cellText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return String(value);
  if ('formula' in value || 'sharedFormula' in value) return 'result' in value ? cellText(value.result) : '[公式无缓存结果]';
  if (Array.isArray(value.richText)) return value.richText.map(item=>item.text || '').join('');
  if ('text' in value) return String(value.text);
  if ('error' in value) return String(value.error);
  return '';
}

async function parseXLSX(file, bytes, onProgress) {
  await inspectArchive(bytes);
  const module = await import('exceljs');
  const ExcelJS = module.default || module;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  const sheets = workbook.worksheets;
  const units = [], warnings=['表格只读取单元格已有值或公式缓存结果，不执行公式；图表、图片、批注与外部链接未核查。'];
  let partial=sheets.length>20, cells=0;
  for (const sheet of sheets.slice(0,20)) {
    onProgress({stage:'parse',message:`正在读取工作表 ${sheet.name}…`,progress:units.length/Math.min(sheets.length,20)});
    const lines=[];
    let limited=false;
    sheet.eachRow({includeEmpty:false},(row,rowNumber)=>{
      if (rowNumber>2000 || cells>=30000) {limited=true;return;}
      const values=[];
      row.eachCell({includeEmpty:false},cell=>{
        if (cells>=30000) {limited=true;return;}
        cells+=1;
        const text=cellText(cell.value).replace(/[\r\n\t]+/g,' ');
        if (text) values.push(`${cell.address}=${text}`);
      });
      if (values.length) lines.push(`行 ${rowNumber}: ${values.join(' | ')}`);
    });
    if (limited) {partial=true;warnings.push(`工作表“${sheet.name}”超出每表 2000 行或总计 30000 单元格限制，未完整读取。`);}
    units.push({label:`${file.name} · 工作表 ${sheet.name}`,sheet:sheet.name,text:lines.join('\n')});
  }
  return resultFor(file,'xlsx',units,{totalUnits:sheets.length,partial,method:'xlsx-cached-values',warnings});
}

export async function parseFile(file, {onProgress = () => {}} = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('请选择可以读取的文件。');
  if (file.size < 1) throw new Error('文件为空，请换一份材料。');
  if (file.size > MAX_FILE_BYTES) throw new Error('单个文件不能超过 20 MB，请压缩或分批提供。');
  const extension = (file.name || '').split('.').at(-1).toLowerCase();
  onProgress({stage:'read',message:`正在读取 ${file.name || '材料'}…`,progress:0});
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === 'pdf' || file.type === 'application/pdf') return parsePDF(file,bytes,onProgress);
  if (imageExtensions.has(extension) || ['image/png','image/jpeg','image/webp','image/bmp'].includes(file.type)) return parseImage(file,bytes,onProgress);
  if (extension === 'docx') return parseDOCX(file,bytes);
  if (extension === 'pptx') return parsePPTX(file,bytes);
  if (extension === 'xlsx') return parseXLSX(file,bytes,onProgress);
  if (['doc','xls','ppt'].includes(extension)) throw new Error('旧版 Office 文件请先另存为 DOCX、XLSX、PPTX，或导出为 PDF/CSV 后提交。');
  if (['zip','exe','js','mjs','cjs','svg','mp3','mp4','mov','wav'].includes(extension)) throw new Error('此格式尚不能自动读取。压缩包请解压；音视频请提供转录文字；其他内容可导出为 PDF、图片或文字。');
  if (!plainExtensions.has(extension) && !file.type?.startsWith('text/')) throw new Error('此格式尚不能自动读取。请导出为 PDF、DOCX、XLSX、PPTX、图片或文字。');
  let text = new TextDecoder('utf-8',{fatal:false}).decode(bytes);
  const warnings=[];
  if (text.includes('\uFFFD')) warnings.push('文件可能不是 UTF-8 编码，存在无法识别的字符；请核对，必要时另存为 UTF-8。');
  if (['html','htm'].includes(extension) || file.type==='text/html') {
    text=htmlText(text);warnings.push('网页文件只读取正文文字，不执行脚本；链接目标、图片和动态内容尚未读取。');
  } else if (extension==='xml') {
    text=xmlText(text);
  } else if (extension==='rtf') {
    throw new Error('RTF 暂不能可靠保留中文和表格，请另存为 DOCX、PDF 或纯文字。');
  }
  return resultFor(file,extension||'text',[{label:`${file.name} · 文字`,text}],{warnings,method:'text'});
}
