/* OkuLens — kullanıcı isteğine dayalı, salt okunur e-posta DOM çıkarıcısı.
 * Adresler, alıcılar, başlıklar, buton metinleri ve ekler toplanmaz.
 * İstemcilerin özel DOM seçicileri değişebilir: sonuç "partial" işaretlenir.
 */
(() => {
  'use strict';
  const LIMIT = 200000;
  const MAX_MESSAGES = 30;
  const clean = s => String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  function visible(node, view) {
    if (!node || node.closest?.('[hidden],[aria-hidden="true"],[role="dialog"],[contenteditable="true"]')) return false;
    const style = view?.getComputedStyle?.(node);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    const rect = node.getBoundingClientRect?.();
    return !rect || (rect.width > 0 && rect.height > 0);
  }
  function getCandidates(doc, provider) {
    // Gmail .aiL genellikle .a3s'in kendisini veya kapsayıcısını içerir:
    // Önce .a3s, hiç yoksa .aiL seçilip iç içe kopyalar ayıklanır.
    const gmail = [...doc.querySelectorAll('.a3s')];
    if (provider === 'gmail') return gmail.length ? gmail : [...doc.querySelectorAll('.aiL')];
    // Outlook varyantları yalnızca açık ana ileti alanında aranır.
    const main = doc.querySelector('[role="main"]') || doc.querySelector('main');
    const root = main || doc;
    const selectors = [
      '[data-testid="message-body"]', '[data-testid="messageBody"]',
      '[aria-label="Message body"]', '[aria-label="İleti gövdesi"]',
      '[data-app-section="MessageBody"]', '.allowTextSelection', '[class^="rps_"]'
    ];
    for (const sel of selectors) {
      const found = [...root.querySelectorAll(sel)];
      if (found.length) return found;
    }
    return [];
  }
  function extract(doc = document, hostname = location.hostname, scope = 'current', view = globalThis) {
    const provider = /(^|\.)mail\.google\.com$/.test(hostname) ? 'gmail' : /(^|\.)outlook\.(live|office|office365)\.com$/.test(hostname) ? 'outlook' : null;
    const base = { text: '', messages: [], messageCount: 0, scope: scope === 'thread' ? 'thread' : 'current',
      scopeLabel: scope === 'thread' ? 'Görünür konuşma' : 'Son görünür ileti',
      extractionMethod: 'visible-email-dom', status: 'unavailable', warnings: [] };
    if (!provider) return { ...base, warnings: ['EMAIL_UNSUPPORTED_PROVIDER'] };
    const candidates = getCandidates(doc, provider).filter(el => visible(el, view));
    const filtered = candidates.filter((el, idx) => !candidates.some((other, j) => idx !== j && other.contains?.(el)));
    const seen = new Set();
    const messages = filtered.map(el => clean(el.innerText ?? el.textContent)).filter(body => {
      if (body.length < 5 || seen.has(body)) return false;
      seen.add(body); return true;
    }).slice(0, MAX_MESSAGES);
    if (!messages.length) return { ...base, warnings: ['EMAIL_BODY_UNAVAILABLE', 'EMAIL_OPEN_A_MESSAGE'] };
    const selected = base.scope === 'thread' ? messages : messages.slice(-1);
    const assembled = selected.join('\n\n');
    const truncated = assembled.length > LIMIT || filtered.length > MAX_MESSAGES;
    const warnings = ['EMAIL_VISIBLE_DOM_HEURISTIC'];
    if (base.scope === 'current' && messages.length > 1) warnings.push('EMAIL_LAST_VISIBLE_ASSUMED_CURRENT');
    if (truncated) warnings.push('EMAIL_TRUNCATED');
    return { ...base, text: assembled.slice(0, LIMIT), messageCount: selected.length,
      messages: selected.map((text, i) => ({ index: i + 1, characterCount: text.length })),
      status: 'partial', warnings };
  }
  globalThis.__okulensExtractEmail = extract;
})();