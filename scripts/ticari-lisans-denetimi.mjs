/* OkuLens — ticari sürüm lisans envanteri. Hukuki görüş değildir.
 * Şüpheli veya bilinmeyen lisanslar olumlu sayılmaz.
 * --release sıkı dağıtım kapısıdır; model ve platform izinleri ayrıca incelenir.
 */
import {existsSync,readFileSync,readdirSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=resolve('.');
const strict=process.argv.includes('--release');
const canonical=new Set(['MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','0BSD','CC0-1.0','Unlicense','Unicode-3.0','Zlib','BlueOak-1.0.0']);
const prohibited=/\b(?:AGPL|GPL|LGPL|SSPL|BUSL|BSL|Commons Clause|non[- ]commercial|NC[-\s]|PolyForm|Elastic License)\b/i;
const licenseFiles=/^(LICENSE|LICENCE|COPYING|NOTICE)(?:[-_.].*)?$/i;
const bundlePath=join(root,'vendor','runtime-inputs.json');
let bundleInputs=null;
try{bundleInputs=json(bundlePath).inputs.map(s=>s.replaceAll('\\','/'));}catch{}
const report={schemaVersion:1,mode:strict?'release':'development',generatedAt:new Date().toISOString(),
 browserBundleInventoryPresent:Array.isArray(bundleInputs),
 findings:[],packages:[],status:'HOLD',count:0};
function finding(code,path,detail){report.findings.push({code,path,detail});}
function json(path){return JSON.parse(readFileSync(path,'utf8'));}
function legalStatus(expression){
 if(typeof expression!=='string'||!expression.trim())return 'UNKNOWN';
 if(prohibited.test(expression))return 'REVIEW';
 const options=expression.replace(/[()]/g,'').split(/\s+(?:OR|AND)\s+/i).map(s=>s.trim());
 if(options.every(x=>canonical.has(x)))return 'PERMISSIVE';
 return 'REVIEW';
}
function scan(dir,seen=new Set()){
 if(!existsSync(dir))return;
 const entries=readdirSync(dir,{withFileTypes:true});
 for(const entry of entries){
  if(!entry.isDirectory()||entry.name.startsWith('.'))continue;
  if(entry.name.startsWith('@')){
   scanScope(join(dir,entry.name),seen);
  }else{
   inspect(join(dir,entry.name),seen);
  }
 }
}
function scanScope(dir,seen){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(entry.isDirectory()&&!entry.name.startsWith('.'))inspect(join(dir,entry.name),seen);
 }
}
function inspect(dir,seen){
 const manifest=join(dir,'package.json');
 if(!existsSync(manifest))return;
 let pkg;
 try{pkg=json(manifest);}catch{finding('INVALID_PACKAGE_JSON',relative(root,manifest),'JSON okunamadı');return;}
 if(!pkg.name)return;
 const key=relative(root,dir);
 if(seen.has(key))return;
 seen.add(key);
 const license=typeof pkg.license==='string'?pkg.license:pkg.license?.type??null;
 const files=readdirSync(dir).filter(x=>licenseFiles.test(x));
 // ONNX Runtime npm paketleri bazen LICENSE dosyasını npm paketine dahil etmez.
 // Resmî Microsoft MIT metni depodaki vendor/licenses'dan aynı lisans olarak taşınır.
 const fallback=['onnxruntime-web','onnxruntime-common'].includes(pkg.name)
   && license==='MIT'&&existsSync(join(root,'vendor','licenses','onnxruntime-MIT.txt'));
 const legalFiles=files.map(x=>relative(root,join(dir,x)));
 if(!legalFiles.length&&fallback)legalFiles.push('vendor/licenses/onnxruntime-MIT.txt');
 const state=legalStatus(license);
 const normalized=key.replaceAll('\\','/')+'/';
 const bundled=Boolean(bundleInputs?.some(name=>name.startsWith(normalized)));
 // ONNX Runtime WASM dosyaları bundle dışında ayrıca kopyalanır.
 const wasm=pkg.name==='onnxruntime-web';
 const scope=bundled?'bundled-js':wasm?'bundled-wasm':'installed-only';
 const entry={name:pkg.name,version:pkg.version??null,license,classification:state,scope,
  files:legalFiles};
 report.packages.push(entry);
 if(state!=='PERMISSIVE'){
  const code=state==='UNKNOWN'?'LICENSE_UNKNOWN':'LICENSE_REVIEW';
  finding(bundleInputs&&!bundled&&!wasm?code+'_INSTALLED_ONLY':code,key,'SPDX: '+String(license)+'; kapsam: '+scope);
 }
 if(!legalFiles.length)finding(bundleInputs&&!bundled&&!wasm?'LICENSE_NOTICE_MISSING_INSTALLED_ONLY':'LICENSE_NOTICE_MISSING',key,
  'Lisans/bildirim metni eksik; kapsam: '+scope);
 scan(join(dir,'node_modules'),seen);
}
const own=json(join(root,'package.json'));
if(strict){
 // npm install yerel ve git dışı lockfile oluşturabilir; ticari tekrarlanabilir
 // sürüm için gerçek sürüm kontrolünde paket-lock bulunmasını şart koş.
 const tracked=spawnSync('git',['ls-files','--error-unmatch','package-lock.json'],{
  cwd:root,encoding:'utf8',windowsHide:true
 });
 if(!existsSync(join(root,'package-lock.json'))||tracked.status!==0)
  finding('LOCKFILE_NOT_VERSIONED','package-lock.json','Yayın için package-lock.json depoya commit edilmeli; npm ci kullanılmalı.');
}
if(own.license!=='MIT')finding('OWN_LICENSE_CHANGED','package.json','Mevcut MIT lisans sözleşmesi değişti; sahibin kararı ve belge güncellemesi gerekli');
for(const required of ['LICENSE','vendor/readability/LICENSE.md','vendor/readability/NOTICE','vendor/licenses/onnxruntime-MIT.txt',
 'docs/THIRD_PARTY_MODELS.md','docs/TICARI_KULLANIM_POLITIKASI.md','docs/GIZLILIK_POLITIKASI_TASLAK.md']){
 if(!existsSync(join(root,required)))finding('REQUIRED_NOTICE_MISSING',required,'Ticari uygunluk dosyası eksik');
}
if(!existsSync(join(root,'node_modules')))finding('DEPENDENCY_TREE_MISSING','node_modules','Önce npm install çalıştırın; bağımlılıklar taranmadı');
if(!bundleInputs)finding('RUNTIME_BUNDLE_INVENTORY_MISSING','vendor/runtime-inputs.json',
  'Üretime giden npm paketleri sınıflandırılamadı; önce npm run build:runtime.');
