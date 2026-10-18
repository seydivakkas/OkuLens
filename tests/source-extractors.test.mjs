import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function load(path) {
  const context = { URL, URLSearchParams };
  runInNewContext(readFileSync(new URL(path, import.meta.url), 'utf8'), context);
  return context;
}
function element(text) {
  return {
    innerText: text, textContent: text, closest: () => null, contains: el => el === this,
    getBoundingClientRect: () => ({ width: 120, height: 30 }),
    querySelector: () => null
  };
}
const view = { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) };
function gmailDoc(texts) {
  const nodes = texts.map(element);
  return { querySelectorAll: selector => selector === '.a3s' ? nodes : [] };
}
function youtubeSegment(stamp, body) {
  return {
    closest: () => null, getBoundingClientRect: () => ({ width: 200, height: 20 }),
    querySelector: selector => {
      if (selector.includes('segment-timestamp')) return stamp === null ? null : { textContent: stamp };
      if (selector.includes('segment-text')) return body === null ? null : { textContent: body };
      return null;
    }
  };
}
function youtubeDoc(segments) {
  return { querySelectorAll: selector => selector.includes('ytd-transcript-segment-renderer') ? segments : [] };
}
const yt = load('../content/youtube-extractor.js');
const email = load('../content/email-extractor.js');

test('Gmail varsayılan son görünür mesajı seçer; alıcı adresi toplamaz', () => {
  const r = email.__okulensExtractEmail(gmailDoc(['İlk ileti', 'Son ileti']), 'mail.google.com');
  assert.equal(r.text, 'Son ileti');
  assert.equal(r.messageCount, 1);
  assert.ok(r.warnings.includes('EMAIL_LAST_VISIBLE_ASSUMED_CURRENT'));
  assert.ok(!JSON.stringify(r).includes('sender'));
});
test('Gmail konuşma seçimi sırayı korur, yinelenen mesajı ayıklar', () => {
  const r = email.__okulensExtractEmail(gmailDoc(['Birinci yazışma', 'İkinci yazışma', 'İkinci yazışma']), 'mail.google.com', 'thread');
  assert.equal(r.text, 'Birinci yazışma\n\nİkinci yazışma');
  assert.equal(r.messageCount, 2);
});
test('Boş Gmail iletisinde açık hata döner', () => {
  const r = email.__okulensExtractEmail(gmailDoc([]), 'mail.google.com');
  assert.equal(r.status, 'unavailable');
  assert.equal(r.text, '');
  assert.ok(r.warnings.includes('EMAIL_BODY_UNAVAILABLE'));
});
test('Outlook gövdesini yalnızca ana alandan okur', () => {
  const node = element('Görünen Outlook ileti içeriği');
  const main = { querySelectorAll: sel => sel === '[data-testid="message-body"]' ? [node] : [] };
  const doc = { querySelector: sel => sel === '[role="main"]' ? main : null };
  const r = email.__okulensExtractEmail(doc, 'outlook.live.com');
  assert.equal(r.text, 'Görünen Outlook ileti içeriği');
});
test('Desteklenmeyen e-posta servisi yanlış kapsam üretmez', () => {
  const r = email.__okulensExtractEmail(gmailDoc(['Korumalı metin']), 'mail.example.com');
  assert.equal(r.status, 'unavailable');
  assert.ok(r.warnings.includes('EMAIL_UNSUPPORTED_PROVIDER'));
});
test('Zaman damgası HH:MM:SS ve MM:SS doğrulanır', () => {
  assert.equal(yt.__okulensParseTimestamp('01:23'), 83000);
  assert.equal(yt.__okulensParseTimestamp('1:02:03'), 3723000);
  assert.equal(yt.__okulensParseTimestamp('1:60'), null);
  assert.equal(yt.__okulensParseTimestamp('03:xx'), null);
});
test('YouTube timestamp ve metin bire bir eşleştirilir', () => {
  const r = yt.__okulensExtractYouTube(youtubeDoc([
    youtubeSegment('0:05', 'Birinci bölüm'),
    youtubeSegment('1:20', 'İkinci bölüm')
  ]), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', view);
  assert.equal(r.status, 'partial');
  assert.equal(r.transcript.length, 2);
  assert.equal(r.transcript[0].startMs, 5000);
  assert.equal(r.transcript[1].startMs, 80000);
  assert.equal(r.text, 'Birinci bölüm İkinci bölüm');
});
test('YouTube Shorts video kimliği çıkarılır', () => {
  const r = yt.__okulensExtractYouTube(youtubeDoc([youtubeSegment('0:01', 'Deneme')]),
    'https://youtube.com/shorts/dQw4w9WgXcQ', view);
  assert.equal(r.videoId, 'dQw4w9WgXcQ');
});
test('Bozuk damga atlanır; sahte saniye üretilmez', () => {
  const r = yt.__okulensExtractYouTube(youtubeDoc([
    youtubeSegment('yaklaşık 3:20', 'Yanlış damga'),
    youtubeSegment('0:11', 'Doğru damga')
  ]), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', view);
  assert.equal(r.transcript.length, 1);
  assert.equal(r.transcript[0].startMs, 11000);
  assert.ok(r.warnings.includes('TRANSCRIPT_SKIPPED_MALFORMED_SEGMENTS'));
});
test('Transkriptsiz video için görünür kullanılabilir hata', () => {
  const r = yt.__okulensExtractYouTube(youtubeDoc([]), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', view);
  assert.equal(r.text, '');
  assert.equal(r.status, 'unavailable');
  assert.ok(r.warnings.includes('TRANSCRIPT_PANEL_CLOSED_OR_CAPTIONS_UNAVAILABLE'));
});
