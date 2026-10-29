// Deterministic checks over the submitted text. No source retrieval or clinical inference.
const VERSION = '1.0.0';
const MAX_CHARACTERS = 300000;

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
}

function uniqueReferences(text, expression, normalize = value => value) {
  const found = new Map();
  for (const match of text.matchAll(expression)) {
    const value = normalize(match[0]);
    if (!value) continue;
    if (found.has(value)) found.get(value).occurrences += 1;
    else found.set(value, { value, occurrences: 1, verified: false });
  }
  return [...found.values()];
}

function locationAt(text, index, materials = []) {
  const line = text.slice(0, index).split('\n').length;
  // The exact line in the evaluated, downloadable text remains the primary anchor.
  return `评价文本 · 第 ${line} 行`;
}

function quoteAt(text, index, length) {
  const begin = text.lastIndexOf('\n', index - 1) + 1;
  const next = text.indexOf('\n', index + length);
  const end = next < 0 ? text.length : next;
  return text.slice(begin, end).trim().slice(0, 500);
}

export function evaluateEvidence({ text: input = '', context = '', materials = [] } = {}) {
  const text = cleanText(input);
  if (!text) throw new Error('请先粘贴文字，或读取至少一份有可评价文字的材料。');
  if (text.length > MAX_CHARACTERS) throw new Error('本次初评最多处理 300,000 个字符，请分批提交。');
  const rows = text.split('\n');
  const findings = [];
  const used = new Set();
  const add = ({ status, category, severity = 'info', quote = '', location = '整体材料', detail, action, key }) => {
    const identity = key || `${category}:${location}:${detail}`;
    if (used.has(identity)) return;
    used.add(identity);
    findings.push({ id: `F${String(findings.length + 1).padStart(3, '0')}`, status, category, severity, quote, location, detail, action });
  };
  const dois = uniqueReferences(text, /\b10\.\d{4,9}\/[A-Z0-9][A-Z0-9._;()/:+-]*/gi,
    value => value.replace(/[.,;:]+$/, '').replace(/\)+$/, match => ')'.repeat(Math.max(0, (value.match(/\(/g) || []).length - (value.match(/\)/g) || []).length + match.length))).toLowerCase());
  const urls = uniqueReferences(text, /https?:\/\/[^\s<>"'\u3000]+/gi,
    value => value.replace(/[.,;:，。；：）】\]]+$/, ''));

  // Only explicit arithmetic forms are called confirmed. No medical denominator is inferred.
  const arithmetic = /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:[（(]\s*|=\s*)(\d+(?:\.\d+)?)\s*%\s*[)）]?/g;
  for (const match of text.matchAll(arithmetic)) {
    const numerator = Number(match[1]), denominator = Number(match[2]), percentage = Number(match[3]);
    const location = locationAt(text, match.index, materials);
    const quote = quoteAt(text, match.index, match[0].length);
    if (denominator === 0) {
      add({ status: 'confirmed', category: '数字与计算', severity: 'moderate', location, quote,
        detail: '此处把分母为 0 的比值写成了百分比，算式不可计算。',
        action: '核对原始人数或事件数；未报告的分母请保留缺失，不能写成 0。' });
      continue;
    }
    const actual = numerator / denominator * 100;
    const decimals = (match[3].split('.')[1] || '').length;
    const roundingTolerance = 0.5 * 10 ** -decimals + 1e-8;
    if (Math.abs(actual - percentage) > roundingTolerance) {
      add({ status: 'confirmed', category: '数字与计算', severity: 'moderate', location, quote,
        detail: `这条显式算式不一致：${numerator} ÷ ${denominator} × 100 = ${Number(actual.toFixed(4))}%，材料写为 ${percentage}%。`,
        action: '回到原始表格核对分子、分母与百分比。该计算检查不能判断哪一个原始数字正确。' });
    }
  }

  // Significance checks are review prompts because alpha, multiplicity, rounding and endpoint identity are unknown.
  let offset = 0;
  for (const line of rows) {
    const affirmative = /(?:差异|结果)?(?:具有|有|达到)?统计学(?:显著性|意义)|(?<!不)显著(?:改善|降低|增加|提高|差异)|statistically\s+significant/iu.test(line);
    const negative = /无统计学(?:显著性|意义)|不(?:具有|有|具备)?统计学(?:显著性|意义)|未(?:达到|见)统计学|不显著|未见显著|not\s+statistically\s+significant|non[- ]significant/iu.test(line);
    for (const match of line.matchAll(/\bp\s*([=<>≤≥])\s*(0?\.\d+|[01](?:\.\d+)?)/gi)) {
      const p = Number(match[2]), operator = match[1];
      const highP = (operator === '=' && p >= 0.05 && p <= 1) || (['>', '≥'].includes(operator) && p >= 0.05);
      const lowP = (operator === '=' && p < 0.05) || (['<', '≤'].includes(operator) && p <= 0.05);
      if ((highP && affirmative && !negative) || (lowP && negative)) {
        add({ status: 'needs_review', category: '统计表达', severity: 'moderate',
          quote: line.trim().slice(0, 500), location: locationAt(text, offset + match.index, materials),
          detail: `同一行的 p 值（${match[0]}）与统计显著性的文字需要核对；以常用 0.05 阈值看存在疑点。`,
          action: '确认是否属于同一结局、预设显著性阈值、多重比较及四舍五入；当前不能据此判定结论错误。' });
      }
    }
    for (const match of line.matchAll(/\b(RR|OR|HR)\s*[=:：]?\s*(\d+(?:\.\d+)?)[^\n]{0,28}?(?:95\s*%\s*(?:CI|置信区间)|(?:CI|置信区间)\s*95\s*%)\s*[:：=]?\s*[(（\[]?\s*(\d+(?:\.\d+)?)\s*[-–—,，至]\s*(\d+(?:\.\d+)?)/gi)) {
      const estimate = Number(match[2]), low = Number(match[3]), high = Number(match[4]);
      const location = locationAt(text, offset + match.index, materials);
      if (low > high || estimate < low || estimate > high) {
        add({ status: 'needs_review', category: '数字与计算', severity: 'moderate', location, quote: line.trim().slice(0, 500),
          detail: '同一行的比值效应点估计与区间顺序或覆盖关系需要核对。',
          action: '核对区间上下限、效应尺度、转录与所属结局；区间构建方法尚未核实。' });
      } else if (low <= 1 && high >= 1 && affirmative && !negative) {
        add({ status: 'needs_review', category: '统计表达', severity: 'moderate', location, quote: line.trim().slice(0, 500),
          detail: `${match[1].toUpperCase()} 的 95% 区间包含无效值 1，同一行却有显著性表述，需要核对。`,
          action: '确认是否同一结局，以及显著性检验、区间算法和四舍五入。尚未核查原始结果。' });
      }
    }
    offset += line.length + 1;
  }

  const promptFor = (id, expression, detail, action) => {
    if (!expression.test(text)) add({ status: 'needs_information', category: '补充核查', detail, action, key: id });
  };
  if (!dois.length && !urls.length) {
    add({ status: 'needs_information', category: '来源定位',
      detail: '未识别到 DOI 或网页链接。材料仍可能包含书目、页码或其他形式的来源，初评没有核验它们。',
      action: '补充原文、可访问链接或完整书目信息，并标出结论对应的来源页段。' });
  }
  promptFor('uncertainty', /不确定|确定性|偏倚|局限|限制|置信|可信|证据不足|GRADE|\bCI\b|confidence|credible|uncertain|limitation|bias|certainty/iu,
    '未识别到常见的不确定性或证据限制表述。短材料或其他措辞可能无法被规则识别。',
    '如结论用于决策，请补充关键局限、偏倚与不确定性；这一缺项提示不等于低质量判断。');
  promptFor('harms', /伤害|不良|副作用|风险|安全|死亡|禁忌|并发症|harm|adverse|side.effect|risk|safety|mortality|contraindicat/iu,
    '未识别到常见的伤害、风险或安全性表述。是否需要这些内容取决于材料用途。',
    '涉及干预选择时，核对重要伤害及其缺失；没有报告不应改写成没有伤害。');
  promptFor('population', /人群|患者|受试|参与者|儿童|成人|老年|女性|男性|孕|岁|population|patient|participant|adult|child|women|men|pregnan|aged/iu,
    '未识别到清楚的目标人群线索，初评不能判断适用性。',
    '补充研究人群、目标人群及关键排除条件，核对能否外推。');

  const partialMaterials = materials.filter(item => item?.coverage?.status === 'partial' || item?.coverage?.partial === true).length;
  const readMaterials = materials.filter(item => typeof item?.text === 'string' && item.text.trim()).length;
  if (partialMaterials) add({ status: 'needs_information', category: '读取范围',
    detail: `${partialMaterials} 份材料仅部分读取，当前报告只覆盖已经提取的文字。`,
    action: '查看材料的页数或字符覆盖说明；补齐未读部分后重新初评。' });
  const confirmedCount = findings.filter(item => item.status === 'confirmed').length;
  const reviewCount = findings.filter(item => item.status === 'needs_review').length;
  const informationCount = findings.filter(item => item.status === 'needs_information').length;
  const notChecked = [
    '来源是否真实存在、是否撤稿，以及原文是否支持结论',
    '检索完整性、研究或队列独立性、原始数据真实性',
    '研究设计适当性、偏倚风险、GRADE 确定性与临床适用性',
    '专家独立双审、仲裁、患者获益与正式 benchmark 排名'
  ];
  return {
    id: `CEB-${Date.now().toString(36).toUpperCase()}`,
    version: VERSION,
    createdAt: new Date().toISOString(),
    status: 'preliminary_complete',
    engine: { id: 'local-rules-v1', label: '规则自动初评', modelUsed: false },
    summary: {
      headline: confirmedCount ? `发现 ${confirmedCount} 处显式计算不一致，另有待核查与补充项。` : reviewCount ? `发现 ${reviewCount} 处需复核的表达疑点。` : '未触发当前规则的计算或统计表达疑点，仍需核查原始来源。',
      confirmedCount, reviewCount, informationCount, referenceCount: dois.length + urls.length
    },
    findings,
    references: { dois, urls, verifiedCount: 0, note: '仅提取文本中的标识；出现次数不代表研究数，重复 DOI 不自动表示重复纳入。' },
    scope: { checked: ['可读取文字中的 DOI 与链接线索', '显式分数与百分比的算术一致性', '有限模式下的 p 值、区间与显著性表达疑点', '常见信息线索及读取缺口'], notChecked },
    checks: [
      { id: 'reference-identifiers', label: '来源标识提取', status: 'checked', detail: '只识别 DOI 和链接，没有访问或核实来源。' },
      { id: 'arithmetic', label: '显式百分比计算', status: 'checked', detail: '仅检查如 20/100（30%）的显式算式，不推断医学分母。' },
      { id: 'statistical-wording', label: '有限统计表达检查', status: 'checked', detail: '只识别指定文本模式；疑点需要结合原文、阈值和结局复核。' },
      { id: 'source-support', label: '结论与原文支持', status: 'pending', detail: '尚未对照并审定原始来源。' },
      { id: 'clinical-methods', label: '方法、确定性与适用性', status: 'pending', detail: '当前规则不作专业质量或临床有效性判定。' }
    ],
    pending: [...notChecked],
    limitations: ['这是一份本机规则自动初评，没有调用语言模型或专家。', '未发现问题不代表内容正确；未识别到表述不代表内容缺失。', '报告没有正式总分、GRADE 等级、合格认证或临床建议。', 'OCR、表格或文件解析可能改变顺序或识别数字，请核对原件。'],
    context: cleanText(context).slice(0, 4000),
    coverage: { characters: text.length, lines: rows.length, materials: materials.length, readMaterials, partialMaterials }
  };
}
