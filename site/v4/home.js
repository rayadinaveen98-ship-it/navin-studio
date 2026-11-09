/* NAVIN STUDIO V4.2 · A+C selected hybrid
   Design-review code only. Reads only the public eight-project catalog;
   no authentication, remote writes, private data, releases or invented stats. */
'use strict';
(() => {
  const parsed = JSON.parse(document.getElementById('v4-project-data').textContent);
  const catalog = parsed.projects;
  const byId = new Map(catalog.map(item => [item.id, item]));
  const publicBase = ''; // same-tab project stories use existing public SPA
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let selected = 0;
  let lastFocus = null;
  let currentDialog = null;
  let currentFilter = 'all';

  function el(tag,cls,text) {
    const n = document.createElement(tag);
    if(cls) n.className=cls;
    if(text!==undefined) n.textContent=text;
    return n;
  }
  function makeLink(href,label,cls) {
    const a=el('a',cls,label); a.href=href;
    if(/^https:\/\//.test(href)){a.target='_blank';a.rel='noopener noreferrer'}
    return a;
  }
  function uriForProject(project){return '#project/'+encodeURIComponent(project.id)}
  function sourceForProject(project){return 'https://github.com/'+project.repository}

  // Accessible universe selection: all nodes remain standard buttons.
  const atlasButtons = [...document.querySelectorAll('.atlas-node')];
  const detailArt = document.getElementById('detail-art');
  function chooseWorld(id,focus=false){
    const p=byId.get(id);if(!p)return;
    selected=catalog.indexOf(p);
    atlasButtons.forEach(b=>{
      const on=b.dataset.node===p.id;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));
      if(on&&focus)b.focus({preventScroll:true});
    });
    document.getElementById('detail-number').textContent=String(selected+1).padStart(2,'0')+' / '+String(catalog.length).padStart(2,'0');
    document.getElementById('detail-index').textContent=String(selected+1).padStart(2,'0');
    document.getElementById('detail-category').textContent=p.category.toUpperCase()+' / '+p.type;
    document.getElementById('detail-title').textContent=p.name;
    document.getElementById('detail-description').textContent=p.summary;
    document.getElementById('detail-story').href=uriForProject(p);
    document.getElementById('detail-story').setAttribute('aria-label','View public project story for '+p.name);
    document.getElementById('detail-source').href=sourceForProject(p);
    detailArt.style.backgroundImage=p.image?`linear-gradient(0deg,#0b0d17ab,#0909100c),url("${p.image}")`:'';
    detailArt.classList.toggle('has-image',Boolean(p.image));
    detailArt.querySelector('.detail-watermark').textContent=p.mark;
    detailArt.setAttribute('aria-label',p.image?'Editorial concept artwork for '+p.name:'Abstract concept illustration for '+p.name);
  }
  atlasButtons.forEach(b=>b.addEventListener('click',()=>chooseWorld(b.dataset.node)));
  document.getElementById('atlas-next').addEventListener('click',()=>chooseWorld(catalog[(selected+1)%catalog.length].id));
  document.getElementById('atlas-prev').addEventListener('click',()=>chooseWorld(catalog[(selected-1+catalog.length)%catalog.length].id));
  chooseWorld('backlot');

  // Real project-specific gallery; empty filters are explicit, not fake releases.
  const projectGrid=document.getElementById('project-grid');
  function cardFor(p,i){
    const card=el('button','project-card');card.type='button';card.dataset.id=p.id;
    card.setAttribute('aria-label','Explore '+p.name+' project preview');
    const art=el('span','card-image'+(p.image?' has-image':''));art.setAttribute('aria-hidden','true');
    if(p.image){art.style.backgroundImage=`url("${p.image}")`}
    else{const abstract=el('span','card-abstract');abstract.append(el('span','',p.mark));art.append(abstract)}
    const top=el('span','card-top');top.append(el('span','',p.type),el('i','','✧'));art.append(top);card.append(art);
    const body=el('span','card-content');body.append(el('span','card-number','0'+(i+1)+' / 08'),el('span','card-name',p.name),el('span','card-summary',p.summary));
    const bottom=el('span','card-bottom');bottom.append(el('span','card-status','DEVELOPMENT PREVIEW'),el('span','card-arrow','↗'));body.append(bottom);card.append(body);
    card.addEventListener('click',()=>openProject(p));return card;
  }
  function renderProjects(filter=currentFilter){
    currentFilter=filter;
    const matches=catalog.filter(p=>filter==='all'||p.category===filter);
    projectGrid.replaceChildren(...matches.map(p=>cardFor(p,catalog.indexOf(p))));
    document.getElementById('visible-count').textContent='SHOWING '+String(matches.length).padStart(2,'0')+' / 08';
    document.querySelectorAll('.filter-btn').forEach(b=>{const on=b.dataset.filter===filter;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
  }
  document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>renderProjects(b.dataset.filter)));
  renderProjects();

  // Search and project dialogs with Escape, Tab trap, backdrop click and focus restore.
  const backdrop=document.getElementById('dialog-backdrop');
  const dialog=backdrop.querySelector('.dialog');
  const dialogContent=document.getElementById('v4-dialog-content');
  function showDialog(){lastFocus=document.activeElement;backdrop.hidden=false;document.body.classList.add('no-scroll');document.querySelector('#view-home .v4-site-shell').inert=true;currentDialog='open';dialog.querySelector('.dialog-close').focus()}
  function closeDialog(){if(!currentDialog)return;backdrop.hidden=true;document.body.classList.remove('no-scroll');document.querySelector('#view-home .v4-site-shell').inert=false;currentDialog=null;lastFocus?.focus({preventScroll:true})}
  function openProject(p){
    if(!p)return;
    document.getElementById('dialog-eyebrow').textContent=p.type+' / DEVELOPMENT PREVIEW';
    const art=el('div','dialog-project-visual'+(p.image?' has-image':''));
    if(p.image)art.style.backgroundImage=`linear-gradient(0deg,#08081090,transparent 70%),url("${p.image}")`;
    art.append(el('span','',p.mark));
    const title=el('h2','',p.name);title.id='v4-dialog-title';
    const summary=el('p','',p.summary);
    const links=el('div','dialog-links');
    links.append(makeLink(uriForProject(p),'Read public project story ↗','button button-coral button-small'),makeLink(sourceForProject(p),'View source repository ↗','button button-ghost button-small'));
    const disclaimer=el('p','dialog-note','This is an editorial development preview, not a released product. No approved public APK or demo is available.');
    dialogContent.replaceChildren(art,title,summary,links,disclaimer);showDialog();
  }
  function renderSearchResults(q=''){
    const list=document.getElementById('v4-search-results');if(!list)return;
    const text=q.trim().toLocaleLowerCase();
    const matches=catalog.filter(p=>(p.name+' '+p.type+' '+p.category+' '+p.summary).toLocaleLowerCase().includes(text));
    if(!matches.length){list.replaceChildren(el('p','','No matching projects in the public catalog.'));return}
    const buttons=matches.map(p=>{
      const b=el('button','search-result');b.type='button';b.append(el('span','',p.name),el('small','',p.type+' · Development preview'));
      b.addEventListener('click',()=>{closeDialog();openProject(p)});return b;
    });list.replaceChildren(...buttons);
  }
  function openSearch(){
    document.getElementById('dialog-eyebrow').textContent='SEARCH THE CREATIVE UNIVERSE';
    const title=el('h2','', 'Find a world.');title.id='v4-dialog-title';
    const input=el('input','dialog-input');input.type='search';input.id='v4-search-input';input.placeholder='Project name, category or idea';input.autocomplete='off';input.setAttribute('aria-label','Search studio projects');
    const results=el('div','v4-search-results');results.id='v4-search-results';results.setAttribute('aria-live','polite');
    dialogContent.replaceChildren(title,input,results);
    input.addEventListener('input',()=>renderSearchResults(input.value));
    renderSearchResults();showDialog();input.focus();
  }
  document.querySelectorAll('[data-search]').forEach(b=>b.addEventListener('click',openSearch));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeDialog));
  backdrop.addEventListener('click',ev=>{if(ev.target===backdrop)closeDialog()});
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape') {if(currentDialog){ev.preventDefault();closeDialog()}}
    if(ev.key==='Tab'&&currentDialog){
      const candidates=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(n=>n.getClientRects().length);
      if(!candidates.length)return;
      const first=candidates[0],last=candidates[candidates.length-1];
      if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}
      else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
    }
  });

  window.addEventListener('hashchange',()=>{if(!document.getElementById('view-home').classList.contains('is-active')&&currentDialog)closeDialog()});

  // Mobile navigation behaves like navigation, with reliable expanded state.
  const menu=document.getElementById('nav-menu');const mobileNav=document.getElementById('v4-mobile-nav');
  function closeMenu(){mobileNav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation')}
  menu.addEventListener('click',()=>{const opening=mobileNav.hidden;mobileNav.hidden=!opening;menu.setAttribute('aria-expanded',String(opening));menu.setAttribute('aria-label',opening?'Close navigation':'Open navigation')});
  mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('click',e=>{if(!mobileNav.hidden&&!mobileNav.contains(e.target)&&!menu.contains(e.target))closeMenu()});

  // Subtle interactive stage tilt. Entirely disabled for reduced motion/touch.
  const stage=document.querySelector('.hero-stage');
  if(!reduceMotion&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();stage.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5).toFixed(2));stage.style.setProperty('--my',((e.clientY-r.top)/r.height-.5).toFixed(2));});
    stage.addEventListener('pointerleave',()=>{stage.style.setProperty('--mx','0');stage.style.setProperty('--my','0')});
  }

  // The existing public M3 runtime owns the approved V3 intro and the global / shortcut.
  document.getElementById('replay-intro').addEventListener('click',()=>document.getElementById('studio-replay-intro')?.click());
  document.querySelectorAll('#view-home [data-v4-scroll]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();
    const to=link.dataset.v4Scroll;
    const target=to==='top'?document.getElementById('view-home'):document.getElementById(to);
    target?.scrollIntoView({behavior:reduceMotion?'instant':'smooth',block:'start'});
    closeMenu();
  }));
  // Main runtime handles browser hash routing. Avoid starting a second SPA.
  // Design-review-only safety: don't hijack the user's live public site.
  console.info('NAVIN STUDIO V4.2 — public A+C Home; existing public project routes retained; zero approved releases.');
})();
