/** İşlem 009 — Bölümlere duyarlı, kaynak kanıtlı çıkarımsal özet seçici.
 * Var olan TF-IDF/TextRank puanlaması aday sıralamasında kullanılır.
 * Yalnız kaynaktan alıntı yapar; hiçbir ağır model/ağ/API kullanmaz.
 */
import {analyzeText} from './hybrid-nlp.mjs';
import {normalizeText,splitSentences,wordCount,wordTokens} from './summarize.mjs';

const HEADING=/^(\d{1,2})\.\s+(.{5,120})$/u;
const UPPER=/[\p{Ll}]/u;
const ROLE_RULES=[
 ['meta',/(?:DEĞERLENDİRME İÇİN|ANAHTAR NOKTALAR|CEVAP ANAHTARI|TEST YÖNERGESİ|ÖNEMLİ NOT|TESTİ — KURGUSAL)/iu],
 ['overview',/(?:YÖNETİCİ ÖZET|PROJE HEDEF|GİRİŞ|PROJE AMACI|KAPSAM)/iu],
 ['participants',/(?:KATILIMCI|GÖREV DAĞILIM|PERSONEL)/iu],
 ['inventory',/(?:BELGE ENVANTER|ARŞİV|VERİ SETİ)/iu],
 ['workflow',/(?:KULLANIM AKIŞ|ÇALIŞMA YÖNTEM|UYGULAMA YÖNTEM)/iu],
 ['measurement',/(?:PERFORMANS|ÖLÇÜM|SONUÇ ANALİZ)/iu],
 ['fidelity',/(?:KAYNAK SADAKAT|DOĞRULUK|İNSAN DEĞERLENDİR)/iu],
 ['budget',/(?:BÜTÇE|MALİYET|HARCAMA|MALİ)/iu],
 ['decision',/(?:SONUÇLAR|SONRAKİ DÖNEM|SONUÇ VE ÖNERİ|KARARLAR)/iu],
 ['risk',/(?:RİSK|EKSİK|SINIR|GÜVENLİK|KESİNTİ)/iu],
 ['workflow',/(?:KULLANICI DENEYİM|ERİŞİLEBİLİRLİK)/iu]
];
function roleFor(heading){
 for(const [role,re] of ROLE_RULES)if(re.test(heading))return role;
 return 'other';
}
function getHeadings(clean){
 const lines=clean.matchAll(/[^\n]+/gu);
 const headings=[];
 for(const m of lines){
  const value=m[0].trim();
  const numbered=HEADING.exec(value);
  if(numbered&&!UPPER.test(numbered[2])&&/[\p{L}]/u.test(numbered[2])){
   headings.push({id:Number(numbered[1]),title:numbered[2],start:m.index,end:m.index+m[0].length});
  }else if(value==='ÖNEMLİ NOT'){
   headings.push({id:'note',title:value,start:m.index,end:m.index+m[0].length});
  }
 }
 return headings;
}
export function parseDocumentStructure(source){
 const clean=normalizeText(source);
 const headers=getHeadings(clean),numbered=headers.filter(h=>typeof h.id==='number');
 if(numbered.length<3)return {structured:false,sections:[],text:clean};
 const sections=[];
 let prev={id:'preamble',title:'Ön bilgiler',role:'meta',startChar:0,bodyStart:0};
 for(const header of headers){
  const end=header.start;
  if(end>prev.bodyStart){
   sections.push({...prev,endChar:end,body:clean.slice(prev.bodyStart,end).trim()});
  }
  prev={id:header.id,title:header.title,role:roleFor(header.title),
   startChar:header.start,bodyStart:header.end};
 }
 if(prev.bodyStart<clean.length){
  sections.push({...prev,endChar:clean.length,body:clean.slice(prev.bodyStart).trim()});
 }
 return {structured:true,sections:sections.filter(x=>x.body),text:clean};
}
const TOKENS=/\d+(?:[.,]\d+)*(?:['’\-][\p{L}\p{N}]+)*|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const numbers=text=>[...new Set(text.match(/\d+(?:[.,]\d+)*/gu)||[])];
function classify(row){
 const t=row.text, role=row.role;
 if(role==='overview' && /(?:pilot|proje|belediye|amaç|hedef|deneme|tasarla)/iu.test(t))return 'overview';
 if(role==='participants'&&/\d/u.test(t))return 'participants';
 if(role==='measurement'&&/\d/u.test(t))return 'measurement';
 if(role==='fidelity'&&/\d/u.test(t))return 'fidelity';
 if(role==='budget'&&/\d/u.test(t))return 'budget';
 if(role==='decision'||/(?:yaygınlaştırma.{0,35}(?:kanıt|onay|izin)|genel kullanım onayı verilme)/iu.test(t))return 'decision';
 if(role==='risk')return 'risk';
 return role;
}
function candidatesFor(parsed,title){
 const candidates=[];
 for(const section of parsed.sections){
  if(section.role==='meta')continue;
  const sentences=splitSentences(section.body).filter(s=>wordCount(s)>=4);
  const ranked=sentences.length?analyzeText(section.body.slice(0,260000),{
   title:section.title+' '+title,targetWords:100
  }).topSentences||[]:[];
  const scoreMap=new Map(ranked.map((r,i)=>[r.text,Math.max(0,5-i)*.16]));
  let cursor=section.bodyStart;
  for(const sentence of sentences){
   const startChar=parsed.text.indexOf(sentence,cursor);
   if(startChar<0||startChar>=section.endChar)continue;
   const endChar=startChar+sentence.length;
   cursor=endChar;
   const wc=wordCount(sentence),nums=numbers(sentence);
   const item={
    index:candidates.length,text:sentence,startChar,endChar,words:wc,
    sectionId:section.id,sectionTitle:section.title,role:section.role,
    numbers:nums
   };
   item.category=classify(item);
   const intro=section.role==='overview'&&
     /(?:belediye|kurum|proje|pilot|deneme)/iu.test(sentence)?1:0;
   const outcome=/(?:medyan|süre|geçti|başarı|harcama|bütçe|kesinti|gönüllü|görev|onay|yaygınlaştır)/iu.test(sentence)?1:0;
   const meta=/(?:bu metnin|bu raporun|bu örnek rapor|bu bölüm|bu dosya|özetinde|özet beklentisinde|özetleme algoritmasına|değerlendirmede yalnız)/iu.test(sentence)?1:0;
   const anaphora=/^(?:Bu|Bunlar|Üçüncü tür|İkinci sorun|Ayrıca|Böylece)\b/iu.test(sentence)?1:0;
   item.score=1+scoreMap.get(sentence)*1.5||1;
   item.score+=intro*.8+outcome*.32+Math.min(nums.length,3)*.15-
     meta*1.4-anaphora*.25;
   item.score+=Math.max(0,.22-candidates.length*.008);
   candidates.push(item);
  }
 }
 return candidates;
}
function prefixFromSource(sentence,budget){
 const matches=[...sentence.matchAll(TOKENS)].slice(0,budget);
 if(!matches.length)return '';
 const last=matches.at(-1);
 return sentence.slice(0,last.index+last[0].length);
}
function lexicalOverlap(a,b){
 const get=t=>new Set(wordTokens(t.toLocaleLowerCase('tr-TR')).filter(x=>x.length>=4).map(x=>x.slice(0,5)));
 const x=get(a.text),y=get(b.text);
 let intersection=0;for(const term of x)if(y.has(term))intersection++;
 return intersection/Math.max(1,x.size+y.size-intersection);
}
export function summarizeStructured(source,{title='',targetWords=100}={}){
 const start=performance.now(),parsed=parseDocumentStructure(source);
 if(!parsed.structured)return null;
 const clean=parsed.text,budget=Number(targetWords),sourceWords=wordCount(clean);
 if(![10,100,1000].includes(budget))throw new Error('STRUCTURED_TARGET_INVALID');
 if(sourceWords<=budget)return null; // Eski sözleşme: kaynak kısa ise aynen koru.
 const candidates=candidatesFor(parsed,title);
 if(!candidates.length)return null;
 const selected=[],used=new Set();
 let remaining=budget,partial=false;
 const add=item=>{
  if(!item||used.has(item.index)||item.words>remaining)return false;
  selected.push(item);used.add(item.index);remaining-=item.words;return true;
 };
 const score=row=>row.score-.58*Math.max(0,...selected.map(s=>lexicalOverlap(s,row)))-
  .10*selected.filter(s=>s.sectionId===row.sectionId).length;
 const pick=(role,maxWords=budget)=>{
  const pool=candidates.filter(r=>r.category===role&&r.words<=Math.min(remaining,maxWords)&&!used.has(r.index))
   .sort((a,b)=>score(b)-score(a)||a.startChar-b.startChar);
  return add(pool[0]);
 };
 if(budget===10){
  // Üretken cümle uydurmak yerine, belgenin gerçek ana konu cümlesinden
  // tam 10 kelimelik kesintisiz bir kaynak alıntısı çıkar.
  const intro=candidates.filter(r=>r.role==='overview'&&
     /(?:belediye|kurum|proje|pilot|amaç)/iu.test(r.text))
    .sort((a,b)=>a.startChar-b.startChar)[0]||candidates[0];
  const clipped=prefixFromSource(intro.text,budget);
  if(!clipped)return null;
  partial=wordCount(clipped)<intro.words;
  selected.push({...intro,text:clipped,words:wordCount(clipped),
   endChar:intro.startChar+clipped.length,partial});
  remaining=budget-wordCount(clipped);
 }else{
  const long=budget===1000;
  // 100 kelime için önce temel konu, ardından en önemli sayısal sonuçlar
  // ve karar. 1000 kelimede her işlevsel bölümden temsil aranır.
  const order=long?[
   ['overview',120],['participants',90],['measurement',90],['fidelity',90],
   ['budget',90],['risk',95],['decision',95],['inventory',85],['workflow',75]
  ]:[
   ['overview',38],['participants',17],['measurement',20],['fidelity',22],
   ['decision',28]
  ];
  for(const [role,maxWords] of order)pick(role,maxWords);
  if(!long){
   // Ayrı kaynak cümlelerinde verilen önceki/yeni ölçümleri karıştırmadan
   // yeterli alan varsa aynı ölçüm bölümünden ikinci cümleyi ekle.
   pick('measurement',17);
  }
  while(remaining>0){
   const pool=candidates.filter(r=>!used.has(r.index)&&r.words<=remaining);
   if(!pool.length)break;
   pool.sort((a,b)=>score(b)-score(a)||
     a.startChar-b.startChar);
   if(!add(pool[0]))break;
  }
 }
 selected.sort((a,b)=>a.startChar-b.startChar);
 const output=selected.map(x=>x.text).join(' ');
 const actualWords=wordCount(output);
 const selectedNumbers=[...new Set(selected.flatMap(x=>numbers(x.text)))];
 const originalNumbers=new Set(numbers(clean));
 const unexpectedNumbers=selectedNumbers.filter(x=>!originalNumbers.has(x));
 const evidence=selected.map((row,index)=>({
  outputIndex:index,sectionId:row.sectionId,sectionTitle:row.sectionTitle,
  role:row.role,category:row.category,
  startChar:row.startChar,endChar:row.endChar,
  partial:Boolean(row.partial),numbers:numbers(row.text)
 }));
 const sectionIds=[...new Set(evidence.map(e=>String(e.sectionId)))];
 const realSections=parsed.sections.filter(s=>s.role!=='meta');
 return {
  text:output,actualWords,sourceWords,engine:'hybrid-extractive',
  compression:Math.max(0,Math.round((1-actualWords/sourceWords)*100)),
  processingMs:Math.round((performance.now()-start)*10)/10,
  sourceSections:parsed.sections.length,
  sourceEvidence:evidence,
  sectionsRepresented:sectionIds.length,
  sectionsEligible:realSections.length,
  metadataSectionsExcluded:parsed.sections.filter(s=>s.role==='meta').length,
  selectedNumbers,unexpectedNumbers,
  numericProvenancePass:unexpectedNumbers.length===0,
  sourceFormat:'normalized',qualityDecision:'HOLD',
  warnings:[
   ...(partial?['Kısa çıktı, ana konu cümlesinin kaynaktaki ilk kelimelerinden alınan kısmi alıntıdır.']:[]),
   'Bölümlere duyarlı çıkarımsal seçim; kaynak doğruluğu ve kapsama için insan değerlendirmesi gerekir.'
  ]
 };
}
