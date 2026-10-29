import {lookup as dnsLookup} from 'node:dns/promises';
import {request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {isIP} from 'node:net';
import {createHash} from 'node:crypto';

// Deliberately limited to public evidence sites. This is not an arbitrary URL proxy.
export const benchmarkSourceHosts=Object.freeze([
 'pubmed.ncbi.nlm.nih.gov','pmc.ncbi.nlm.nih.gov','www.ncbi.nlm.nih.gov',
 'cochranelibrary.com','www.cochranelibrary.com','cochrane.org','www.cochrane.org',
 'who.int','www.who.int','nih.gov','www.nih.gov','nice.org.uk','www.nice.org.uk',
 'cdc.gov','www.cdc.gov','clinicaltrials.gov',
]);
const allowedHosts=new Set(benchmarkSourceHosts);
const MAX_BYTES=1024*1024,DEADLINE_MS=8000,MAX_REDIRECTS=3,MAX_TEXT_CHARS=160000;
const allowedTypes=new Set(['text/html','application/xhtml+xml','text/plain','text/markdown']);
const redirects=new Set([301,302,303,307,308]);
const failureMessages={
 invalid_source_url:'请填写不含登录凭据的公开 HTTP 或 HTTPS 网页链接。',
 unsupported_source_host:'暂只读取 PubMed、PMC、Cochrane、WHO、NIH、NICE、CDC 和 ClinicalTrials.gov 的公开文本网页；其他链接请粘贴正文。',
 blocked_source_address:'此链接不能作为公开来源读取，请粘贴正文。',
 source_timeout:'网页读取超过 8 秒，请重试或粘贴正文。',
 source_too_large:'网页超过 1 MB 读取上限，请粘贴所需正文。',
 source_unavailable:'未能取得公开正文，可能需要登录、启用脚本或网站拒绝读取；请粘贴正文。',
 unsupported_source_type:'链接未返回可读取的文本网页；PDF 或其他文件请在本页本地上传。',
 source_redirect_limit:'网页重定向过多，请使用最终公开正文链接或粘贴正文。',
 benchmark_source_origin:'请从 Evidence OS benchmark 页面读取链接。',
 source_rate_limited:'网页读取次数较多或已有读取任务，请稍后重试。',
};
export class BenchmarkSourceError extends Error{
 constructor(code,status=422){super(code);this.name='BenchmarkSourceError';this.status=status;this.publicMessage=failureMessages[code]||failureMessages.source_unavailable;}
}
const fail=(code,status)=>{throw new BenchmarkSourceError(code,status)};

export function parseBenchmarkSourceURL(input){
 if(typeof input!=='string'||input.length<1||input.length>2048||/[\u0000-\u0020\u007f\\]/.test(input))fail('invalid_source_url',400);
 let url;try{url=new URL(input)}catch{fail('invalid_source_url',400)}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||(url.protocol==='https:'&&url.port==='80')||(url.protocol==='http:'&&url.port==='443'))fail('invalid_source_url',400);
 // WHATWG URL normalizes alternate IP spellings; every IP literal and unlisted host is denied.
 if(isIP(url.hostname.replace(/^\[|\]$/g,''))||!allowedHosts.has(url.hostname))fail('unsupported_source_host',400);
 url.hash='';return url;
}

export function isPublicSourceAddress(address){
 const family=isIP(address);
 if(family===4){
  const [a,b,c]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===0||b===168||(b===88&&c===99)))||(a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));
 }
 if(family!==6||address.includes('.'))return false;
 const raw=address.toLowerCase();
 // Only current global unicast, excluding special-purpose, documentation and tunnel ranges.
 if(!/^[23][0-9a-f]{3}:/.test(raw))return false;
 const first=parseInt(raw.split(':')[0],16),second=parseInt(raw.split(':')[1]||'0',16);
 if(first===0x2001&&(second<=0x1ff||second===0xdb8))return false;
 if(first===0x2002||(first===0x3fff&&second<=0xfff))return false;
 return true;
}

