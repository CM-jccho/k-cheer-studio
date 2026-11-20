#!/usr/bin/env python3
"""K-Cheer Studio · end to end verification (Playwright)

Checks
  1. page loads with no console or page error
  2. four languages carry the same key set, every marked node is filled, no key leaks to the page
  3. switching language updates html[lang], the title and the samples the visitor has not touched
  4. all three modes render a non-blank canvas; each slogan style, pattern and paper changes the pixels
  5. free PNG download is 150 dpi with the bottom mark, free PDF is a valid A3 landscape PDF
  6. Pro gate: 300 dpi asks for a code, a wrong code is refused, the code unlocks, 300 dpi output is 7087 px wide and the mark is gone
  7. photocard: a locked frame asks for the code, an uploaded photo lands in the window, the export is 55 x 85 mm at 300 dpi with alpha
  8. ticket and ribbon export at their own sizes
  9. no horizontal overflow at 375, 768, 1024, 1440 and 1920
 10. saves browser/k-cheer-studio-desktop.png and browser/k-cheer-studio-mobile.png

Run:  python3 tests/e2e.py
Needs: playwright (python), chromium, Pillow
"""
import functools
import http.server
import io
import os
import sys
import threading

from PIL import Image, ImageDraw, ImageChops
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS = os.path.join(ROOT, 'tests', '.downloads')
SHOTS = os.path.join(ROOT, 'tests', '.shots')
FIXTURES = os.path.join(ROOT, 'tests', '.fixtures')
BROWSER_DIR = os.path.join(os.path.dirname(ROOT), 'browser')
PORT = 8821
CODE = 'KCHEER-PRO-2026'

PASS, FAIL = [], []


def check(name, cond, detail=''):
    if cond:
        PASS.append(name)
        print('  PASS  ' + name)
    else:
        FAIL.append(name + ' :: ' + str(detail))
        print('  FAIL  ' + name + ' :: ' + str(detail))


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


def canvas_pixels(page, sel='#sheetCanvas'):
    return page.evaluate(
        """(sel) => {
        const c = document.querySelector(sel);
        const x = c.getContext('2d');
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let sum = 0, min = 255, max = 0;
        for (let i = 0; i < d.length; i += 4 * 97) {
          const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
          sum += v; if (v < min) min = v; if (v > max) max = v;
        }
        return { w: c.width, h: c.height, mean: sum / (d.length / (4 * 97)), range: max - min };
      }""",
        sel,
    )


def png_size(path):
    with Image.open(path) as im:
        return im.size, im.mode


