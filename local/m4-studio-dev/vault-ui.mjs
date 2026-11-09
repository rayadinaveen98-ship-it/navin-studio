/** Local-only E1 Vault assets; not part of public Studio or Cloudflare Worker. */
import {readFileSync} from 'node:fs';
export const vaultAssets=Object.freeze({
  html:readFileSync(new URL('./studio-vault.html',import.meta.url),'utf8'),
  css:readFileSync(new URL('./studio-vault.css',import.meta.url),'utf8'),
  js:readFileSync(new URL('./studio-vault.js',import.meta.url),'utf8'),
});
