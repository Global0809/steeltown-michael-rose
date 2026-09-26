(() => {
  'use strict';
  if (window.steeltownSignature) return;
  const logo = document.querySelector('.header .wordmark');
  if (!logo) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const dialogs = [...document.querySelectorAll('dialog')];
  let visible = false, suspended = false, paused = false;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('signature-light');
  svg.setAttribute('viewBox', '0 0 220 82');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // Paired arcs frame the lockup without crossing any of its lettering.
  const arcs = ['M4 28C24 2 72 2 110 3S195 3 216 28', 'M4 55C27 79 73 79 110 79S192 80 216 55'];
  arcs.forEach((d, index) => {
    const orbit = document.createElementNS(svg.namespaceURI, 'path');
    orbit.setAttribute('d', d);
    orbit.setAttribute('pathLength', '100');
    orbit.setAttribute('class', 'signature-orbit');
    const comet = orbit.cloneNode();
    comet.setAttribute('class', `signature-comet${index ? ' signature-comet--rose' : ''}`);
    svg.append(orbit, comet);
  });
  ['M14 20v8M10 24h8', 'M206 55v8M202 59h8'].forEach((d, index) => {
    const glint = document.createElementNS(svg.namespaceURI, 'path');
    glint.setAttribute('d', d);
    glint.setAttribute('class', `signature-glint${index ? ' signature-glint--second' : ''}`);
    svg.append(glint);
  });
  logo.append(svg);
  logo.classList.add('has-signature-light');

  const canMove = () => visible && !suspended && !paused && !document.hidden && !reduced.matches && !dialogs.some(dialog => dialog.open);
  const sync = () => logo.classList.toggle('is-signature-live', canMove());
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, { threshold: .1 });
  const dialogObserver = new MutationObserver(sync);
  const observeDialogs = () => dialogs.forEach(dialog => dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
  const on = (target, name, handler) => target.addEventListener(name, handler, { signal: events.signal });
  observer.observe(logo);
  observeDialogs();
  on(reduced, 'change', sync);
  on(document, 'visibilitychange', sync);
  on(document, 'steeltown:motion', event => { paused = !!event.detail?.paused; sync(); });
  on(window, 'pagehide', event => {
    suspended = true;
    sync();
    observer.disconnect();
    dialogObserver.disconnect();
    if (!event.persisted) events.abort();
  });
  on(window, 'pageshow', event => {
    if (!event.persisted) return;
    suspended = false;
    visible = false;
    observer.observe(logo);
    observeDialogs();
    sync();
  });
  window.steeltownSignature = { getState: () => ({ running: canMove(), reducedMotion: reduced.matches, visible, suspended }) };
})();
