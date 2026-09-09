(() => {
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const buttons=[document.getElementById('motion-toggle'),document.getElementById('footer-motion')];
  let paused=preference.matches, frame=0;
  function paint() {
    document.body.classList.toggle('motion-paused',paused);
    buttons.forEach(button=>{button.textContent=preference.matches?'Reduced motion':paused?'Enable motion':'Pause motion';button.disabled=preference.matches;button.setAttribute('aria-pressed',String(paused));});
    document.dispatchEvent(new CustomEvent('steeltown:motion',{detail:{paused}}));
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{paused=!paused;paint();}));
  preference.addEventListener('change',()=>{paused=preference.matches;paint();});paint();
  const candidates=[...document.querySelectorAll('.section-heading, .product-image, .product-title, .craft-image, .craft-copy, .romance-image, .romance-copy .eyebrow, .romance-copy h2 span, .romance-copy h2 em, .romance-copy .text-link, .signature, .closing h2')];
  if('IntersectionObserver' in window && !preference.matches) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.02,rootMargin:'0px 0px 30px 0px'});
    candidates.forEach((element,index)=>{element.classList.add('reveal-ready');element.style.setProperty('--delay',`${index%2*90}ms`);observer.observe(element);});
    const storyObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){document.getElementById('story').classList.add('story-in-view');storyObserver.disconnect();}},{threshold:.25});storyObserver.observe(document.getElementById('story'));
  } else document.getElementById('story').classList.add('story-in-view');
  const image=document.getElementById('campaign-portrait');
  function scrollUpdate() {
    frame=0;
    if(paused||preference.matches||innerWidth<=760)return;
    const r=image.parentElement.getBoundingClientRect();
    if(r.bottom>0&&r.top<innerHeight){const progress=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));image.style.setProperty('--photo-y',`${(progress-.5)*26}px`);}
  }
  addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(scrollUpdate);},{passive:true});
  addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;});
})();
