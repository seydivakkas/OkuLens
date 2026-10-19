/* Windows x64 tasinabilir Electron paketi.
 * Kurulum ve model indirme adimi yok; imza/SmartScreen kabulü ayrıdır.
 */
import {packager} from '@electron/packager';
import {resolve} from 'node:path';
const root=resolve('.');
const out=resolve('dist/desktop');
const result=await packager({
 dir:root,
 name:'OkuLens',
 electronVersion:'44.9.0',
 platform:'win32',
 arch:'x64',
 executableName:'OkuLens',
 out,
 overwrite:true,
 asar:true,
 prune:true,
 ignore:[
  /[/\\]\.git(?:[/\\]|$)/,
  /[/\\](?:\.github|tests|docs|kanitlar|models|coverage|dist)(?:[/\\]|$)/,
  /[/\\]vendor[/\\](?:runtime-inputs\.json|runtime-build\.json)/,
  /[/\\]package-lock\.json\.bak$/
 ]
});
console.log('Windows tasinabilir uygulama klasoru:',result.join(', '));
console.log('Bu bir installer veya kod imzali ticari surum degildir; Windows fiziksel kabul HOLD.');
