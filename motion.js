(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const listeners = new AbortController();
  const on = (target, type, fn, options = {}) => target.addEventListener(type, fn, { ...options, signal: listeners.signal });
  let paused = preference.matches, frame = 0, pointerFrame = 0, pointer = null;
  const observers = [];
  function paint() {
    paused = preference.matches;
    document.body.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new CustomEvent('steeltown:motion', { detail: { paused } }));
    if (paused) {
      document.querySelectorAll('.tap-bloom').forEach(node => node.remove());
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0; pointer = null;
    }
  }
  on(preference, 'change', paint); paint();

  const openingLine=document.querySelector('.experience h1 > span');
  if (openingLine) {
    const words=openingLine.textContent.trim().split(/\s+/);
    const spoken=document.createElement('span'); spoken.className='sr-only'; spoken.textContent=words.join(' ');
    const visual=document.createElement('span'); visual.setAttribute('aria-hidden','true');
    words.forEach((word,index)=>{const span=document.createElement('span');span.className='hero-word';span.style.setProperty('--word',index);span.textContent=word;visual.append(span);if(index<words.length-1)visual.append(' ');});
    openingLine.replaceChildren(spoken,visual);
  }

  // The words stay intact for assistive technology; only visual glyphs float.
  document.querySelectorAll('.experience h1 em, .section-heading h2 em, .craft-copy h2 em, .romance-copy h2 em, .closing h2 em').forEach(element => {
    const text = element.textContent;
    element.classList.add('flowing-text');
    const spoken = document.createElement('span');
    spoken.className = 'sr-only'; spoken.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    Array.from(text).forEach((character, index) => {
      const glyph = document.createElement('span');
      glyph.className = 'flow-char'; glyph.textContent = character === ' ' ? '\u00a0' : character;
      glyph.style.setProperty('--char', index); visual.append(glyph);
    });
    element.replaceChildren(spoken, visual);
  });

  const trails = '<svg class="couture-trails" viewBox="0 0 1400 900" preserveAspectRatio="none" aria-hidden="true"><path d="M-200 820C300 20 1540 30 1230 550S-70 390 120 155S1240 970 1610 250"/><path d="M-180 830C340 45 1510 60 1240 565S-50 420 145 160S1220 1010 1630 275"/><path d="M-150 850C370 60 1500 90 1250 580S-20 450 165 175S1240 1040 1660 300"/></svg>';
  const petals = [[8,17,19,-28,11,-3],[79,13,24,34,13,-7],[16,72,31,-64,16,-5],[90,64,18,80,12,-9],[62,83,14,32,15,-2]];
  document.querySelectorAll('.experience, .closing').forEach(section => {
    section.insertAdjacentHTML('afterbegin', trails);
    const field = document.createElement('div'); field.className = 'petal-field'; field.setAttribute('aria-hidden','true');
    petals.forEach(([x,y,size,turn,duration,delay]) => {
      const petal = document.createElement('i');
      petal.style.cssText = '--x:'+x+'%;--y:'+y+'%;--size:'+size+'px;--turn:'+turn+'deg;--duration:'+duration+'s;--delay:'+delay+'s';
      field.append(petal);
    });
    section.prepend(field);
  });

  const ribbon = document.createElement('div');
  ribbon.className = 'satin-ribbon'; ribbon.setAttribute('aria-hidden','true');
  const ribbonWords = '<span>Every woman’s dream <b>✦</b> Steeltown Michael <b>✦</b> Every woman’s dream <b>✦</b> Steeltown Michael <b>✦</b></span>';
  ribbon.innerHTML = '<div class="satin-track">'+ribbonWords+ribbonWords+'</div>';
  document.getElementById('experience').after(ribbon);
  const story = document.getElementById('story');
  story.insertAdjacentHTML('beforeend', '<span class="romance-watermark" aria-hidden="true">Michael</span><svg class="couture-seal" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="seal-lettering" d="M60 13a47 47 0 1 1-.1 0"/></defs><circle cx="60" cy="60" r="57"/><circle cx="60" cy="60" r="37"/><g class="seal-ring"><text><textPath href="#seal-lettering">STEELTOWN · MICHAEL PARFUM · </textPath></text></g><path class="seal-crown" d="m42 57-3-14 12 8 9-13 9 13 12-8-3 14Z M42 62h36"/><text x="60" y="83" text-anchor="middle" style="font:25px Georgia;letter-spacing:0">M</text></svg>');

  const candidates = [...document.querySelectorAll('.section-heading, .product-image, .product-title, .craft-image, .craft-copy, .romance-image, .romance-copy .eyebrow, .romance-copy h2>span, .romance-copy h2>em, .romance-copy .text-link, .signature, .closing h2')];
  if ('IntersectionObserver' in window && !preference.matches) {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
    }), { threshold: .02, rootMargin: '0px 0px 30px 0px' });
    candidates.forEach((element,index) => {
      element.classList.add('reveal-ready');
      element.style.setProperty('--delay', (index%2*90)+'ms'); reveal.observe(element);
    });
    observers.push(reveal);
  }
  if ('IntersectionObserver' in window) {
    const scenes = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('is-outside', !entry.isIntersecting);
      if (entry.target === story && entry.isIntersecting) story.classList.add('story-in-view');
    }), {threshold:0});
    document.querySelectorAll('main>section, .satin-ribbon').forEach(section => {
      section.classList.add('is-outside'); scenes.observe(section);
    });
    observers.push(scenes);
  } else story.classList.add('story-in-view');

  const image = document.getElementById('campaign-portrait');
  function scrollUpdate() {
    frame = 0;
    if (paused || innerWidth <= 760 || document.hidden) return;
    const rect = story.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) {
      const progress = Math.max(0, Math.min(1, (innerHeight-rect.top)/(innerHeight+rect.height)));
      image.style.setProperty('--photo-y', ((progress-.5)*34)+'px');
    }
  }
  on(window, 'scroll', () => { if (!frame && !paused) frame = requestAnimationFrame(scrollUpdate); }, {passive:true});

  // One coalesced pointer update, restricted to the two types of glossy surface.
  on(document, 'pointermove', event => {
    if (paused || !finePointer.matches || document.hidden) return;
    const surface = event.target.closest('.studio-information, .product-card');
    if (!surface) return;
    pointer = {surface,x:event.clientX,y:event.clientY};
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pointer || paused) return;
      const {surface,x,y} = pointer, rect = surface.getBoundingClientRect();
      surface.style.setProperty('--pointer-x', ((x-rect.left)/rect.width*100)+'%');
      surface.style.setProperty('--pointer-y', ((y-rect.top)/rect.height*100)+'%');
      pointer = null;
    });
  }, {passive:true});
  on(document, 'pointerdown', event => {
    if (paused || !event.target.closest('button:not(:disabled), a')) return;
    // Never move the hit target; a single brief ring acknowledges the tap.
    document.querySelectorAll('.tap-bloom').forEach(node => node.remove());
    const bloom = document.createElement('i'); bloom.className='tap-bloom'; bloom.setAttribute('aria-hidden','true');
    bloom.style.left=(event.clientX-8)+'px'; bloom.style.top=(event.clientY-8)+'px';
    document.body.append(bloom); bloom.addEventListener('animationend',()=>bloom.remove(),{once:true});
  }, {passive:true});
  function visibility() { document.body.classList.toggle('scene-hidden', document.hidden); }
  on(document, 'visibilitychange', visibility); visibility();
  on(window, 'pagehide', event => {
    if (frame) cancelAnimationFrame(frame);
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    frame = 0; pointerFrame = 0; pointer = null;
    if (!event.persisted) { observers.forEach(observer => observer.disconnect()); listeners.abort(); }
  });
  on(window, 'pageshow', () => { visibility(); paint(); });
})();
