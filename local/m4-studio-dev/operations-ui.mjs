import {readFileSync} from 'node:fs';
export const operationsAssets=Object.freeze({
  html:readFileSync(new URL('./studio-operations.html',import.meta.url),'utf8'),
  css:readFileSync(new URL('./studio-operations.css',import.meta.url),'utf8'),
  js:readFileSync(new URL('./studio-operations.js',import.meta.url),'utf8'),
});
