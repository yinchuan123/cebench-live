#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {evaluate}=require('./scorer');
const root=path.resolve(__dirname,'..');
function main(){
 const input=process.argv[2],output=process.argv[3];
 if(!input){console.error('用法: node tools/evaluate-record.js 输入评价.json [输出结果.json]');process.exitCode=2;return;}
 const config=JSON.parse(fs.readFileSync(path.join(root,'data/benchmark-config.json'),'utf8'));
 const record=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
 if(record.schema_version!=='0.1.0')throw new Error('不支持的schema版本');
 const result={benchmark_id:config.benchmark_id,protocol_version:config.version,record_id:record.record_id,result:evaluate(config,record),notice:'只做草案计分和字段检查，不能核验临床证据或证明医学安全。'};
 const text=JSON.stringify(result,null,2)+'\n';if(output)fs.writeFileSync(path.resolve(output),text);else process.stdout.write(text);
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}
