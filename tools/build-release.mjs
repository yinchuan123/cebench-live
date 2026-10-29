import {readFileSync,writeFileSync,readdirSync,mkdirSync,lstatSync,existsSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
const pkg=read('package.json');
const config=read('data/benchmark-config.json');
const blueprint=read('outputs/v0.2/benchmark-blueprint-v0.2.json');
const registry=read('data/source-register.json');
const seeds=read('data/pilot-topic-seeds.json');
if(pkg.version!=='1.0.0')throw new Error('Update the release policy before changing the software version.');
if(blueprint.formal_ranking_enabled||blueprint.composite_score_enabled||blueprint.compatible_with_v0_1_scorer)throw new Error('The planning framework cannot silently enable ranking or the legacy scorer.');
if(blueprint.new_plan_adjudicated_roots!==0||blueprint.new_plan_real_runs!==0)throw new Error('Review the release evidence and public status before claiming actual benchmark cases or runs.');

// Explicit public source roots: internal worktrees, user submissions and runtime
// data are outside this allowlist even when they exist in the same workspace.
const topFiles=['README.md','CHANGELOG.md','CITATION.cff','START-HERE.txt','package.json','package-lock.json','.gitignore','.github/workflows/check.yml'];
const directories=['data','research','tools','tests','intake','server','docs','vendor/ocr','outputs/v0.1','outputs/v0.2','outputs/v0.3'];
const extensions=new Set(['json','md','txt','html','js','mjs','cjs','py','css','ts','tsx','svg','yml','yaml']);
const files=[];
function collect(directory,built=false){
  if(!existsSync(directory))return;
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    if(entry.name.startsWith('.')||['qa','__pycache__','node_modules','private','uploads','submissions'].includes(entry.name))continue;
    const path=join(directory,entry.name);
    if(entry.isSymbolicLink())continue;
    if(entry.isDirectory())collect(path,built);
    else if(entry.isFile()&&(built||extensions.has(entry.name.split('.').at(-1))))files.push(path);
  }
}
for(const file of topFiles){const path=join(root,file);if(!existsSync(path)||!lstatSync(path).isFile())throw new Error(`Missing public release input: ${file}`);files.push(path)}
for(const directory of directories)collect(join(root,directory));
const siteDirectory=join(root,'dist/site/benchmark');
if(!existsSync(join(siteDirectory,'index.html')))throw new Error('Build the evidence submission interface before creating the 1.0 release manifest.');
collect(siteDirectory,true);
const entries=[...new Set(files)].sort().map(path=>{const bytes=readFileSync(path);return {path:relative(root,path).split('\\').join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}});
const manifest={
  benchmark_id:'CEBench-Live',release_version:pkg.version,release_date:'2026-10-30',
  release_kind:'public_software_and_framework',
  method_protocol_version:blueprint.version,method_status:blueprint.status,
  legacy_calculator_version:config.version,legacy_calculator_compatible_with_planning_framework:false,
  formal_ranking_enabled:false,composite_score_enabled:false,
  adjudicated_benchmark_roots:0,actual_system_comparisons:0,official_leaderboard_results:0,
  proposed_topic_roots:seeds.topics.length,
  planning_dimensions:blueprint.dimensions.length,planning_tracks:blueprint.tracks.length,planning_evidence_modules:blueprint.evidence_modules.length,
  source_records:registry.source_records,unique_source_urls:registry.unique_urls,
  source_verification_as_of:registry.as_of,
  interpretation:'Software checks validate implemented behavior and arithmetic only. Automatic preliminary review is not source adjudication, expert review, medical validation or patient benefit.',
  files:entries,
};
const output=join(root,'dist/releases');mkdirSync(output,{recursive:true});
writeFileSync(join(output,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({release_version:manifest.release_version,public_files:entries.length,output:'dist/releases/release-manifest.json',formal_ranking_enabled:false}));
