#!/usr/bin/env python3
"""Rebuild the self-contained, offline protocol report from versioned local data."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs' / 'v0.1'

def read_json(p):
    return json.loads((ROOT / p).read_text(encoding='utf-8'))

def js_json(value):
    return json.dumps(value, ensure_ascii=False).replace('<', '\\u003c')

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    config = read_json('data/benchmark-config.json')
    catalog = read_json('data/metric-catalog.json')
    topics = read_json('data/pilot-topic-seeds.json')
    template = read_json('data/evaluation-template.json')
    for profile_id, profile in config['profiles'].items():
        assert profile['weights'] == catalog['profiles'][profile_id]['dimension_weights'], '配置与指标目录的profile权重不一致'
        assert abs(sum(profile['weights'].values()) - 100) < 1e-8, 'profile权重总和必须为100'
        for dimension_id, dimension_weight in profile['weights'].items():
            subweights = sum(m['within_dimension_weights'][profile_id] for m in catalog['metrics'] if m['dimension'] == dimension_id)
            assert abs(subweights - (1 if dimension_weight else 0)) < 1e-8, '维内权重不一致：' + dimension_id
    sources = []
    for name in ['clinical_standards', 'novel_metrics', 'landscape', 'root-sources']:
        research = read_json('research/' + name + '.json')
        for s in research['sources']:
            sources.append({**s, 'verified_date': s.get('verified_date', research.get('verified_date', '2026-10-29')), 'research_file': name + '.json'})
    registry = {'as_of': config['as_of'], 'status': 'curated_sources_not_systematic_review', 'source_records': len(sources), 'unique_urls': len({s['url'] for s in sources}), 'sources': sources}
    (ROOT / 'data/source-register.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    document = (ROOT / 'tools/report-shell.html').read_text(encoding='utf-8')
    body = (ROOT / 'tools/report-body.html').read_text(encoding='utf-8')
    assert len({s['id'] for s in sources}) == len(sources), '来源ID重复'
    source_ids = {s['id'] for s in sources}
    assert set(re.findall(r'href="#src-([^\"]+)"', body)) <= source_ids, '正文来源引用缺失'
    document = document.replace('<!--REPORT_BODY-->', body)
    document = document.replace('<!--DATA-->', '<script type="application/json" id="ce-data">' + js_json({'config': config, 'catalog': catalog, 'topics': topics, 'template': template, 'registry': registry}) + '</script>')
    modules = ['tools/scorer.js']
    if (ROOT / 'tools/metric-engine.js').exists():
        modules.append('tools/metric-engine.js')
    document = document.replace('<!--MODULES-->', '\n'.join('<script>' + (ROOT / p).read_text(encoding='utf-8') + '</script>' for p in modules))
    document = document.replace('<!--APP-->', '<script>' + (ROOT / 'tools/report-app.js').read_text(encoding='utf-8') + '</script>')
    (OUT / 'CEBench-Live-v0.1.html').write_text(document, encoding='utf-8')
    manifest = {'benchmark_id': config['benchmark_id'], 'version': config['version'], 'as_of': config['as_of'], 'status': config['status'], 'source_records': registry['source_records'], 'unique_source_urls': registry['unique_urls'], 'dimensions': len(config['dimensions']), 'submetrics': len(catalog['metrics']), 'proposed_topic_roots': len(topics['topics']), 'adjudicated_cases': 0, 'actual_system_runs': 0, 'official_leaderboard_results': 0, 'auto_search_or_scheduled_updates': False}
    (OUT / 'build-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False))

if __name__ == '__main__':
    main()
