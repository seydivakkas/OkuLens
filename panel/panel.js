import { summarizeExtractive, wordCount } from '../shared/summarize.mjs';
import { tryNativeSummary } from '../shared/native-ai.mjs';
import { analyzeText } from '../shared/hybrid-nlp.mjs';

const $ = id => document.getElementById(id);
const state = {
  tabId: null, doc: null, result: null, targetWords: 100, difficulty: 'medium',
  jobId: 0, abort: null, engineMode: 'auto'
};
const TYPE_NAMES = { selection: 'Seçili metin', article: 'Makale', email: 'E-posta (görünür DOM)', youtube: 'YouTube (transkript paneli)' };
const status = text => { $('status').textContent = text; };
const setBusy = busy => {
  $('summarize').disabled = busy;
  $('cancel').disabled = !busy;
  $('capture').disabled = busy;
};
function errorMessage(e) {
  const msg = String(e?.message || e || 'Bilinmeyen hata');
  if (/Cannot access|Cannot inject|permissions|Missing host permission|No tab with id/i.test(msg))
    return 'Bu sekmede içerik erişimi yok. Sayfayı açıp araç çubuğundaki OkuLens simgesine basın. Tarayıcı iç sayfalarında çalışmaz.';
  return msg;
}
function showDocument(doc) {
  state.doc = doc;
  if (!doc) {
    $('sourceTitle').textContent = 'Kaynak bekleniyor';
    $('sourceDetail').textContent = 'Özetlemek için desteklenen bir sekmede uzantıyı açın.';
    $('timeSection').hidden = true;
    $('emailScopeField').hidden = true;
    return;
  }
  $('sourceTitle').textContent = doc.sourceTitle || '(Başlıksız kaynak)';
  $('sourceKind').textContent = (TYPE_NAMES[doc.sourceType] || doc.sourceType).toUpperCase();
  $('emailScopeField').hidden = doc.sourceType !== 'email';
  const scopeInfo = doc.sourceType === 'email' ? ' • ' + (doc.scopeLabel || 'Görünür ileti') + ' (' + (doc.messageCount || 0) + ' ileti)' : '';
  $('sourceDetail').textContent = `${TYPE_NAMES[doc.sourceType] || doc.sourceType} • ${(doc.text || '').length.toLocaleString('tr-TR')} karakter${scopeInfo}`;
  const stamps = doc.transcript || [];
  $('timeSection').hidden = stamps.length === 0;
  $('timestamps').replaceChildren();
  for (const segment of stamps.slice(0, 250)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timeentry';
    const time = document.createElement('time');
    time.textContent = new Date(Math.max(0, segment.startMs)).toISOString().slice(11, 19).replace(/^00:/, '');
    const text = document.createElement('span');
    text.textContent = segment.text.slice(0, 180);
    button.append(time, text);
    button.addEventListener('click', async () => {
      try {
        const response = await chrome.tabs.sendMessage(state.tabId, {
          type: 'OKULENS_SEEK_VIDEO', startMs: segment.startMs, videoId: doc.videoId
        });
        if (!response?.ok) status(`Videoya atlanamadı: ${response?.error || 'VIDEO_UNAVAILABLE'}`);
      } catch (e) { status(`Videoya atlanamadı: ${errorMessage(e)}`); }
    });
    $('timestamps').append(button);
  }
}
function showResult(result) {
  state.result = result;
  $('summary').textContent = result?.text || 'Henüz özet bulunmuyor.';
  $('engine').textContent = result?.engine === 'builtin' ? 'Chrome yerleşik AI' : result?.engine === 'hybrid-extractive' ? 'TF-IDF + TextRank' : result?.engine === 'extractive' ? 'Yerel çıkarımsal' : 'Motor bekleniyor';
  renderDiagnostics(result);
  $('meta').textContent = result ? `${result.actualWords} kelime • hedef ${result.targetWords} • ${new Date(result.createdAt).toLocaleString('tr-TR')}` : '';
  $('warn').textContent = (result?.warnings || []).join('\n');
  $('copy').disabled = !result?.text;
  $('export').disabled = !result?.text;
}
function renderDiagnostics(result) {
  const d = result?.diagnostics || null;
  $('telemetry').hidden = !d;
  if (!d) return;
  $('stat-source').textContent = `${d.sourceWords} kelime`;
  $('stat-compress').textContent = `${d.compression}%`;
  $('stat-read').textContent = `${d.readingSecondsSaved} sn`;
  $('stat-ms').textContent = `${d.processingMs} ms`;
  $('keywords').replaceChildren();
  for (const k of d.keywords || []) {
    const chip=document.createElement('span');chip.className='tag';chip.textContent=`${k.word} (${k.frequency})`;$('keywords').append(chip);
  }
  $('sentenceScores').replaceChildren();
  for(const item of d.topSentences || []) {
    const wrap=document.createElement('div');wrap.className='score';
    const head=document.createElement('small');head.textContent=`#${item.id} · TextRank ${item.textRank.toFixed(2)} · TF-IDF ${item.tfidf.toFixed(2)} · Hibrit ${item.combined.toFixed(2)}`;
    const body=document.createElement('p');body.textContent=item.text;wrap.append(head,body);$('sentenceScores').append(wrap);
  }
}
async function currentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}
async function changeTab(tabId) {
  if (!Number.isInteger(tabId)) return;
  ++state.jobId;
  state.abort?.abort();
  state.abort = null;
  setBusy(false);
  state.tabId = tabId;
  showDocument(null);
  showResult(null);
  const stored = await chrome.storage.session.get(`summary:tab:${tabId}`);
  const cached = stored[`summary:tab:${tabId}`];
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  // URL değiştiyse başka belgenin eski özetini göstermeyiz.
  if (cached?.sourceUrl && tab?.url && cached.sourceUrl !== tab.url) {
    await chrome.storage.session.remove(`summary:tab:${tabId}`);
  }
  if (cached && (!tab?.url || cached.sourceUrl === tab.url) && state.tabId === tabId) {
    showResult(cached.result);
    $('sourceTitle').textContent = cached.title || '(Önceki içerik)';
    $('sourceDetail').textContent = 'Bu sekmenin geçici özeti geri yüklendi. Yeni kaynak almak için Kaynağı al seçin.';
  }
  status('Bu sekmeye ait kaynak gerektiğinde yeniden alınır.');
}
async function capture() {
  const tab = await currentTab();
  if (!tab?.id) throw new Error('NO_ACTIVE_TAB');
  if (tab.id !== state.tabId) await changeTab(tab.id);
  // activeTab yalnızca uzantı simgesi / bağlam menüsü gibi uygun kullanıcı jestlerinden alınır.
  // Readability yalnızca makale sayfalarında ve kullanıcı kaynak istediğinde yüklenir.
  // E-posta / YouTube: ağır kütüphane yüklenmez ve mevcut çıkarıcılar korunur.
  const host = (() => { try { return new URL(tab.url).hostname.toLowerCase(); } catch { return ''; } })();
  const isEmail = host === 'mail.google.com' || ['outlook.live.com', 'outlook.office.com', 'outlook.office365.com'].includes(host);
  const isYouTube = host === 'youtube.com' || host.endsWith('.youtube.com');
  const files = isEmail
    ? ['content/email-extractor.js', 'content/spa-monitor.js', 'content/injected.js']
    : isYouTube
      ? ['content/youtube-extractor.js', 'content/spa-monitor.js', 'content/injected.js']
      : ['vendor/readability/Readability.js', 'content/article-extractor.js', 'content/injected.js'];
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
  const reply = await chrome.tabs.sendMessage(tab.id, {
    type: 'OKULENS_EXTRACT', emailScope: $('emailScope').value
  });
  if (reply?.document?.sourceUrl && tab.url && reply.document.sourceUrl !== tab.url) {
    showDocument(null);
    throw new Error('SOURCE_CHANGED_DURING_CAPTURE: Kaynak sekme değişti, yeniden deneyin.');
  }
  if (!reply?.ok || !reply.document?.text?.trim()) {
    showDocument(reply?.document || null);
    throw new Error(reply?.document?.warnings?.[0] || 'SOURCE_UNAVAILABLE: Okunabilir metin bulunamadı.');
  }
  showResult(null);
  showDocument(reply.document);
  status(`Kaynak alındı: ${wordCount(reply.document.text)} kelime. Çıkarım yöntemi: ${reply.document.extractionMethod}`);
}
async function summarize() {
  const id = ++state.jobId;
  state.abort?.abort();
  state.abort = new AbortController();
  setBusy(true);
  try {
    if (!state.doc?.text?.trim()) await capture();
    const doc = state.doc;
    if (!doc?.text) throw new Error('SOURCE_UNAVAILABLE');
    status('Yerel özet hazırlanıyor…');
    const warnings = [...(doc.warnings || [])];
    let result = null;
    if (state.engineMode === 'auto' && state.difficulty === 'medium') {
      try {
        result = await tryNativeSummary(doc.text, { targetWords: state.targetWords, language: doc.language, signal: state.abort.signal });
      } catch (e) {
        if (state.abort.signal.aborted) return;
        warnings.push(`Yerleşik model kullanılamadı: ${errorMessage(e)}. Çıkarımsal metoda dönüldü.`);
      }
    }
    if (id !== state.jobId || state.abort?.signal.aborted) return;
    const diagnostics = analyzeText(doc.text, { targetWords: state.targetWords, title: doc.sourceTitle });
    if (!result) result = diagnostics;
    warnings.push(...diagnostics.warnings);
    const final = {
      ...result, targetWords: state.targetWords, actualWords: wordCount(result.text),
      difficulty: state.difficulty, createdAt: new Date().toISOString(), warnings, diagnostics
    };
    if (id !== state.jobId) return;
    showResult(final);
    await chrome.storage.session.set({ [`summary:tab:${state.tabId}`]: {
      title: doc.sourceTitle, result: final, sourceUrl: doc.sourceUrl
    } });
    if (id === state.jobId) status('Özet tamamlandı. Üretim motoru ve sınırları sonuçta gösteriliyor.');
  } catch (e) {
    if (id === state.jobId) status(`Özetlenemedi: ${errorMessage(e)}`);
  } finally {
    if (id === state.jobId) setBusy(false);
  }
}
function saveMarkdown() {
  if (!state.result) return;
  const doc = state.doc;
  const title = doc?.sourceTitle || $('sourceTitle').textContent;
  const url = doc?.sourceUrl || '(Kaynak sekmede artık açık değil)';
  const text = `# ${title}\n\nKaynak: ${url}\nHedef: ${state.result.targetWords} kelime\nMotor: ${state.result.engine}\n\n${state.result.text}\n\n${(state.result.warnings || []).join('\n')}\n`;
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = href; a.download = 'okulens-ozet.md'; a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

for (const btn of document.querySelectorAll('[data-length]')) {
  btn.addEventListener('click', async () => {
    state.targetWords = Number(btn.dataset.length);
    for (const b of document.querySelectorAll('[data-length]')) b.classList.toggle('selected', b === btn);
    $('wordLabel').textContent = `${state.targetWords} kelime`;
    await chrome.storage.local.set({ 'okulens:targetWords': state.targetWords });
  });
}
for(const button of document.querySelectorAll('[data-level]'))button.addEventListener('click', async()=>{
  state.difficulty=button.dataset.level;
  for(const other of document.querySelectorAll('[data-level]'))other.classList.toggle('selected', other===button);
  $('levelLabel').textContent={easy:'Kolay',medium:'Orta',hard:'Zor'}[state.difficulty];
  await chrome.storage.local.set({'okulens:difficulty':state.difficulty});
});
$('engineMode').addEventListener('change',e=>{state.engineMode=e.target.value;});
$('emailScope').addEventListener('change', () => {
  state.doc = null;
  showResult(null);
  status('E-posta kapsamı değişti. Kaynağı yeniden alarak kapsamı doğrulayın.');
});
$('inspect').addEventListener('click',()=>{$('inspection').hidden=!$('inspection').hidden});
$('studio').addEventListener('click',()=>chrome.tabs.create({url:chrome.runtime.getURL('studio/index.html')}));
$('capture').addEventListener('click', () => capture().catch(e => status(`Kaynak alınamadı: ${errorMessage(e)}`)));
$('summarize').addEventListener('click', summarize);
$('cancel').addEventListener('click', () => {
  ++state.jobId; state.abort?.abort(); setBusy(false); status('İşlem iptal edildi.');
});
$('settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('copy').addEventListener('click', () => navigator.clipboard.writeText(state.result?.text || '')
  .then(()=>status('Özet panoya kopyalandı.')).catch(e=>status(`Kopyalanamadı: ${errorMessage(e)}`)));
$('export').addEventListener('click', saveMarkdown);
$('clear').addEventListener('click', async () => {
  ++state.jobId; state.abort?.abort(); setBusy(false); showResult(null);
  if (state.tabId !== null) await chrome.storage.session.remove(`summary:tab:${state.tabId}`);
  status('Özet geçici depodan temizlendi.');
});
chrome.tabs.onActivated.addListener(({ tabId }) => changeTab(tabId).catch(e => status(errorMessage(e))));
function invalidateSource(tabId, reason) {
  if (tabId !== state.tabId) return;
  ++state.jobId;
  state.abort?.abort();
  state.doc = null;
  showDocument(null);
  showResult(null);
  setBusy(false);
  chrome.storage.session.remove(`summary:tab:${tabId}`).catch(console.warn);
  status(reason);
}
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'OKULENS_SOURCE_CHANGED' || sender.tab?.id !== state.tabId) return;
  invalidateSource(sender.tab.id, 'Kaynak veya görünür ileti değişti. Yeni içerik için Kaynağı al seçin.');
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === state.tabId && (changeInfo.status === 'loading' || typeof changeInfo.url === 'string')) {
    invalidateSource(tabId, 'Sayfa veya SPA adresi değişti. Yeni içerik için Kaynağı al seçin.');
  }
});
const prefs = await chrome.storage.local.get(['okulens:targetWords', 'okulens:difficulty']);
state.targetWords = [10,100,1000].includes(prefs['okulens:targetWords']) ? prefs['okulens:targetWords'] : 100;
state.difficulty = ['easy','medium','hard'].includes(prefs['okulens:difficulty']) ? prefs['okulens:difficulty'] : 'medium';
for(const b of document.querySelectorAll('[data-level]'))b.classList.toggle('selected',b.dataset.level===state.difficulty);
$('levelLabel').textContent={easy:'Kolay',medium:'Orta',hard:'Zor'}[state.difficulty];
$('wordLabel').textContent=`${state.targetWords} kelime`;
for (const btn of document.querySelectorAll('[data-length]')) btn.classList.toggle('selected', Number(btn.dataset.length) === state.targetWords);
const tab = await currentTab();
if (tab?.id) {
  await changeTab(tab.id);
  status('Kaynak hazır. Gizlilik için içeriği yalnızca Kaynağı al veya Özetle komutuyla çıkaracağız.');
}
