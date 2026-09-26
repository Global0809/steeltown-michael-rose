(() => {
  'use strict';
  if (window.steeltownType) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const on = (node,type,handler,options={}) => node?.addEventListener(type,handler,{...options,signal:events.signal});
  const selector = '#hero-title,#atelier-title,#edition-name,#couture-title,#scent-title,#collection-title,#craft-title,#film-title,#invitation-title,.scent-echo p,.footer-wordmark,.wordmark strong,.wordmark>span,.wordmark small,.hero-copy>.eyebrow,.collection-heading .eyebrow,.craft-copy>.eyebrow,.film-heading>.eyebrow,.invitation>.eyebrow';
  const titles = [...document.querySelectorAll(selector)];
  const visible = new Set(), entered = new WeakSet(), running = new Map(), letterAnimations = new WeakMap(), pointers = new Map();
  const dialogs = [...document.querySelectorAll('dialog')];
  let suspended = false, frame = 0, paused = false;
  const canMove = () => !reduced.matches && !document.hidden && !suspended && !paused;
  const active = title => {
    const dialog = dialogs.find(item=>item.open);
    return canMove() && visible.has(title) && (!dialog || dialog.contains(title));
  };
  function split(title) {
    if (title.querySelector('.kinetic-word')) return;
    const plain = title.cloneNode(true);
    plain.querySelectorAll('br,em,span,strong,small').forEach(node=>{
      if(node.tagName==='BR')node.replaceWith(document.createTextNode(' '));
      else{node.before(document.createTextNode(' '));node.after(document.createTextNode(' '));}
    });
    const readable=plain.textContent.replace(/\s+/g,' ').trim();
    if(title.matches('h1,h2,h3,a'))title.setAttribute('aria-label',readable);
    title.classList.add('kinetic-title');
    title.classList.toggle('kinetic-small',title.matches('.eyebrow,.wordmark strong,.wordmark>span,.wordmark small'));
    const walker = document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode())nodes.push(walker.currentNode);
    let count = 0;
    const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined,{granularity:'grapheme'}) : null;
    nodes.forEach(node=>{
      const fragment=document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(piece=>{
        if(!piece)return;
        if(/^\s+$/.test(piece)){fragment.append(document.createTextNode(piece));return;}
        const word=document.createElement('span');word.className='kinetic-word';word.setAttribute('aria-hidden','true');
        const letters=segmenter?[...segmenter.segment(piece)].map(item=>item.segment):[...piece];
        letters.forEach(letter=>{
          const glyph=document.createElement('span');glyph.className='kinetic-letter';glyph.textContent=letter;
          glyph.style.setProperty('--letter-index',String(count++));word.append(glyph);
        });
        fragment.append(word);
      });
      node.replaceWith(fragment);
    });
    if(!title.matches('h1,h2,h3,a')){
      const accessible=document.createElement('span');accessible.className='sr-only kinetic-accessible';accessible.textContent=readable;title.append(accessible);
    }
    title.querySelectorAll('em').forEach(em=>{
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 320 30');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.classList.add('type-flourish');
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M3 21C58 1 132 5 193 14S276 26 317 9');path.setAttribute('pathLength','1');svg.append(path);em.append(svg);
    });
  }
  function play(title,kind='entrance') {
    if(!active(title)||!title.animate)return;
    const letters=[...title.querySelectorAll('.kinetic-letter')];
    const small=title.classList.contains('kinetic-small');
    letters.forEach((letter,index)=>{
      letterAnimations.get(letter)?.cancel();
      const entrance=kind==='entrance';
      const animation=letter.animate(entrance?[
        {opacity:.36,transform:`translate3d(0,${small?'8px':'.29em'},0) rotate(${index%2?-5:5}deg)`,filter:small?'blur(1px)':'blur(5px)'},
        {opacity:1,transform:'translate3d(0,0,0) rotate(0deg)',filter:'blur(0px)'}
      ]:[
        {transform:'translateY(0)'},
        {transform:`translateY(${small?'-2px':'-.10em'}) rotate(-2deg)`,offset:.38},
        {transform:'translateY(0)'}
      ],{duration:entrance?1150:800,delay:Math.min(index*(entrance?22:14),entrance?550:340),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
      running.set(animation,title);letterAnimations.set(letter,animation);animation.finished.catch(()=>{}).finally(()=>running.delete(animation));
    });
  }
  function sync() {
    titles.forEach(title=>{
      const live=active(title);title.classList.toggle('is-type-live',live);
      if(live&&!entered.has(title)){entered.add(title);play(title);}
    });
    running.forEach((title,animation)=>{if(!active(title))animation.cancel();});
    if(!canMove()||dialogs.some(dialog=>dialog.open)){
      running.forEach((title,animation)=>animation.cancel());
      if(frame)cancelAnimationFrame(frame);frame=0;pointers.clear();
      titles.forEach(title=>{title.style.setProperty('--type-x','0px');title.style.setProperty('--type-y','0px');});
    }
  }
  function paintPointers() {
    frame=0;
    const values=[...pointers].map(([title,point])=>{
      const rect=title.getBoundingClientRect();
      return [title,Math.max(-1,Math.min(1,(point.x-rect.left)/rect.width*2-1))*4,Math.max(-1,Math.min(1,(point.y-rect.top)/rect.height*2-1))*3];
    });
    pointers.clear();
    values.forEach(([title,x,y])=>{if(active(title)){title.style.setProperty('--type-x',x.toFixed(2)+'px');title.style.setProperty('--type-y',y.toFixed(2)+'px');}});
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);});sync();
  },{threshold:.08});
  titles.forEach(title=>{
    split(title);observer.observe(title);
    on(title,'pointermove',event=>{
      if(!active(title)||!fine.matches||event.pointerType==='touch')return;
      pointers.set(title,{x:event.clientX,y:event.clientY});if(!frame)frame=requestAnimationFrame(paintPointers);
    },{passive:true});
    on(title,'pointerleave',()=>{pointers.delete(title);title.style.setProperty('--type-x','0px');title.style.setProperty('--type-y','0px');},{passive:true});
    on(title,'pointerdown',()=>play(title,'ripple'),{passive:true});
  });
  // Only semantic state attributes are observed; animated inline styles never trigger this observer.
  const stateObserver=new MutationObserver(sync);
  dialogs.forEach(dialog=>stateObserver.observe(dialog,{attributes:true,attributeFilter:['open']}));
  on(document,'steeltown:finish',()=>{
    const title=document.getElementById('edition-name');if(!title)return;
    split(title);entered.delete(title);sync();
  });
  on(reduced,'change',sync);on(document,'visibilitychange',sync);
  on(document,'steeltown:motion',event=>{paused=!!event.detail?.paused;sync();});
  on(window,'pagehide',event=>{
    suspended=true;sync();observer.disconnect();
    if(!event.persisted){stateObserver.disconnect();events.abort();}
  });
  on(window,'pageshow',event=>{if(event.persisted){suspended=false;visible.clear();titles.forEach(title=>observer.observe(title));sync();}});
  window.steeltownType={get titleCount(){return titles.length;},get activeCount(){return titles.filter(active).length;},get pendingFrame(){return frame;}};
})();
