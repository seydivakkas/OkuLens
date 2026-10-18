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
  function extractEmail() {
    const selectors = location.hostname.includes('google')
      ? '.a3s, .aiL'
      : '[data-testid="message-body"], [role="document"], .rps_0';
    const nodes = [...document.querySelectorAll(selectors)].filter(isVisible);
    const seen = new Set();
    return [...nodes].map(el => clean(el.innerText)).filter(t => {
      if (!t || seen.has(t)) return false;
      seen.add(t); return true;
    }).join('\n\n').slice(0, MAX_CHARS);
  }
  function parseStamp(stamp) {
    const parts = stamp.trim().split(':').map(Number);
    if (!parts.length || parts.some(n=>!Number.isFinite(n))) return null;
    let seconds = 0;
    for (const n of parts) seconds = 60 * seconds + n;
    return Math.floor(seconds * 1000);
  }
  function extractYouTube() {
    const selectors = 'ytd-transcript-segment-renderer, ytd-transcript-segment-view-model';
    const transcript = [...document.querySelectorAll(selectors)].filter(isVisible).map(el => {
      const stamp = el.querySelector('.segment-timestamp, .ytwTranscriptSegmentViewModelHost .yt-core-attributed-string')?.textContent
        || el.querySelector('[class*=timestamp]')?.textContent || '';
      const text = clean(el.querySelector('.segment-text, [class*=segment-text], .ytwTranscriptSegmentViewModelHost')?.textContent || el.textContent);
      const startMs = parseStamp(stamp);
      return (startMs === null || !text) ? null : { startMs, text };
    }).filter(Boolean);
    return { transcript, text: transcript.map(x => x.text).join(' ').slice(0, MAX_CHARS) };
  }
  function extract() {
    const selected = clean(String(getSelection() ?? '')) || lastSelection;
    const kind = sourceKind();
    const base = {
      schemaVersion: 1, sourceUrl: location.href, sourceTitle: document.title,
      language: (document.documentElement.lang || '').split('-')[0].toLowerCase(),
      capturedAt: new Date().toISOString(), warnings: [], status: 'ok'
    };
    if (selected.length > 2) return { ...base, sourceType: 'selection', extractionMethod: 'selection', text: selected.slice(0, MAX_CHARS) };
    if (kind === 'email') {
      const text = extractEmail();
      return { ...base, sourceType: 'email', extractionMethod: 'visible-email-dom', text,
        status: text ? 'partial' : 'unavailable', warnings: ['E-posta DOM çıkarımı deneyseldir; mesaj kapsamını doğrulayın.'] };
    }
    if (kind === 'youtube') {
      const { transcript, text } = extractYouTube();
      return { ...base, sourceType: 'youtube', extractionMethod: 'visible-transcript-dom', text, transcript,
        status: text ? 'partial' : 'unavailable', warnings: text
          ? ['Yalnızca açık transkript panelinde görünür zaman kodları yakalandı.']
          : ['TRANSCRIPT_UNAVAILABLE: Videonun transkript panelini açıp yeniden deneyin.'] };
    }
    const article = extractArticle();
    return {
      ...base, ...article, sourceType: 'article',
      sourceTitle: article.sourceTitle || base.sourceTitle,
      language: (article.language || base.language).split('-')[0].toLowerCase()
    };
  }

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
  document.addEventListener('mouseup', updateSelection, { passive: true });
  document.addEventListener('keyup', e => { if (e.key === 'Escape') hideBubble(); else updateSelection(); });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === 'OKULENS_EXTRACT') { reply({ ok: true, document: extract() }); return; }
    if (message?.type === 'OKULENS_SEEK_VIDEO') {
      const video = document.querySelector('video');
      const ms = Number(message.startMs);
      if (video && Number.isFinite(ms) && ms >= 0) { video.currentTime = ms / 1000; reply({ ok: true }); }
      else reply({ ok: false, error: 'VIDEO_UNAVAILABLE' });
    }
  });
})();
