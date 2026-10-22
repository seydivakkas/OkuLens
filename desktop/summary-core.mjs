/* OkuLens Windows: kaynak metnini yeniden yazmadan, uzun TXT/MD dosyalarını
 * sonuna kadar inceleyen denetlenebilir çıkarımsal özetleme.
 * ONNX veya bulut üretimi değildir.
 */
import {analyzeText} from '../shared/hybrid-nlp.mjs';
import {summarizeStructured} from '../shared/structured-extractive.mjs';
import {normalizeText,wordCount,summarizeExtractive} from '../shared/summarize.mjs';

export const DESKTOP_TARGETS=Object.freeze([10,100,1000]);
export const DESKTOP_MAX_CHARS=2*1024*1024;
const SECTION_CHARS=110000;

export function splitDesktopSections(source,maxChars=SECTION_CHARS){
 if(typeof source!=='string'||!Number.isInteger(maxChars)||maxChars<1000||maxChars>260000)
  throw new Error('DESKTOP_SECTION_OPTIONS_INVALID');
 const sections=[];
 let cursor=0;
 while(cursor<source.length){
  let end=Math.min(source.length,cursor+maxChars);
  if(end<source.length){
   // Mümkünse paragraf/cümle, değilse kelime sınırından devam et.
   const searchStart=cursor+Math.floor(maxChars*.65);
   const window=source.slice(searchStart,end);
   const paragraph=window.lastIndexOf('\n');
   const punctuation=window.search(/(?:[.!?]\s)(?![\s\S]*[.!?]\s)/u);
   const split=paragraph>=0?searchStart+paragraph+1:
    punctuation>=0?searchStart+punctuation+2:source.lastIndexOf(' ',end);
   if(split>cursor)end=split;
  }
  if(end<=cursor)end=Math.min(source.length,cursor+maxChars);
  const piece=source.slice(cursor,end).trim();
  if(piece)sections.push({startChar:cursor,endChar:end,text:piece});
  cursor=end;
 }
 return sections;
}

export function createDesktopSummary(source,{title='',targetWords=100}={}){
 if(!DESKTOP_TARGETS.includes(targetWords))throw new RangeError('DESKTOP_TARGET_INVALID');
 if(typeof source!=='string')throw new TypeError('DESKTOP_SOURCE_NOT_TEXT');
 if(source.length>DESKTOP_MAX_CHARS)throw new RangeError('DESKTOP_SOURCE_TOO_LARGE');
 const started=performance.now(),clean=normalizeText(source);
 if(!clean)throw new Error('DESKTOP_EMPTY_SOURCE');
 const sourceWords=wordCount(clean);
 // Bölüm başlıkları olan orta boy belgelerde mevcut TextRank cümle
 // puanlamasını koru; fakat sonuçları konu/olgu/bölüm kanıtıyla seç.
 if(sourceWords>targetWords&&clean.length<=260000){
  const structured=summarizeStructured(clean,{title:String(title).slice(0,300),targetWords});
  if(structured)return {...structured,processedChars:clean.length};
 }
 if(clean.length<=260000){
  const result=analyzeText(clean,{title:String(title).slice(0,300),targetWords});
  if(result.text)return {...result,processedChars:clean.length,sourceSections:1};
  // Üç kelimeden kısa metinler hibrit seçicide elenir: kaynağı atma.
  const basic=summarizeExtractive(clean,targetWords);
  return {...basic,sourceWords,compression:0,processingMs:Math.round((performance.now()-started)*10)/10,
   keywords:[],processedChars:clean.length,sourceSections:1,warnings:[
    'Kaynak çok kısa. Özgün metin korundu; yeni bilgi üretilmedi.',
    'Bu çıktı çıkarımsaldır; yerel ONNX üretimi değildir.'
   ]};
 }
 const parts=splitDesktopSections(clean);
 const representatives=parts.map(section=>{
  const sample=analyzeText(section.text,{title:String(title).slice(0,300),
   targetWords:targetWords===1000?140:targetWords===100?70:30});
  return {text:sample.text||summarizeExtractive(section.text,100).text,
   scoredSentences:sample.scoredSentences||0};
 });
 const combined=representatives.map(x=>x.text).filter(Boolean).join('\n\n');
 if(!combined)throw new Error('DESKTOP_NO_READABLE_SECTIONS');
 const result=analyzeText(combined,{title:String(title).slice(0,300),targetWords});
 const final=result.text?result:summarizeExtractive(combined,targetWords);
 const actualWords=wordCount(final.text);
 return {...final,actualWords,sourceWords,
  engine:'hybrid-extractive',processedChars:clean.length,sourceSections:parts.length,
  scoredSentences:representatives.reduce((n,x)=>n+x.scoredSentences,0),
  compression:Math.max(0,Math.round((1-actualWords/sourceWords)*100)),
  processingMs:Math.round((performance.now()-started)*10)/10,
  warnings:[
   ...(final.warnings||[]),
   'Uzun dosya '+parts.length+' parçanın tamamında incelendi; sınırlı kelime bütçesi her parçanın özette bulunacağını garanti etmez.',
   'Çıktı kaynak cümlelerinden seçilir; üretken yeniden yazım veya iddia doğrulaması değildir.'
  ]
 };
}
