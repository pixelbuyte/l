/*
 * anatomy.js — what each labelled part of the drawing is, and where blood goes.
 *
 * The shapes themselves live in index.html, because they are markup and belong
 * where they can be read next to the rest of the document. This file holds the
 * things the shapes do not say: what a part is called, what it is for, which
 * live number belongs in its readout, and the order blood passes through it.
 *
 * Every `id` here must exist in the SVG and every `id` in the SVG marked as a
 * part must appear here. The test suite reads both files and checks it, which
 * is the only thing keeping a renamed path from silently killing a hotspot.
 */
(function (root) {
  'use strict';

  var HEART = (root.HEART = root.HEART || {});

  /*
   * The parts, in the order blood meets them. `side` decides the colour of the
   * blood in the readout: 'venous' is blood on its way to the lungs, 'arterial'
   * is blood on its way to the body. `metric` names a live figure to show.
   */
  var PARTS = [
    {
      id: 'p-svc', name: 'Superior vena cava', side: 'venous', order: 1,
      blurb: 'Returns blood from the head, neck and arms. It has no valve, ' +
             'which is why the pulse in your neck veins is a picture of what ' +
             'the right atrium is doing.',
      metric: null
    },
    {
      id: 'p-ivc', name: 'Inferior vena cava', side: 'venous', order: 2,
      blurb: 'Returns blood from everything below the diaphragm — the larger ' +
             'of the two returns at rest, and the one that empties when you ' +
             'stand up too fast.',
      metric: null
    },
    {
      id: 'p-ra', name: 'Right atrium', side: 'venous', order: 3,
      blurb: 'A thin-walled holding chamber. It fills all the way through ' +
             'ventricular contraction against a shut valve, then empties ' +
             'mostly by gravity when the valve opens. Its own squeeze adds ' +
             'the last fifth.',
      metric: 'rap'
    },
    {
      id: 'p-tricuspid', name: 'Tricuspid valve', side: 'venous', order: 4,
      blurb: 'Three leaflets between the right atrium and right ventricle, ' +
             'guyed to the ventricle wall by tendinous cords so they cannot ' +
             'blow backwards. Shut for the whole of systole.',
      metric: 'tricuspid'
    },
    {
      id: 'p-rv', name: 'Right ventricle', side: 'venous', order: 5,
      blurb: 'Moves exactly the same stroke volume as the left ventricle ' +
             'against about a sixth of the pressure. That is the entire ' +
             'reason its wall is a third the thickness.',
      metric: 'rv'
    },
    {
      id: 'p-pulmonary', name: 'Pulmonary valve', side: 'venous', order: 6,
      blurb: 'Three cusps that fill and slam shut the instant the right ' +
             'ventricle stops pushing. Its closing is the second half of the ' +
             'second heart sound.',
      metric: 'pulmonary'
    },
    {
      id: 'p-pa', name: 'Pulmonary arteries', side: 'venous', order: 7,
      blurb: 'The only arteries in the body carrying blood that is short of ' +
             'oxygen. They divide until they are one cell thick around the ' +
             'air sacs, which is where the colour changes.',
      metric: 'pa'
    },
    {
      id: 'p-pv', name: 'Pulmonary veins', side: 'arterial', order: 8,
      blurb: 'Four of them, and the only veins carrying freshly oxygenated ' +
             'blood. They have no valves either, so the left atrium drains ' +
             'and refills them with every beat.',
      metric: null
    },
    {
      id: 'p-la', name: 'Left atrium', side: 'arterial', order: 9,
      blurb: 'The chamber furthest back in the chest. When it is stretched ' +
             'for long enough it stops contracting in step and starts to ' +
             'fibrillate, which costs the ventricle its atrial kick.',
      metric: 'la'
    },
    {
      id: 'p-mitral', name: 'Mitral valve', side: 'arterial', order: 10,
      blurb: 'The only valve with two leaflets rather than three. Its large ' +
             'front leaflet is also one wall of the outflow the aorta takes, ' +
             'so it does two jobs in opposite directions.',
      metric: 'mitral'
    },
    {
      id: 'p-lv', name: 'Left ventricle', side: 'arterial', order: 11,
      blurb: 'The pump the rest of it is arranged around. Its muscle is wound ' +
             'in opposing helices, so a beat is a wring rather than a squeeze ' +
             '— the base drops towards a nearly stationary apex.',
      metric: 'lv'
    },
    {
      id: 'p-aortic', name: 'Aortic valve', side: 'arterial', order: 12,
      blurb: 'Three cusps holding back the whole arterial pressure through ' +
             'diastole. The recoil that shuts them is the notch you can see ' +
             'on the aortic pressure trace.',
      metric: 'aortic'
    },
    {
      id: 'p-aorta', name: 'Aorta', side: 'arterial', order: 13,
      blurb: 'Elastic enough to take about half of each stroke volume into ' +
             'its own wall and give it back during diastole. That is what ' +
             'turns an intermittent pump into a continuous flow.',
      metric: 'ao'
    },
    {
      id: 'p-septum', name: 'Interventricular septum', side: 'muscle', order: 14,
      blurb: 'A shared wall, not a partition — it belongs to the left ' +
             'ventricle and bulges into the right. Both ventricles contract ' +
             'as one twisted sheet of muscle wrapped around it.',
      metric: null
    },
    {
      id: 'p-coronary', name: 'Coronary arteries', side: 'arterial', order: 15,
      blurb: 'The heart feeds itself from the first two branches off the ' +
             'aorta, and can only do it between beats: squeezing shuts its ' +
             'own supply. A fast heart is a hungrier heart with less time to eat.',
      metric: null
    },
    {
      id: 'p-apex', name: 'Apex', side: 'muscle', order: 16,
      blurb: 'The tip of the left ventricle, and the part that barely moves. ' +
             'It is what taps your chest wall between the fifth and sixth ribs ' +
             'once a second for your whole life.',
      metric: null
    }
  ];

  /*
   * Routes for the flow particles. Each names a hidden path in the SVG, the
   * gate that has to be open before anything moves along it, and how the blood
   * is coloured on the way.
   *
   * `gate` values:
   *   'inflow'  venous return — runs continuously, faster when the atrium empties
   *   'av'      through a cuspid valve — only while it is open
   *   'semi'    through a semilunar valve — only while it is open
   *   'free'    a vessel with nothing shut in it
   */
  var ROUTES = [
    { id: 'r-svc', path: 'flow-svc', gate: 'inflow', tint: 'venous', rate: 0.9 },
    { id: 'r-ivc', path: 'flow-ivc', gate: 'inflow', tint: 'venous', rate: 1.1 },
    { id: 'r-tri', path: 'flow-tricuspid', gate: 'av', tint: 'venous', rate: 2.4 },
    { id: 'r-rvot', path: 'flow-rvot', gate: 'semi', tint: 'venous', rate: 2.6 },
    { id: 'r-rpa', path: 'flow-rpa', gate: 'semi', tint: 'venous', rate: 1.3, delay: 0.45 },
    { id: 'r-lpa', path: 'flow-lpa', gate: 'semi', tint: 'venous', rate: 1.3, delay: 0.45 },
    { id: 'r-pv1', path: 'flow-pv1', gate: 'free', tint: 'arterial', rate: 1.0 },
    { id: 'r-pv2', path: 'flow-pv2', gate: 'free', tint: 'arterial', rate: 1.0 },
    { id: 'r-mit', path: 'flow-mitral', gate: 'av', tint: 'arterial', rate: 2.4 },
    { id: 'r-lvot', path: 'flow-aortic', gate: 'semi', tint: 'arterial', rate: 3.0 },
    { id: 'r-arch', path: 'flow-arch', gate: 'semi', tint: 'arterial', rate: 1.6, delay: 0.4 }
  ];

  /*
   * Groups whose transform is driven every frame. `pivot` is the point the
   * squeeze happens around, in viewBox units. The ventricles pivot on the apex
   * because that is what actually happens: the base of a beating heart travels
   * about 12 mm towards an apex that stays put against the chest wall.
   */
  var MOTION = [
    { id: 'm-lv', driver: 'ventricle', pivot: [390, 708], sx: 0.088, sy: 0.112, twist: -3.2 },
    { id: 'm-rv', driver: 'ventricle', pivot: [300, 626], sx: 0.072, sy: 0.082, twist: -2.0 },
    { id: 'm-ra', driver: 'atrium',    pivot: [240, 372], sx: 0.075, sy: 0.080, twist: 0 },
    { id: 'm-la', driver: 'atrium',    pivot: [438, 372], sx: 0.075, sy: 0.080, twist: 0 },
    { id: 'm-body', driver: 'body',    pivot: [390, 708], sx: 0.026, sy: 0.036, twist: -1.5 }
  ];

  /* Wall thickness in viewBox units at end-diastole and end-systole. A left
     ventricle wall goes from about 9 mm to 14 mm as it shortens; a right
     ventricle barely changes because it has so little muscle to thicken. */
  var WALLS = [
    { id: 'w-lv', min: 30, max: 42 },
    { id: 'w-rv', min: 13, max: 17 },
    { id: 'w-ra', min: 8,  max: 10 },
    { id: 'w-la', min: 8,  max: 10 }
  ];


  /*
   * Where each label hangs. `px,py` is the point on the drawing being pointed
   * at; `x,y` is where the text sits out in the margin. The margins only exist
   * when labels are switched on — the viewBox widens to make room for them,
   * which is why the heart is drawn to fill 640 units and the plate is wider.
   */
  var LABELS = {
    'p-pulmonary': { px: 303, py: 314, x: 104, y: 62,  anchor: 'end',   side: 'left' },
    'p-svc':       { px: 180, py: 120, x: 104, y: 130, anchor: 'end',   side: 'left' },
    'p-pa':        { px: 200, py: 188, x: 104, y: 198, anchor: 'end',   side: 'left' },
    'p-ra':        { px: 240, py: 300, x: 104, y: 272, anchor: 'end',   side: 'left' },
    'p-tricuspid': { px: 244, py: 414, x: 104, y: 348, anchor: 'end',   side: 'left' },
    'p-ivc':       { px: 150, py: 448, x: 104, y: 424, anchor: 'end',   side: 'left' },
    'p-rv':        { px: 250, py: 502, x: 104, y: 500, anchor: 'end',   side: 'left' },
    'p-septum':    { px: 330, py: 532, x: 104, y: 578, anchor: 'end',   side: 'left' },
    'p-aortic':    { px: 368, py: 304, x: 528, y: 64,  anchor: 'start', side: 'right' },
    'p-aorta':     { px: 472, py: 164, x: 528, y: 132, anchor: 'start', side: 'right' },
    'p-pv':        { px: 544, py: 256, x: 528, y: 200, anchor: 'start', side: 'right' },
    'p-la':        { px: 438, py: 300, x: 528, y: 272, anchor: 'start', side: 'right' },
    'p-mitral':    { px: 430, py: 410, x: 528, y: 348, anchor: 'start', side: 'right' },
    'p-lv':        { px: 412, py: 500, x: 528, y: 424, anchor: 'start', side: 'right' },
    'p-coronary':  { px: 470, py: 378, x: 528, y: 500, anchor: 'start', side: 'right' },
    'p-apex':      { px: 388, py: 680, x: 528, y: 592, anchor: 'start', side: 'right' }
  };
  for (var li = 0; li < PARTS.length; li++) PARTS[li].label = LABELS[PARTS[li].id] || null;

  HEART.anatomy = {
    parts: PARTS,
    routes: ROUTES,
    motion: MOTION,
    walls: WALLS,
    byId: function (id) {
      for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) return PARTS[i];
      return null;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
