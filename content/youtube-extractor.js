/* OkuLens — sadece kullanıcıya gösterilen YouTube transkript panelinin DOM'u.
 * Dahili Innertube/player imzalarını çözmez, korsan caption isteği yapmaz.
 */
(() => {
  'use strict';
  const MAX_SEGMENTS = 5000;
  const MAX_CHARS = 250000;
  const clean = s => String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  function parseStamp(raw) {
    const normalized = String(raw ?? '').trim().replace(/\s/g, '');
    if (!/^\d{1,4}:\d{2}(?::\d{2})?$/.test(normalized)) return null;
    const parts = normalized.split(':').map(Number);
    if (parts.length === 2 && parts[1] >= 60) return null;
    if (parts.length === 3 && (parts[1] >= 60 || parts[2] >= 60)) return null;
    let total = 0;
    for (const n of parts) total = total * 60 + n;
    return total * 1000;
  }
  function videoIdFromUrl(href) {
    try {
      const url = new URL(href);
      const host = url.hostname.toLowerCase();
      if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) return null;
      let id = url.pathname.startsWith('/shorts/') ? url.pathname.split('/')[2] : url.searchParams.get('v');
      return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
  }
  function visible(node, view) {
    if (node.closest?.('[hidden],[aria-hidden="true"]')) return false;
    const style = view?.getComputedStyle?.(node);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    const r = node.getBoundingClientRect?.();
    return !r || (r.width > 0 && r.height > 0);
  }
  function extract(doc = document, url = location.href, view = globalThis) {
    const videoId = videoIdFromUrl(url);
    const base = { text: '', transcript: [], videoId, extractionMethod: 'visible-transcript-dom',
      status: 'unavailable', warnings: [], segmentCount: 0 };
    if (!videoId) return { ...base, warnings: ['YOUTUBE_VIDEO_ID_MISSING'] };
    const all = [...doc.querySelectorAll('ytd-transcript-segment-renderer,ytd-transcript-segment-view-model')].filter(node => visible(node, view));
    const segments = [], seen = new Set();
    let malformed = 0;
    for (const el of all) {
      const stampNode = el.querySelector('.segment-timestamp, [class*="segment-timestamp"], [class*="timestamp-text"]');
      const textNode = el.querySelector('.segment-text, [class*="segment-text"], [class*="segment-content"]');
      const startMs = parseStamp(stampNode?.textContent);
      const text = clean(textNode?.textContent);
      if (startMs === null || !text) { malformed++; continue; }
      const signature = startMs + ':' + text;
      if (seen.has(signature)) continue;
      seen.add(signature);
      segments.push({ startMs, text });
      if (segments.length >= MAX_SEGMENTS) break;
    }
    if (!segments.length) return { ...base, warnings: [
      'TRANSCRIPT_UNAVAILABLE',
      all.length ? 'TRANSCRIPT_TIMESTAMPS_OR_TEXT_UNREADABLE' : 'TRANSCRIPT_PANEL_CLOSED_OR_CAPTIONS_UNAVAILABLE'
    ] };
    // Doğrulanmış startMs korunur; sırayı kaynak DOM belirler, sentetik saniye üretilmez.
    const included = [];
    let len = 0;
    for (const seg of segments) {
      if (len + seg.text.length + 1 > MAX_CHARS) break;
      included.push(seg);
      len += seg.text.length + 1;
    }
    if (!included.length) return { ...base, warnings: ['TRANSCRIPT_TOO_LARGE'] };
    const warnings = ['TRANSCRIPT_VISIBLE_PANEL_ONLY'];
    if (malformed) warnings.push('TRANSCRIPT_SKIPPED_MALFORMED_SEGMENTS');
    if (included.length < segments.length || all.length > MAX_SEGMENTS) warnings.push('TRANSCRIPT_TRUNCATED');
    return { ...base, transcript: included, text: included.map(seg => seg.text).join(' '),
      segmentCount: included.length, status: 'partial', warnings };
  }
  globalThis.__okulensExtractYouTube = extract;
  globalThis.__okulensParseTimestamp = parseStamp;
})();