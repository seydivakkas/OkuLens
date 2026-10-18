/* OkuLens: ticari uzantı paketine npm lisans/bildirim dosyalarını ekle.
 * Bu betik paketleme aşamasında zorunludur, lisans metni değiştirmez.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.');
const audit=join(root,'build','ticari-uygunluk','lisans-envanteri.json');
if(!existsSync(audit))throw new Error('COMMERCIAL_AUDIT_MISSING: önce npm run commercial:check');
const report=JSON.parse(readFileSync(audit,'utf8'));
if(report.status==='HOLD')console.warn('Ticari dağıtım HOLD: Lisans sınıflandırması bitmemiş paketler mevcut.');
const out=join(root,'vendor','ticari-lisanslar');
mkdirSync(out,{recursive:true});
const copied=[],missing=[];
function safe(id){return id.replace(/[^a-z0-9._-]/gi,'_');}
for(const entry of report.packages){
 if(!entry.files.length){missing.push(entry.name+'@'+entry.version);continue;}
 for(const filename of entry.files){
  const source=join(root,filename);
  const newName=safe(entry.name+'@'+entry.version)+'--'+safe(basename(filename));
  const dest=join(out,newName);
  copyFileSync(source,dest);
  const hash=createHash('sha256').update(readFileSync(dest)).digest('hex');
  copied.push({name:entry.name,version:entry.version,license:entry.license,file:newName,sha256:hash});
 }
}
for(const fname of ['vendor/readability/LICENSE.md','vendor/readability/NOTICE']){
 const src=join(root,fname);
 if(!existsSync(src))throw new Error('VENDORED_LICENSE_MISSING '+fname);
 const dest=join(out,'readability--'+basename(fname));copyFileSync(src,dest);
 copied.push({name:'Mozilla Readability',version:'0.6.0',license:'Apache-2.0',
  file:basename(dest),sha256:createHash('sha256').update(readFileSync(dest)).digest('hex')});
}
const manifest={schemaVersion:1,notice:'Bu dosyalar ilgili üçüncü taraf hak sahiplerinin kendi lisans koşullarına tabidir.',
 generatedAt:new Date().toISOString(),documents:copied,missingLicenseTexts:missing};
writeFileSync(join(out,'LISANS_ENVANTERI.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Ticari bildirim dosyaları hazır:',copied.length,'eksik metin:',missing.length);
if(missing.length)console.warn('Dağıtım HOLD: Eksik lisans metinleri:',missing.join(', '));
if(process.argv.includes('--release')&&(missing.length||report.status!=='READY_FOR_LEGAL_REVIEW'))process.exitCode=1;
