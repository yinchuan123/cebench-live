#!/usr/bin/env python3
"""Package editable sources and the offline report; exclude transient QA images."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'outputs' / 'v0.1' / 'CEBench-Live-v0.1-editable.zip'
paths = [ROOT / 'START-HERE.txt']
for folder in ['data', 'research', 'tools', 'tests']:
    paths.extend((ROOT / folder).rglob('*'))
for name in ['CEBench-Live-v0.1.html', 'measurement-handbook.txt', 'build-manifest.json']:
    paths.append(out.parent / name)
for name in ['qa-results.json', 'inline-qa-results.json', 'QA-NOTICE.txt']:
    paths.append(out.parent / 'qa' / name)
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    for p in sorted(set(paths)):
        if p.is_file() and not any(part.startswith('._') or part == '__pycache__' for part in p.parts) and p.suffix != '.pyc':
            archive.write(p, 'CEBench-Live-v0.1/' + str(p.relative_to(ROOT)))
print(str(out))
print('bytes=' + str(out.stat().st_size))
