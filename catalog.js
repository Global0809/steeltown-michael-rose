// The only source of product facts and purchase availability.
window.STEELTOWN_CATALOG = {
  price: 199,
  currency: 'USD',
  sizeMl: 150,
  format: 'Eau de parfum',
  checkout: {
    enabled: false,
    url: null,
    // Do not enable the old link: its verified offer is $175 / 100 ml.
    // Enable only after verifying the replacement is $199 / 150 ml.
    pendingMessage: 'Online purchasing is not available yet.'
  },
  editions: {
    pink: { name: 'Pink', modelSrc: 'assets/models/steeltown-michael-pink.glb' },
    silver: { name: 'Silver', modelSrc: 'assets/models/steeltown-michael-silver.glb' }
  }
};
window.STEELTOWN = (() => {
  const listeners = new Set();
  let edition = 'pink';
  return Object.freeze({
    get edition() { return edition; },
    get catalog() { return window.STEELTOWN_CATALOG; },
    selectEdition(next) {
      if (!Object.hasOwn(window.STEELTOWN_CATALOG.editions,next)) return;
      if (next === edition) return;
      edition = next;
      listeners.forEach(listener => listener(edition));
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  });
})();
