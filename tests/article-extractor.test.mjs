import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const code = readFileSync(new URL('../content/article-extractor.js', import.meta.url), 'utf8');
const bodyText = 'Tarayıcı uzantısı, web sayfalarındaki ana makale metnini seçerek reklamları, menüleri ve gereksiz bağlantıları çıkarır. '.repeat(8);
function textNode(text) { return { nodeType: 3, nodeValue: text }; }
function element(tag, children = []) {
  return { nodeType: 1, tagName: tag.toUpperCase(), childNodes: children,
    get textContent() { return children.map(c => c.nodeValue || c.textContent || '').join(''); },
    querySelectorAll(selector) { return selector === '*' ? [] : []; },
    cloneNode() { return element(tag, children); }
  };
}
function documentFixture({ fallback = true, big = false } = {}) {
  const para = element('p', [textNode(bodyText)]);
  const original = element('article', [para]);
  const doc = { documentElement: { lang: 'tr' }, title: 'Örnek başlık', body: original, cloneCount: 0,
    getElementsByTagName() { return { length: big ? 40000 : 6 }; },
    cloneNode() { this.cloneCount++; return { cloned: true }; },
    querySelectorAll(selector) { return fallback && selector === 'article,main,[role="main"]' ? [original] : []; }
  };
  return { doc, original };
}
function setup(Parser) {
  const context = { Readability: Parser };
  runInNewContext(code, context, { filename: 'article-extractor.js' });
  return context.__okulensExtractArticle;
}
test('Readability yalnızca klon belgeyle çalışır ve metin/başlık/metadata döner', () => {
  const { doc } = documentFixture();
  const extract = setup(class {
    constructor(clone, options) { assert.equal(clone.cloned, true); assert.equal(options.maxElemsToParse, 35000); }
    parse() { return { content: element('article', [element('h2', [textNode('Alt başlık')]), element('p', [textNode(bodyText)])]), title: 'Doğru başlık', lang: 'tr', byline: 'Yazar' }; }
  });
  const result = extract(doc);
  assert.equal(result.status, 'ok');
  assert.equal(result.extractionMethod, 'readability');
  assert.equal(result.sourceTitle, 'Doğru başlık');
  assert.equal(result.byline, 'Yazar');
  assert.match(result.text, /Tarayıcı uzantısı/);
  assert.equal(doc.cloneCount, 1);
  assert.deepEqual(Array.from(result.warnings), []);
});
test('Readability boş döndüğünde anlamsal DOM fallback görünür şekilde kullanılır', () => {
  const { doc } = documentFixture();
  const extract = setup(class { parse() { return null; } });
  const result = extract(doc);
  assert.equal(result.status, 'partial');
  assert.equal(result.extractionMethod, 'semantic-dom-fallback');
  assert.ok(result.warnings.includes('READABILITY_EMPTY_OR_SHORT'));
  assert.ok(result.warnings.includes('ARTICLE_FALLBACK_USED'));
});
test('Okunamayan sayfada metin icat edilmez', () => {
  const { doc } = documentFixture({ fallback: false });
  doc.body = element('body', [textNode('Ana içerik yok.')]);
  const extract = setup(class { parse() { throw new Error('broken article'); } });
  const result = extract(doc);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.text, '');
  assert.ok(result.warnings.includes('ARTICLE_UNREADABLE'));
});
test('Kütüphane olmadan fallback açıkça işaretlenir', () => {
  const { doc } = documentFixture();
  const result = setup(undefined)(doc, undefined);
  assert.equal(result.status, 'partial');
  assert.ok(result.warnings.includes('READABILITY_NOT_LOADED'));
});
test('Aşırı büyük DOM belleği korumak için Readability aşamasını atlar', () => {
  const { doc } = documentFixture({ big: true });
  const result = setup(class { parse() { throw new Error('must not run'); } })(doc);
  assert.equal(doc.cloneCount, 0);
  assert.equal(result.status, 'partial');
  assert.ok(result.warnings.includes('READABILITY_SKIPPED_LARGE_DOM'));
});
