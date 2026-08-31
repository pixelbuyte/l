// Crown Fried Chicken, 443 Lincoln St, Worcester MA.
//
// Everything here is sourced, not invented. The phone number is legible on the
// right-hand storefront window in Street View; the combo prices come from the
// published menu listings for this address; the coordinates are the geocoded
// building footprint. Anything we could not verify is simply absent — the page
// would rather say less than say something wrong about someone's business.

(function (root) {
  'use strict';

  var PLACE = {
    name: 'Crown Fried Chicken',
    tagline: 'Fried chicken, wings and seafood on Lincoln Street.',
    street: '443 Lincoln St',
    city: 'Worcester',
    state: 'MA',
    zip: '01605',
    phone: '(508) 595-0220',
    phoneHref: '+15085950220',
    lat: 42.2918014,
    lng: -71.7803734,
    // Google's own identifiers for this listing.
    cid: '15066648775664512677',
    panoId: 'tUaswcEJKwm-FW6Cmm7tBg',
    // Yaw that points the Street View camera at the storefront.
    panoHeading: 150,
    shortLink: 'https://maps.app.goo.gl/tkQppe6kzSGrC8KH6',

    // Open 10:00 to 24:00, every day. Stored as minutes past midnight so the
    // open/closed logic is plain arithmetic.
    hours: { open: 10 * 60, close: 24 * 60, days: 'Every day' },

    traits: [
      'Counter service',
      'Takeout',
      'Delivery',
      'Free parking lot',
      'Cards accepted'
    ]
  };

  PLACE.addressLine = PLACE.street + ', ' + PLACE.city + ', ' + PLACE.state + ' ' + PLACE.zip;
  PLACE.mapsUrl = 'https://www.google.com/maps?cid=' + PLACE.cid;
  PLACE.directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(PLACE.street + ', ' + PLACE.city + ', ' + PLACE.state + ' ' + PLACE.zip);

  // The menu board. `note` is the combo each section is served as — at this
  // counter almost everything is a plate, not an item.
  var MENU = [
    {
      id: 'chicken',
      label: 'Chicken',
      note: 'with fries or rice & soda',
      blurb: 'The thing on the sign. Fried to order, so give it a minute.',
      items: [
        { name: '2 Piece Chicken', price: 4.50, tag: 'Most ordered' },
        { name: '3 Piece Chicken', price: 5.50 },
        { name: '5 Piece Chicken', price: 7.50, tag: 'Feeds two' }
      ]
    },
    {
      id: 'wings',
      label: 'Wings',
      note: 'with fries or rice & soda',
      blurb: 'Wing dings or hot wings — say which at the counter.',
      items: [
        { name: '4 Piece Wings', price: 5.25 },
        { name: '6 Piece Wing Dings or Hot Wings', price: 5.25, tag: 'Best value' },
        { name: '10 Piece Wing Dings or Hot Wings', price: 7.50 }
      ]
    },
    {
      id: 'seafood',
      label: 'Seafood',
      note: 'with fries or rice & soda',
      blurb: 'Fried shrimp and whiting. The window has said SEAFOOD for years.',
      items: [
        { name: '21 Piece Shrimp', price: 5.99, tag: 'Twenty-one of them' },
        { name: '6 Piece Jumbo Shrimp', price: 5.99 },
        { name: '2 Piece Whiting Fish', price: 5.25 }
      ]
    },
    {
      id: 'subs',
      label: 'Subs & Burgers',
      note: 'with fries & soda',
      blurb: 'Griddle side of the kitchen. Steak and cheese comes out fast.',
      items: [
        { name: 'Chicken Sandwich', price: 4.50 },
        { name: 'Grilled Chicken Sandwich', price: 4.99 },
        { name: 'Fried Fish Sandwich', price: 4.50 },
        { name: 'Cheeseburger', price: 4.50 },
        { name: 'Italian Cheeseburger', price: 4.75 },
        { name: 'Double Cheeseburger', price: 5.50 },
        { name: 'Cheese Steak', price: 5.99 },
        { name: 'Philly Cheese Steak', price: 5.99, tag: 'Griddle favourite' }
      ]
    }
  ];

  // Street View frames, rendered straight from Google's panorama of the block.
  //
  // The spans tile a three-column grid exactly, with no gaps: two rows of
  // 1+2, then a full-width strip. Reordering these without redoing that sum
  // will punch a hole in the grid.
  var GALLERY = [
    { src: 'img/front.webp', w: 900, h: 675, span: 'tall',
      caption: 'The counter, straight on. The address is on the glass: 443.' },
    { src: 'img/sign.webp', w: 1100, h: 374, span: 'wide',
      caption: 'Red letters, red roofline. Visible the length of Lincoln Street.' },
    { src: 'img/corner.webp', w: 1100, h: 374, span: 'wide',
      caption: 'The lot wraps the building — there is always somewhere to put a car.' },
    { src: 'img/crown-badge.webp', w: 420, h: 420, span: 'square',
      caption: 'The crown badge itself, over the left-hand window.' },
    { src: 'img/street.webp', w: 1100, h: 457, span: 'full',
      caption: 'The block: the oil-change place, then the lot, then the shop.' }
  ];

  var API = { PLACE: PLACE, MENU: MENU, GALLERY: GALLERY };

  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.CrownData = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
