"""Download the six reviewed sample photos; image decoding/packaging runs in Docker."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
items = json.loads((root / 'frontend/src/features/samples/materials.json').read_text())
target = root / 'frontend/public/samples'
target.mkdir(parents=True, exist_ok=True)
for item in items:
    url = item['downloadUrl']
    if not url.startswith('https://images.unsplash.com/'):
        raise ValueError('Only reviewed Unsplash image URLs are allowed')
    request = Request(url, headers={'User-Agent': 'MaterialStudio-SampleDownload/1.0'})
    with urlopen(request, timeout=45) as response:
        data = response.read(5242881)
    if not data or len(data) > 5242880:
        raise ValueError(f"Unexpected size: {item['file']}")
    signature = b'\x89PNG\r\n\x1a\n' if item['format'] == 'PNG' else b'\xff\xd8'
    if not data.startswith(signature):
        raise ValueError(f"Unexpected format: {item['file']}")
    (target / item['file']).write_bytes(data)
    print(item['file'], len(data), hashlib.sha256(data).hexdigest())
