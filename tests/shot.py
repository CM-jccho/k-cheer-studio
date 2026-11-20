#!/usr/bin/env python3
"""Quick visual check: python3 tests/shot.py out.png [width] [height] [full]"""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8795


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


out = sys.argv[1] if len(sys.argv) > 1 else '/workspace/tmpwork/shot.png'
width = int(sys.argv[2]) if len(sys.argv) > 2 else 1440
height = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
full = len(sys.argv) > 4 and sys.argv[4] == 'full'
mode = sys.argv[5] if len(sys.argv) > 5 else 'slogan'
lang = sys.argv[6] if len(sys.argv) > 6 else 'ko'

serve()
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1, locale='ko-KR')
    page = ctx.new_page()
    errs = []
    page.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.goto(f'http://127.0.0.1:{PORT}/index.html#{mode}', wait_until='networkidle')
    page.wait_for_function('window.KCS && window.KCS.ready === true', timeout=15000)
    page.wait_for_timeout(400)
    if lang != 'ko':
        page.click('[data-set-lang="%s"]' % lang)
        page.wait_for_timeout(300)
    if mode == 'slogan':
        page.fill('#sloganText', '오늘도 빛나' if lang == 'ko' else 'Hoy brillas')
        page.fill('#sloganSub', '항상 응원해' if lang == 'ko' else 'Siempre contigo')
    elif mode == 'photo':
        page.fill('#photoNameInput', 'SOFÍA')
        page.fill('#photoDate', '2026-11-20')
        page.check('#photoInput') if False else None
    elif mode == 'ticket':
        page.fill('#ticketTitle', '오늘도 빛나')
        page.fill('#ticketVenue', '올림픽홀 A구역')
        page.fill('#ticketDate', '2026-11-20')
    page.wait_for_timeout(400)
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=out, full_page=full)
    print('errors:', errs)
    b.close()
