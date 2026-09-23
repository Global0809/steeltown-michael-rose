(() => {
  'use strict';
  if (window.steeltownSensory || !document.body) return;

  const root = document.documentElement;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const on = (target, type, callback, options = {}) => target?.addEventListener(type, callback, { ...options, signal: events.signal });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const dialogs = [...document.querySelectorAll('dialog')];
  const film = document.querySelector('#film-dialog');
  const depths = [...document.querySelectorAll('[data-depth]')];
  const visibleDepths = new Set();
  const depthOffsets = new WeakMap();
  const sections = [...document.querySelectorAll('main section, .cinematic-hero')];
  const activeSections = new Set();
  const nativeSelector = 'input, textarea, select, option, video, iframe, [contenteditable]:not([contenteditable="false"]), [data-native-cursor], button:disabled, [aria-disabled="true"]';
  const actionSelector = 'button, a[href], summary, [role="button"]';
  const soundControls = '#sound-toggle, #footer-sound';
  const glassActions = '[data-select], [data-finish], [data-note], [data-cart], [data-cart-finish], [data-buy], [data-explore-studio], #cart-open, #cart-remove, #checkout-link, #gallery-previous, #gallery-next, #gallery-thumbs button, #feature-previous, #feature-next, #photo-zoom, #view-photos, #view-studio, [data-gallery], [data-gallery-index]';
  let paused = document.body.classList.contains('motion-paused');
  let suspended = false, raf = 0, renderCount = 0, lastFrame = 0;
  let scrollDirty = true, progress = 0, energy = 0, direction = 0;
  let lastScrollY = scrollY, lastScrollTime = performance.now(), lastScrollAt = -Infinity;
  let cursorActive = false, pointerInside = false, pointerTarget = null;
  let pointX = 0, pointY = 0, ringX = 0, ringY = 0, cursorPositioned = false;
  let currentSection = null, lastAirAt = -Infinity;

  const progressBar = document.createElement('div');
  progressBar.className = 'sensory-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  const cursor = document.createElement('div');
  cursor.className = 'sensory-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  const ring = document.createElement('span');
  ring.className = 'sensory-cursor-ring';
  const dot = document.createElement('span');
  dot.className = 'sensory-cursor-dot';
  const cursorLabel = document.createElement('span');
  cursorLabel.className = 'sensory-cursor-label';
  cursor.append(ring, dot, cursorLabel);
  document.body.append(progressBar, cursor);

  const canMove = () => !reduced.matches && !paused && !suspended && !document.hidden;
  const topDialog = () => [...dialogs].reverse().find(dialog => dialog.open) || null;
  function requestFrame() {
    if (!raf && !suspended && !document.hidden) raf = requestAnimationFrame(paint);
  }
  function hideCursor() {
    cursorActive = false;
    cursorPositioned = false;
    cursor.classList.remove('is-visible', 'is-pressed');
    root.classList.remove('sensory-cursor-active');
  }
  function updateCursorTarget(target) {
    pointerTarget = target instanceof Element ? target : null;
    if (!pointerInside || !fine.matches || !canMove() || !pointerTarget || pointerTarget.closest(nativeSelector)) {
      hideCursor();
      return;
    }
    const owner = topDialog();
    if (owner && pointerTarget !== owner && !owner.contains(pointerTarget)) {
      hideCursor();
      return;
    }
    const action = pointerTarget.closest(actionSelector);
    const label = action?.matches('[data-open-film]') ? 'Play' : action?.matches('[data-buy], [data-explore-studio]') ? 'View' : '';
    cursorLabel.textContent = label;
    cursor.classList.toggle('is-interactive', !!action);
    cursor.classList.toggle('has-label', !!label);
    if (!cursorPositioned) {
      ringX = pointX;
      ringY = pointY;
      cursorPositioned = true;
    }
    cursorActive = true;
    requestFrame();
  }
  function movePointer(event) {
    if (event.pointerType !== 'mouse') {
      pointerInside = false;
      hideCursor();
      return;
    }
    pointerInside = true;
    pointX = event.clientX;
    pointY = event.clientY;
    updateCursorTarget(event.target);
  }
  function resetDepth() {
    depths.forEach(node => {
      node.style.setProperty('--depth-y', '0px');
      depthOffsets.set(node, 0);
    });
  }
  function paint(time) {
    raf = 0;
    if (suspended || document.hidden) return;
    renderCount++;
    const elapsed = clamp(time - (lastFrame || time - 16.7), 1, 50);
    lastFrame = time;
    let settling = false;
    if (cursorActive && canMove() && fine.matches) {
      const response = 1 - Math.exp(-elapsed / 48);
      ringX += (pointX - ringX) * response;
      ringY += (pointY - ringY) * response;
      settling = Math.abs(pointX - ringX) + Math.abs(pointY - ringY) > .15;
      if (!settling) { ringX = pointX; ringY = pointY; }
      // The zero-size host supplies the correct origin during dialog entry transforms.
      const origin = cursor.getBoundingClientRect();
      cursor.style.setProperty('--cursor-point-x', `${(pointX - origin.left).toFixed(2)}px`);
      cursor.style.setProperty('--cursor-point-y', `${(pointY - origin.top).toFixed(2)}px`);
      cursor.style.setProperty('--cursor-ring-x', `${(ringX - origin.left).toFixed(2)}px`);
      cursor.style.setProperty('--cursor-ring-y', `${(ringY - origin.top).toFixed(2)}px`);
      cursor.classList.add('is-visible');
      root.classList.add('sensory-cursor-active');
      const owner = cursor.parentElement;
      if (owner.tagName === 'DIALOG' && owner.getAnimations) {
        // A transformed dialog is a temporary fixed-position containing block.
        settling ||= owner.getAnimations().some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity);
      }
    }
    if (scrollDirty) {
      scrollDirty = false;
      const distance = Math.max(0, root.scrollHeight - innerHeight);
      progress = distance ? clamp(scrollY / distance, 0, 1) : 0;
      root.style.setProperty('--page-progress', progress.toFixed(5));
      if (canMove() && !topDialog()) {
        const positions = [...visibleDepths].map(node => {
          const rect = node.getBoundingClientRect();
          const value = Number.parseFloat(node.dataset.depth);
          const depth = clamp(Number.isFinite(value) ? value : .025, -.08, .08);
          const center = rect.top - (depthOffsets.get(node) || 0) + rect.height / 2;
          return [node, clamp((innerHeight / 2 - center) * depth, -18, 18)];
        });
        positions.forEach(([node, offset]) => {
          node.style.setProperty('--depth-y', `${offset.toFixed(2)}px`);
          depthOffsets.set(node, offset);
        });
      }
    }
    if (energy > 0) {
      energy = canMove() ? energy * Math.exp(-elapsed / 110) : 0;
      if (energy < .003) { energy = 0; direction = 0; }
      root.style.setProperty('--scroll-energy', energy.toFixed(4));
      root.style.setProperty('--scroll-direction', String(direction));
    }
    if (settling || energy > 0) requestFrame();
  }
  function onScroll() {
    const now = performance.now();
    const delta = scrollY - lastScrollY;
    if (delta && canMove()) {
      energy = clamp(Math.abs(delta) / clamp(now - lastScrollTime, 16, 64) / 2.5, 0, 1);
      direction = Math.sign(delta);
      lastScrollAt = now;
    }
    lastScrollY = scrollY;
    lastScrollTime = now;
    scrollDirty = true;
    requestFrame();
  }

  // The master bus stays quiet; every source has a finite envelope and lifetime.
  let audioContext = null, master = null, noiseBuffer = null;
  let soundWanted = false, soundGesture = false, audioUnavailable = false;
  let audioRevision = 0, lastNoteAt = -Infinity;
  const voices = new Set();
  const audioAllowed = () => soundWanted && soundGesture && !audioUnavailable && !suspended && !document.hidden && !film?.open;
  function stopVoices() {
    [...voices].forEach(voice => voice.stop());
  }
  function makeContext() {
    if (audioContext || audioUnavailable || !soundGesture) return audioContext;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { audioUnavailable = true; return null; }
    try {
      audioContext = new Audio({ latencyHint: 'interactive' });
      master = audioContext.createGain();
      master.gain.value = .02;
      master.connect(audioContext.destination);
    } catch { audioUnavailable = true; audioContext = null; }
    return audioContext;
  }
  function syncAudio() {
    if (!audioContext) return;
    const revision = ++audioRevision;
    const allowed = audioAllowed();
    if (!allowed) stopVoices();
    try {
      const transition = allowed ? audioContext.resume() : audioContext.suspend();
      Promise.resolve(transition).then(() => {
        if (revision === audioRevision && !audioAllowed() && audioContext?.state === 'running') syncAudio();
      }).catch(() => {});
    } catch { /* Browser audio may be unavailable without affecting the controls. */ }
  }
  function voiceRecord(sources, nodes) {
    let remaining = sources.length, disposed = false;
    const record = {
      stop() {
        if (disposed) return;
        sources.forEach(source => { try { source.stop(); } catch {} });
        dispose();
      }
    };
    function dispose() {
      if (disposed) return;
      disposed = true;
      nodes.forEach(node => { try { node.disconnect(); } catch {} });
      voices.delete(record);
    }
    sources.forEach(source => { source.onended = () => { if (--remaining === 0) dispose(); }; });
    voices.add(record);
    return record;
  }
  function note(kind, target) {
    if (!audioAllowed() || audioContext?.state !== 'running' || voices.size >= 4) return;
    const now = performance.now();
    if (now - lastNoteAt < 55) return;
    lastNoteAt = now;
    try {
      const time = audioContext.currentTime;
      const click = kind === 'click';
      const frequency = click ? 245 : target?.matches('[data-note="base"]') ? 523.25 : target?.matches('[data-note="heart"]') ? 783.99 : target?.matches('[data-select="silver"], [data-finish="silver"], [data-cart-finish="silver"]') ? 1174.66 : 1046.5;
      const duration = click ? .07 : .62;
      const sources = [], nodes = [];
      for (let index = 0; index < (click ? 1 : 2); index++) {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency * (index ? 2.003 : 1), time);
        if (click) oscillator.frequency.exponentialRampToValueAtTime(155, time + duration);
        gain.gain.setValueAtTime(.0001, time);
        gain.gain.exponentialRampToValueAtTime(click ? .24 : index ? .14 : .42, time + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
        oscillator.connect(gain); gain.connect(master);
        sources.push(oscillator); nodes.push(oscillator, gain);
      }
      voiceRecord(sources, nodes);
      sources.forEach(source => { source.start(time); source.stop(time + duration + .02); });
    } catch { stopVoices(); }
  }
  function air() {
    const now = performance.now();
    if (!canMove() || !audioAllowed() || audioContext?.state !== 'running' || voices.size >= 3 || now - lastAirAt < 1800) return;
    lastAirAt = now;
    try {
      if (!noiseBuffer) {
        noiseBuffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * .42), audioContext.sampleRate);
        const channel = noiseBuffer.getChannelData(0);
        for (let index = 0; index < channel.length; index++) channel[index] = Math.random() * 2 - 1;
      }
      const time = audioContext.currentTime;
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      source.buffer = noiseBuffer;
      filter.type = 'bandpass'; filter.Q.value = .7;
      filter.frequency.setValueAtTime(direction < 0 ? 1400 : 650, time);
      filter.frequency.exponentialRampToValueAtTime(direction < 0 ? 650 : 1400, time + .4);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(.16, time + .16);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .41);
      source.connect(filter); filter.connect(gain); gain.connect(master);
      voiceRecord([source], [source, filter, gain]);
      source.start(time); source.stop(time + .42);
    } catch { stopVoices(); }
  }

  const depthObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleDepths.add(entry.target);
      else visibleDepths.delete(entry.target);
    });
    scrollDirty = true;
    requestFrame();
  }, { rootMargin: '0px', threshold: 0 }) : null;
  const sectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) activeSections.add(entry.target);
      else activeSections.delete(entry.target);
    });
    const nearest = [...activeSections].sort((a, b) => {
      const first = a.getBoundingClientRect(), second = b.getBoundingClientRect();
      return Math.abs(first.top + first.height / 2 - innerHeight / 2) - Math.abs(second.top + second.height / 2 - innerHeight / 2);
    })[0];
    if (nearest && nearest !== currentSection) {
      if (currentSection && performance.now() - lastScrollAt < 1000) air();
      currentSection = nearest;
    }
  }, { rootMargin: '-30% 0px -45% 0px', threshold: 0 }) : null;
  function syncDialog() {
    const owner = topDialog() || document.body;
    if (cursor.parentElement !== owner) {
      hideCursor();
      owner.append(cursor);
    }
    syncAudio();
    scrollDirty = true;
    requestFrame();
  }
  const dialogObserver = new MutationObserver(syncDialog);
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => { scrollDirty = true; requestFrame(); }) : null;
  function observe() {
    depths.forEach(node => depthObserver?.observe(node));
    sections.forEach(node => sectionObserver?.observe(node));
    dialogs.forEach(dialog => dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    resizeObserver?.observe(document.body);
  }
  function syncMotion() {
    if (!canMove()) {
      hideCursor();
      resetDepth();
      energy = 0; direction = 0;
      root.style.setProperty('--scroll-energy', '0');
      root.style.setProperty('--scroll-direction', '0');
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    scrollDirty = true;
    requestFrame();
  }

  on(document, 'pointermove', movePointer, { passive: true });
  on(document, 'pointerover', movePointer, { passive: true });
  on(document, 'pointerout', event => { if (!event.relatedTarget) { pointerInside = false; hideCursor(); } }, { passive: true });
  on(document, 'pointerdown', event => { movePointer(event); if (cursorActive) cursor.classList.add('is-pressed'); }, { passive: true });
  on(document, 'pointerup', () => cursor.classList.remove('is-pressed'), { passive: true });
  on(document, 'pointercancel', hideCursor, { passive: true });
  on(document, 'keydown', event => { if (event.key === 'Tab') hideCursor(); });
  on(window, 'blur', () => { pointerInside = false; hideCursor(); });
  on(window, 'scroll', onScroll, { passive: true });
  on(window, 'resize', () => { scrollDirty = true; requestFrame(); }, { passive: true });
  on(fine, 'change', () => { hideCursor(); syncMotion(); });
  on(reduced, 'change', syncMotion);
  on(document, 'steeltown:motion', event => { paused = !!event.detail?.paused; syncMotion(); });
  on(document, 'click', event => {
    const target = event.target instanceof Element ? event.target.closest(soundControls) : null;
    if (!target || !event.isTrusted || target.matches(':disabled, [aria-disabled="true"]')) return;
    soundGesture = true;
    if (target.getAttribute('aria-pressed') !== 'true') {
      const context = makeContext();
      // Resume in the gesture's call stack; the application event decides consent.
      try { context?.resume().catch(() => {}); } catch {}
    }
  }, { capture: true });
  on(document, 'steeltown:sound', event => {
    soundWanted = event.detail?.enabled === true && soundGesture;
    if (soundWanted) makeContext();
    syncAudio();
  });
  on(document, 'click', event => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const target = event.target.closest(actionSelector);
    if (!target || target.matches(`${soundControls}, :disabled, [aria-disabled="true"]`)) return;
    note(target.matches(glassActions) ? 'glass' : 'click', target);
  });
  on(document, 'keydown', event => {
    if (event.isTrusted && ['ArrowLeft', 'ArrowRight'].includes(event.key) && event.target instanceof Element && event.target.closest('#product-photos')) note('glass');
  });
  on(document, 'visibilitychange', () => { pointerInside = false; syncMotion(); syncAudio(); });
  on(window, 'pagehide', event => {
    suspended = true;
    syncMotion(); syncAudio();
    depthObserver?.disconnect(); sectionObserver?.disconnect(); dialogObserver.disconnect(); resizeObserver?.disconnect();
    if (!event.persisted) {
      events.abort(); cursor.remove(); progressBar.remove();
      try { audioContext?.close().catch(() => {}); } catch {}
    }
  });
  on(window, 'pageshow', event => {
    if (!event.persisted) return;
    suspended = false; lastFrame = 0; lastScrollY = scrollY;
    activeSections.clear(); visibleDepths.clear(); observe(); syncDialog(); syncMotion();
  });

  Object.defineProperty(window, 'steeltownSensory', {
    value: Object.freeze({
      get cursorActive() { return cursorActive; },
      get renderCount() { return renderCount; },
      get soundEnabled() { return !!(audioAllowed() && audioContext?.state === 'running'); },
      get voices() { return voices.size; },
      get progress() { return progress; },
      get scrollEnergy() { return energy; }
    }),
    writable: false,
    configurable: false
  });
  observe();
  syncDialog();
  requestFrame();
})();
