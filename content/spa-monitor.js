/* OkuLens — SPA gözlemcisi. URL / görünür e-posta gövdesi değişince panel önbelleğini geçersizleştirir.
 * Mutasyon verisini veya e-posta içeriğini arka plana GÖNDERMEZ.
 */
(() => {
  'use strict';
  if (globalThis.__okulensSpaMonitor) return;
  const host = location.hostname.toLowerCase();
  const email = host === 'mail.google.com' || /^outlook\.(live|office|office365)\.com$/.test(host);
  const youtube = host === 'youtube.com' || host.endsWith('.youtube.com');
  let active = false, observer = null, timer = null;
  let url = location.href, emailSignature = '';
  function signature() {
    if (!email) return '';
    const nodes = document.querySelectorAll('.a3s,[data-testid="message-body"],[data-testid="messageBody"],[aria-label="Message body"]');
    return [...nodes].slice(0, 30).map(el => {
      const text = el.textContent || '';
      return [text.length, text.slice(0, 64), text.slice(-64)].join(':');
    }).join('|');
  }
  function send(reason) {
    try {
      chrome.runtime.sendMessage({ type: 'OKULENS_SOURCE_CHANGED', url: location.href, reason }).catch(() => {});
    } catch { stop(); }
  }
  function check() {
    timer = null;
    if (!active) return;
    const next = location.href;
    if (next !== url) {
      url = next;
      emailSignature = signature();
      send('navigation');
    } else if (email) {
      const nextSignature = signature();
      if (nextSignature !== emailSignature) {
        emailSignature = nextSignature;
        send('email-dom');
      }
    }
  }
  function schedule() {
    if (!active || timer) return;
    timer = setTimeout(check, 200);
  }
  function stop() {
    active = false;
    if (timer) clearTimeout(timer);
    timer = null;
    observer?.disconnect();
    observer = null;
    window.removeEventListener('popstate', schedule);
    window.removeEventListener('hashchange', schedule);
    window.removeEventListener('yt-navigate-finish', schedule);
    window.removeEventListener('pagehide', stop);
  }
  function start() {
    if (active || (!email && !youtube)) return;
    active = true;
    url = location.href;
    emailSignature = signature();
    window.addEventListener('popstate', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener('yt-navigate-finish', schedule);
    window.addEventListener('pagehide', stop, { once: true });
    observer = new MutationObserver(schedule);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  globalThis.__okulensSpaMonitor = { start, stop };
})();