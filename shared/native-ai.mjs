import { wordCount } from './summarize.mjs';

// Sadece koşulları sağlanan İngilizce içeriğin 10/100 kelime modunda denenir.
// Buradaki native Summarizer yeniden yazım seviyesi sağlamaz ve tam kelime garantisi vermez.
export async function tryNativeSummary(text, { targetWords, language, signal } = {}) {
  if (!['en', 'en-US', 'en-GB'].includes(language)) return null;
  if (![10, 100].includes(Number(targetWords))) return null;
  if (typeof globalThis.Summarizer === 'undefined') return null;
  const available = await globalThis.Summarizer.availability();
  if (available !== 'available') return null; // İndirmeyi kullanıcının haberi olmadan başlatma.
  let session;
  try {
    session = await globalThis.Summarizer.create({
      type: targetWords === 10 ? 'headline' : 'tldr',
      length: targetWords === 10 ? 'short' : 'medium',
      format: 'plain-text',
      preference: 'auto',
      expectedInputLanguages: ['en'],
      outputLanguage: 'en'
    });
    let output = '';
    // Destek varsa gerçek akış; yoksa batch.
    if (typeof session.summarizeStreaming === 'function') {
      const stream = session.summarizeStreaming(text, { signal });
      for await (const chunk of stream) {
        if (signal?.aborted) throw new DOMException('İptal edildi', 'AbortError');
        // API akışının çıktı semantiği tarayıcıya göre değişebileceğinden son parça veya birleştirme test edilmeli.
        output += chunk;
      }
    } else {
      output = await session.summarize(text, { signal });
    }
    if (!output?.trim()) return null;
    return { text: output.trim(), actualWords: wordCount(output), engine: 'builtin' };
  } finally {
    session?.destroy?.();
  }
}
