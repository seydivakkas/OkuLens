/** OkuLens: kaynak HTML'deki TF-IDF ve TextRank yaklaşımının izlenebilir, güvenli uyarlaması. */
import { normalizeText, splitSentences, wordCount, wordTokens } from './summarize.mjs';
const STOP = new Set(`ve veya ile için ancak ama çünkü daha gibi kadar olan olarak gibi sonra önce aynı bunlar bu bir da de mi mü mı mu çok her en o şu biz siz onlar olan that this the and are for from with about could would where when which into have been were what your you but not they their them`.split(' '));
function tokens(text) { return wordTokens(text).map(t => t.toLocaleLowerCase('tr-TR')).filter(t => t.length > 2 && !STOP.has(t)); }
function makeChunks(sentences, target = 130) {
  const chunks = []; let current = [], size = 0;
  for (const s of sentences) {
    const n = wordCount(s.text);
    if (current.length && size + n > target) { chunks.push(current); current = []; size = 0; }
    current.push(s); size += n;
  }
  if (current.length) chunks.push(current);
  return chunks;
}
function calcSection(rows, title = '') {
  const count = rows.length;
  if (!count) return [];
  const documentFrequency = new Map();
  for (const row of rows) for (const tok of new Set(row.tokens)) documentFrequency.set(tok, (documentFrequency.get(tok)||0)+1);
  const titleTerms = new Set(tokens(title));
  rows.forEach(row => {
    const tf = new Map(); for (const t of row.tokens) tf.set(t,(tf.get(t)||0)+1);
    row.vector = new Map(); let normSq = 0; let tfidf = 0;
    for (const [t,f] of tf) {
      const idf = Math.log(1 + (count+1)/(1+(documentFrequency.get(t)||0)));
      const val = f / Math.max(1,row.tokens.length) * idf * (titleTerms.has(t)?1.4:1);
      row.vector.set(t,val); normSq += val*val; tfidf += val;
    }
    row.norm = Math.sqrt(normSq)||1; row.tfidfScore = tfidf;
  });
  // Her bölüm sınırlıdır; tüm metin üzerinde O(N^2) graf kullanılmaz.
  const edges = Array.from({length:count},()=>[]), sums=Array(count).fill(0);
  for(let i=0;i<count;i++) for(let j=i+1;j<count;j++) {
    let dot=0; for(const [t,v] of rows[i].vector) dot += v*(rows[j].vector.get(t)||0);
    const similarity=dot/(rows[i].norm*rows[j].norm);
    if(similarity>.035) { edges[i].push([j,similarity]);edges[j].push([i,similarity]);sums[i]+=similarity;sums[j]+=similarity; }
  }
  let rank=Array(count).fill(1/count);
  for(let iteration=0;iteration<20;iteration++){
    const next=Array(count).fill((1-.85)/count);
    for(let j=0;j<count;j++) {
      if(!sums[j]) {for(let i=0;i<count;i++)next[i]+=.85*rank[j]/count;continue;}
      for(const [i,weight] of edges[j])next[i]+=.85*rank[j]*weight/sums[j];
    }
    rank=next;
  }
  const maxRank=Math.max(...rank,1e-6),maxTf=Math.max(...rows.map(s=>s.tfidfScore),1e-6);
  rows.forEach((r,i)=>{
    r.textRank=rank[i]/maxRank;
    r.tfidf=r.tfidfScore/maxTf;
    r.combined=(.55*r.textRank+.45*r.tfidf)*(r.index===0?1.1:1);
  });
  return rows;
}
export function analyzeText(input,{title='',targetWords=100}={}) {
  const start=performance.now();
  const clean=normalizeText(input).slice(0,260000);
  const sentences=splitSentences(clean)
    .filter(s=>wordCount(s)>=3 && !/^(?:\\d{1,2}\\.\\s*)?[\\p{Lu}\\d\\s/—–-]{9,}$/u.test(s.trim()))
    .map((text,index)=>({index,text,tokens:tokens(text)}));
  const chunks=makeChunks(sentences);
  const rows=[];
  for(const chunk of chunks)rows.push(...calcSection(chunk,title));
  const termFreq=new Map();
  for(const row of rows)for(const term of row.tokens)termFreq.set(term,(termFreq.get(term)||0)+1);
  const keywords=[...termFreq.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'tr')).slice(0,9).map(([word,frequency])=>({word,frequency}));
  // Çeşitli belgelerde tek cümleye sıkışmayı ve bağlamdan kopuk
  // 'Üçüncü tür...' gibi ayrıntıların kısa özet olmasını önle.
  const budget=Math.max(1,Number(targetWords)||100);
  const sourceWords=wordCount(clean);
  const topicStem=term=>term.slice(0,Math.min(term.length,5));
  const leadFreq=new Map();
  for(const row of rows.slice(0,Math.min(rows.length,16))){
    for(const t of new Set(row.tokens.map(topicStem))){
      leadFreq.set(t,(leadFreq.get(t)||0)+1);
    }
  }
  const generalFreq=new Map();
  for(const row of rows)for(const t of new Set(row.tokens.map(topicStem)))
    generalFreq.set(t,(generalFreq.get(t)||0)+1);
  const maxGlobal=Math.max(1,...generalFreq.values());
  const isAnaphoric=text=>/^(?:Bu|Bunun|Buna|Bunlar|İkinci|Üçüncü|Örneğin|Ayrıca|Ancak|Böylece|Dolayısıyla)\b/iu.test(text);
  const lexicalSet=new Map();
  const terms=row=>{
    if(!lexicalSet.has(row.index))lexicalSet.set(row.index,new Set(row.tokens.map(topicStem)));
    return lexicalSet.get(row.index);
  };
  const overlap=(a,b)=>{
    const aa=terms(a),bb=terms(b);
    if(!aa.size||!bb.size)return 0;
    let match=0;
    for(const t of aa)if(bb.has(t))match++;
    return match/(aa.size+bb.size-match);
  };
  const salience=row=>{
    const ss=terms(row);
    const lead=[...ss].filter(t=>(leadFreq.get(t)||0)>=2).length;
    const globals=[...ss].reduce((sum,t)=>sum+Math.log1p(generalFreq.get(t)||0),0)/
      Math.max(1,ss.size*Math.log1p(maxGlobal));
    const early=Math.exp(-row.index/Math.max(1,rows.length*.16));
    const numeric=/\d+(?:[.,]\d+)*/u.test(row.text)?1:0;
    const anaphora=isAnaphoric(row.text)?1:0;
    const meta=/^(?:Bu (?:dosya|metin|rapor)|Sürüm:|ÖNEMLİ NOT)/iu.test(row.text)?1:0;
    return row.combined + .12*Math.min(5,lead)+.20*globals+.28*early+
      .12*numeric-.43*anaphora-.30*meta;
  };
  const ranked=[...rows].sort((a,b)=>salience(b)-salience(a)||a.index-b.index);
  let remaining=budget,selected=[];
  const picked=new Set();
  let truncated=false;
  if(sourceWords<=budget){
    selected=rows;
    remaining=budget-sourceWords;
  }else{
    const add=row=>{
      if(!row||picked.has(row.index))return false;
      const n=wordCount(row.text);
      if(n>remaining)return false;
      picked.add(row.index);selected.push(row);remaining-=n;return true;
    };
    if(budget<100){
      // 10 sözcüklük özet ayrı değerlendirilir; bağımsız ve ana
      // konuya yakın, bütçeye sığan en anlamlı cümleyi seç.
      const short=ranked.filter(r=>wordCount(r.text)<=remaining);
      if(short.length) add(short[0]);
    }else{
      const bandCount=budget>=500?Math.min(8,Math.ceil(rows.length/12)):3;
      if(rows.length>=bandCount*2){
        for(let band=0;band<bandCount;band++){
          const lower=Math.floor(rows.length*band/bandCount);
          const upper=Math.floor(rows.length*(band+1)/bandCount);
          const candidates=rows.slice(lower,upper)
            .sort((a,b)=>salience(b)-salience(a)||a.index-b.index);
          for(const row of candidates)if(add(row))break;
        }
      }
      // Belgenin başındaki ana konuyu ayrıca koru.
      if(rows.length>=6&&!selected.some(r=>r.index<Math.ceil(rows.length*.13))){
        for(const row of ranked.filter(r=>r.index<Math.ceil(rows.length*.13))){
          if(add(row))break;
        }
      }
      while(remaining>0){
        let best=null,score=-Infinity;
        for(const row of ranked){
          if(picked.has(row.index)||wordCount(row.text)>remaining)continue;
          const maxOverlap=selected.length?Math.max(...selected.map(s=>overlap(row,s))):0;
          const band=Math.floor(8*row.index/Math.max(1,rows.length));
          const sameBand=selected.filter(x=>Math.floor(8*x.index/rows.length)===band).length;
          const adjusted=salience(row)-.70*maxOverlap-.055*sameBand;
          if(adjusted>score){score=adjusted;best=row;}
        }
        if(!add(best))break;
      }
    }
  }
  selected.sort((a,b)=>a.index-b.index);
  let summary=sourceWords<=budget?clean:selected.map(s=>s.text).join(' ');
  if(!summary&&ranked.length){
    // Bütçeye sığan hiçbir tam cümle yok: yalnızca kaynakta var
    // olan, bağlamı yüksek cümlenin başını kullan ve uyar.
    const best=ranked[0];
    summary=wordTokens(best.text).slice(0,budget).join(' ')+'…';
    truncated=true;
  }
  const actualWords=wordCount(summary);
  return {
    text:summary,actualWords,sourceWords,engine:'hybrid-extractive',createdAt:new Date().toISOString(),
    keywords,sections:chunks.length,scoredSentences:rows.length,
    compression:sourceWords?Math.max(0,Math.round((1-actualWords/sourceWords)*100)):0,
    processingMs:Math.round((performance.now()-start)*10)/10,
    readingSecondsSaved:Math.max(0,Math.round((sourceWords-actualWords)/200*60)),
    topSentences:ranked.slice(0,5).map(s=>({id:s.index+1,text:s.text,textRank:s.textRank,tfidf:s.tfidf,combined:s.combined})),
    warnings:[...(truncated?['Hiçbir tam cümle kısa kelime sınırına sığmadı; kaynak ifadesi kesildi.']:[]),...((sourceWords<budget)?['Kaynak metin hedef bütçeden kısa; 1000 kelimeye tamamlamak için içerik uydurulmadı.']:[]),
      'Çıkarımsal motor özgün cümleleri seçer; Kolay/Orta/Zor üretken yeniden yazım değildir.']
  };
}
