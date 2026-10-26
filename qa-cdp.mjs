import fs from 'node:fs';

const wsUrl = process.argv[2];
const out = { results: [], console: [] };

const ws = new WebSocket(wsUrl);
let id = 0;
const pending = new Map();

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    out.console.push({ type: msg.params.type, args: msg.params.args.map(a => a.value ?? a.description ?? a.type) });
  }
  if (msg.method === 'Log.entryAdded') {
    out.console.push({ type: msg.params.entry.level, args: [msg.params.entry.text] });
  }
};

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function evalExpr(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function clickByText(text) {
  return evalExpr(`
    (() => {
      const els = Array.from(document.querySelectorAll('button'));
      const el = els.find(e => (e.textContent || '').trim().includes(${JSON.stringify(text)}));
      if (!el) return false;
      el.click();
      return true;
    })()
  `);
}

async function getOverflow() {
  return evalExpr(`
    (() => {
      const doc = document.documentElement;
      const body = document.body;
      const vw = window.innerWidth;
      const offenders = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 || r.left < -1) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0,80) : '';
          offenders.push({ tag, cls, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
        }
      });
      const unique = [];
      const seen = new Set();
      for (const o of offenders.sort((a,b)=>b.right-a.right).slice(0,12)) {
        const key = o.tag+o.cls+o.right;
        if (!seen.has(key)) { seen.add(key); unique.push(o); }
      }
      return {
        innerWidth: vw,
        scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
        clientWidth: doc.clientWidth,
        hasHorizontalScroll: Math.max(doc.scrollWidth, body.scrollWidth) > doc.clientWidth + 1,
        offenderCount: offenders.length,
        topOffenders: unique
      };
    })()
  `);
}

const views = [
  { name: 'dashboard', click: 'Home' },
  { name: 'billing', click: 'New Bill' },
  { name: 'invoices', click: 'Invoices' },
  { name: 'products', click: 'Inventory' },
  { name: 'customers', click: 'Customers' },
  { name: 'suppliers', click: 'Suppliers' },
  { name: 'payments', click: 'Payments' },
  { name: 'reports', click: 'Reports' },
  { name: 'settings', click: 'Settings' },
];

const widths = [320,375,390,430,768,1024,1440];

ws.onopen = async () => {
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Console.enable');
    await sleep(1500);

    for (const w of widths) {
      const mobile = w < 768;
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: 844,
        deviceScaleFactor: 1,
        mobile
      });
      await send('Page.reload', { ignoreCache: true });
      await sleep(2500);

      const widthResult = { width: w, views: [] };
      for (const v of views) {
        const clicked = await clickByText(v.click);
        await sleep(700);
        const overflow = await getOverflow();
        widthResult.views.push({ view: v.name, clicked, ...overflow });
      }
      out.results.push(widthResult);
    }

    await send('Emulation.clearDeviceMetricsOverride');
    fs.writeFileSync('qa-results.json', JSON.stringify(out, null, 2));
    ws.close();
  } catch (e) {
    out.error = String(e);
    fs.writeFileSync('qa-results.json', JSON.stringify(out, null, 2));
    ws.close();
  }
};
