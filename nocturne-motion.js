(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const header = document.querySelector('.header');
  const hero = document.querySelector('.cinematic-hero');
  const photos = [...document.querySelectorAll('.muse-image>img,.craft-visual img')];
  const cards = [...document.querySelectorAll('.muse-image')];
  const sections = [...document.querySelectorAll('main section,.cinematic-hero')];
  const magnetic = [...document.querySelectorAll('.magnetic')];
  const events = new AbortController();
  const on = (target,type,callback,options={}) => target?.addEventListener(type,callback,{...options,signal:events.signal});
  let raf = 0, heroVisible = true, suspended = false;
  let paused = document.body.classList.contains('motion-paused');
  const canMove = () => !reduced.matches && !paused && !suspended && !document.hidden;
  const running = new Set();
  function animate(node, frames, options) {
    if (!canMove() || !node.animate) return;
    const animation = node.animate(frames, options); running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  }
  const textFrames = [{opacity:0,transform:'translateY(25px)',filter:'blur(4px)'},{opacity:1,transform:'none',filter:'blur(0)'}];
  document.querySelectorAll('.hero-copy .eyebrow, h1 span, h1 em, .hero-caption, .hero-actions').forEach((node,index) => animate(node,textFrames,{duration:1100,delay:index*125,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  const reveal = new IntersectionObserver(entries => {
    if(suspended)return;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const node = entry.target;
      const pieces=node.children.length>1?[...node.children]:[node];
      pieces.forEach((piece,index)=>animate(piece,textFrames,{duration:950,delay:index*100,easing:'cubic-bezier(.16,1,.3,1)'}));
      reveal.unobserve(node);
      unrevealed.delete(node);
    }
  },{threshold:.13});
  const unrevealed = new Set(document.querySelectorAll('.section-intro,.scent-intro,.collection-heading,.muse-card,.craft-copy,.film-heading,.invitation,.footer-wordmark'));
  const onStage = new Set();
  function paintStages(){
    sections.forEach(section=>section.classList.toggle('is-on-stage',canMove()&&onStage.has(section)));
  }
  const stageObserver = new IntersectionObserver(entries => {
    if(suspended)return;
    for(const entry of entries){
      if(entry.isIntersecting)onStage.add(entry.target);else onStage.delete(entry.target);
      if(entry.target===hero)heroVisible=entry.isIntersecting;
    }
    paintStages();
  },{threshold:.01});
  function observe(){
    unrevealed.forEach(node=>reveal.observe(node));
    sections.forEach(section=>stageObserver.observe(section));
  }
  observe();
  function onScroll() {
    if(raf||suspended||document.hidden)return;
    raf=requestAnimationFrame(()=>{
      raf=0;header?.classList.toggle('is-scrolled',scrollY>30);
      if(!canMove())return;
      for(const image of photos){const rect=image.parentElement.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){const offset=Math.max(-14,Math.min(14,(innerHeight/2-rect.top-rect.height/2)*.035));image.style.setProperty('--photo-y',`${offset}px`);}}
    });
  }
  on(window,'scroll',onScroll,{passive:true});onScroll();
  on(hero,'pointermove',event=>{
    if(!canMove()||!fine.matches||!heroVisible)return;
    const rect=hero.getBoundingClientRect();
    hero.style.setProperty('--hero-x',`${((event.clientX-rect.left)/rect.width-.5)*-9}px`);
    hero.style.setProperty('--hero-y',`${((event.clientY-rect.top)/rect.height-.5)*-7}px`);
  },{passive:true});
  function resetHero(){hero?.style.setProperty('--hero-x','0px');hero?.style.setProperty('--hero-y','0px');}
  on(hero,'pointerleave',resetHero,{passive:true});
  magnetic.forEach(button=>{
    on(button,'pointermove',event=>{
      if(!canMove()||!fine.matches)return;
      const rect=button.getBoundingClientRect();
      button.style.translate=`${(event.clientX-rect.left-rect.width/2)*.055}px ${(event.clientY-rect.top-rect.height/2)*.09}px`;
    },{passive:true});
    on(button,'pointerleave',()=>button.style.translate='0px 0px');
    on(button,'focus',()=>button.style.translate='0px 0px');
  });
  function resetCard(card){
    card.style.setProperty('--card-rx','0deg');card.style.setProperty('--card-ry','0deg');
    card.style.setProperty('--card-x','50%');card.style.setProperty('--card-y','50%');
  }
  cards.forEach(card=>{
    resetCard(card);
    on(card,'pointermove',event=>{
      if(!canMove()||!fine.matches||event.pointerType==='touch')return;
      const rect=card.getBoundingClientRect();
      const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
      const y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
      card.style.setProperty('--card-rx',`${(-y*2.3).toFixed(3)}deg`);
      card.style.setProperty('--card-ry',`${(x*2.3).toFixed(3)}deg`);
      card.style.setProperty('--card-x',`${((x+1)*50).toFixed(2)}%`);
      card.style.setProperty('--card-y',`${((y+1)*50).toFixed(2)}%`);
    },{passive:true});
    on(card,'pointerleave',()=>resetCard(card),{passive:true});
    on(card.closest('.muse-card')||card,'focusin',()=>resetCard(card));
  });
  const content={cap:['The silhouette','A conceptual light study of the Michael sculpture. Drag to explore its form.'],body:['100 ml','Eau de parfum. The Michael collection is offered in Pink Candy Rose and Silver finishes.'],base:['The signature','The oval plinth carries the Steeltown Michael signature.']};
  const hotspots=[...document.querySelectorAll('[data-hotspot]')], popover=document.getElementById('spec-popover');
  hotspots.forEach(button=>on(button,'click',()=>{
    const expanded=button.getAttribute('aria-expanded')==='true';
    hotspots.forEach(item=>item.setAttribute('aria-expanded','false'));
    popover.hidden=expanded;
    if(!expanded){button.setAttribute('aria-expanded','true');const [title,copy]=content[button.dataset.hotspot];const heading=document.createElement('strong');heading.textContent=title;popover.replaceChildren(heading,document.createTextNode(copy));}
  }));
  on(document,'keydown',event=>{if(event.key==='Escape'){if(popover)popover.hidden=true;hotspots.forEach(item=>item.setAttribute('aria-expanded','false'));}});
  function resetMotion(){
    resetHero();cards.forEach(resetCard);
    photos.forEach(image=>image.style.setProperty('--photo-y','0px'));
    magnetic.forEach(button=>button.style.translate='0px 0px');
  }
  function syncMotion(){
    if(!canMove()){running.forEach(animation=>animation.cancel());resetMotion();}
    paintStages();onScroll();
  }
  on(reduced,'change',syncMotion);
  on(fine,'change',()=>{if(!fine.matches)resetMotion();});
  on(document,'steeltown:motion',event=>{paused=!!event.detail?.paused;syncMotion();});
  on(document,'visibilitychange',syncMotion);
  on(window,'pagehide',event=>{
    suspended=true;
    if(raf)cancelAnimationFrame(raf);raf=0;
    running.forEach(animation=>animation.cancel());
    resetMotion();paintStages();
    reveal.disconnect();stageObserver.disconnect();
    if(!event.persisted)events.abort();
  });
  on(window,'pageshow',event=>{
    if(!event.persisted)return;
    suspended=false;onStage.clear();observe();syncMotion();
  });
})();
