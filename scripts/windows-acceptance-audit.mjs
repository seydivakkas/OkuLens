/** İşlem 004-E — Windows gerçek model kanıt dosyalarının yapısal denetimi.
 * Girdiyi değerlendirmek teknik incelemenin yerine geçmez.
 * Kullanıcı metni/özet içerikleri veya hassas dosya adları stdout'a yazılmaz.
 * Son karar bilinçli olarak daima HOLD: ağ, VRAM ve bağımsız kaynak teyidi gerekir.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

function text(v){return typeof v==='string'?v.trim():'';}
function hexSha(data){return createHash('sha256').update(data).digest('hex');}
function readReport(file){
 const bytes=readFileSync(file);
 if(bytes.length>8*1024*1024)throw new Error('EVIDENCE_FILE_TOO_LARGE');
 let data;
 try{data=JSON.parse(bytes.toString('utf8'));}
 catch{throw new Error('EVIDENCE_INVALID_JSON');}
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('EVIDENCE_OBJECT_REQUIRED');
 return {data,sha256:hexSha(bytes)};
}
function validateEnvironment(raw){
 const issues=[];
 const e=raw?.data;
 if(e?.kind!=='OKULENS_WINDOWS_ENVIRONMENT_EVIDENCE')issues.push('WINDOWS_ENVIRONMENT_MISSING_OR_INVALID');
 if(!['Chrome','Edge'].includes(e?.browser))issues.push('BROWSER_NAME_INVALID');
 if(e?.browserDetected!==true||!text(e?.browserVersion))issues.push('BROWSER_NOT_DETECTED');
 if(!text(e?.windowsVersion))issues.push('WINDOWS_VERSION_UNRECORDED');
 if(!/^[a-f0-9]{40}$/.test(text(e?.repositoryCommit)))issues.push('GIT_COMMIT_UNRECORDED');
 if(e?.extensionName!=='OkuLens'||!text(e?.extensionVersion))issues.push('EXTENSION_IDENTITY_UNRECORDED');
 if(e?.decision!=='HOLD')issues.push('ENVIRONMENT_MUST_NOT_CLAIM_PASS');
 return {kind:'environment',sha256:raw?.sha256??null,validated:issues.length===0,
  browser:['Chrome','Edge'].includes(e?.browser)?e.browser:null,issues};
}
function validatePreflight(raw){
 if(!raw)return {kind:'preflight',provided:false,validated:false,issues:['PREFLIGHT_EVIDENCE_MISSING']};
 const r=raw.data??{},v=r.result??{},issues=[];
 if(r.kind!=='OKULENS_OPFS_WORKER_PREFLIGHT')issues.push('PREFLIGHT_KIND_INVALID');
 if(v.stage!=='PREFLIGHT_FILES_READABLE')issues.push('PREFLIGHT_FILES_NOT_READABLE');
 if(!Number.isSafeInteger(v.checkedFiles)||v.checkedFiles<10)issues.push('PREFLIGHT_FILE_COUNT_UNEXPECTED');
 if(!Number.isSafeInteger(v.sampledBytes)||v.sampledBytes<10)issues.push('PREFLIGHT_BYTES_NOT_SAMPLED');
 if(!Number.isSafeInteger(v.opfsCacheHits)||v.opfsCacheHits<v.checkedFiles)issues.push('PREFLIGHT_CACHE_HITS_INSUFFICIENT');
 if(!text(v.modelId)||!text(v.revision)||!['webgpu','wasm'].includes(v.backend))issues.push('PREFLIGHT_MODEL_UNIDENTIFIED');
 if(r.realModelInferenceVerified!==false||r.networkCaptureStatus!=='NOT_MEASURED'||r.decision!=='HOLD')
  issues.push('PREFLIGHT_MUST_NOT_CLAIM_INFERENCE_OR_NETWORK_PASS');
 return {kind:'preflight',provided:true,sha256:raw.sha256,validated:issues.length===0,
  backend:['webgpu','wasm'].includes(v.backend)?v.backend:null,issues};
}
function validateInference(raw){
 const d=raw.data??{},m=d.model??{},review=d.humanReview??{},rt=d.runtime??{},issues=[];
 if(d.kind!=='OKULENS_REAL_MODEL_ACCEPTANCE_EVIDENCE')issues.push('INFERENCE_KIND_INVALID');
 if(!['micro','standard','deep','simple','injected'].includes(d.caseId))issues.push('INFERENCE_CASE_INVALID');
 if(!text(m.id)||!text(m.revision)||!['webgpu','wasm'].includes(m.backend))issues.push('INFERENCE_MODEL_UNIDENTIFIED');
 if(m.verifiedRuntimeInference!==true||!text(d.outputText)||d.error)issues.push('REAL_MODEL_OUTPUT_NOT_OBSERVED');
 if(!Number.isInteger(d.actualWords)||d.actualWords<1)issues.push('OUTPUT_WORD_COUNT_INVALID');
 if(review.turkishQuality!=='pass'||review.factualSupport!=='pass'||review.sourceCitationVerified!=='pass')
  issues.push('INDEPENDENT_SOURCE_REVIEW_MISSING');
 if(rt.networkCaptureStatus!=='MEASURED_NO_REMOTE_EGRESS')issues.push('NETWORK_EVIDENCE_MISSING');
 if(rt.offlineInferenceVerified!==true)issues.push('OFFLINE_INFERENCE_NOT_VERIFIED');
 if(d.decision!=='HOLD')issues.push('RAW_REPORT_MUST_REMAIN_HOLD');
 return {kind:'inference',sha256:raw.sha256,caseId:d.caseId||null,
  validated:issues.length===0,issues};
}
/** Denetçi yalnız rapor yapısını doğrular; cihazda gerçek işlem yaptığını iddia etmez. */
export function assessWindowsEvidence({environment,preflight=null,inferences=[]}){
 const env=validateEnvironment(environment);
 const pre=validatePreflight(preflight);
 const rs=inferences.map(validateInference);
 const cases=new Set(rs.map(x=>x.caseId));
 const missing=['micro','standard','deep','simple','injected'].filter(x=>!cases.has(x));
 const notes=[];
 if(!env.validated)notes.push('WINDOWS_ENVIRONMENT_HOLD');
 if(!pre.validated)notes.push('OPFS_PREFLIGHT_HOLD');
 if(!rs.length||missing.length||rs.some(x=>!x.validated))notes.push('INFERENCE_EVIDENCE_INCOMPLETE');
 notes.push('CROSS_BROWSER_AND_EXTERNAL_NETWORK_VRAM_REVIEW_REQUIRED');
 return {schemaVersion:1,kind:'OKULENS_WINDOWS_EVIDENCE_AUDIT',
  browser:env.browser,environment:env,preflight:pre,
  cases:rs,missingCases:missing,findings:notes,
  networkAndGpuIndependentReview:'NOT_VERIFIED',
  decision:'HOLD',
  decisionReason:'Bu denetçi yüklenmiş dosyaların biçimini ve alanlarını inceler; gerçek tarayıcı, ağ izi, VRAM veya bağımsız kaynak incelemesini kendi başına doğrulamaz.'};
}
function argsToInputs(args){
 const inputs={inferences:[]};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--environment')inputs.environment=args[++i];
  else if(args[i]==='--preflight')inputs.preflight=args[++i];
  else if(args[i]==='--inference')inputs.inferences.push(args[++i]);
  else if(args[i]==='--output')inputs.output=args[++i];
  else throw new Error('UNKNOWN_ARGUMENT');
 }
 if(!inputs.environment)throw new Error('ENVIRONMENT_EVIDENCE_REQUIRED');
 if(!inputs.output)throw new Error('AUDIT_OUTPUT_PATH_REQUIRED');
 return inputs;
}
function main(){
 const args=argsToInputs(process.argv.slice(2));
 const inputs={environment:readReport(args.environment),
  preflight:args.preflight?readReport(args.preflight):null,
  inferences:args.inferences.map(readReport)};
 const audit=assessWindowsEvidence(inputs);
 writeFileSync(args.output,JSON.stringify(audit,null,2)+'\n','utf8');
 process.stdout.write('Yapisal denetim kaydedildi. Karar: HOLD. '+
   'Tarayici: '+String(audit.browser||'bilinmiyor')+
   ', eksik senaryolar: '+audit.missingCases.length+
   ', inceleme bulgulari: '+audit.findings.length+'.\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{main();}catch(error){
  process.stderr.write('WINDOWS_EVIDENCE_AUDIT_ERROR: '+String(error?.message||error).slice(0,120)+'\n');
  process.exitCode=2;
 }
}