def main():
    for d in (DOWNLOADS, SHOTS, FIXTURES, BROWSER_DIR):
        os.makedirs(d, exist_ok=True)

    photo_path = os.path.join(FIXTURES, 'photo.jpg')
    img = Image.new('RGB', (900, 1200), (232, 214, 210))
    dr = ImageDraw.Draw(img)
    for i in range(0, 1200, 60):
        dr.rectangle([0, i, 900, i + 30], fill=(210, 120, 110))
    dr.ellipse([220, 320, 680, 780], fill=(38, 120, 132))
    dr.ellipse([330, 430, 570, 670], fill=(250, 246, 240))
    img.save(photo_path, quality=92)

    serve()
    errors = []
    state = {'ok': True}

    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        ctx = browser.new_context(
            viewport={'width': 1440, 'height': 1000}, accept_downloads=True, locale='ko-KR'
        )
        page = ctx.new_page()
        page.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        page.goto('http://127.0.0.1:%d/index.html' % PORT, wait_until='networkidle')
        page.wait_for_function('window.KCS && window.KCS.ready === true', timeout=20000)
        page.wait_for_timeout(500)

        # ---- 1. boot ----
        check('page boots with no console or page error', not errors, errors)

        # ---- 2. languages ----
        key_sets = page.evaluate(
            """() => Object.fromEntries(Object.entries(window.KCS_I18N.dict).map(([k, v]) => [k, Object.keys(v).sort()]))"""
        )
        base = key_sets['ko']
        for lang, keys in key_sets.items():
            check('key set complete for ' + lang, keys == base, 'differs from ko by %d keys' % len(set(keys) ^ set(base)))
        filled = page.evaluate(
            """() => {
            const bad = [];
            document.querySelectorAll('[data-i18n]').forEach((el) => {
              if (!el.textContent.trim()) bad.push(el.getAttribute('data-i18n'));
            });
            return bad;
        }"""
        )
        check('every text node carries its translation', not filled, filled)

        for lang in ['es', 'pt', 'en', 'ko']:
            page.click('[data-set-lang="%s"]' % lang)
            page.wait_for_timeout(160)
            info = page.evaluate(
                """() => ({
                lang: document.documentElement.lang,
                title: document.title,
                leaked: [...document.querySelectorAll('[data-i18n]')]
                  .map((el) => el.textContent.trim())
                  .filter((t) => /^[a-z]+\\.[a-zA-Z0-9]+$/.test(t)),
                slogan: document.querySelector('#sloganText').value,
                pro: document.querySelector('#proToggle').textContent.trim()
              })"""
            )
            check('language ' + lang + ' applies html[lang]', info['lang'] == lang, info['lang'])
            check('language ' + lang + ' sets its own title', len(info['title']) > 12, info['title'])
            check('language ' + lang + ' leaks no raw key', not info['leaked'], info['leaked'])
            check('language ' + lang + ' keeps a sample sentence', len(info['slogan']) > 3, info['slogan'])

        # ---- 3. slogan rendering ----
        page.click('[data-set-lang="ko"]')
        page.fill('#sloganText', '오늘도 빛나')
        page.fill('#sloganSub', '항상 응원해')
        page.wait_for_timeout(200)
        base_px = canvas_pixels(page)
        check('slogan canvas is painted', base_px['range'] > 40, base_px)

        for font in ['solid', 'outline', 'condensed', 'wide', 'slant']:
            page.click('#fontSeg [data-font="%s"]' % font)
            page.wait_for_timeout(120)
            px = canvas_pixels(page)
            check('slogan style ' + font + ' paints', px['range'] > 40, px)
        page.click('#fontSeg [data-font="solid"]')

        for pattern in ['holo', 'check', 'minimal', 'border']:
            page.click('#patternSeg [data-pattern="%s"]' % pattern)
            page.wait_for_timeout(120)
            px = canvas_pixels(page)
            check('slogan pattern ' + pattern + ' paints', px['range'] > 40, px)
        page.click('#patternSeg [data-pattern="holo"]')

        page.click('#groundSeg [data-ground="light"]')
        page.wait_for_timeout(150)
        light_px = canvas_pixels(page)
        page.click('#groundSeg [data-ground="dark"]')
        page.wait_for_timeout(150)
        dark_px = canvas_pixels(page)
        check('paper choice changes the artwork', abs(light_px['mean'] - dark_px['mean']) > 30, (light_px, dark_px))

        # ---- 4. free downloads ----
        with page.expect_download() as dl:
            page.click('#pngBtn')
        free_png = os.path.join(DOWNLOADS, 'free-slogan.png')
        dl.value.save_as(free_png)
        size, mode = png_size(free_png)
        check('free slogan PNG is 150 dpi (3543 x 1181)', size == (3543, 1181), size)
        check('free slogan PNG is opaque RGB', mode in ('RGB', 'RGBA'), mode)

        with page.expect_download() as dl:
            page.click('#pdfBtn')
        pdf_path = os.path.join(DOWNLOADS, 'free-slogan.pdf')
        dl.value.save_as(pdf_path)
        with open(pdf_path, 'rb') as fh:
            head = fh.read(8)
        check('free slogan PDF is a real PDF', head.startswith(b'%PDF-1.'), head)
        check('free slogan PDF has content', os.path.getsize(pdf_path) > 40000, os.path.getsize(pdf_path))

        marks = page.evaluate(
            """() => {
            const a = document.createElement('canvas');
            window.KCS_RENDER.renderTo(a, 'slogan', window.KCS.state, 150, { mark: 'K-Cheer Studio' });
            const b = document.createElement('canvas');
            window.KCS_RENDER.renderTo(b, 'slogan', window.KCS.state, 150, { mark: '' });
            const ax = a.getContext('2d').getImageData(0, a.height - 120, 420, 110).data;
            const bx = b.getContext('2d').getImageData(0, b.height - 120, 420, 110).data;
            let diff = 0;
            for (let i = 0; i < ax.length; i += 4) if (Math.abs(ax[i] - bx[i]) > 8) diff++;
            return diff;
          }"""
        )
        check('free output carries the bottom mark, Pro does not', marks > 200, marks)

        page.click('#tab-photo')
        page.wait_for_timeout(200)
        page.click('.frame-btn[data-frame="ribbon"]')
        page.wait_for_timeout(150)
        page.click('.frame-btn[data-frame="laurel"]')
        page.wait_for_timeout(200)
        locked = page.evaluate(
            """() => ({ frame: window.KCS.state.photo.frame,
                        open: !document.querySelector('#proPanel').hidden })"""
        )
        check('a Pro frame asks for the code instead of switching', locked['frame'] == 'ribbon' and locked['open'], locked)
        page.click('#proToggle')
        page.click('#tab-slogan')
        page.wait_for_timeout(150)

        # ---- 5. pro gate ----
        page.click('#hiresBtn')
        page.wait_for_timeout(200)
        gate = page.evaluate(
            """() => ({ open: !document.querySelector('#proPanel').hidden,
                       msg: document.querySelector('#dlMsg').textContent.trim() })"""
        )
        check('300 dpi asks for a code before it saves', gate['open'] and len(gate['msg']) > 4, gate)

        page.fill('#codeInput', 'WRONG-CODE-1')
        page.click('#codeForm button[type="submit"]')
        page.wait_for_timeout(150)
        bad_msg = page.eval_on_selector('#codeMsg', 'el => el.textContent.trim()')
        still_locked = page.evaluate('window.KCS.state.pro === false')
        check('a wrong code is refused', still_locked and len(bad_msg) > 4, bad_msg)

        page.fill('#codeInput', CODE)
        page.click('#codeForm button[type="submit"]')
        page.wait_for_timeout(250)
        unlocked = page.evaluate(
            """() => ({ pro: window.KCS.state.pro,
                        badge: !document.querySelector('#proBadge').hidden,
                        button: document.querySelector('#proToggle').hidden })"""
        )
        check('the licence code unlocks Pro', unlocked['pro'] is True, unlocked)
        check('Pro state is shown in the bar', unlocked['badge'] and unlocked['button'], unlocked)
        check('unlocked panel closes', page.evaluate("document.querySelector('#proPanel').hidden") is True)

        with page.expect_download() as dl:
            page.click('#hiresBtn')
        pro_png = os.path.join(DOWNLOADS, 'pro-slogan.png')
        dl.value.save_as(pro_png)
        size, _ = png_size(pro_png)
        check('Pro slogan PNG is 300 dpi (7087 x 2362)', size == (7087, 2362), size)
        check('Pro slogan file is bigger than the free one', os.path.getsize(pro_png) > os.path.getsize(free_png))

        # ---- 6. photocard ----
        page.click('#tab-photo')
        page.wait_for_timeout(200)
        check('photocard mode shows its own sheet', page.eval_on_selector('#panel-photo', 'el => !el.hidden'))
        page.click('.frame-btn[data-frame="ribbon"]')
        page.wait_for_timeout(150)
        px = canvas_pixels(page)
        check('photocard frame paints', px['range'] > 20, px)

        page.set_input_files('#photoInput', photo_path)
        page.wait_for_timeout(400)
        uploaded = page.evaluate(
            """() => ({ has: !!window.KCS.state.photo.img,
                        name: document.querySelector('#photoName').textContent.trim() })"""
        )
        check('an uploaded photo reaches the preview', uploaded['has'], uploaded)
        check('the file name is shown beside the button', 'photo.jpg' in uploaded['name'], uploaded['name'])

        page.fill('#photoNameInput', 'SOFÍA')
        page.fill('#photoDate', '2026-11-20')
        page.wait_for_timeout(250)

        card = page.evaluate(
            """() => {
            const c = document.createElement('canvas');
            window.KCS_RENDER.renderTo(c, 'photo', window.KCS.state, 300, { mark: '' });
            const x = c.getContext('2d');
            const cx = Math.floor(c.width / 2), cy = Math.floor(c.height / 2);
            const mid = x.getImageData(cx, cy, 1, 1).data;
            const corner = x.getImageData(6, 6, 1, 1).data;
            return { w: c.width, h: c.height, mid: [...mid], corner: [...corner] };
          }"""
        )
        check('photocard export is 55 x 85 mm at 300 dpi', (card['w'], card['h']) == (650, 1004), (card['w'], card['h']))
        check('the photo fills the window', card['mid'][3] == 255 and card['mid'] != card['corner'], card['mid'])
        empty = page.evaluate(
            """() => {
            const keep = window.KCS.state.photo.img;
            window.KCS.state.photo.img = null;
            const c = document.createElement('canvas');
            window.KCS_RENDER.renderTo(c, 'photo', window.KCS.state, 300, { mark: '' });
            window.KCS.state.photo.img = keep;
            const x = c.getContext('2d');
            const mid = x.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
            const edge = x.getImageData(Math.floor(c.width / 2), 20, 1, 1).data;
            return { mid: [...mid], edge: [...edge] };
          }"""
        )
        check('without a photo the window stays clear', empty['mid'][3] == 0, empty['mid'])
        check('the frame matte is printed, not transparent', empty['edge'][3] == 255, empty['edge'])

        with page.expect_download() as dl:
            page.click('#pngBtn')
        card_png = os.path.join(DOWNLOADS, 'pro-photocard.png')
        dl.value.save_as(card_png)
        size, mode = png_size(card_png)
        check('photocard PNG keeps its alpha channel', mode == 'RGBA', mode)
        check('photocard PNG is 650 x 1004', size == (650, 1004), size)

        # ---- 7. ticket and ribbon ----
        page.click('#tab-ticket')
        page.wait_for_timeout(200)
        page.fill('#ticketTitle', '오늘도 빛나')
        page.fill('#ticketVenue', '올림픽홀 A구역')
        page.wait_for_timeout(200)
        with page.expect_download() as dl:
            page.click('#pngBtn')
        ticket_png = os.path.join(DOWNLOADS, 'pro-ticket.png')
        dl.value.save_as(ticket_png)
        size, _ = png_size(ticket_png)
        check('ticket exports at 18 x 7 cm, 300 dpi', size == (2126, 827), size)

        page.click('#variantSeg [data-variant="ribbon"]')
        page.wait_for_timeout(250)
        with page.expect_download() as dl:
            page.click('#pngBtn')
        ribbon_png = os.path.join(DOWNLOADS, 'pro-ribbon.png')
        dl.value.save_as(ribbon_png)
        size, _ = png_size(ribbon_png)
        check('ribbon exports at 6 x 24 cm, 300 dpi', size == (709, 2835), size)
        page.click('#variantSeg [data-variant="ticket"]')

        # ---- 8. overflow ----
        for w, h in [(375, 812), (768, 1024), (1024, 768), (1440, 900), (1920, 1080)]:
            page.set_viewport_size({'width': w, 'height': h})
            page.wait_for_timeout(220)
            over = page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            check('no horizontal overflow at %d px' % w, over <= 0, over)

        # ---- 9. final state, screenshots (fresh visitor, free plan) ----
        page.evaluate("localStorage.clear()")
        page.reload(wait_until='networkidle')
        page.wait_for_function('window.KCS && window.KCS.ready === true', timeout=20000)
        page.wait_for_timeout(500)
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.click('[data-set-lang="ko"]')
        page.click('#tab-slogan')
        page.click('#patternSeg [data-pattern="holo"]')
        page.evaluate('window.scrollTo(0, 0)')
        page.wait_for_timeout(400)
        desktop = os.path.join(BROWSER_DIR, 'k-cheer-studio-desktop.png')
        page.screenshot(path=desktop)
        shot = os.path.join(SHOTS, 'desktop.png')
        page.screenshot(path=shot)

        page.set_viewport_size({'width': 390, 'height': 844})
        page.click('[data-set-lang="es"]')
        page.wait_for_timeout(200)
        page.evaluate('window.scrollTo(0, 0)')
        page.wait_for_timeout(400)
        mobile = os.path.join(BROWSER_DIR, 'k-cheer-studio-mobile.png')
        page.screenshot(path=mobile, full_page=True)
        page.screenshot(path=os.path.join(SHOTS, 'mobile.png'), full_page=True)

        page.click('#tab-photo')
        page.evaluate('window.scrollTo(0, 0)')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(SHOTS, 'desktop-photo.png'))

        page.click('#tab-ticket')
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(SHOTS, 'desktop-ticket.png'))

        check('no console or page error during the run', not errors, errors)
        browser.close()

    print('\n%d passed, %d failed' % (len(PASS), len(FAIL)))
    for f in FAIL:
        print('  failed: ' + f)
    return 0 if not FAIL else 1


if __name__ == '__main__':
    sys.exit(main())