function abortFailure(signal){return signal.reason instanceof BenchmarkSourceError?signal.reason:new BenchmarkSourceError('source_timeout',504)}
function bounded(operation,signal){
 if(signal.aborted)return Promise.reject(abortFailure(signal));
 return new Promise((resolve,reject)=>{
  const aborted=()=>reject(abortFailure(signal));signal.addEventListener('abort',aborted,{once:true});
  Promise.resolve(operation).then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
 });
}
async function publicAddresses(url,resolveDNS,signal){
 let records;try{records=await bounded(resolveDNS(url.hostname,{all:true,verbatim:true}),signal)}catch(error){if(error instanceof BenchmarkSourceError)throw error;fail('source_unavailable')}
 if(!Array.isArray(records)||!records.length||records.length>32||records.some(record=>!record||!isPublicSourceAddress(record.address)||isIP(record.address)!==record.family))fail('blocked_source_address',400);
 return records;
}

// Pin the socket lookup to an address already validated for this exact hop. TLS still
// verifies the original hostname; no Cookie, Authorization or incoming headers are forwarded.
export function requestPublicSource(url,{address,signal,maxBytes=MAX_BYTES}={}){
 return new Promise((resolve,reject)=>{
  const send=url.protocol==='https:'?httpsRequest:httpRequest;
  const request=send(url,{
   method:'GET',agent:false,signal,family:address.family,
   headers:{Accept:'text/html, application/xhtml+xml, text/plain, text/markdown','Accept-Encoding':'identity','User-Agent':'EvidenceOS-CEBench/1.0 PublicSourceReader'},
   lookup:(hostname,options,callback)=>{
    if(hostname!==url.hostname)return callback(new Error('Pinned hostname mismatch'));
    if(options?.all)callback(null,[address]);else callback(null,address.address,address.family);
   },
  },response=>{
   const status=response.statusCode||0,headers=response.headers;
   if(redirects.has(status)){response.destroy();return resolve({status,headers,bytes:Buffer.alloc(0)})}
   if(status!==200){response.destroy();return reject(new BenchmarkSourceError('source_unavailable'))}
   const type=String(headers['content-type']||'').split(';')[0].trim().toLowerCase();
   if(!allowedTypes.has(type)||(headers['content-encoding']&&headers['content-encoding']!=='identity')){response.destroy();return reject(new BenchmarkSourceError('unsupported_source_type'))}
   if(Number(headers['content-length']||0)>maxBytes){response.destroy();return reject(new BenchmarkSourceError('source_too_large',413))}
   let length=0;const chunks=[];
   response.on('data',chunk=>{length+=chunk.length;if(length>maxBytes){reject(new BenchmarkSourceError('source_too_large',413));response.destroy();return}chunks.push(chunk)});
   response.once('error',reject);response.once('aborted',()=>reject(new BenchmarkSourceError('source_unavailable')));
   response.once('end',()=>resolve({status,headers,bytes:Buffer.concat(chunks,length)}));
  });
  request.once('error',error=>reject(signal?.aborted?abortFailure(signal):error));request.end();
 });
}

