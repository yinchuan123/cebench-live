#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const {aggregateDimensions}=require('./metric-engine');
const root=path.resolve(__dirname,'..');
try{
 const input=process.argv[2],output=process.argv[3];
 if(!input)throw new Error('用法: node tools/score-metrics.js 原始指标观测.json [维度结果.json]');
 const record=JSON.parse(fs.readFileSync(path.resolve(input),'utf8'));
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/metric-catalog.json'),'utf8'));
 if(record.schema_version!=='0.1.0-draft'||record.catalog_version!==catalog.catalog_version)throw new Error('原始指标schema或catalog版本不匹配');
 const result=aggregateDimensions(catalog,record.metric_observations,record.selected_profile);
 const text=JSON.stringify(result,null,2)+'\n';
 if(output)fs.writeFileSync(path.resolve(output),text);else process.stdout.write(text);
 if(!result.valid)process.exitCode=1;
}catch(e){console.error(e.message);process.exitCode=1;}
