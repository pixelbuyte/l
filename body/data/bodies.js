/*
 * bodies.js — the four pre-built bodies, and what one of them costs.
 *
 * Everything the page shows comes from here: the specs, the effector options,
 * and the Warden's bill of materials down to the individual motor. The page
 * computes every total at load time from the rows in this file — nothing on
 * screen is hand-summed — so any figure can be checked by reading the row it
 * came from, and the test suite re-adds the whole sheet in node.
 *
 * The costs are estimates assembled from public prices for the same class of
 * part: quasi-direct-drive actuators of the kind open-source humanoids use,
 * harmonic drives where the torque demands them, hobbyist microturbines, an
 * automotive-grade battery pack. They are believable, not quoted. Nothing here
 * is a vendor list.
 */
(function (root) {
  'use strict';

  var BOT = (root.BOT = root.BOT || {});

  /*
   * The four bodies. One design language, four duty cycles — which is how
   * real product families work: you do not redesign the skeleton, you re-spec
   * it. `dims` is where the height dimension line attaches on that body's
   * drawing, in viewBox units.
   */
  BOT.bodies = [
    {
      id: 'warden',
      name: 'Warden',
      role: 'Guardian · rescue',
      blurb: 'The one you described. It pairs with a wrist sensor, and when ' +
             'your pulse says you are in trouble it stops walking and starts ' +
             'flying. Four microturbines are most of its cost sheet, and the ' +
             'cost sheet below is its real argument.',
      hasBom: true,
      dims: { top: 40, bottom: 594 },
      specs: {
        height: 1.88, mass: 96, dof: 29, handDof: 32,
        payload: '32 kg carried · 80 kg dragged',
        speed: '11 m/s ground · 40 m/s flight',
        power: '2.2 kWh pack + 6 L turbine fuel',
        runtime: '3.5 h mixed duty'
      },
      features: [
        'Distress link: paired wrist sensor streams pulse; a sustained spike re-tasks it mid-stride',
        'Four 220 N microturbines, two scapular and two pelvic, gimballed 15°',
        'Hands are the standard 16-DoF units — rescue work is grip work'
      ]
    },
    {
      id: 'aide',
      name: 'Aide',
      role: 'Domestic · care',
      blurb: 'The body that cooks and cleans. Everything the Warden spends on ' +
             'thrust this one spends on quietness: smaller motors run well ' +
             'inside their torque curve, which is where motors are silent.',
      hasBom: false,
      dims: { top: 58, bottom: 594 },
      specs: {
        height: 1.68, mass: 58, dof: 27, handDof: 32,
        payload: '12 kg carried',
        speed: '2.2 m/s — a brisk indoor walk',
        power: '1.1 kWh pack',
        runtime: '8 h household duty'
      },
      features: [
        'Compliant joints throughout: it loses a wrestling match with a door on purpose',
        'Wipe-down shell, no external fasteners, food-safe forearms',
        'Same distress link as the Warden — it just walks there instead'
      ]
    },
    {
      id: 'swift',
      name: 'Swift',
      role: 'Flight · courier',
      blurb: 'The airframe wearing legs. Strip the payload, stretch the legs ' +
             'into landing gear, sweep the winglets, and the same skeleton ' +
             'files a flight plan. It gives up hands to keep the weight down.',
      hasBom: false,
      dims: { top: 46, bottom: 594 },
      specs: {
        height: 1.74, mass: 51, dof: 24, handDof: 0,
        payload: '8 kg slung',
        speed: '9 m/s ground · 62 m/s flight',
        power: '0.9 kWh pack + 9 L turbine fuel',
        runtime: '40 min continuous flight'
      },
      features: [
        'Swept dorsal winglets carry a third of cruise lift',
        'Simple two-finger grippers — a courier holds, it does not manipulate',
        'Legs double as landing gear; the knees take the touchdown'
      ]
    },
    {
      id: 'forge',
      name: 'Forge',
      role: 'Industrial · heavy work',
      blurb: 'The stocky one. Shorter levers mean the same motors move twice ' +
             'the load, which is the whole trick of it. Ships with the tool ' +
             'chuck fitted, and the scissor hand you wanted lives here too.',
      hasBom: false,
      dims: { top: 66, bottom: 594 },
      specs: {
        height: 1.62, mass: 112, dof: 26, handDof: 4,
        payload: '55 kg carried · 140 kg jacked',
        speed: '1.6 m/s — it is not in a hurry',
        power: '1.8 kWh pack, hot-swap',
        runtime: '10 h shift duty'
      },
      features: [
        'Roll cage over the head; the head is the cheap part but the lidar is not',
        'Forearms take any effector on the same chuck: scissor, gripper, tool drive',
        'Ballast pelvis — it is heavy at the bottom the way a crane is'
      ]
    }
  ];

  /*
   * End effectors. Any body takes any of them — that is what "more variations"
   * means in practice: you do not redraw the body, you change what it holds
   * the world with. `unit` is per hand; the Warden's sheet re-prices its hand
   * row live when you swap.
   */
  BOT.effectors = [
    { id: 'hand',    name: '16-DoF hand',   unit: 4800, mass: 620,
      note: 'The expensive default. Twenty tendons, four per finger, and worth it anywhere the world was built for people.' },
    { id: 'scissor', name: 'Scissor blade', unit: 1150, mass: 740,
      note: 'Two hardened blades on one pivot. Cuts strap, cable, sheet and seatbelt; the rescue variant of a hand.' },
    { id: 'gripper', name: 'Two-jaw gripper', unit: 890, mass: 810,
      note: 'One motion, enormous force. The right hand for everything that only needs holding.' },
    { id: 'chuck',   name: 'Tool chuck',    unit: 640, mass: 650,
      note: 'A powered socket that takes whatever tool the job needs. The cheapest hand is the one the tool brings.' }
  ];

  /*
   * The Warden's bill of materials. Rows with a `joint` key light up on the
   * drawing, and the drawing lights up rows. The `hand` row is special: it is
   * re-priced from the selected effector, which is why it carries no unit here.
   */
  BOT.bom = [
    {
      group: 'Actuation',
      note: 'Twenty-nine joints. Harmonic drives where the torque is brutal, quasi-direct-drive everywhere the joint has to feel the world.',
      items: [
        { joint: 'hip',      label: 'Hip — harmonic drive, 130 N·m',      qty: 6, unit: 1850 },
        { joint: 'waist',    label: 'Waist — harmonic drive, 110 N·m',    qty: 3, unit: 1700 },
        { joint: 'knee',     label: 'Knee — QDD, 90 N·m',                 qty: 2, unit: 1240 },
        { joint: 'ankle',    label: 'Ankle — QDD, 45 N·m',                qty: 4, unit: 760 },
        { joint: 'shoulder', label: 'Shoulder — QDD, 60 N·m',             qty: 6, unit: 920 },
        { joint: 'elbow',    label: 'Elbow — QDD, 45 N·m',                qty: 2, unit: 760 },
        { joint: 'wrist',    label: 'Wrist — QDD, 18 N·m',                qty: 4, unit: 430 },
        { joint: 'neck',     label: 'Neck — QDD, 12 N·m',                 qty: 2, unit: 360 },
        { joint: 'hand',     label: 'Hands', qty: 2, effector: true }
      ]
    },
    {
      group: 'Flight',
      note: 'The reason this body costs what it costs. Nothing else on the sheet is a third of it.',
      items: [
        { joint: 'jet', label: 'Microturbine, 220 N thrust', qty: 4, unit: 8900 },
        { joint: 'jet', label: 'Fuel system + gimbal mounts', qty: 1, unit: 4200 }
      ]
    },
    {
      group: 'Sensing',
      note: 'It has to find you before it can reach you.',
      items: [
        { label: 'Solid-state lidar',                        qty: 1,  unit: 940 },
        { label: 'Stereo camera module',                     qty: 4,  unit: 210 },
        { label: 'Tactical-grade IMU',                       qty: 1,  unit: 1400 },
        { label: 'Joint encoder',                            qty: 29, unit: 85 },
        { label: 'Pressure-skin panel set',                  qty: 1,  unit: 1150 },
        { label: 'Microphone array',                         qty: 1,  unit: 160 },
        { label: 'UWB ranging link — finds the wrist sensor',qty: 1,  unit: 240 },
        { label: 'Distress receiver — reads the pulse feed', qty: 1,  unit: 180 }
      ]
    },
    {
      group: 'Compute',
      note: 'Two of everything that matters, one safety controller that trusts neither.',
      items: [
        { label: 'Orin-class autonomy module', qty: 2, unit: 1999 },
        { label: 'Safety microcontroller',     qty: 1, unit: 240 },
        { label: 'Radio set',                  qty: 1, unit: 310 }
      ]
    },
    {
      group: 'Power',
      note: 'The pack is sized for the mission it fails on, not the one it succeeds on.',
      items: [
        { label: '2.2 kWh battery pack', qty: 1, unit: 3300 },
        { label: 'Power distribution',   qty: 1, unit: 560 },
        { label: 'Fast-charge port',     qty: 1, unit: 180 }
      ]
    },
    {
      group: 'Structure',
      note: 'Aluminium-lithium where it bends, polymer where it merely covers.',
      items: [
        { label: 'Al-Li frame set',    qty: 1, unit: 5200 },
        { label: 'Shell panel set',    qty: 1, unit: 2300 },
        { label: 'Harness + routing',  qty: 1, unit: 700 },
        { label: 'Thermal management', qty: 1, unit: 640 }
      ]
    }
  ];

  /* One place computes money, and everyone asks it. */
  BOT.price = function (effectorId) {
    var fx = null;
    for (var i = 0; i < BOT.effectors.length; i++) {
      if (BOT.effectors[i].id === effectorId) fx = BOT.effectors[i];
    }
    var groups = [], grand = 0;
    BOT.bom.forEach(function (g) {
      var sub = 0, rows = g.items.map(function (it) {
        var unit = it.effector ? (fx ? fx.unit : 0) : it.unit;
        var label = it.effector && fx ? 'Hands — ' + fx.name : it.label;
        var line = unit * it.qty;
        sub += line;
        return { joint: it.joint || null, label: label, qty: it.qty, unit: unit, line: line };
      });
      grand += sub;
      groups.push({ group: g.group, note: g.note, sub: sub, rows: rows });
    });
    return { groups: groups, grand: grand, effector: fx };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
