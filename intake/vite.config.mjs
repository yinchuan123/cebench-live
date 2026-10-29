import {defineConfig} from 'vite';
import {resolve} from 'node:path';
import {mkdirSync,copyFileSync,cpSync,existsSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const out=resolve(root,'dist/site/benchmark');
export default defineConfig({root:resolve(root,'intake'),base:'/benchmark/',publicDir:false,server:{host:'127.0.0.1',port:5173},build:{outDir:out,emptyOutDir:true,chunkSizeWarningLimit:1800},plugins:[{name:'local-parser-resources',closeBundle(){
 const copy=(from,to)=>{mkdirSync(resolve(out,to,'..'),{recursive:true});copyFileSync(resolve(root,from),resolve(out,to))};
 copy('node_modules/tesseract.js/dist/worker.min.js','ocr/worker.min.js');
 for(const file of readdirSync(resolve(root,'node_modules/tesseract.js-core')).filter(f=>/^tesseract-core(?:-(?:simd|relaxedsimd))?-lstm\.wasm\.js$/.test(f)))copy('node_modules/tesseract.js-core/'+file,'ocr/core/'+file);
 for(const lang of ['eng','chi_sim']){const source=resolve(root,'vendor/ocr/'+lang+'.traineddata.gz');if(!existsSync(source))throw new Error('Run node tools/prepare-ocr.mjs before building.');copyFileSync(source,(mkdirSync(resolve(out,'ocr/lang'),{recursive:true}),resolve(out,'ocr/lang',lang+'.traineddata.gz')))}
 for(const dir of ['cmaps','standard_fonts','wasm','iccs'])cpSync(resolve(root,'node_modules/pdfjs-dist/'+dir),resolve(out,'pdfjs/'+dir),{recursive:true,filter:src=>!src.split('/').at(-1).startsWith('._')});
 const licenses=[['node_modules/tesseract.js/LICENSE.md','TESSERACT-JS-LICENSE.txt'],['node_modules/tesseract.js-core/LICENSE','TESSERACT-CORE-LICENSE.txt'],['node_modules/mammoth/LICENSE','MAMMOTH-LICENSE.txt'],['node_modules/exceljs/LICENSE','EXCELJS-LICENSE.txt'],['node_modules/fflate/LICENSE','FFLATE-LICENSE.txt'],['node_modules/pdfjs-dist/LICENSE','PDFJS-LICENSE.txt'],['vendor/ocr/LICENSE','OCR-LANG-LICENSE.txt']];for(const [from,to] of licenses)if(existsSync(resolve(root,from)))copy(from,'licenses/'+to);
 copy('vendor/ocr/provenance.json','ocr/provenance.json');
 writeFileSync(resolve(out,'resource-provenance.json'),JSON.stringify({ocrLanguages:['eng','chi_sim'],source:'https://github.com/naptha/tessdata/tree/gh-pages/4.0.0_best_int',resources:'Browser parsing only; no materials are sent to resource hosts.',software:'CEBench-Live 1.0.0'},null,2));
}}]});
