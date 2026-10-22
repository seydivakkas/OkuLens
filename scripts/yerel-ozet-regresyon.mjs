/** İşlem 008 — Aynı yerel TXT belgesinden 10/100/1000 karşılaştırma paketi.
 * Kaynağı internete yüklemez, haricî model çağırmaz.
 * Kelime hedefi uygunluğu ve sayısal bozulma kontrolü algoritmik ölçümdür;
 * temsil, doğruluk ve gerçek model kabulü yine insan değerlendirmesine tabidir.
 */
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createDesktopSummary} from '../desktop/summary-core.mjs';
import {wordCount} from '../shared/summarize.mjs';
const numRe=/\d+(?:[.,]\d+)*/gu;
const targets=[10,100,1000];
const getNumbers=str=>new Set(str.match(numRe)||[]);
function args(argv){
 const r={outDir:resolve('kanitlar','islem008')};
 for(let i=0;i<argv.length;i++){
  if(argv[i]==='--input')r.input=argv[++i];
  else if(argv[i]==='--output-dir')r.outDir=resolve(argv[++i]);
  else throw new Error('UNKNOWN_ARGUMENT: '+String(argv[i]).slice(0,40));
 }
 if(!r.input||!r.outDir)throw new Error('INPUT_AND_OUTPUT_REQUIRED');
 return r;
}
export function evaluateSummarySet(source,{title=''}={}){
 const originals=getNumbers(source);
 const result=[];
 for(const targetWords of targets){
  const summary=createDesktopSummary(source,{title,targetWords});
  const outputNums=getNumbers(summary.text);
  const unexpectedNumbers=[...outputNums].filter(x=>!originals.has(x));
  result.push({
   targetWords,sourceWords:wordCount(source),actualWords:summary.actualWords,
   withinWordBudget:summary.actualWords<=targetWords,
   sourceSections:summary.sourceSections||1,
   sectionsRepresented:summary.sectionsRepresented??null,
   sectionsEligible:summary.sectionsEligible??null,
   metadataSectionsExcluded:summary.metadataSectionsExcluded??0,
   sourceEvidence:summary.sourceEvidence||[],
   sourceFormat:summary.sourceFormat||'normalized',
   processingMs:summary.processingMs,
   engine:summary.engine,output:summary.text,unexpectedNumbers,
   numbersSelected:[...outputNums],numericProvenancePass:unexpectedNumbers.length===0,
   contentCoverage:'INDEPENDENT_REVIEW_REQUIRED',
   modelInference:'NOT_TESTED',
   qualityDecision:'HOLD'
  });
 }
 return result;
}
async function main(){
 const {input,outDir}=args(process.argv.slice(2));
 const file=resolve(input);
 const size=await stat(file);
 if(!size.isFile()||size.size>2*1024*1024)throw new Error('SOURCE_FILE_MUST_BE_UTF8_TXT_UNDER_2_MIB');
 const bytes=await readFile(file);
 const source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 const outputs=evaluateSummarySet(source,{title:basename(file)});
 await mkdir(outDir,{recursive:true});
 const metadata={
  schemaVersion:1,kind:'OKULENS_EXTRACTIVE_REGRESSION',
  generatedAt:new Date().toISOString(),
  sourceSha256:createHash('sha256').update(bytes).digest('hex'),
  sourceBytes:bytes.length,
  engine:'hybrid-extractive',
  qualityDecision:'HOLD',
  results:outputs.map(({output,...row})=>row)
 };
 for(const x of outputs){
  await writeFile(join(outDir,'OkuLens-'+x.targetWords+'-Ozet.txt'),x.output+'\n','utf8');
 }
 await writeFile(join(outDir,'denetim.json'),JSON.stringify(metadata,null,2)+'\n','utf8');
 process.stdout.write('Yerel analiz tamamlandi: 10/100/1000. Sayisal bozulma ve kelime siniri raporlandi; kalite HOLD.\n');
 process.stdout.write('Kanit klasoru: '+outDir+'\n');
}
if(process.argv[1]===fileURLToPath(import.meta.url))
 main().catch(e=>{process.stderr.write('ISLEM008_ERROR: '+String(e.message||e).slice(0,150)+'\n');process.exitCode=1;});
