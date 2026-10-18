/* OkuLens makale çıkarıcısı — yalnızca kullanıcı eylemiyle enjekte edilir.
 * Mozilla Readability (vendor/readability/Readability.js) aynı isolated world'de
 * önceden yüklenmiş olmalıdır. Kaynak DOM üzerinde işlem yapılmaz.
 */
(() => {
  'use strict';
  const MAX_CHARS = 250000;
  const MIN_WORDS = 30;
  const MIN_CHARS = 160;
  const BLOCK = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'LI', 'MAIN', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TD', 'TH', 'TR', 'UL']);
  const REMOVE = 'script,style,template,noscript,nav,footer,aside,form,button,dialog,iframe,svg,[aria-hidden="true"],[hidden],.cookie-banner,.cookie-consent,.advertisement,[role="navigation"]';
  const tidy = text => String(text ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[ \t\f\v]+/g, ' ').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const words = text => (text.match(/[\p{L}\p{N}]+/gu) || []).length;
  const isUseful = text => text.length >= MIN_CHARS && words(text) >= MIN_WORDS;
  function toPlainText(node) {
    const out = [];
    function visit(current) {
      if (current.nodeType === 3) { out.push(current.nodeValue || ''); return; }
      if (current.nodeType !== 1 && current.nodeType !== 9 && current.nodeType !== 11) return;
      const tag = current.nodeType === 1 ? current.tagName : '';
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return;
      if (tag === 'BR' || tag === 'HR') { out.push('\n'); return; }
      const block = BLOCK.has(tag);
      if (block) out.push('\n');
      for (const child of current.childNodes) visit(child);
      if (block) out.push('\n');
    }
    visit(node);
    return tidy(out.join('').replace(/([^\n])\n([^\n])/g, '$1\n$2'));
  }
  function headingsFrom(root) {
    return Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')).slice(0, 80)
      .map(el => ({ level: Number(el.tagName.slice(1)), text: tidy(el.textContent).slice(0, 300) }))
      .filter(h => h.text);
  }
  function fallback(doc) {
    const els = Array.from(doc.querySelectorAll('article,main,[role="main"]'));
    const candidates = els.map(el => {
      const text = tidy(el.textContent);
      return { el, textLength: text.length, priority: el.tagName === 'ARTICLE' ? 2 : 1 };
    }).filter(c => c.textLength >= MIN_CHARS).sort((a, b) => b.priority - a.priority || b.textLength - a.textLength);
    const nodes = candidates.length ? candidates.map(c => c.el) : [doc.body].filter(Boolean);
    for (const el of nodes) {
      if (el.querySelectorAll('*').length > 30000) continue;
      const clone = el.cloneNode(true);
      clone.querySelectorAll(REMOVE).forEach(child => child.remove());
      const text = toPlainText(clone);
      if (isUseful(text)) return { text, headings: headingsFrom(clone) };
    }
    return null;
  }
  function extract(doc = document, Parser = globalThis.Readability) {
    const warnings = [];
    const base = { text: '', headings: [], byline: null, publishedTime: null, siteName: null, extractionMethod: 'readability', status: 'unavailable', warnings };
    if (!doc?.documentElement || !doc.body) return { ...base, warnings: ['ARTICLE_DOCUMENT_UNAVAILABLE'] };
    if (typeof Parser === 'function') {
      try {
        if (doc.getElementsByTagName('*').length > 35000) {
          warnings.push('READABILITY_SKIPPED_LARGE_DOM');
        } else {
          const clone = doc.cloneNode(true);
          const parsed = new Parser(clone, { maxElemsToParse: 35000, serializer: el => el, disableJSONLD: false }).parse();
          const root = parsed?.content;
          const text = root?.nodeType ? toPlainText(root) : tidy(parsed?.textContent);
          if (isUseful(text)) {
            return {
              ...base, text: text.slice(0, MAX_CHARS),
              headings: root?.querySelectorAll ? headingsFrom(root) : [],
              sourceTitle: tidy(parsed.title) || doc.title,
              language: tidy(parsed.lang) || doc.documentElement.lang || '',
              byline: tidy(parsed.byline) || null,
              siteName: tidy(parsed.siteName) || null,
              publishedTime: tidy(parsed.publishedTime) || null,
              status: text.length > MAX_CHARS ? 'partial' : 'ok',
              warnings: text.length > MAX_CHARS ? ['ARTICLE_TRUNCATED'] : []
            };
          }
          warnings.push('READABILITY_EMPTY_OR_SHORT');
        }
      } catch (error) {
        warnings.push('READABILITY_FAILED');
      }
    } else warnings.push('READABILITY_NOT_LOADED');
    const reduced = fallback(doc);
    if (!reduced) return { ...base, extractionMethod: 'none', warnings: [...warnings, 'ARTICLE_UNREADABLE'] };
    return {
      ...base, text: reduced.text.slice(0, MAX_CHARS), headings: reduced.headings,
      extractionMethod: 'semantic-dom-fallback', status: 'partial',
      warnings: [...warnings, 'ARTICLE_FALLBACK_USED', ...(reduced.text.length > MAX_CHARS ? ['ARTICLE_TRUNCATED'] : [])]
    };
  }
  globalThis.__okulensExtractArticle = extract;
})();