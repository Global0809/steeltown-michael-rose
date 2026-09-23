(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = window.STEELTOWN, catalog = store.catalog;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const product = $('#product-dialog'), film = $('#film-dialog'), video = $('#full-film');
  const cartDialog = $('#cart-dialog'), menu = $('#menu-dialog');
  const dialogs = [product, film, cartDialog, menu];
  const preview = $('#hero-media');
  let photo = 0, music, musicWanted = false, musicRevision = 0, toastTimer;
  let teaser, teaserVisible = false, teaserPaused = false;
  const contexts = new WeakMap(), afterClose = new WeakMap();
  let dialogRevision = 0, pendingDialogAction = 0;
  const cartKey = 'steeltown:cart:v1', maxQuantity = 99;
  let cart = null;
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey) || 'null');
    if (saved && Object.hasOwn(catalog.editions, saved.edition) && Number.isInteger(saved.quantity) && saved.quantity >= 1 && saved.quantity <= maxQuantity) {
      cart = { edition: saved.edition, quantity: saved.quantity };
    }
  } catch { /* The bag still works when browser storage is unavailable. */ }
  const canMove = () => !reduced.matches && !document.body.classList.contains('motion-paused');
  const money = new Intl.NumberFormat('en-US',{style:'currency',currency:catalog.currency,maximumFractionDigits:0});
  const price = money.format(catalog.price);
  const checkoutUrl = (edition = store.edition) => catalog.checkout.urls?.[edition] || catalog.checkout.url;
  const canBuy = (edition = store.edition) => catalog.checkout.enabled && !!checkoutUrl(edition);
  const anyDialogOpen = () => dialogs.some(dialog => dialog.open);

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
    $$('[data-current-edition]').forEach(button=>{delete button.dataset.buy;button.dataset.cart=edition;});
    $$('[data-select], .finish').forEach(button=>{ const selected=(button.dataset.select||button.dataset.finish)===edition; button.setAttribute('aria-pressed',String(selected)); button.classList.toggle('active',selected); });
    $$('.product-card, .muse-card').forEach(card=>card.classList.toggle('selected-edition',card.dataset.edition===edition));
    $('#order-title').textContent=catalog.editions[edition].title; $('#studio-word').textContent=edition==='pink'?'Rose.':'Silver.';
    $$('[data-price]').forEach(node=>node.textContent=price);
    $$('[data-volume]').forEach(node=>node.textContent=`${catalog.sizeMl} ml`);
    $$('[data-format]').forEach(node=>node.textContent=catalog.format);
    $$('[data-availability]').forEach(node=>{ node.textContent=canBuy()?'':catalog.checkout.pendingMessage; node.hidden=canBuy(); });
    $$('[data-current-edition]').forEach(button=>{ button.firstChild.textContent='Pre-order now '; });
    const checkout=$('#checkout-link');
    checkout.setAttribute('aria-disabled',String(!canBuy())); checkout.tabIndex=canBuy()?0:-1;
    if(canBuy())checkout.href=checkoutUrl();else checkout.removeAttribute('href');
    checkout.textContent=canBuy()?'Pre-order now ↗':'Not available online yet';
    $('.checkout-caption').textContent=canBuy()?catalog.checkout.caption:catalog.checkout.pendingMessage;
    photo=0; buildGallery(); showPhoto();
  }
  store.subscribe(paintEdition); paintEdition();
  $$('[data-select], .finish').forEach(button=>button.addEventListener('click',()=>store.selectEdition(button.dataset.select||button.dataset.finish)));
  $('#checkout-link').addEventListener('click',event=>{
    event.preventDefault();
    if(canBuy())openCart(store.edition,event.currentTarget);
  });
  $('#gallery-previous').addEventListener('click',()=>stepPhoto(-1));
  $('#gallery-next').addEventListener('click',()=>stepPhoto(1));
  $('.order-photo').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepPhoto(event.key==='ArrowLeft'?-1:1);}});

  function outsideTrigger(trigger) {
    let target=trigger||document.activeElement;
    const visited=new Set();
    while(target?.closest?.('dialog')) {
      const owner=target.closest('dialog');
      if(visited.has(owner))break;
      visited.add(owner);
      const previous=contexts.get(owner)?.focus;
      if(!previous||previous===target)break;
      target=previous;
    }
    return target;
  }
  function remember(dialog,trigger) { contexts.set(dialog,{focus:outsideTrigger(trigger),x:scrollX,y:scrollY}); }
  function showDialog(dialog,trigger,ready) {
    dialogRevision++; pendingDialogAction=0;
    if(!dialog.open)remember(dialog,trigger);
    dialogs.forEach(other=>{
      afterClose.delete(other);
      if(other!==dialog&&other.open)other.close();
    });
    teaser?.pause();
    if(!dialog.open)dialog.showModal();
    $('#menu-open').setAttribute('aria-expanded',String(menu.open));
    ready?.(); syncTeaser();
  }
  function close(dialog,next) {
    if(!dialog?.open)return;
    const revision=++dialogRevision;
    if(next)pendingDialogAction=revision;
    afterClose.set(dialog,{run:next,revision});
    dialog.close();
  }
  function moveToSection(href) {
    const target=$(href);
    if(!target)return;
    try { history.pushState(null,'',href); } catch { /* Scrolling does not require history access. */ }
    target.scrollIntoView({behavior:canMove()?'smooth':'instant'});
    const heading=target.querySelector('h1,h2,h3')||target;
    if(!heading.hasAttribute('tabindex')) {
      heading.tabIndex=-1;
      heading.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true});
    }
    heading.focus({preventScroll:true});
  }

  function saveCart() {
    try { if(cart)localStorage.setItem(cartKey,JSON.stringify(cart));else localStorage.removeItem(cartKey); } catch { /* Keep the in-memory selection. */ }
  }
  function paintCart() {
    const quantity=cart?.quantity||0;
    $('#bag-count').textContent=String(quantity);
    $$('[data-open-cart]').forEach(button=>button.setAttribute('aria-label',`Open shopping bag, ${quantity} ${quantity===1?'bottle':'bottles'}`));
    $('#cart-empty').hidden=!!cart; $('#cart-filled').hidden=!cart;
    const paypal=$('#cart-paypal'), payable=!!cart&&quantity===1&&canBuy(cart.edition);
    paypal.setAttribute('aria-disabled',String(!payable)); paypal.tabIndex=payable?0:-1;
    if(payable)paypal.href=checkoutUrl(cart.edition);else paypal.removeAttribute('href');
    $('#cart-multiple-note').hidden=quantity<=1;
    if(!cart)return;
    const edition=catalog.editions[cart.edition];
    $('#cart-image').src=edition.cover; $('#cart-image').alt=edition.title+' perfume bottle';
    $('#cart-name').textContent=edition.title;
    $('.cart-item p').textContent=`${catalog.sizeMl} ml · ${catalog.format}`;
    $$('[data-cart-finish]').forEach(button=>{
      const selected=button.dataset.cartFinish===cart.edition;
      button.setAttribute('aria-pressed',String(selected)); button.classList.toggle('active',selected);
    });
    $('#quantity-value').textContent=String(quantity);
    $('#quantity-minus').disabled=quantity<=1; $('#quantity-plus').disabled=quantity>=maxQuantity;
    $('#cart-subtotal').textContent=`${money.format(catalog.price*quantity)} ${catalog.currency}`;
    $('#cart-checkout-note').textContent=canBuy(cart.edition)?catalog.checkout.caption:catalog.checkout.pendingMessage;
    $('.cart-assurance span:last-child').textContent=`${price} ${catalog.currency} / bottle`;
  }
  function openCart(edition,trigger) {
    if(edition&&Object.hasOwn(catalog.editions,edition)) {
      if(!cart||cart.edition!==edition)cart={edition,quantity:1};
      saveCart();
    }
    paintCart(); showDialog(cartDialog,trigger);
  }
  $$('[data-cart]').forEach(button=>button.addEventListener('click',()=>openCart(button.dataset.cart,button)));
  $$('[data-open-cart]').forEach(button=>button.addEventListener('click',()=>openCart(null,button)));
  $$('[data-cart-finish]').forEach(button=>button.addEventListener('click',()=>{
    if(!cart||!Object.hasOwn(catalog.editions,button.dataset.cartFinish))return;
    cart.edition=button.dataset.cartFinish; saveCart(); paintCart();
  }));
  $('#quantity-minus').addEventListener('click',()=>{if(cart&&cart.quantity>1){cart.quantity--;saveCart();paintCart();}});
  $('#quantity-plus').addEventListener('click',()=>{if(cart&&cart.quantity<maxQuantity){cart.quantity++;saveCart();paintCart();}});
  $('#cart-remove').addEventListener('click',()=>{cart=null;saveCart();paintCart();$('#cart-discover').focus();});
  $('#cart-discover').addEventListener('click',()=>close(cartDialog,()=>moveToSection('#collection')));
  $('#cart-paypal').addEventListener('click',event=>{
    if(!cart||cart.quantity!==1||!canBuy(cart.edition))event.preventDefault();
  });
  paintCart();
  $('#menu-open').setAttribute('aria-controls','menu-dialog');
  $('#menu-open').setAttribute('aria-expanded','false');
  $('#menu-open').addEventListener('click',event=>showDialog(menu,event.currentTarget));
  $$('#menu-dialog a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();close(menu,()=>moveToSection(link.getAttribute('href')));
  }));
  const noteLayers=$$('[data-note]');
  function revealNote(selected) {
    noteLayers.forEach(button=>{
      const expanded=button===selected, details=button.querySelector('.note-details');
      button.classList.toggle('active',expanded);button.setAttribute('aria-expanded',String(expanded));
      if(details){details.id=`scent-note-${button.dataset.note}`;details.hidden=!expanded;button.setAttribute('aria-controls',details.id);}
    });
  }
  noteLayers.forEach(button=>button.addEventListener('click',()=>revealNote(button)));
  if(noteLayers.length)revealNote(noteLayers.find(button=>button.getAttribute('aria-expanded')==='true')||noteLayers[0]);
  function setProductView(view) {
    const studio=view==='studio'; product.dataset.view=studio?'studio':'photos';
    $('#studio-view').hidden=!studio; $('#product-photos').hidden=studio;
    $('#view-studio').setAttribute('aria-pressed',String(studio)); $('#view-photos').setAttribute('aria-pressed',String(!studio));
    $('.studio-lighting').hidden=!studio;
    document.dispatchEvent(new CustomEvent('steeltown:studio',{detail:{open:product.open,view:product.dataset.view}}));
  }
  $('#view-studio').addEventListener('click',()=>setProductView('studio'));
  $('#view-photos').addEventListener('click',()=>setProductView('photos'));
  function openProduct(edition,trigger) {
    store.selectEdition(edition); photo=0; buildGallery(); showPhoto();
    showDialog(product,trigger,()=>{document.body.classList.add('product-open');setProductView('studio');});
  }
  $$('[data-buy]').forEach(button=>button.addEventListener('click',()=>openProduct(button.dataset.buy,button)));
  document.addEventListener('steeltown:open-product',()=>openProduct(store.edition,$('#bottle-canvas')));
  function exploreStudio(event) { openProduct(store.edition,event?.currentTarget); }
  $$('[data-explore-studio]').forEach(button=>button.addEventListener('click',exploreStudio));
  function syncTeaser() {
    $('#teaser-pause').disabled=!canMove(); $('#replay-teaser').disabled=!canMove();
    if(!teaser)return;
    if(teaserVisible && canMove() && !teaserPaused && !teaser.ended && !anyDialogOpen() && !pendingDialogAction && !document.hidden) teaser.play().catch(()=>{});
    else teaser.pause();
  }
  function openFilm(trigger) {
    musicRevision++; music?.pause(); teaser?.pause();
    if(!video.src)video.src='assets/full-film.mp4';
    showDialog(film,trigger,()=>{
      $('#full-film-end').hidden=true;video.currentTime=0;
      video.play().catch(()=>{if(film.open)notify('Press play to start the film.');});
    });
  }
  $$('[data-open-film]').forEach(button=>button.addEventListener('click',()=>openFilm(button)));
  video.poster='assets/collection-reveal-poster.webp';
  video.addEventListener('play',()=>{musicRevision++;music?.pause();});
  video.addEventListener('ended',()=>{$('#full-film-end').hidden=false;$('#film-shop').focus();});
  $('#replay-full').addEventListener('click',()=>{$('#full-film-end').hidden=true;video.currentTime=0;video.play().catch(()=>{});});
  $('#film-shop').addEventListener('click',()=>{const origin=contexts.get(film)?.focus;close(film,()=>openProduct(store.edition,origin));});
  $('#film-skip').addEventListener('click',()=>close(film,()=>{$('#collection').scrollIntoView({behavior:canMove()?'smooth':'instant'});$('#collection-title').focus({preventScroll:true});}));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>close(document.getElementById(button.dataset.close))));
  for(const dialog of dialogs) {
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close(dialog);}});
    dialog.addEventListener('close',()=>{
      if(dialog.open)return;
      if(dialog===film){video.pause();if(musicWanted)startMusic();}
      if(dialog===product){document.body.classList.remove('product-open');document.dispatchEvent(new CustomEvent('steeltown:studio',{detail:{open:false,view:'studio'}}));}
      if(dialog===menu)$('#menu-open').setAttribute('aria-expanded','false');
      const next=afterClose.get(dialog);afterClose.delete(dialog);
      const revision=next?.revision??dialogRevision, context=contexts.get(dialog);
      requestAnimationFrame(()=>{
        if(revision!==dialogRevision||anyDialogOpen())return;
        if(pendingDialogAction===revision)pendingDialogAction=0;
        if(next?.run)next.run();
        else if(context?.focus?.isConnected&&!context.focus.closest('dialog'))context.focus.focus({preventScroll:true});
        syncTeaser();
      });
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
