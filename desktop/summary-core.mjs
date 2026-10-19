/* Windows P0: mevcut ortak motorun masaustu adaptoru.
 * Asla uretken model veya API ciktisi iddia etmez.
 */
import {analyzeText} from '../shared/hybrid-nlp.mjs';
import {normalizeText,wordCount,summarizeExtractive} from '../shared/summarize.mjs';

export const DESKTOP_TARGETS=Object.freeze([10,100,1000]);
export const DESKTOP_MAX_CHARS=260000;

export function createDesktopSummary(source,{title='',targetWords=100}={}){
 if(!DESKTOP_TARGETS.includes(targetWords))throw new RangeError('DESKTOP_TARGET_INVALID');
 if(typeof source!=='string')throw new TypeError('DESKTOP_SOURCE_NOT_TEXT');
 if(source.length>DESKTOP_MAX_CHARS)throw new RangeError('DESKTOP_SOURCE_TOO_LARGE');
 const clean=normalizeText(source);
 if(!clean)throw new Error('DESKTOP_EMPTY_SOURCE');
 const result=analyzeText(clean,{title:String(title).slice(0,300),targetWords});
 if(result.text)return result;
 // Uc kelimeden kisa cümlelerde hibrit puanlayici secim yapmaz.
 // Kaynak kaybi yasatmamak icin mevcut saf cikarimsal motoru kullan.
 const basic=summarizeExtractive(clean,targetWords);
 return {...basic,sourceWords:wordCount(clean),compression:0,
  processingMs:0,keywords:[],warnings:[
   'Kaynak çok kısa. Özgün metin korundu; yeni bilgi üretilmedi.',
   'Bu çıktı çıkarımsal motora aittir; yerel ONNX çıkarımı değildir.'
  ]};
}