else scan(join(root,'node_modules'));
report.packages.sort((a,b)=>a.name.localeCompare(b.name)||String(a.version).localeCompare(String(b.version)));
report.count=report.packages.length;
const blocking=new Set(['LICENSE_UNKNOWN','LICENSE_REVIEW','REQUIRED_NOTICE_MISSING','OWN_LICENSE_CHANGED','INVALID_PACKAGE_JSON','DEPENDENCY_TREE_MISSING','RUNTIME_BUNDLE_INVENTORY_MISSING','LOCKFILE_NOT_VERSIONED']);
report.status=report.findings.some(f=>blocking.has(f.code))?'HOLD':(report.findings.some(f=>f.code==='LICENSE_NOTICE_MISSING')?'PARTIAL':'READY_FOR_LEGAL_REVIEW');
const outputDir=join(root,'build','ticari-uygunluk');
mkdirSync(outputDir,{recursive:true});
const auditFile=join(outputDir,'lisans-envanteri.json');
writeFileSync(auditFile,JSON.stringify(report,null,2)+'\n');
console.log('Ticari lisans ön denetimi:',report.status,'paket:',report.count,'bulgu:',report.findings.length);
for(const f of report.findings.slice(0,50))console.log(' -',f.code,f.path,f.detail);
if(report.findings.length>50)console.log('... devamı için:',auditFile);
console.log('Kanıt:',auditFile);
// Geliştirme denetimi HOLD bulgularını kayıt eder. Dağıtım kapısı bunları FAIL yapar.
// CI yeşili, ticari dağıtım onayı değildir.
if(strict&&report.status!=='READY_FOR_LEGAL_REVIEW')process.exitCode=1;
