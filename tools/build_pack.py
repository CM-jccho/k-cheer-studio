#!/usr/bin/env python3
"""Build the K-Cheer Studio downloads.

    python3 tools/build_pack.py

Writes
  build/frames/*.png                       the twenty photocard frames, 650 x 1004, transparent
  build/k-cheer-print-guide.pdf            the print guide, A4, 8 pages
  downloads/k-cheer-studio.zip             the web app, ready to host
  downloads/k-cheer-studio-pro-pack.zip    frames + guide + licence, ready for Gumroad
"""
import base64
import functools
import http.server
import json
import os
import shutil
import threading
import zipfile

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKSPACE = os.path.dirname(ROOT)
BUILD = os.path.join(ROOT, 'build')
FRAMES = os.path.join(BUILD, 'frames')
DOWNLOADS = os.path.join(WORKSPACE, 'downloads')
PACK = os.path.join(BUILD, 'k-cheer-studio-pro-pack')
PORT = 8833

NAMES = [
    ('star', 'Star'), ('ribbon', 'Ribbon'), ('checker', 'Checker'), ('polaroid', 'Polaroid'),
    ('stub', 'Stub'), ('scallop', 'Scallop'), ('halftone', 'Halftone'), ('confetti', 'Confetti'),
    ('arch', 'Arch'), ('film', 'Film'), ('stamp', 'Stamp'), ('tape', 'Tape'),
    ('prism', 'Prism'), ('grid', 'Grid'), ('banner', 'Banner'), ('cloud', 'Cloud'),
    ('laurel', 'Laurel'), ('wave', 'Wave'), ('stripe', 'Stripe'), ('plate', 'Plate'),
]

LICENCE = """K-Cheer Studio · Pro pack
Twenty photocard frames, the print guide, and the unlock code.

WHAT IS HERE
  frames/     20 PNG frames, 650 x 1004 px, 300 dpi, transparent middle
  guide/      k-cheer-print-guide.pdf, eight pages

UNLOCK CODE
  KCHEER-PRO-2026

  Open the studio, press Pro in the top bar, type the code, press Check code.
  Pro stays on in that browser: 300 dpi output, no bottom mark, all 20 frames.

LICENCE
  You may print the frames for yourself, for friends and for fan events with no
  entry fee, and post the printed result on your own accounts.
  You may not resell the files, upload them to a template shop, a print on demand
  catalogue or a stock site, or claim the frames as your own design.

NOT INCLUDED, ON PURPOSE
  No idol, group, agency or light stick name, logo or shape is in this pack.
  The words on a card are the ones the fan types, which is what keeps the file
  theirs to print.

K-Cheer Studio · 2026
"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = Server(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def build_frames(page):
    page.goto('http://127.0.0.1:%d/build/frames.html' % PORT, wait_until='networkidle')
    page.wait_for_function('window.KCS_PACK && window.KCS_PACK.ready', timeout=20000)
    page.wait_for_timeout(900)
    items = page.evaluate(
        "window.KCS_PACK.frames.map(f => ({id: f.id, pro: f.pro, data: f.dataUrl}))"
    )
    shutil.rmtree(FRAMES, ignore_errors=True)
    os.makedirs(FRAMES, exist_ok=True)
    listing = []
    for i, item in enumerate(items, 1):
        name = dict(NAMES)[item['id']]
        filename = '%02d-%s.png' % (i, item['id'])
        with open(os.path.join(FRAMES, filename), 'wb') as fh:
            fh.write(base64.b64decode(item['data'].split(',', 1)[1]))
        listing.append({'n': '%02d' % i, 'id': item['id'], 'name': name, 'file': filename})
    with open(os.path.join(BUILD, 'frames.json'), 'w') as fh:
        json.dump(listing, fh, indent=1)
    return listing


def build_guide(page):
    page.goto('http://127.0.0.1:%d/build/guide.html' % PORT, wait_until='networkidle')
    page.wait_for_function("document.documentElement.getAttribute('data-frames') === 'ready'", timeout=20000)
    page.wait_for_timeout(700)
    out = os.path.join(BUILD, 'k-cheer-print-guide.pdf')
    page.pdf(path=out, format='A4', print_background=True, margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
    return out


def zip_app():
    target = os.path.join(DOWNLOADS, 'k-cheer-studio.zip')
    skip = {'tests', 'tools', 'build', '.hallmark', '.git'}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in skip and not d.startswith('.')]
            for f in files:
                full = os.path.join(base, f)
                rel = os.path.relpath(full, ROOT)
                z.write(full, os.path.join('k-cheer-studio', rel))
    return target


def zip_pack():
    shutil.rmtree(PACK, ignore_errors=True)
    os.makedirs(os.path.join(PACK, 'frames'), exist_ok=True)
    os.makedirs(os.path.join(PACK, 'guide'), exist_ok=True)
    for f in sorted(os.listdir(FRAMES)):
        shutil.copy2(os.path.join(FRAMES, f), os.path.join(PACK, 'frames', f))
    shutil.copy2(os.path.join(BUILD, 'k-cheer-print-guide.pdf'), os.path.join(PACK, 'guide', 'k-cheer-print-guide.pdf'))
    with open(os.path.join(PACK, 'LICENCE.txt'), 'w') as fh:
        fh.write(LICENCE)
    target = os.path.join(DOWNLOADS, 'k-cheer-studio-pro-pack.zip')
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(PACK):
            for f in sorted(files):
                full = os.path.join(base, f)
                rel = os.path.relpath(full, PACK)
                z.write(full, os.path.join('k-cheer-studio-pro-pack', rel))
    return target


def main():
    os.makedirs(DOWNLOADS, exist_ok=True)
    os.makedirs(BUILD, exist_ok=True)
    serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1400, 'height': 1000})
        listing = build_frames(page)
        print('frames:', len(listing))
        guide = build_guide(page)
        print('guide:', guide, os.path.getsize(guide))
        browser.close()

    app_zip = zip_app()
    pack_zip = zip_pack()
    for path in (app_zip, pack_zip):
        with zipfile.ZipFile(path) as z:
            print(os.path.basename(path), len(z.namelist()), 'files', os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    main()
