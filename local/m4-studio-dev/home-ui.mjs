/** Local-only M4-D4 Home. Not exported to the public GitHub Pages build. */
import {readFileSync} from 'node:fs';
export const homeAssets=Object.freeze({
  html:readFileSync(new URL('./studio-home.html',import.meta.url),'utf8'),
  css:readFileSync(new URL('./studio-home.css',import.meta.url),'utf8'),
  js:readFileSync(new URL('./studio-home.js',import.meta.url),'utf8'),
});
