const TR_STOPWORDS = new Set(`ve veya ile bir bu şu o çok daha için gibi de da ki ama fakat ancak ise olan olarak sonra önce kadar her hem en ne ya mı mi mu mü biz siz onlar onun bunu nasıl neden hangi çünkü ayrıca yani burada yine aynı arasında tarafından üzere var yok değil`.split(' '));
const EN_STOPWORDS = new Set(`the a an and or in on of at to for from with as is are was were be been being by this that it its they their you your we our but not have has had do does did more most which who when why how`.split(' '));

export function wordTokens(text) {
  return String(text ?? '').match(/\d+(?:[.,]\d+)*(?:['’\-][\p{L}\p{N}]+)*|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? [];
}
export function wordCount(text) { return wordTokens(text).length; }
export function normalizeText(text) {
  return String(text ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
/** Metnin her karakterini sırayla kapsar; cümle sonu dışında
 * nokta içeren 1.800.000, 4.1, 31.12.2026 gibi değerleri kaybetmez.
 * Kaynakta olmayan sözcük veya noktalama eklenmez.
 */
export function splitSentences(text) {
  const clean = normalizeText(text);
  if (!clean) return [];
  const sentences = [];
  const abbreviation = /(?:^|\s)(?:Dr|Prof|Doç|Av|Sn|Md|No|vb|vs|örn|bkz|T\.C|A\.Ş)\.$/iu;
  let start = 0;
  const delimiters = /[.!?]+(?=\s|$)|\n+/gu;
  for (const match of clean.matchAll(delimiters)) {
    const delimiter = match[0];
    const end = match.index + delimiter.length;
    if (delimiter[0] !== '\n') {
      const before = clean.slice(start,end).trim();
      // Bölüm başlıklarındaki '1. GİRİŞ' numarası cümle bitişi değildir.
      if (/^\d{1,3}\.$/u.test(before) || (delimiter==='.' && abbreviation.test(before))) continue;
    }
    const sentence = clean.slice(start,end).trim();
    if (sentence) sentences.push(sentence);
    start = end;
    while(start<clean.length && /\s/u.test(clean[start]))start++;
  }
  const tail = clean.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}
function tokenizeNormalized(sentence) {
  return wordTokens(sentence).map(s => s.toLocaleLowerCase('tr-TR'));
}
export function summarizeExtractive(text, targetWords = 100) {
  const clean = normalizeText(text);
  const budget = [10, 100, 1000].includes(Number(targetWords)) ? Number(targetWords) : 100;
  const sentences = splitSentences(clean);
  if (sentences.length === 0) return { text: '', actualWords: 0, engine: 'extractive', truncated: false };
  const sourceWords = wordCount(clean);
  if (sourceWords <= budget) return { text: clean, actualWords: sourceWords, engine: 'extractive', truncated: false };

  const freq = new Map();
  sentences.forEach((sentence) => {
    for (const token of tokenizeNormalized(sentence)) {
      if (token.length < 3 || TR_STOPWORDS.has(token) || EN_STOPWORDS.has(token)) continue;
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  });
  const weights = sentences.map((sentence, idx) => {
    const terms = tokenizeNormalized(sentence).filter(t => freq.has(t));
    const raw = terms.reduce((sum, t) => sum + (freq.get(t) ?? 0), 0);
    return { index: idx, words: wordCount(sentence), score: raw / Math.max(4, terms.length) + (idx === 0 ? 1.5 : 0) };
  });
  const selected = [];
  let used = 0;
  for (const item of [...weights].sort((a, b) => b.score - a.score || a.index - b.index)) {
    if (used + item.words <= budget) { selected.push(item.index); used += item.words; }
  }
  if (!selected.length) {
    // Çok uzun ilk cümlede kaynak kelimeleri değiştirmeden kısaltma; üretken sentez değildir.
    const best = [...weights].sort((a,b)=>b.score-a.score)[0];
    const slice = wordTokens(sentences[best.index]).slice(0, budget).join(' ');
    return { text: slice, actualWords: wordCount(slice), engine: 'extractive', truncated: true };
  }
  const output = selected.sort((a,b)=>a-b).map(i=>sentences[i]).join(' ');
  return { text: output, actualWords: wordCount(output), engine: 'extractive', truncated: used < sourceWords };
}
