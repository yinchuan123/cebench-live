'use strict';
// Build an offline reader from the two versioned narrative documents.
const fs = require('fs');
const path = require('path');
const {marked} = require('marked');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/v0.3');
const intro = fs.readFileSync(path.join(out, '临床证据Benchmark对外介绍.md'), 'utf8');
const full = fs.readFileSync(path.join(out, '临床证据Benchmark用户价值与商业方案.md'), 'utf8');
const render = source => marked.parse(source, {gfm:true}).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
const document = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><title>CEBench-Live 用户价值与商业方案</title>
<style>
:root{color-scheme:light dark;--bg:light-dark(#fcfcfa,#191b1a);--fg:light-dark(#202e29,#e4ebe7);--muted:light-dark(#55665e,#b2bfb7);--line:light-dark(#d9e1db,#414d46);--accent:light-dark(#195a43,#a6d6bc);--soft:light-dark(#edf3ef,#263a2d)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.85 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;overflow-wrap:anywhere}header,main,footer{max-width:1040px;margin:auto;padding:24px 32px}header{border-bottom:1px solid var(--line)}.brand{font-size:15px;letter-spacing:.06em;color:var(--accent);font-weight:650}.status{font-size:14px;color:var(--muted);margin:6px 0 14px}.views{display:flex;gap:8px;flex-wrap:wrap}button{font:inherit;font-size:15px;color:var(--fg);background:transparent;border:1px solid var(--line);border-radius:8px;padding:8px 16px;cursor:pointer}button[aria-selected=true]{background:var(--soft);border-color:var(--accent);color:var(--accent)}button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}h1{font-size:32px;line-height:1.4;letter-spacing:-.02em;margin:8px 0 20px}h2{font-size:23px;line-height:1.5;margin:36px 0 16px;padding-top:8px;border-top:1px solid var(--line)}h3{font-size:19px;margin:24px 0 10px}p{margin:0 0 18px}a{color:var(--accent);text-underline-offset:3px}li{margin-bottom:12px}ol,ul{padding-left:1.5em}article{max-width:850px}#full{max-width:100%}.table-wrap{max-width:100%;overflow:auto;margin:18px 0 24px}table{border-collapse:collapse;width:100%;font-size:15px;line-height:1.75;min-width:600px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid var(--line);min-width:125px}th{background:var(--soft);font-weight:600}td:first-child{font-weight:550}nav[aria-label="完整方案目录"]{font-size:14px;background:var(--soft);padding:18px 22px;margin:0 0 25px}nav[aria-label="完整方案目录"] ul{columns:2;column-gap:36px;margin:8px 0 0}nav[aria-label="完整方案目录"] li{break-inside:avoid;margin:0 0 6px}footer{border-top:1px solid var(--line);font-size:13px;color:var(--muted)}[hidden]{display:none!important}@media(max-width:600px){header,main,footer{padding:20px 18px}h1{font-size:26px}h2{font-size:21px}nav[aria-label="完整方案目录"] ul{columns:1}table{font-size:14px}button{min-height:44px}}@media print{header,.contents,footer{display:none}main{max-width:none;padding:0}article[hidden]{display:block!important}article{max-width:none}#intro{break-after:page}body{font-size:11pt;background:white;color:black}table{min-width:0;font-size:9pt}.table-wrap{overflow:visible}a{color:inherit}h2,h3{break-after:avoid}tr{break-inside:avoid}}
</style></head><body>
<header><div class="brand">CEBench-Live</div><p class="status">试点筹备阶段 · 内容方案 0.3 · 2026 年 10 月 29 日</p><div class="views" role="tablist" aria-label="阅读版本"><button type="button" id="intro-tab" role="tab" aria-controls="intro" aria-selected="true">对外介绍</button><button type="button" id="full-tab" role="tab" aria-controls="full" aria-selected="false">完整用户与商业方案</button></div></header>
<main><article id="intro" role="tabpanel" aria-labelledby="intro-tab">${render(intro)}</article><article id="full" role="tabpanel" aria-labelledby="full-tab" hidden><nav class="contents" aria-label="完整方案目录"><strong>阅读目录</strong><ul id="contents"></ul></nav>${render(full)}</article></main>
<footer>本页为可离线阅读的方案说明。核查工具、服务时限与商业路径依各自验证范围启用。短版与完整版源文件保存在本页同一目录。</footer>
<script>
const tabs=Array.from(document.querySelectorAll('[role=tab]'));
const panels=Array.from(document.querySelectorAll('[role=tabpanel]'));
function select(id){for(const t of tabs)t.setAttribute('aria-selected',String(t.getAttribute('aria-controls')===id));for(const p of panels)p.hidden=p.id!==id;}
for(const t of tabs)t.addEventListener('click',()=>select(t.getAttribute('aria-controls')));
const contents=document.getElementById('contents');
Array.from(document.querySelectorAll('#full h2')).forEach((h,i)=>{h.id='section-'+(i+1);const li=document.createElement('li');const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;li.append(a);contents.append(li);});
document.querySelector('#full h2').before(document.querySelector('.contents'));
</script></body></html>`;
fs.writeFileSync(path.join(out, 'CEBench-Live用户与商业说明.html'), document);
console.log('已生成离线阅读版');
