(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const header = document.querySelector('.header');
  const hero = document.querySelector('.cinematic-hero');
  const photos = [...document.querySelectorAll('.muse-image>img,.craft-visual img')];
  let raf = 0, heroVisible = true;
  const running = new Set();
  function animate(node, frames, options) {
    if (reduced.matches || !node.animate) return;
    const animation = node.animate(frames, options); running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  }
  const textFrames = [{opacity:0,transform:'translateY(25px)',filter:'blur(4px)'},{opacity:1,transform:'none',filter:'blur(0)'}];
  document.querySelectorAll('.hero-copy .eyebrow, h1 span, h1 em, .hero-caption, .hero-actions').forEach((node,index) => animate(node,textFrames,{duration:1100,delay:index*125,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const node = entry.target;
      const pieces=node.children.length>1?[...node.children]:[node];
      pieces.forEach((piece,index)=>animate(piece,textFrames,{duration:950,delay:index*100,easing:'cubic-bezier(.16,1,.3,1)'}));
      reveal.unobserve(node);
    }
  },{threshold:.13});
  document.querySelectorAll('.section-intro,.scent-intro,.collection-heading,.muse-card,.craft-copy,.film-heading,.invitation,.footer-wordmark').forEach(node => reveal.observe(node));
  const heroObserver = new IntersectionObserver(entries => {heroVisible=entries[0].isIntersecting;},{threshold:0});
  heroObserver.observe(hero);
  function onScroll() {
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      raf=0;header.classList.toggle('is-scrolled',scrollY>30);
      if(reduced.matches)return;
      for(const image of photos){const rect=image.parentElement.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){const offset=Math.max(-14,Math.min(14,(innerHeight/2-rect.top-rect.height/2)*.035));image.style.setProperty('--photo-y',`${offset}px`);}}
    });
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  hero.addEventListener('pointermove',event=>{
    if(reduced.matches||!fine.matches||!heroVisible)return;
    const rect=hero.getBoundingClientRect();
    hero.style.setProperty('--hero-x',`${(event.clientX/rect.width-.5)*-9}px`);
    hero.style.setProperty('--hero-y',`${(event.clientY/rect.height-.5)*-7}px`);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--hero-x','0px');hero.style.setProperty('--hero-y','0px');});
  document.querySelectorAll('.magnetic').forEach(button=>{
    button.addEventListener('pointermove',event=>{
      if(reduced.matches||!fine.matches)return;
      const rect=button.getBoundingClientRect();
      button.style.translate=`${(event.clientX-rect.left-rect.width/2)*.055}px ${(event.clientY-rect.top-rect.height/2)*.09}px`;
    },{passive:true});
    button.addEventListener('pointerleave',()=>button.style.translate='0px 0px');
  });
  const content={cap:['The sculptural cap','A stage-inspired silhouette. Explore the figure from every angle in the atelier.'],body:['100 ml','Eau de parfum. The Michael collection is offered in Pink Candy Rose and Silver finishes.'],base:['The signature','The oval plinth carries the Steeltown Michael signature.']};
  const hotspots=[...document.querySelectorAll('[data-hotspot]')], popover=document.getElementById('spec-popover');
  hotspots.forEach(button=>button.addEventListener('click',()=>{
    const expanded=button.getAttribute('aria-expanded')==='true';
    hotspots.forEach(item=>item.setAttribute('aria-expanded','false'));
    popover.hidden=expanded;
    if(!expanded){button.setAttribute('aria-expanded','true');const [title,copy]=content[button.dataset.hotspot];const heading=document.createElement('strong');heading.textContent=title;popover.replaceChildren(heading,document.createTextNode(copy));}
  }));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){popover.hidden=true;hotspots.forEach(item=>item.setAttribute('aria-expanded','false'));}});
  reduced.addEventListener('change',()=>{if(reduced.matches){running.forEach(animation=>animation.cancel());hero.style.setProperty('--hero-x','0px');hero.style.setProperty('--hero-y','0px');document.querySelectorAll('.magnetic').forEach(button=>button.style.translate='none');}});
  addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;running.forEach(animation=>animation.cancel());});
})();
