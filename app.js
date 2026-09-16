(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = window.STEELTOWN, catalog = store.catalog;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const product = $('#product-dialog'), film = $('#film-dialog'), video = $('#full-film');
  const preview = $('#hero-media');
  let photo = 0, music, musicWanted = false, musicRevision = 0, toastTimer;
  let teaser, teaserVisible = false, teaserPaused = false;
  const contexts = new WeakMap(), afterClose = new WeakMap();
  const canMove = () => !reduced.matches && !document.body.classList.contains('motion-paused');
  const price = new Intl.NumberFormat('en-US',{style:'currency',currency:catalog.currency,maximumFractionDigits:0}).format(catalog.price);
  const checkoutUrl = () => catalog.checkout.urls?.[store.edition] || catalog.checkout.url;
  const canBuy = () => catalog.checkout.enabled && !!checkoutUrl();

  function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('#toast').hidden=true,4500); }
  function paintSound() {
    const playing = !!music && !music.paused && !music.ended;
    $('#sound-toggle').setAttribute('aria-pressed',String(playing));
    $('#sound-toggle').setAttribute('aria-label',playing?'Turn background music off':'Turn background music on');
    $('#sound-label').textContent = playing ? 'Sound on' : 'Sound off';
    $('#footer-sound').textContent = playing ? 'Pause the music' : 'Play the music';
  }
  async function startMusic() {
    if (!musicWanted || film.open || document.hidden) return;
    if (!music) {
      music = new Audio('assets/music.mp3'); music.loop = true; music.volume = .32;
      ['play','pause','ended'].forEach(name=>music.addEventListener(name,paintSound));
    }
    const revision = ++musicRevision;
    try { await music.play(); if (revision!==musicRevision || !musicWanted || film.open || document.hidden) music.pause(); }
    catch { if (revision===musicRevision) { musicWanted=false; notify('Tap Sound to try the music again.'); } }
    paintSound();
  }
  function toggleMusic() { musicWanted = !musicWanted; if (!musicWanted) { musicRevision++; music?.pause(); paintSound(); } else startMusic(); }
  $('#sound-toggle').addEventListener('click',toggleMusic); $('#footer-sound').addEventListener('click',toggleMusic);

  function showPhoto() {
    const entry=catalog.editions[store.edition], gallery=entry.gallery, selected=gallery[photo];
    $('#bottle-poster').src=entry.cover;
    $('#bottle-poster').alt=`${entry.name} Steeltown Michael sculptural perfume bottle`;
    $('#order-image').src=selected.src; $('#order-image').alt=selected.alt;
    $('.order-photo').style.setProperty('--gallery-backdrop',`url("${selected.src}")`);
    $('#gallery-count').textContent=`${String(photo+1).padStart(2,'0')} / ${String(gallery.length).padStart(2,'0')}`;
    $('#gallery-caption').textContent=selected.label;
    $$('#gallery-thumbs button').forEach((button,index)=>button.setAttribute('aria-current',String(index===photo)));
  }
  function buildGallery() {
    const fragment=document.createDocumentFragment();
    catalog.editions[store.edition].gallery.forEach((image,index)=>{
      const button=document.createElement('button'); button.type='button';
      button.setAttribute('aria-label',`View photo ${index+1}: ${image.label}`);
      button.setAttribute('aria-current',String(index===photo));
      const thumbnail=document.createElement('img'); thumbnail.src=image.src; thumbnail.alt=''; thumbnail.loading='lazy';
      button.append(thumbnail); button.addEventListener('click',()=>{photo=index;showPhoto();});fragment.append(button);
    });
    $('#gallery-thumbs').replaceChildren(fragment);
  }
  function stepPhoto(direction) {
    const count=catalog.editions[store.edition].gallery.length;
    photo=(photo+direction+count)%count; showPhoto();
  }
  function paintEdition() {
    const edition=store.edition;
    $$('[data-current-edition]').forEach(button=>button.dataset.buy=edition);
    $$('[data-select], .finish').forEach(button=>{ const selected=(button.dataset.select||button.dataset.finish)===edition; button.setAttribute('aria-pressed',String(selected)); button.classList.toggle('active',selected); });
    $$('.product-card').forEach(card=>card.classList.toggle('selected-edition',card.dataset.edition===edition));
    $('#order-title').textContent=catalog.editions[edition].title;
    $$('[data-price]').forEach(node=>node.textContent=price);
    $$('[data-volume]').forEach(node=>node.textContent=`${catalog.sizeMl} ml`);
    $$('[data-format]').forEach(node=>node.textContent=catalog.format);
    $$('[data-availability]').forEach(node=>{ node.textContent=canBuy()?'':catalog.checkout.pendingMessage; node.hidden=canBuy(); });
    $$('[data-current-edition]').forEach(button=>{ button.firstChild.textContent=canBuy()?'Shop the edition ':'Explore the edition '; });
    const checkout=$('#checkout-link');
    checkout.setAttribute('aria-disabled',String(!canBuy())); checkout.tabIndex=canBuy()?0:-1;
    if(canBuy())checkout.href=checkoutUrl();else checkout.removeAttribute('href');
    checkout.textContent=canBuy()?'Continue to PayPal ↗':'Not available online yet';
    $('.checkout-caption').textContent=canBuy()?catalog.checkout.caption:catalog.checkout.pendingMessage;
    photo=0; buildGallery(); showPhoto();
  }
  store.subscribe(paintEdition); paintEdition();
  $$('[data-select], .finish').forEach(button=>button.addEventListener('click',()=>store.selectEdition(button.dataset.select||button.dataset.finish)));
  $('#checkout-link').addEventListener('click',event=>{ if(!canBuy()) event.preventDefault(); });
  $('#gallery-previous').addEventListener('click',()=>stepPhoto(-1));
  $('#gallery-next').addEventListener('click',()=>stepPhoto(1));
  $('.order-photo').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepPhoto(event.key==='ArrowLeft'?-1:1);}});

  function remember(dialog,trigger) { contexts.set(dialog,{focus:trigger||document.activeElement,x:scrollX,y:scrollY}); }
  function close(dialog,next) { if(next)afterClose.set(dialog,next); dialog.close(); }
  function openProduct(edition,trigger) {
    store.selectEdition(edition); photo=0; buildGallery(); showPhoto(); remember(product,trigger);
    teaser?.pause(); product.showModal();
  }
  $$('[data-buy]').forEach(button=>button.addEventListener('click',()=>openProduct(button.dataset.buy,button)));
  function exploreStudio() {
    const go=()=>{ $('#experience').scrollIntoView({behavior:canMove()?'smooth':'instant'}); const target=$('#bottle-canvas').hidden?$('#experience-buy'):$('#bottle-canvas'); target.focus({preventScroll:true}); };
    if(product.open)close(product,go);else go();
  }
  $$('[data-explore-studio]').forEach(button=>button.addEventListener('click',exploreStudio));
  const modelButton=document.createElement('button'); modelButton.className='model-button'; modelButton.textContent='Explore in 3D ↗'; modelButton.addEventListener('click',exploreStudio); $('.order-photo').append(modelButton);
  function syncTeaser() {
    $('#teaser-pause').disabled=!canMove(); $('#replay-teaser').disabled=!canMove();
    if(!teaser)return;
    if(teaserVisible && canMove() && !teaserPaused && !teaser.ended && !product.open && !film.open && !document.hidden) teaser.play().catch(()=>{});
    else teaser.pause();
  }
  function openFilm(trigger) {
    remember(film,trigger); musicRevision++; music?.pause(); teaser?.pause();
    if(!video.src)video.src='assets/full-film.mp4';
    $('#full-film-end').hidden=true; film.showModal(); video.currentTime=0;
    video.play().catch(()=>notify('Press play to start the film.'));
  }
  $$('[data-open-film]').forEach(button=>button.addEventListener('click',()=>openFilm(button)));
  video.poster='assets/collection-reveal-poster.webp';
  video.addEventListener('play',()=>{musicRevision++;music?.pause();});
  video.addEventListener('ended',()=>{$('#full-film-end').hidden=false;$('#film-shop').focus();});
  $('#replay-full').addEventListener('click',()=>{$('#full-film-end').hidden=true;video.currentTime=0;video.play().catch(()=>{});});
  $('#film-shop').addEventListener('click',()=>{const origin=contexts.get(film)?.focus;close(film,()=>openProduct(store.edition,origin));});
  $('#film-skip').addEventListener('click',()=>close(film,()=>{$('#collection').scrollIntoView({behavior:canMove()?'smooth':'instant'});$('#collection-title').focus({preventScroll:true});}));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>close(document.getElementById(button.dataset.close))));
  for(const dialog of [product,film]) {
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close(dialog);}});
    dialog.addEventListener('close',()=>{
      if(dialog===film){video.pause();if(musicWanted)startMusic();}
      const next=afterClose.get(dialog);afterClose.delete(dialog);
      if(next)requestAnimationFrame(next); else {const context=contexts.get(dialog);context?.focus?.focus({preventScroll:true});}
      syncTeaser();
    });
  }
  $('#replay-teaser').addEventListener('click',()=>{if(!teaser||!canMove())return;preview.classList.remove('ended');$('#hero-end').hidden=true;teaser.currentTime=0;teaserPaused=false;syncTeaser();});
  $('#teaser-pause').addEventListener('click',()=>{if(!teaser||!canMove())return;teaserPaused=!teaser.paused;syncTeaser();});
  function installTeaser() {
    teaser=document.createElement('video'); teaser.className='hero-video';teaser.muted=true;teaser.playsInline=true;teaser.preload='metadata';teaser.setAttribute('aria-hidden','true');teaser.tabIndex=-1;teaser.src='assets/teaser.mp4';preview.prepend(teaser);
    teaser.addEventListener('timeupdate',()=>{$('#teaser-progress').style.width=`${teaser.duration?teaser.currentTime/teaser.duration*100:0}%`;teaser.classList.toggle('reveal-shot',teaser.currentTime>=21.4);});
    teaser.addEventListener('play',()=>{$('#teaser-pause').textContent='Pause preview Ⅱ';$('#teaser-pause').setAttribute('aria-label','Pause the campaign preview');});
    teaser.addEventListener('pause',()=>{$('#teaser-pause').textContent='Play preview ▷';$('#teaser-pause').setAttribute('aria-label','Play the campaign preview');});
    teaser.addEventListener('ended',()=>{preview.classList.add('ended');$('#hero-end').hidden=false;});
    teaser.addEventListener('error',()=>{teaser.remove();$('#teaser-pause').hidden=true;});syncTeaser();
  }
  const filmObserver=new IntersectionObserver(entries=>{teaserVisible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.45;if(teaserVisible&&!teaser)installTeaser();syncTeaser();},{threshold:[0,.45]});filmObserver.observe(preview);
  document.addEventListener('steeltown:motion',syncTeaser); reduced.addEventListener('change',syncTeaser);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){musicRevision++;music?.pause();video.pause();}else startMusic();syncTeaser();});
  $('#year').textContent=String(new Date().getFullYear());
})();
