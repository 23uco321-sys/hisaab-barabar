import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import app from '../src/server.js';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-full-audit-'));

const server = app.listen(8098, '127.0.0.1', async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let allPassed = true;
  const auditReport = [];

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    const wsUrl = tabs[0].webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };
    function sendCmd(method, params = {}) {
      return new Promise(r => {
        const id = msgId++;
        callbacks.set(id, r);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    await new Promise(r => ws.onopen = r);

    await sendCmd('Page.enable');
    await sendCmd('Runtime.enable');

    const routes = ['/worker', '/', '/admin'];
    const viewports = [
      { name: 'Compact Mobile', width: 320, height: 568 },
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12/13/14', width: 390, height: 844 },
      { name: 'Desktop Baseline', width: 1200, height: 800 }
    ];

    for (const route of routes) {
      for (const vp of viewports) {
        // Set exact layout viewport
        await sendCmd('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: false,
          fitWindow: false
        });

        await sendCmd('Page.navigate', { url: `http://127.0.0.1:8098${route}` });
        // Wait for page rendering and client-side data fetches
        await new Promise(r => setTimeout(r, 800));

        const res = await sendCmd('Runtime.evaluate', {
          expression: `JSON.stringify((() => {
            const winW = window.innerWidth;
            const docW = document.documentElement.clientWidth;
            const scrollW = document.documentElement.scrollWidth;
            const bodyScrollW = document.body.scrollWidth;

            // In admin, table-responsive legitimately has internal horizontal scroll,
            // but the page document element and body must NOT overflow or scroll!
            const overflows = [];
            document.querySelectorAll('body, body *').forEach(el => {
              if (el.offsetParent === null && el.tagName !== 'BODY') return;
              
              // If element is inside .table-responsive, it's allowed to scroll within its container
              if (el.closest && el.closest('.table-responsive')) return;

              const r = el.getBoundingClientRect();
              if (r.right > winW + 1) {
                overflows.push({
                  tag: el.tagName,
                  id: el.id || '',
                  cls: typeof el.className === 'string' ? el.className : '',
                  r: Math.round(r.right),
                  w: Math.round(r.width),
                  text: (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 30)
                });
              }
            });

            return {
              targetW: ${vp.width},
              winW,
              docW,
              scrollW,
              bodyScrollW,
              hasHorizontalScroll: scrollW > winW,
              overflowDelta: Math.max(0, scrollW - winW),
              overflowCount: overflows.length,
              overflows: overflows.slice(0, 5)
            };
          })())`,
          returnByValue: true
        });

        const data = JSON.parse(res.result.result.value);
        const passed = !data.hasHorizontalScroll && data.overflowCount === 0;

        if (!passed) {
          allPassed = false;
        }

        auditReport.push({
          Route: route,
          Viewport: `${vp.width}px (${vp.name})`,
          'Inner Width': `${data.winW}px`,
          'Scroll Width': `${data.scrollW}px`,
          'Overflow Delta': `${data.overflowDelta}px`,
          'Overflow Elements': data.overflowCount,
          Status: passed ? 'PASS' : 'FAIL',
          Culprits: data.overflows
        });
      }
    }

    ws.close();
  } catch (err) {
    console.error('Audit execution error:', err);
    allPassed = false;
  } finally {
    chromeProc.kill();
    server.close();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }

  console.log('\n============================================================');
  console.log('OFFICIAL MOBILE RESPONSIVENESS VERIFICATION AUDIT');
  console.log('============================================================\n');

  console.table(auditReport.map(r => ({
    Route: r.Route,
    Viewport: r.Viewport,
    'Inner W': r['Inner Width'],
    'Scroll W': r['Scroll Width'],
    Overflow: r['Overflow Delta'],
    Status: r.Status
  })));

  if (!allPassed) {
    console.log('\nFAILED VIEWPORT DETAILS:');
    auditReport.filter(r => r.Status === 'FAIL').forEach(f => {
      console.log(`\nRoute ${f.Route} at ${f.Viewport}:`);
      console.log(JSON.stringify(f.Culprits, null, 2));
    });
    process.exit(1);
  } else {
    console.log('\nALL 12 VIEWPORT COMBINATIONS (320px, 375px, 390px, 1200px) PASSED WITH ZERO OVERFLOW!\n');
    process.exit(0);
  }
});
