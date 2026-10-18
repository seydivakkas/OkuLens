import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const code = readFileSync(new URL('../content/spa-monitor.js', import.meta.url), 'utf8');

function fixture(hostname, href) {
  const location = { hostname, href };
  const events = new Map();
  const messages = [];
  let disconnected = false, observeCount = 0, callback = null;
  let body = 'İlk görünür ileti gövdesi';
  class MutationObserver {
    constructor(fn) { callback = fn; }
    observe() { observeCount++; }
    disconnect() { disconnected = true; }
  }
  const window = {
    addEventListener(name, fn) { events.set(name, fn); },
    removeEventListener(name) { events.delete(name); }
  };
  const document = {
    body: {}, documentElement: {},
    querySelectorAll() { return hostname.includes('mail.google.com') ? [{textContent: body}] : []; }
  };
  const chrome = { runtime: { sendMessage(msg) { messages.push(msg); return Promise.resolve(); } } };
  const sandbox = { location, document, window, chrome, MutationObserver, setTimeout, clearTimeout };
  runInNewContext(code, sandbox);
  return { sandbox, location, messages, events, mutate: value => { body = value; callback?.(); },
    get disconnected() { return disconnected; }, get observeCount() { return observeCount; } };
}
const pause = () => new Promise(resolve => setTimeout(resolve, 260));

test('Gmail görünür ileti değişiminde yalnızca kapsam olayı gönderilir', async () => {
  const x = fixture('mail.google.com', 'https://mail.google.com/mail/u/0/#inbox/one');
  x.sandbox.__okulensSpaMonitor.start();
  x.mutate('Başka bir görünür ileti metni');
  await pause();
  assert.equal(x.messages.length, 1);
  assert.equal(x.messages[0].reason, 'email-dom');
  assert.equal(x.messages[0].type, 'OKULENS_SOURCE_CHANGED');
  assert.equal(Object.hasOwn(x.messages[0], 'url'), false);
  assert.equal(JSON.stringify(x.messages).includes('mail.google.com'), false);
  assert.equal(JSON.stringify(x.messages).includes('Başka bir görünür ileti'), false);
  x.sandbox.__okulensSpaMonitor.stop();
  assert.equal(x.disconnected, true);
  assert.equal(x.events.size, 0);
});
test('YouTube SPA navigasyonu URL değişikliği bildirir; pagehide temizler', async () => {
  const x = fixture('www.youtube.com', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  x.sandbox.__okulensSpaMonitor.start();
  x.location.href = 'https://www.youtube.com/watch?v=9bZkp7q19f0';
  x.events.get('yt-navigate-finish')();
  await pause();
  assert.equal(x.messages.length, 1);
  assert.equal(x.messages[0].reason, 'navigation');
  assert.equal(Object.hasOwn(x.messages[0], 'url'), false);
  x.events.get('pagehide')();
  assert.equal(x.disconnected, true);
  assert.equal(x.events.size, 0);
});
