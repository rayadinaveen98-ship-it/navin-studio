import {readFileSync} from 'node:fs';
const base=new URL('.',import.meta.url);
export const backupAssets=Object.freeze({
  html:readFileSync(new URL('./studio-backup.html',base),'utf8'),
  css:readFileSync(new URL('./studio-backup.css',base),'utf8'),
  js:readFileSync(new URL('./studio-backup.js',base),'utf8')
});
