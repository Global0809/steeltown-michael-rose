(() => {
  'use strict';
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const lifecycle=new AbortController(), observers=[];
  const on=(target,event,fn,options={})=>target.addEventListener(event,fn,{...options,signal:lifecycle.signal});
  let paused=preference.matches, scrollFrame=0, pointerFrame=0, pointer=null;
  const hero=document.querySelector('#experience'), story=document.querySelector('#story');
  const scenes=[...document.querySelectorAll('main>section,.brand-ribbon')];
  const headingParts=[...document.querySelectorAll('.experience h1>span,.experience h1>em')];
  headingParts.forEach((element,index)=>{
    const text=element.textContent;
    const spoken=document.createElement('span');spoken.className='sr-only';spoken.textContent=text;
    const visual=document.createElement('span');visual.className='title-visual';visual.setAttribute('aria-hidden','true');
    text.split(/\s+/).forEach((word,i)=>{const span=document.createElement('span');span.className='title-word';span.textContent=word;span.style.setProperty('--i',index*2+i);visual.append(span);if(i<text.split(/\s+/).length-1)visual.append(' ');});
    element.replaceChildren(spoken,visual);
  });
  document.querySelectorAll('.section-heading h2 em,.craft-copy h2 em,.romance-copy h2 em,.closing h2 em').forEach(element=>element.classList.add('emphasis-flow'));
  const reveals=[...document.querySelectorAll('.section-heading,.product-card,.craft-image,.craft-copy,.romance-copy,.hero-media,.closing h2')];
  if('IntersectionObserver' in window){
    const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');reveal.unobserve(entry.target);}}),{threshold:.04,rootMargin:'0px 0px 40px 0px'});
    reveals.forEach(element=>{element.classList.add('reveal-ready');if(element.matches('.product-card,.craft-image,.hero-media'))element.classList.add('image-reveal');if(paused)element.classList.add('is-visible');else reveal.observe(element);});
    observers.push(reveal);
    const visible=new IntersectionObserver(entries=>entries.forEach(entry=>{entry.target.classList.toggle('is-outside',!entry.isIntersecting);if(entry.target===story&&entry.isIntersecting)story.classList.add('story-in-view');}),{threshold:0,rootMargin:'80px'});
    scenes.forEach(section=>visible.observe(section));observers.push(visible);
    document.body.classList.add('motion-ready');
  }
  const movingPhotos=[{section:story,image:document.querySelector('#campaign-portrait'),travel:44},{section:document.querySelector('#details'),image:document.querySelector('.craft-image>img'),travel:18}];
  function updateScroll(){
    scrollFrame=0;document.querySelector('.header').classList.toggle('is-scrolled',scrollY>35);
    if(paused||document.hidden||document.querySelector('dialog[open]'))return;
    for(const {section,image,travel} of movingPhotos){
      const rect=section.getBoundingClientRect();if(rect.bottom<=0||rect.top>=innerHeight)continue;
      const progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));
      image.style.setProperty('--photo-y',((progress-.5)*travel)+'px');
      section.style.setProperty('--inset-y',((progress-.5)*-65)+'px');
    }
    const closing=document.querySelector('#forever'),rect=closing.getBoundingClientRect();
    if(rect.bottom>0&&rect.top<innerHeight)closing.style.setProperty('--inset-y',((innerHeight-rect.top)/(innerHeight+rect.height)*42-21)+'px');
  }
  function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);}
  function paint(){
    paused=preference.matches;document.body.classList.toggle('motion-paused',paused);
    document.dispatchEvent(new CustomEvent('steeltown:motion',{detail:{paused}}));
    if(paused){
      reveals.forEach(element=>element.classList.add('is-visible'));
      document.querySelectorAll('.tap-glow').forEach(node=>node.remove());
      document.querySelectorAll('.product-image').forEach(element=>{element.style.removeProperty('--card-x');element.style.removeProperty('--card-y');});
      if(pointerFrame)cancelAnimationFrame(pointerFrame);pointerFrame=0;pointer=null;
    }
    scheduleScroll();
  }
  on(preference,'change',paint);paint();
  on(window,'scroll',scheduleScroll,{passive:true});on(window,'resize',scheduleScroll,{passive:true});
  on(document,'pointermove',event=>{
    if(paused||!fine.matches||document.hidden||document.querySelector('dialog[open]'))return;
    const surface=event.target.closest('.experience,.product-image,.closing');if(!surface)return;
    pointer={surface,x:event.clientX,y:event.clientY};
    if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{
      pointerFrame=0;if(!pointer||paused)return;
      const {surface,x,y}=pointer,rect=surface.getBoundingClientRect();
      const px=Math.max(0,Math.min(1,(x-rect.left)/rect.width)),py=Math.max(0,Math.min(1,(y-rect.top)/rect.height));
      surface.style.setProperty('--light-x',(px*100)+'%');surface.style.setProperty('--light-y',(py*100)+'%');
      surface.style.setProperty('--pointer-x',(px*100)+'%');surface.style.setProperty('--pointer-y',(py*100)+'%');
      if(surface.matches('.product-image')){surface.style.setProperty('--card-x',((.5-py)*3)+'deg');surface.style.setProperty('--card-y',((px-.5)*3)+'deg');}
      pointer=null;
    });
  },{passive:true});
  document.querySelectorAll('.product-image').forEach(surface=>on(surface,'pointerleave',()=>{surface.style.setProperty('--card-x','0deg');surface.style.setProperty('--card-y','0deg');if(pointer?.surface===surface)pointer=null;}));
  on(document,'pointerdown',event=>{
    if(paused||!event.target.closest('button:not(:disabled),a'))return;
    document.querySelectorAll('.tap-glow').forEach(node=>node.remove());
    const glow=document.createElement('i');glow.className='tap-glow';glow.setAttribute('aria-hidden','true');glow.style.left=(event.clientX-20)+'px';glow.style.top=(event.clientY-20)+'px';document.body.append(glow);glow.addEventListener('animationend',()=>glow.remove(),{once:true});
  },{passive:true});
  function visibility(){document.body.classList.toggle('scene-hidden',document.hidden);if(!document.hidden)scheduleScroll();}
  on(document,'visibilitychange',visibility);visibility();
  on(window,'pagehide',event=>{if(scrollFrame)cancelAnimationFrame(scrollFrame);if(pointerFrame)cancelAnimationFrame(pointerFrame);scrollFrame=0;pointerFrame=0;pointer=null;if(!event.persisted){observers.forEach(observer=>observer.disconnect());lifecycle.abort();}});
  on(window,'pageshow',()=>{visibility();paint();});
})();
