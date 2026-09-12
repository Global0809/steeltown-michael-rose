// The only source of product facts and purchase availability.
window.STEELTOWN_CATALOG = {
  price: 199,
  currency: 'USD',
  sizeMl: 100,
  format: 'Eau de parfum',
  checkout: {
    enabled: false,
    url: null,
    // Merchant confirmation is pending: the existing hosted link charges $175 / 100 ml.
    // A live checkout must agree with this catalog's price, size and selected edition.
    pendingMessage: 'Online purchasing is not available yet.'
  },
  editions: {
    pink: {
      name: 'Pink Candy Rose', shortName: 'Pink', title: 'Pink Candy Rose Edition',
      modelSrc: 'assets/models/steeltown-michael-pink.glb', cover: 'assets/pink-campaign-3.webp',
      gallery: [
        {src:'assets/pink-campaign-3.webp', alt:'Glossy Pink Candy Rose perfume bottle in a sunset rose garden with falling petals', label:'Rose reverie'},
        {src:'assets/pink-campaign-1.jpg', alt:'Pink sculptural perfume bottle standing in a field of flowers', label:'The original'},
        {src:'assets/pink-campaign-2.jpg', alt:'Pink sculptural perfume bottle with its presentation packaging', label:'The presentation'},
        {src:'assets/pink-campaign-4.webp', alt:'Pink Candy Rose perfume bottle reflected in a liquid mirror with flowing pink silk', label:'Silk & reflection'},
        {src:'assets/pink-campaign-5.webp', alt:'Pink Candy Rose perfume bottle in a cinematic moonlit glass conservatory', label:'Midnight bloom'}
      ]
    },
    silver: {
      name: 'Silver', shortName: 'Silver', title: 'The Silver Edition',
      modelSrc: 'assets/models/steeltown-michael-silver.glb', cover: 'assets/silver-campaign-1.jpg',
      gallery: [
        {src:'assets/silver-campaign-3.webp', alt:'Polished silver perfume bottle in a moonlit rose garden beside a reflection pool', label:'Moonlit roses'},
        {src:'assets/silver-campaign-1.jpg', alt:'Silver sculptural perfume bottle on a dark natural display', label:'The original'},
        {src:'assets/silver-campaign-2.jpg', alt:'Silver perfume bottle with its sculptural cap removed and atomizer revealed', label:'The details'},
        {src:'assets/silver-campaign-4.webp', alt:'Silver perfume bottle with rain droplets and soft pink cinematic reflections', label:'After the rain'},
        {src:'assets/silver-campaign-5.webp', alt:'Silver perfume bottle in an art deco mirror gallery with pearl pink silk', label:'Mirror muse'}
      ]
    }
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
