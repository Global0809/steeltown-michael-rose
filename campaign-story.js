(() => {
  const story = document.querySelector('.campaign-story');
  if (!story || story.dataset.storyInitialized) return;
  story.dataset.storyInitialized = 'true';

  const reel = story.querySelector('[data-story-reel]');
  const stage = story.querySelector('[data-story-stage]');
  const scenes = [...story.querySelectorAll('[data-story-scene]')];
  const progressLine = story.querySelector('[data-story-progress]');
  if (!reel || !stage || !scenes.length || !progressLine || !('IntersectionObserver' in window)) return;

  const desktop = window.matchMedia('(min-width: 960px) and (min-height: 620px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = false;
  let inView = false;
  let listening = false;
  let frame = 0;
  let activeIndex = -1;
  let renderCount = 0;
  let needsMeasurement = true;
  let stageHeight = 0;
  let stickyTop = 106;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function render() {
    frame = 0;
    if (!enabled || !inView || document.hidden) return;

    // Read geometry first; the remaining work only updates classes and transforms.
    const bounds = reel.getBoundingClientRect();
    if (needsMeasurement) {
      stageHeight = stage.getBoundingClientRect().height;
      stickyTop = Number.parseFloat(window.getComputedStyle(stage).top) || 106;
      needsMeasurement = false;
    }
    const distance = Math.max(1, bounds.height - stageHeight);
    const progress = clamp((stickyTop - bounds.top) / distance, 0, 1);
    const position = progress * scenes.length;
    const index = Math.min(scenes.length - 1, Math.floor(position));
    const chapterProgress = clamp(position - index, 0, 1);

    if (index !== activeIndex) {
      scenes.forEach((scene, sceneIndex) => scene.classList.toggle('is-active', sceneIndex === index));
      activeIndex = index;
      story.dataset.storyChapter = String(index + 1);
    }
    scenes[index].style.setProperty('--story-drift', `${((0.5 - chapterProgress) * 22).toFixed(2)}px`);
    progressLine.style.transform = `scaleX(${progress.toFixed(4)})`;
    story.dataset.storyProgress = progress.toFixed(4);
    story.dataset.storyRenderCount = String(++renderCount);
  }

  function schedule() {
    if (enabled && inView && !document.hidden && !frame) frame = window.requestAnimationFrame(render);
  }

  function syncListeners() {
    const shouldListen = enabled && inView && !document.hidden;
    if (shouldListen !== listening) {
      if (shouldListen) window.addEventListener('scroll', schedule, { passive: true });
      else window.removeEventListener('scroll', schedule);
      listening = shouldListen;
    }
    if (!shouldListen && frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
    if (shouldListen) schedule();
  }

  function configure() {
    enabled = desktop.matches && !reducedMotion.matches;
    story.classList.toggle('is-story-enhanced', enabled);
    needsMeasurement = true;
    if (enabled && activeIndex < 0) {
      scenes[0].classList.add('is-active');
      activeIndex = 0;
      story.dataset.storyChapter = '1';
    }
    if (!enabled) {
      scenes.forEach((scene) => {
        scene.classList.remove('is-active');
        scene.style.removeProperty('--story-drift');
      });
      activeIndex = -1;
      progressLine.style.removeProperty('transform');
      delete story.dataset.storyChapter;
      delete story.dataset.storyProgress;
    }
    syncListeners();
  }

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncListeners();
  }, { rootMargin: '100px 0px' });
  observer.observe(reel);

  desktop.addEventListener('change', configure);
  reducedMotion.addEventListener('change', configure);
  window.addEventListener('resize', () => {
    needsMeasurement = true;
    schedule();
  }, { passive: true });
  document.addEventListener('visibilitychange', syncListeners);
  window.addEventListener('pageshow', () => {
    needsMeasurement = true;
    schedule();
  });
  configure();
})();
