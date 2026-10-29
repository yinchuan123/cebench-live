import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const directory=fileURLToPath(new URL('../vendor/ocr/',import.meta.url));mkdirSync(directory,{recursive:true});
const records=[];
const previous=existsSync(resolve(directory,'provenance.json'))?JSON.parse(readFileSync(resolve(directory,'provenance.json'),'utf8')).resources:[];
for(const file of ['eng.traineddata.gz','chi_sim.traineddata.gz','LICENSE']){
 const path=resolve(directory,file),url='https://raw.githubusercontent.com/naptha/tessdata/806cd9adc8c6e8abc11c782db1818c990576bebc/'+(file==='LICENSE'?'LICENSE':'4.0.0_best_int/'+file);
 if(!existsSync(path)){const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error('OCR resource unavailable: '+file);writeFileSync(path,Buffer.from(await response.arrayBuffer()))}
 const bytes=readFileSync(path);if(file.endsWith('.gz')&&(bytes[0]!==31||bytes[1]!==139))throw new Error('Invalid OCR language resource: '+file);const sha256=createHash('sha256').update(bytes).digest('hex'),expected=previous.find(row=>row.file===file);if(expected&&expected.sha256!==sha256)throw new Error('OCR resource checksum mismatch: '+file);records.push({file,url,bytes:bytes.length,sha256});
}
writeFileSync(resolve(directory,'provenance.json'),JSON.stringify({resources:records},null,2)+'\n');console.log('Local OCR resources ready.');
