#!/usr/bin/env python3
"""Package only the public, hashed inputs approved by build-release.mjs."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'dist/releases/release-manifest.json'


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    version = manifest['release_version']
    if version != '1.0.0':
        raise ValueError('Review release packaging before changing the version.')
    archive_path = MANIFEST.parent / f'CEBench-Live-{version}.zip'
    files = []
    for entry in manifest['files']:
        relative = Path(entry['path'])
        if relative.is_absolute() or '..' in relative.parts or relative.parts[0] in {'work', 'private', 'uploads', 'submissions', '.git', 'node_modules'}:
            raise ValueError(f'Non-public path in release manifest: {relative}')
        if any(part.startswith('._') or part == '__pycache__' or part.startswith('.env') for part in relative.parts):
            raise ValueError(f'Private or transient input in manifest: {relative}')
        source = ROOT / relative
        if source.is_symlink() or not source.is_file() or not source.resolve().is_relative_to(ROOT):
            raise ValueError(f'Invalid public release input: {relative}')
        data = source.read_bytes()
        if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise ValueError(f'Input changed after release checks: {relative}; rebuild the manifest.')
        files.append((relative.as_posix(), data))
    files.append(('release-manifest.json', MANIFEST.read_bytes()))
    with ZipFile(archive_path, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files):
            item = ZipInfo(f'CEBench-Live-{version}/{name}', date_time=(2026, 10, 30, 0, 0, 0))
            item.compress_type = ZIP_DEFLATED
            item.external_attr = 0o100644 << 16
            archive.writestr(item, data)
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    (MANIFEST.parent / f'CEBench-Live-{version}.zip.sha256').write_text(f'{digest}  {archive_path.name}\n', encoding='utf-8')
    print(json.dumps({'archive': str(archive_path.relative_to(ROOT)), 'sha256': digest, 'files': len(files)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
