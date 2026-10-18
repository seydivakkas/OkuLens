(() => {
  if (globalThis.__okulensContentInstalled) return;
  globalThis.__okulensContentInstalled = true;
  let lastSelection = '';
  let bubble;
  let shadow;
  let disposeTimer;

  const clean = (s) => String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  const MAX_CHARS = 250000;
  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }
  function sourceKind() {
    const h = location.hostname;
    if (h === 'mail.google.com' || h.endsWith('.mail.google.com') || h === 'outlook.live.com' || h === 'outlook.office.com' || h === 'outlook.office365.com') return 'email';
    if (h === 'youtube.com' || h === 'www.youtube.com' || h === 'm.youtube.com') return 'youtube';
    return 'article';
  }
  function extractArticle() {
    if (typeof globalThis.__okulensExtractArticle !== 'function') return {
      text: '', status: 'unavailable', extractionMethod: 'none',
      warnings: ['ARTICLE_PARSER_NOT_LOADED: Makale çıkarma modülü yüklenemedi.']
    };
    return globalThis.__okulensExtractArticle(document);
  }
  function extractEmail(scope) {
    return typeof globalThis.__okulensExtractEmail === 'function'
      ? globalThis.__okulensExtractEmail(document, location.hostname, scope, window)
      : { text: '', status: 'unavailable', warnings: ['EMAIL_EXTRACTOR_NOT_LOADED'] };
  }
  function extractYouTube() {
    return typeof globalThis.__okulensExtractYouTube === 'function'
      ? globalThis.__okulensExtractYouTube(document, location.href, window)
      : { text: '', transcript: [], status: 'unavailable', warnings: ['YOUTUBE_EXTRACTOR_NOT_LOADED'] };
  }
  function extract(request = {}) {
    const selected = clean(String(getSelection() ?? '')) || (request.usePendingSelection ? lastSelection : '');
    const kind = sourceKind();
    const base = {
      schemaVersion: 1, sourceUrl: location.href, sourceTitle: document.title,
      language: (document.documentElement.lang || '').split('-')[0].toLowerCase(),
      capturedAt: new Date().toISOString(), warnings: [], status: 'ok'
    };
    if (selected.length > 2) return { ...base, sourceType: 'selection', extractionMethod: 'selection', text: selected.slice(0, MAX_CHARS) };
    if (kind === 'email') {
      const email = extractEmail(request.emailScope);
      return { ...base, ...email, sourceType: 'email' };
    }
    if (kind === 'youtube') {
      const video = extractYouTube();
      return { ...base, ...video, sourceType: 'youtube' };
    }
    const article = extractArticle();
    return {
      ...base, ...article, sourceType: 'article',
      sourceTitle: article.sourceTitle || base.sourceTitle,
      language: (article.language || base.language).split('-')[0].toLowerCase()
    };
  }

  globalThis.__okulensSpaMonitor?.start();

  function ensureBubble() {
    if (bubble) return;
    bubble = document.createElement('div');
    bubble.id = 'okulens-selection-bridge';
    bubble.style.cssText = 'all:initial;position:fixed;z-index:2147483647;display:none;pointer-events:auto;';
    shadow = bubble.attachShadow({ mode: 'closed' });
    shadow.innerHTML = `<style>
      :host{all:initial}button{font:600 12px system-ui,sans-serif;background:#182a46;color:white;border:1px solid #7fa8eb;border-radius:10px;padding:9px 12px;box-shadow:0 8px 24px #0004;cursor:pointer}button:focus-visible{outline:3px solid #8cc6ff}
    </style><button type="button" aria-label="Seçili metni OkuLens panelinde özetle">OkuLens · Özetle</button>`;
    shadow.querySelector('button').addEventListener('pointerdown', e => e.preventDefault());
    shadow.querySelector('button').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'okulens-open-selection' }).catch(() => {});
      hideBubble();
    });
    document.documentElement.appendChild(bubble);
  }
  function hideBubble() { if (bubble) bubble.style.display = 'none'; }
  function updateSelection() {
    clearTimeout(disposeTimer);
    disposeTimer = setTimeout(() => {
      let selection;
      try { selection = getSelection(); } catch { return hideBubble(); }
      const text = clean(String(selection ?? ''));
      if (text.length < 10 || !selection?.rangeCount) return hideBubble();
      lastSelection = text;
      ensureBubble();
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      bubble.style.left = `${Math.max(4, Math.min(innerWidth - 145, rect.right))}px`;
      bubble.style.top = `${Math.max(4, Math.min(innerHeight - 50, rect.bottom + 6))}px`;
      bubble.style.display = 'block';
    }, 80);
  }
  window.addEventListener('popstate', () => { lastSelection = ''; hideBubble(); });
  window.addEventListener('hashchange', () => { lastSelection = ''; hideBubble(); });
  window.addEventListener('yt-navigate-finish', () => { lastSelection = ''; hideBubble(); });
  document.addEventListener('mouseup', updateSelection, { passive: true });
  document.addEventListener('keyup', e => { if (e.key === 'Escape') hideBubble(); else updateSelection(); });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === 'OKULENS_EXTRACT') {
      const result = extract({ emailScope: message.emailScope, usePendingSelection: Boolean(message.usePendingSelection) });
      lastSelection = '';
      reply({ ok: true, document: result });
      return;
    }
    if (message?.type === 'OKULENS_SEEK_VIDEO') {
      const video = document.querySelector('video');
      const ms = Number(message.startMs);
      const currentVideoId = typeof globalThis.__okulensExtractYouTube === 'function'
        ? new URLSearchParams(location.search).get('v') || location.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/)?.[1]
        : null;
      if (message.videoId && currentVideoId !== message.videoId) {
        reply({ ok: false, error: 'VIDEO_CHANGED' });
      } else if (video && Number.isFinite(ms) && ms >= 0) {
        video.currentTime = ms / 1000; reply({ ok: true });
      } else reply({ ok: false, error: 'VIDEO_UNAVAILABLE' });
    }
  });
})();
