#!/usr/bin/env python3
"""Render the twenty photocard frames to transparent PNGs (300 dpi).

    python3 tools/make_frames.py <out-dir>
"""
import base64
import functools
import http.server
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8811
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build', 'frames')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True


def main():
    os.makedirs(OUT, exist_ok=True)
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = Server(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1400, 'height': 1000})
        page.goto(f'http://127.0.0.1:{PORT}/build/frames.html', wait_until='networkidle')
        page.wait_for_function('window.KCS_PACK && window.KCS_PACK.ready', timeout=20000)
        page.wait_for_timeout(900)
        items = page.evaluate("window.KCS_PACK.frames.map(f => ({id: f.id, pro: f.pro, data: f.dataUrl}))")
        browser.close()

    for i, item in enumerate(items, 1):
        raw = base64.b64decode(item['data'].split(',', 1)[1])
        name = 'kcheer-frame-%02d-%s.png' % (i, item['id'])
        with open(os.path.join(OUT, name), 'wb') as fh:
            fh.write(raw)
        print(name, len(raw))


if __name__ == '__main__':
    main()
