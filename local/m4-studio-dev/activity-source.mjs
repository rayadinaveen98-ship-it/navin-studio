/** M4-D4 cross-project public activity. No private events, credentials, writes or APK claims. */
import {projects} from './source-adapter.mjs';
import {readGitHub} from './workspace-source.mjs';

const SHA=/^[0-9a-f]{40}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const iso=(s)=>typeof s==='string'&&!Number.isNaN(Date.parse(s))?new Date(s).toISOString():null;
const title=(s)=>typeof s==='string'?(s.split('\n')[0].trim().slice(0,160)||'Untitled commit'):'Untitled commit';
const observed=(clock)=>{const d=clock();return d instanceof Date&&!Number.isNaN(d.getTime())?d.toISOString():null};
const limit=8;

export function createActivitySource({mode='fixture',fetchImpl=globalThis.fetch,clock=()=>new Date()}={}) {
  if(!['fixture','github'].includes(mode))throw Error('Unsupported source mode');
  return {
    async load(){
      const at=observed(clock);
      if(mode==='fixture')return {
        ok:true, mode:'fixture',scope:'SIMULATED DATA — NOT LIVE',observed_at:at,
        source_count:projects.length, release_ready:null, network_requests:0,
        sources:projects.map(p=>({id:p.id,name:p.name,repository:p.repository,state:'simulated',observed_at:at,items:1})),
        records:projects.map((p,i)=>({project_id:p.id,project_name:p.name,repository:p.repository,
          title:['Example: plan a new release review','Example: improve interface layout','Example: verify regression checks','Example: research next milestone'][i%4],
          sha:null,short_sha:null,url:null,authored_at:null,author:null,simulated:true}))
      };
      // Each explicit refresh uses just one read-only public GitHub commit request per catalog repo.
      // No unrestricted URL, user-supplied repo or hidden automatic polling.
      const entries=await Promise.all(projects.slice(0,limit).map(async(p)=>{
        if(!REPO.test(p.repository))return {project:p,state:'unavailable',item:null};
        const url='https://api.github.com/repos/'+p.repository+'/commits?per_page=1';
        const result=await readGitHub(url,fetchImpl,true);
        if(result.state!=='current')return {project:p,state:result.state,item:null};
        const raw=result.value;
        if(!Array.isArray(raw))return {project:p,state:'unavailable',item:null};
        if(raw.length===0)return {project:p,state:'no_records',item:null};
        const first=raw[0],sha=first?.sha;
        const exact='https://github.com/'+p.repository+'/commit/'+sha;
        if(typeof sha!=='string'||!SHA.test(sha)||first.html_url!==exact)
          return {project:p,state:'unavailable',item:null};
        // Require precise time for chronological sorting; do not call an unknown date 'recent'.
        const when=iso(first.commit?.author?.date)||iso(first.commit?.committer?.date);
        if(!when)return {project:p,state:'unavailable',item:null};
        return {project:p,state:'current',item:{project_id:p.id,project_name:p.name,repository:p.repository,
          title:title(first.commit?.message),sha,short_sha:sha.slice(0,7),url:exact,authored_at:when,
          author:typeof first.author?.login==='string'?first.author.login.slice(0,70):null,simulated:false}};
      }));
      const records=entries.filter(x=>x.item).map(x=>x.item)
        .sort((a,b)=>b.authored_at.localeCompare(a.authored_at)||a.project_id.localeCompare(b.project_id));
      return {ok:true,mode:'github',scope:'PUBLIC GITHUB — latest one commit per repository, not all work or priority',
        observed_at:at,release_ready:null,source_count:entries.length,network_requests:entries.length,
        sources:entries.map(x=>({id:x.project.id,name:x.project.name,repository:x.project.repository,
          state:x.state,items:x.item?1:0,observed_at:at})),records};
    }
  };
}
