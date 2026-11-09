import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
export const planningAssets=Object.freeze({
 html:readFileSync(join(dir,'studio-planning.html'),'utf8'),
 css:readFileSync(join(dir,'studio-planning.css'),'utf8'),
 js:readFileSync(join(dir,'studio-planning.js'),'utf8')
});
