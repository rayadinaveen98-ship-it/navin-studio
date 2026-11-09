/** Local-only M4-D2 UI assets. Static files are never shipped to GitHub Pages. */
import {readFileSync} from 'node:fs';
export const workspaceAssets=Object.freeze({
  html:readFileSync(new URL('./workspace.html',import.meta.url),'utf8'),
  css:readFileSync(new URL('./workspace.css',import.meta.url),'utf8'),
  js:readFileSync(new URL('./workspace.js',import.meta.url),'utf8'),
});
