(() => {
  if (window.steeltownPhotoFrames) return;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const imageSelector = '.hero-art > img, .photo-frame > img, .muse-image > img, .craft-visual > img, .couture-image > img, .hero-media > img, .campaign-story__visual > img, #cart-image';
  const records = new Map();
  const boxes = new Map();
  const pendingMeasurements = new Set();
  const dialogOrder = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  const narrowHero = window.matchMedia('(max-width: 700px)');
  let nextId = 0;
  let openingOrder = 0;
  let measureFrame = 0;
  let discoveryFrame = 0;
  let pageSuspended = false;
  let measureCount = 0;

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  function makeFrame(kind) {
    const id = `photo-rim-${++nextId}`;
    const svg = svgElement('svg', { class: 'photo-light-frame', 'data-photo-kind': kind, 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
    const defs = svgElement('defs');
    const gradient = svgElement('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    [['0%', '#fff0f5'], ['28%', '#b48a9f'], ['54%', '#e8e6ed'], ['77%', '#b68b9f'], ['100%', '#f6cadc']].forEach(([offset, color]) => {
      gradient.append(svgElement('stop', { offset, 'stop-color': color }));
    });
    defs.append(gradient);
    svg.append(defs);
    const rim = svgElement('rect', { class: 'photo-light-frame__rim', stroke: `url(#${id})`, 'vector-effect': 'non-scaling-stroke' });
    const inner = svgElement('rect', { class: 'photo-light-frame__inner', 'vector-effect': 'non-scaling-stroke' });
    const corners = svgElement('path', { class: 'photo-light-frame__corners', 'vector-effect': 'non-scaling-stroke' });
    const trail = svgElement('rect', { class: 'photo-light-frame__trail', pathLength: '100', 'vector-effect': 'non-scaling-stroke' });
    const runner = svgElement('rect', { class: 'photo-light-frame__runner', pathLength: '100', 'vector-effect': 'non-scaling-stroke' });
    svg.append(rim, inner, corners, trail, runner);
    return { svg, rim, inner, corners, trail, runner };
  }

  function topDialog() {
    let selected = null;
    let order = -1;
    document.querySelectorAll('dialog[open]').forEach((dialog) => {
      const candidate = dialogOrder.get(dialog) || 0;
      if (candidate >= order) { selected = dialog; order = candidate; }
    });
    return selected;
  }

  function allowed(record, dialog) {
    if (pageSuspended || document.hidden || reducedMotion.matches || !record.inView || !record.image.isConnected) return false;
    if (dialog ? record.dialog !== dialog : record.dialog && !record.dialog.open) return false;
    if (record.scene && record.story.classList.contains('is-story-enhanced') && !record.scene.classList.contains('is-active')) return false;
    return !record.image.closest('[hidden]');
  }

  function stop(record) {
    record.revision++;
    record.animations.forEach((animation) => animation.cancel());
    record.animations = [];
    record.running = false;
    record.svg.classList.remove('is-running');
  }

  function play(record, restart = false) {
    if (!record.eligible || typeof record.runner.animate !== 'function' || (record.running && !restart)) return;
    stop(record);
    const revision = record.revision;
    record.running = true;
    record.svg.classList.add('is-running');
    const compact = record.kind === 'thumbnail' || record.kind === 'cart';
    const duration = mobile.matches ? 9600 : 7800 + (record.ordinal % 4) * 500;
    const tracks = mobile.matches || compact ? [[record.runner, 0.88]] : [[record.trail, 0.22], [record.runner, 0.92]];
    record.animations = tracks.map(([node, opacity]) => node.animate([
      { strokeDashoffset: '0', opacity },
      { strokeDashoffset: '-100', opacity }
    ], { duration, easing: 'linear', iterations: Infinity, fill: 'none' }));
    record.animations.forEach((animation) => { animation.currentTime = (record.ordinal * 1097) % duration; });
    Promise.all(record.animations.map((animation) => animation.finished)).then(() => {
      if (record.revision !== revision) return;
      record.animations = [];
      record.running = false;
      record.svg.classList.remove('is-running');
    }).catch(() => {});
  }

  function reconcile() {
    const dialog = topDialog();
    records.forEach((record) => {
      const wasEligible = record.eligible;
      record.eligible = allowed(record, dialog);
      if (!record.eligible) stop(record);
      else if (!wasEligible) play(record);
    });
  }

  function queueMeasurement(record) {
    pendingMeasurements.add(record);
    if (!pageSuspended && !document.hidden && !measureFrame) measureFrame = requestAnimationFrame(measure);
  }

  function measure() {
    measureFrame = 0;
    if (pageSuspended || document.hidden) return;
    const measurements = [...pendingMeasurements].filter((record) => record.image.isConnected).map((record) => {
      const box = record.box;
      let width = box.offsetWidth;
      let left = record.imageBox ? box.offsetLeft : 0;
      if (record.host.matches('.hero-art') && narrowHero.matches) {
        left = Math.max(0, 24 - record.host.getBoundingClientRect().left);
        width = Math.min(width, Math.max(0, window.innerWidth - 48));
      }
      return { record, width, height: box.offsetHeight, left, top: record.imageBox ? box.offsetTop : 0 };
    });
    pendingMeasurements.clear();
    measurements.forEach(({ record, width, height, left, top }) => {
      record.svg.style.visibility = width && height ? 'visible' : 'hidden';
      if (!width || !height) return;
      const inset = width < 150 ? 2 : width < 380 ? 5 : 8;
      const right = width - inset, bottom = height - inset;
      const length = Math.min(32, Math.min(width, height) * 0.11);
      Object.assign(record.svg.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      record.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      [record.rim, record.trail, record.runner].forEach((rect) => {
        Object.entries({ x: inset, y: inset, width: Math.max(0, width - inset * 2), height: Math.max(0, height - inset * 2), rx: 1 }).forEach(([name, value]) => rect.setAttribute(name, value));
      });
      Object.entries({ x: inset + 3, y: inset + 3, width: Math.max(0, width - (inset + 3) * 2), height: Math.max(0, height - (inset + 3) * 2), rx: 1 }).forEach(([name, value]) => record.inner.setAttribute(name, value));
      record.corners.setAttribute('d', `M${inset} ${inset + length}V${inset}H${inset + length}M${right - length} ${inset}H${right}V${inset + length}M${right} ${bottom - length}V${bottom}H${right - length}M${inset + length} ${bottom}H${inset}V${bottom - length}`);
      measureCount++;
    });
  }

  const intersectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const record = boxes.get(entry.target);
      if (record) record.inView = entry.isIntersecting && entry.intersectionRatio > 0;
    });
    reconcile();
  }, { threshold: [0, 0.05] }) : null;

  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver((entries) => {
    entries.forEach((entry) => { const record = boxes.get(entry.target); if (record) queueMeasurement(record); });
  }) : null;

  const sourceObserver = new MutationObserver((mutations) => {
    mutations.forEach(({ target }) => {
      const record = records.get(target);
      if (record) { queueMeasurement(record); play(record, true); }
    });
  });

  const sceneObserver = new MutationObserver(reconcile);
  const dialogObserver = new MutationObserver((mutations) => {
    mutations.forEach(({ target, attributeName }) => {
      if (attributeName === 'open' && target.open) dialogOrder.set(target, ++openingOrder);
    });
    reconcile();
    records.forEach((record) => { if (record.dialog?.open) queueMeasurement(record); });
  });

  function discover() {
    discoveryFrame = 0;
    if (pageSuspended) return;
    let removed = false;
    records.forEach((record, image) => {
      if (!image.isConnected) {
        stop(record);
        intersectionObserver?.unobserve(record.box);
        resizeObserver?.unobserve(record.box);
        boxes.delete(record.box);
        record.host.removeEventListener('pointerenter', record.onInteraction);
        record.host.removeEventListener('focusin', record.onInteraction);
        record.svg.remove();
        records.delete(image);
        removed = true;
      }
    });
    document.querySelectorAll(imageSelector).forEach((image) => {
      if (records.has(image)) return;
      const host = image.parentElement;
      const kind = image.classList.contains('campaign-story__main-image') ? 'story-main' : image.classList.contains('campaign-story__detail-image') ? 'story-detail' : image.id === 'cart-image' ? 'cart' : image.closest('.gallery-thumbs, #feature-thumbs') ? 'thumbnail' : 'photo';
      const imageBox = kind.startsWith('story-') || kind === 'cart';
      const box = imageBox ? image : host;
      if (getComputedStyle(host).position === 'static') host.classList.add('photo-frame-positioned');
      const record = { ...makeFrame(kind), ordinal: nextId, kind, imageBox, image, host, box, dialog: image.closest('dialog'), scene: image.closest('.campaign-story__scene'), story: image.closest('.campaign-story'), inView: false, eligible: false, running: false, animations: [], revision: 0 };
      record.onInteraction = () => play(record);
      host.addEventListener('pointerenter', record.onInteraction);
      host.addEventListener('focusin', record.onInteraction);
      host.append(record.svg);
      records.set(image, record);
      boxes.set(box, record);
      intersectionObserver?.observe(box);
      resizeObserver?.observe(box);
      sourceObserver.observe(image, { attributes: true, attributeFilter: ['src'] });
      queueMeasurement(record);
    });
    if (removed) {
      sourceObserver.disconnect();
      records.forEach((record) => sourceObserver.observe(record.image, { attributes: true, attributeFilter: ['src'] }));
    }
    reconcile();
  }

  const structureObserver = new MutationObserver((mutations) => {
    const hasImages = (node) => node.nodeType === 1 && (node.matches('img') || node.querySelector('img'));
    if (mutations.some(({ addedNodes, removedNodes }) => [...addedNodes, ...removedNodes].some(hasImages)) && !discoveryFrame && !pageSuspended) discoveryFrame = requestAnimationFrame(discover);
  });

  function observeContext() {
    structureObserver.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('#story, #story .campaign-story__scene').forEach((scene) => sceneObserver.observe(scene, { attributes: true, attributeFilter: ['class'] }));
    document.querySelectorAll('dialog').forEach((dialog) => {
      if (dialog.open && !dialogOrder.has(dialog)) dialogOrder.set(dialog, ++openingOrder);
      dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open', 'hidden'] });
    });
    records.forEach((record) => {
      intersectionObserver?.observe(record.box);
      resizeObserver?.observe(record.box);
      sourceObserver.observe(record.image, { attributes: true, attributeFilter: ['src'] });
      queueMeasurement(record);
    });
  }

  function suspend() {
    pageSuspended = true;
    if (measureFrame) cancelAnimationFrame(measureFrame);
    if (discoveryFrame) cancelAnimationFrame(discoveryFrame);
    measureFrame = discoveryFrame = 0;
    [intersectionObserver, resizeObserver, sourceObserver, sceneObserver, dialogObserver, structureObserver].forEach((observer) => observer?.disconnect());
    records.forEach((record) => { record.inView = false; record.eligible = false; stop(record); });
  }

  function resume() {
    if (!pageSuspended) return;
    pageSuspended = false;
    discover();
    observeContext();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (measureFrame) cancelAnimationFrame(measureFrame);
      if (discoveryFrame) cancelAnimationFrame(discoveryFrame);
      measureFrame = discoveryFrame = 0;
    } else {
      discover();
      records.forEach(queueMeasurement);
    }
    reconcile();
  });
  reducedMotion.addEventListener('change', reconcile);
  mobile.addEventListener('change', () => {
    records.forEach((record) => { if (record.running) { stop(record); play(record); } });
  });
  narrowHero.addEventListener('change', () => {
    records.forEach((record) => { if (record.host.matches('.hero-art')) queueMeasurement(record); });
  });
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  if (!resizeObserver) window.addEventListener('resize', () => records.forEach(queueMeasurement), { passive: true });

  window.steeltownPhotoFrames = Object.freeze({
    getState: () => ({ frames: records.size, running: [...records.values()].filter((record) => record.running).length, eligible: [...records.values()].filter((record) => record.eligible).length, measureCount, suspended: pageSuspended, reducedMotion: reducedMotion.matches, topDialog: topDialog()?.id || null })
  });
  discover();
  observeContext();
})();
