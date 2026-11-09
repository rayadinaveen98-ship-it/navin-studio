import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const dir=resolve('dist');
await mkdir(dir,{recursive:true});
const assets=['index.html','workspace.html','studio-home.css','studio-home.js','workspace.css','workspace.js','studio-cloud.html','studio-cloud.css'];
for(const asset of assets)await copyFile(resolve(asset),resolve(dir,asset));
await build({entryPoints:['src/studio-cloud-entry.mjs'],outfile:resolve(dir,'studio-cloud.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
console.log('Built protected Studio preview assets into dist/');