function decodeEntities(value){
 const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',hellip:'…'};
 return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(whole,key)=>{
  if(key[0]==='#'){const cp=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return cp>0&&cp<=0x10ffff&&!(cp>=0xd800&&cp<=0xdfff)?String.fromCodePoint(cp):' '}
  return entities[key.toLowerCase()]??whole;
 });
}
const cleanText=value=>decodeEntities(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
export function extractPublicSource(bytes,contentType){
 if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
 if(bytes.length>MAX_BYTES)fail('source_too_large',413);
 const type=String(contentType||'').split(';')[0].trim().toLowerCase();
 if(!allowedTypes.has(type)||bytes.subarray(0,128).includes(0)||bytes.subarray(0,5).toString()==='%PDF-')fail('unsupported_source_type');
 const warnings=['仅提取公开页面中的文本，不执行网页脚本；提取内容可能包含导航或缺少动态内容。','来源内容尚未经医学正确性、证据确定性或主张支持核验。'];
 let charset=/charset\s*=\s*["']?([\w-]+)/i.exec(contentType||'')?.[1]||'utf-8',source;
 try{source=new TextDecoder(charset,{fatal:true}).decode(bytes)}catch{fail('unsupported_source_type')}
 let title='',text=source;
 if(type==='text/html'||type==='application/xhtml+xml'){
  // Avoid repeated scans for a closing title or malformed nested tag starts.
  const opening=/<title\b[^<>]*>/i.exec(source),closing=opening?source.toLowerCase().indexOf('</title',opening.index+opening[0].length):-1;
  if(opening&&closing>=0)title=cleanText(source.slice(opening.index+opening[0].length,closing).replace(/<[^<>]*>/g,' ')).slice(0,240);
  if(/^(?:just a moment|access denied|checking your browser|sign in|log in|page not found|not found)\b/i.test(title)||/\bcf-chl-/i.test(source))fail('source_unavailable');
  text=source.replace(/<!--[\s\S]*?(?:-->|$)/g,' ').replace(/<(script|style|noscript|template|svg|iframe|object)\b[^<>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,' ').replace(/<head\b[^<>]*>[\s\S]*?(?:<\/head\s*>|$)/gi,' ').replace(/<\/?(?:p|div|section|article|main|h[1-6]|li|br|tr|blockquote)\b[^<>]*>/gi,'\n').replace(/<[^<>]*>/g,' ');
 }
 text=cleanText(text);
 if(text.length<40)fail('source_unavailable');
 if(text.length>MAX_TEXT_CHARS){text=text.slice(0,MAX_TEXT_CHARS);warnings.push('正文超过显示上限，已截取前 160000 个字符；不能视为全文。')}
 return {title,text,warnings};
}

export function createBenchmarkSourceReader({resolveDNS=dnsLookup,request=requestPublicSource,now=Date.now,deadlineMs=DEADLINE_MS}={}){
 const clients=new Map();let active=0;
 return async(input,clientKey)=>{
  const url=parseBenchmarkSourceURL(input),at=now(),key=createHash('sha256').update(String(clientKey||'unknown').slice(0,200)).digest('hex');
  for(const [id,entry] of clients)if(entry.until<=at&&entry.active===0)clients.delete(id);
  if(!clients.has(key)&&clients.size>=1000)fail('source_rate_limited',429);
  const entry=clients.get(key)||{count:0,until:at+60000,active:0};
  if(entry.until<=at){entry.count=0;entry.until=at+60000}
  if(active>=2||entry.active>=2||entry.count>=10)fail('source_rate_limited',429);
  entry.count++;entry.active++;clients.set(key,entry);active++;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new BenchmarkSourceError('source_timeout',504)),Math.min(DEADLINE_MS,deadlineMs));
  try{
   let current=url;
   for(let hop=0;;hop++){
    const records=await publicAddresses(current,resolveDNS,controller.signal);
    let result;try{result=await bounded(request(current,{address:records[0],signal:controller.signal,maxBytes:MAX_BYTES}),controller.signal)}catch(error){if(error instanceof BenchmarkSourceError)throw error;fail('source_unavailable')}
    if(redirects.has(result.status)){
     if(hop>=MAX_REDIRECTS)fail('source_redirect_limit');
     const location=result.headers.location;if(typeof location!=='string')fail('source_unavailable');
     let redirected;try{redirected=new URL(location,current)}catch{fail('invalid_source_url',400)}
     current=parseBenchmarkSourceURL(redirected.href);continue;
    }
    if(result.status!==200)fail('source_unavailable');
    return {url:current.href,...extractPublicSource(result.bytes,result.headers['content-type'])};
   }
  }finally{clearTimeout(timer);active--;entry.active--}
 };
}

export function createBenchmarkSourceAPI({publicOrigin,clientIP,reader=createBenchmarkSourceReader()}={}){
 return {async handle(req,res,url){
  if(url.pathname!=='/api/benchmark/source')return false;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
  const respond=(status,data,extra={})=>{res.writeHead(status,{...headers,...extra});res.end(JSON.stringify(data))};
  if(req.method!=='GET'){respond(405,{error:'method_not_allowed',message:'方法不支持。'},{Allow:'GET'});return true}
  try{
   if(req.headers['sec-fetch-site']!=='same-origin'||req.headers['x-eos-benchmark']!=='1'||(req.headers.origin&&req.headers.origin!==publicOrigin))fail('benchmark_source_origin',403);
   if(url.searchParams.getAll('url').length!==1||[...url.searchParams.keys()].some(key=>key!=='url'))fail('invalid_source_url',400);
   const result=await reader(url.searchParams.get('url'),clientIP(req));respond(200,result);
  }catch(error){
   const known=error instanceof BenchmarkSourceError;respond(known?error.status:503,{error:known?error.message:'source_unavailable',message:known?error.publicMessage:failureMessages.source_unavailable},error.status===429?{'Retry-After':'60'}:{});
  }
  return true;
 }};
}
