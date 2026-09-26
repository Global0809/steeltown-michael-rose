// Product facts and client-approved campaign artwork.
window.STEELTOWN_CATALOG = {
  "price": 175,
  "currency": "USD",
  "sizeMl": 100,
  "format": "Eau de parfum",
  "checkout": {
    "enabled": true,
    "url": "https://www.paypal.com/ncp/payment/ZU5K2273WDMPJ",
    "caption": "PayPal lists a single “Perfume” item. Confirm your Pink or Silver finish with the seller before paying.",
    "pendingMessage": "Online purchasing is not available yet."
  },
  "editions": {
    "pink": {
      "name": "Pink Candy Rose",
      "shortName": "Pink",
      "title": "Pink Candy Rose Edition",
      "cover": "assets/product-portraits/pink-portrait-rose.webp",
      "gallery": [
        {
          "src": "assets/product-portraits/pink-portrait-rose.webp",
          "alt": "Pink Candy Rose Edition full sculptural perfume portrait",
          "label": "The signature portrait",
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-angles-rose.webp",
          "alt": "Pink Candy Rose Edition perfume sculpture, front three-quarter view",
          "label": "Front three-quarter",
          "crop": [
            0,
            0
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-angles-rose.webp",
          "alt": "Pink Candy Rose Edition perfume sculpture, rear oblique view",
          "label": "Rear oblique",
          "crop": [
            1,
            0
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-angles-rose.webp",
          "alt": "Pink Candy Rose Edition perfume sculpture, rear three-quarter view",
          "label": "Rear three-quarter",
          "crop": [
            0,
            1
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-angles-rose.webp",
          "alt": "Pink Candy Rose Edition perfume sculpture, overhead view",
          "label": "Overhead",
          "crop": [
            1,
            1
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-panorama.webp",
          "alt": "Pink Candy Rose sculptural bottle, right profile",
          "label": "Right profile",
          "stripRect": [420,16,364,912],
          "crop": [
            1,
            0
          ],
          "layout": "strip",
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-panorama.webp",
          "alt": "Pink Candy Rose sculptural bottle, rear view",
          "label": "Rear view",
          "stripRect": [784,16,388,912],
          "crop": [
            2,
            0
          ],
          "layout": "strip",
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/pink-panorama.webp",
          "alt": "Pink Candy Rose sculptural bottle, left profile",
          "label": "Left profile",
          "stripRect": [1172,16,364,912],
          "crop": [
            3,
            0
          ],
          "layout": "strip",
          "scene": "rose"
        }
      ]
    },
    "silver": {
      "name": "Silver",
      "shortName": "Silver",
      "title": "The Silver Edition",
      "cover": "assets/product-portraits/silver-hero.webp",
      "gallery": [
        {
          "src": "assets/product-portraits/silver-hero.webp",
          "alt": "The Silver Edition full sculptural perfume portrait",
          "label": "The signature portrait",
          "scene": "dark"
        },
        {
          "src": "assets/product-portraits/silver-angles-rose.webp",
          "alt": "The Silver Edition perfume sculpture, front view",
          "label": "Front",
          "crop": [
            0,
            0
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/silver-angles-rose.webp",
          "alt": "The Silver Edition perfume sculpture, profile view",
          "label": "Profile",
          "crop": [
            1,
            0
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/silver-angles-rose.webp",
          "alt": "The Silver Edition perfume sculpture, rear view",
          "label": "Rear",
          "crop": [
            0,
            1
          ],
          "sheetScale": 2,
          "scene": "rose"
        },
        {
          "src": "assets/product-portraits/silver-angles-rose.webp",
          "alt": "The Silver Edition perfume sculpture, three-quarter view",
          "label": "Three-quarter",
          "crop": [
            1,
            1
          ],
          "sheetScale": 2,
          "scene": "rose"
        }
      ]
    }
  },
  "constellation": {
    "modelSrc": "assets/models/steeltown-scan.glb"
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
