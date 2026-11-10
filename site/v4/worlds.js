/** NAVIN STUDIO V4.3 — public Project Worlds progressive enhancement.
 * Requires existing verified public `projects` and M3 renderProjectExperience.
 * No private API calls, downloads, counters, or inferred product releases.
 */
(() => {
  'use strict';
  if (typeof window.renderProjectExperience !== 'function') return;
  const previousRender = window.renderProjectExperience;
  const projectRoot = document.getElementById('project-experience-content');
  if (!projectRoot) return;
  const maxFocusProjects = 8;
  let activeProject = '';

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function enhance(project) {
    if (!project || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id)) return;
    const root = document.getElementById('project-experience-content');
    const hero = root?.querySelector('.px-hero');
    const breadcrumb = root?.querySelector('.px-breadcrumb');
    const explore = root?.querySelector('.px-explore');
    if (!root || !hero || !breadcrumb || !explore) return;
    root.classList.add('v43-world');
    root.dataset.world = project.id;
    activeProject = project.id;

    // Canonical projects only: this navigation is never an invented release feed.
    const all = typeof projects !== 'undefined' && Array.isArray(projects) ? projects.slice(0,maxFocusProjects) : [project];
    const nav = make('nav','v43-world-nav');
    nav.setAttribute('aria-label','Explore all studio project worlds');
    const navLabel = make('div','v43-world-nav-title');
    navLabel.append(make('span','v43-nav-marker','N/S'), make('span','v43-nav-label','WORLD INDEX'));
    const rail = make('div','v43-world-rail');
    all.forEach((item,index) => {
      const button = make('button','v43-world-link');
      button.type = 'button';
      button.dataset.project = item.id;
      button.setAttribute('aria-label','Explore '+item.name);
      if (item.id === project.id) { button.classList.add('is-current'); button.setAttribute('aria-current','page'); }
      button.append(make('span','v43-world-number',String(index+1).padStart(2,'0')),make('span','v43-world-name',item.name));
      rail.append(button);
    });
    nav.append(navLabel,rail);
    breadcrumb.before(nav);
    const currentButton=nav.querySelector('.is-current');
    if (currentButton) {currentButton.scrollIntoView?.({block:'nearest',inline:'nearest'});}

    // Project identity is tied to the public catalog and existing M3 editorial text.
    const stageMark = make('div','v43-stage-mark');
    stageMark.setAttribute('aria-hidden','true');
    stageMark.append(make('span','v43-stage-mark-inner',project.mark || project.name.slice(0,1)));
    hero.append(stageMark);
    hero.querySelector('.px-copy')?.insertAdjacentElement('afterbegin', (() => {
      const plate = make('div','v43-hero-plate');
      plate.append(make('span','v43-plate-line','NAVIN STUDIO / CREATIVE UNIVERSE'),make('span','v43-plate-coordinate', 'WORLD '+String(all.findIndex(item=>item.id===project.id)+1).padStart(2,'0')+' / '+String(all.length).padStart(2,'0')));
      return plate;
    })());
    const art=hero.querySelector('.px-art');
    if (art) art.setAttribute('aria-hidden','true');
    const visualNote=make('span','v43-art-disclaimer','CONCEPT VISUAL / NOT A PRODUCT SCREENSHOT');
    if (art) art.append(visualNote);
    hero.addEventListener('pointermove', event => {
      if (!window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
      const bounds=hero.getBoundingClientRect();
      const x=(event.clientX-bounds.left)/bounds.width-.5;
      const y=(event.clientY-bounds.top)/bounds.height-.5;
      hero.style.setProperty('--v43-shift-x',(x*12).toFixed(2)+'px');
      hero.style.setProperty('--v43-shift-y',(y*10).toFixed(2)+'px');
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{hero.style.removeProperty('--v43-shift-x');hero.style.removeProperty('--v43-shift-y');},{passive:true});

    // Preserve the three source-authored craft facets, upgrading them into an
    // accessible, reversible exploration rather than fictitious product features.
    const facets = [...explore.querySelectorAll('.px-facet')].slice(0,3).map((node,index)=>({
      name:node.querySelector('h3')?.textContent?.trim()||('Direction '+(index+1)),
      description:node.querySelector('p')?.textContent?.trim()||''
    }));
    if (facets.length!==3) return;
    explore.classList.add('v43-explore');
    const tabs = explore.querySelector('.px-facets');
    if (!tabs) return;
    tabs.replaceChildren();
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Explore three creative directions');
    const panel = make('div','v43-lens-panel');
    panel.id='v43-lens-panel';
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('tabindex','0');
    panel.setAttribute('aria-live','polite');
    const panelSymbol = make('span','v43-lens-symbol',project.mark||'N');
    panelSymbol.setAttribute('aria-hidden','true');
    const panelInner = make('div','v43-lens-content');
    const panelEyebrow = make('span','v43-lens-eyebrow','CREATIVE DIRECTION / 01');
    const panelName = make('h3','v43-lens-name');
    const panelDescription = make('p','v43-lens-description');
    const panelFooter = make('p','v43-lens-disclosure','An exploration of intent — not a shipped feature or playable demo.');
    panelInner.append(panelEyebrow,panelName,panelDescription,panelFooter);
    panel.append(panelSymbol,panelInner);
    tabs.after(panel);
    const buttons=facets.map((item,index) => {
      const button = make('button','px-facet v43-lens');
      button.type='button';
      button.id='v43-lens-'+index;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','v43-lens-panel');
      button.append(make('span','v43-lens-index','0'+(index+1)),make('span','v43-lens-title',item.name),make('span','v43-lens-tease',item.description),make('span','v43-lens-arrow','↗'));
      tabs.append(button);
      button.addEventListener('click',()=>selectLens(index));
      button.addEventListener('keydown', event => {
        const next=event.key==='ArrowRight'||event.key==='ArrowDown'?index+1:
          event.key==='ArrowLeft'||event.key==='ArrowUp'?index-1:
          event.key==='Home'?0:event.key==='End'?facets.length-1:null;
        if(next===null)return;
        event.preventDefault();
        const target=(next+facets.length)%facets.length;
        selectLens(target);
        buttons[target]?.focus();
      });
      return button;
    });
    function selectLens(index){
      buttons.forEach((b,i)=>{const selected=i===index;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;b.classList.toggle('is-active',selected);});
      const item=facets[index];
      panel.setAttribute('aria-labelledby',buttons[index].id);
      panel.dataset.lens=String(index);
      panelEyebrow.textContent='CREATIVE DIRECTION / 0'+(index+1);
      panelName.textContent=item.name;
      panelDescription.textContent=item.description;
    }
    selectLens(0);
    const frontMatter = make('div','v43-explore-label');
    frontMatter.append(make('span','v43-line-accent'),make('span','v43-gloss','SELECT A CREATIVE LENS TO EXPLORE THE IDEA'));
    tabs.before(frontMatter);

    // Link adjacent worlds through the established public route and catalog.
    const currentIndex=all.findIndex(item=>item.id===project.id);
    if (currentIndex!==-1) {
      const next=all[(currentIndex+1)%all.length];
      const switcher=make('section','v43-next-world');
      switcher.setAttribute('aria-label','Continue exploring studio creations');
      const text=make('div','v43-next-copy');
      text.append(make('span','v43-next-kicker','NEXT WORLD  /  '+String((currentIndex+1)%all.length+1).padStart(2,'0')),make('h2','v43-next-heading',next.name),make('p','v43-next-details','Continue your journey through the public studio catalog.'));
      const button=make('button','v43-next-action','Explore '+next.name+'  ↗');
      button.type='button';button.dataset.project=next.id;
      switcher.append(text,button);
      root.append(switcher);
    }
  }

  window.renderProjectExperience = function(project){
    previousRender(project);
    enhance(project);
  };
  // Initial deep links may have rendered before this enhancement was installed.
  const current = /^#project\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(location.hash);
  if (current && typeof projects !== 'undefined') {
    const project=projects.find(item=>item.id===current[1]);
    if(project) window.renderProjectExperience(project);
  }
})();
