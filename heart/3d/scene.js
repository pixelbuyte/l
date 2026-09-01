/*
 * heart/3d/scene.js — the beating heart in three dimensions.
 *
 * Nothing in here is keyframed. Every motion is read from HEART.cycle, the
 * same model that drives the 2D page:
 *
 *   chamber size      ← volumeAt / atrialFill
 *   leaflet angle     ← valves
 *   vessel calibre    ← pressures
 *   blood particles   ← flowAt (sign decides which valve they cross)
 *   ventricular twist ← fill (the LV wrings as it empties, as a real one does)
 *
 * The ventricles are anchored at the apex and the atria at the valve plane,
 * so a contracting ventricle pulls its base *down* toward a fixed apex — the
 * longitudinal shortening you see on an echo — rather than shrinking about
 * its centre like a balloon.
 *
 * One file, two hosts: index.html loads it beside cycle.js, and the inline
 * viewer embeds it verbatim. It needs only THREE, OrbitControls and a canvas.
 */
window.HEART3D = function (THREE, OrbitControls, canvas, width, height, opts) {
  'use strict';
  opts = opts || {};
  var C = HEART.cycle;
  var h = C.hemodynamics(opts.hr || 72, opts.contractility || 1, opts.filling || 1);

  /* ---------------------------------------------------------------- stage */
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
  camera.position.set(0.5, 0.9, 6.3);
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.45, 0);
  controls.minDistance = 3.5;
  controls.maxDistance = 16;

  scene.add(new THREE.HemisphereLight(0xffe9e0, 0x1e0810, 0.6));
  var key = new THREE.DirectionalLight(0xfff2e8, 1.0); key.position.set(3, 5, 4); scene.add(key);
  var rim = new THREE.DirectionalLight(0x9cc6ff, 0.5); rim.position.set(-4, 2.5, -3); scene.add(rim);
  var warm = new THREE.PointLight(0xff7a5c, 0.35, 24); warm.position.set(0.5, -2.5, 3); scene.add(warm);

  var root = new THREE.Group();
  root.position.y = -0.35;
  scene.add(root);

  /* ------------------------------------------------------------ materials */
  var OXY = 0xb63430, DEOXY = 0x3e5c9a, LA_C = 0xc75850, RA_C = 0x5a74ab;
  var AORTA = 0xd2463a, PULM = 0x4a6bb2, CAVA = 0x4b66a0, LEAF = 0xf3e3d4, RING = 0xe6c8b6;

  function tissue(color, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: color, roughness: 0.58, metalness: 0.03,
      emissive: color, emissiveIntensity: 0
    }, extra || {}));
  }

  /* ------------------------------------------------------------- chambers */
  /* A sphere whose origin is moved to its bottom pole, so scaling it grows and
     shrinks it about that point. `anchor` is where that pole sits. */
  function chamber(color, ax, ay, az, rx, ry, rz) {
    var g = new THREE.SphereGeometry(1, 56, 44);
    g.translate(0, 1, 0);
    var m = new THREE.Mesh(g, tissue(color));
    m.position.set(ax, ay, az);
    m.userData.r = new THREE.Vector3(rx, ry, rz);
    m.scale.copy(m.userData.r);
    root.add(m);
    return m;
  }
  /* ventricles: apex fixed, base rides up and down */
  var LV = chamber(OXY,   0.55, -1.72, 0.00, 0.98, 1.24, 0.92);
  var RV = chamber(DEOXY, -0.62, -1.42, 0.28, 0.88, 1.06, 0.70);
  /* atria: floor fixed on the valve plane, roof rises as they fill */
  var LA = chamber(LA_C,  0.62, 0.60, -0.30, 0.74, 0.62, 0.68);
  var RA = chamber(RA_C, -0.74, 0.54,  0.02, 0.74, 0.60, 0.68);

  /* --------------------------------------------------------------- valves */
  /* A ring and two hinged half-disc leaflets. `dir` is +1 when the leaflets
     swing toward +y in the valve's frame (semilunar), −1 toward −y (AV). */
  function valve(x, y, z, r, tilt, dir) {
    var g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.set(tilt[0], tilt[1], tilt[2]);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.14, 12, 44), tissue(RING, { roughness: 0.5 }));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    var hinges = [];
    for (var i = 0; i < 2; i++) {
      var outer = new THREE.Group(); outer.rotation.y = i * Math.PI;
      var inner = new THREE.Group();
      var leaf = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 26, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: LEAF, roughness: 0.42, metalness: 0, side: THREE.DoubleSide }));
      leaf.rotation.x = -Math.PI / 2;        /* lay flat in the valve plane, tip toward −z */
      inner.add(leaf); outer.add(inner); g.add(outer);
      hinges.push(inner);
    }
    root.add(g);
    return { group: g, set: function (open) {
      var a = -dir * open * 1.32;            /* 0 → coapted, 1 → ~76° */
      hinges[0].rotation.x = a; hinges[1].rotation.x = a;
    } };
  }
  var mitral    = valve( 0.58, 0.68, -0.28, 0.40, [0.10, 0, -0.10], -1);
  var tricuspid = valve(-0.70, 0.60,  0.06, 0.38, [0.06, 0,  0.14], -1);
  var aortic    = valve( 0.18, 0.78,  0.14, 0.26, [-0.25, 0, 0.30],  1);
  var pulmonic  = valve(-0.36, 0.80,  0.46, 0.24, [-0.30, 0, -0.10], 1);

  /* -------------------------------------------------------------- vessels */
  function tube(points, r, color, segs) {
    var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
    var m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs || 64, r, 18, false), tissue(color, { roughness: 0.55 }));
    root.add(m);
    return { mesh: m, curve: curve };
  }
  /* aorta rises from the aortic valve, arches, and descends behind the heart */
  var aorta = tube([[0.18, 0.78, 0.14], [0.14, 1.70, 0.20], [-0.20, 2.48, 0.10], [-0.86, 2.42, -0.06],
                    [-1.22, 1.70, -0.30], [-1.26, 0.50, -0.52], [-1.18, -1.30, -0.62]], 0.225, AORTA);
  var brach = tube([[-0.05, 2.36, 0.08], [0.02, 2.95, 0.10]], 0.09, AORTA, 12);
  var carot = tube([[-0.45, 2.44, 0.02], [-0.42, 3.05, 0.02]], 0.08, AORTA, 12);
  /* pulmonary trunk from the RV, splitting left and right under the arch */
  var pulm  = tube([[-0.36, 0.80, 0.46], [-0.50, 1.50, 0.66], [-0.34, 2.02, 0.56]], 0.20, PULM, 32);
  var pulmL = tube([[-0.34, 2.02, 0.56], [0.30, 2.10, 0.42], [0.95, 1.98, 0.30]], 0.13, PULM, 24);
  var pulmR = tube([[-0.34, 2.02, 0.56], [-0.95, 1.96, 0.40], [-1.50, 1.82, 0.30]], 0.13, PULM, 24);
  /* venae cavae into the right atrium, pulmonary veins into the left */
  tube([[-0.76, 2.70, 0.02], [-0.76, 1.90, 0.02]], 0.17, CAVA, 12);
  tube([[-0.80, -0.20, -0.30], [-0.98, -1.30, -0.36]], 0.16, CAVA, 12);
  tube([[1.30, 1.55, -0.55], [0.95, 1.30, -0.60]], 0.10, LA_C, 8);
  tube([[1.30, 0.95, -0.60], [0.95, 0.98, -0.62]], 0.10, LA_C, 8);
  /* pulsing vessels scale about their own valve, not about the origin */
  [aorta, brach, carot].forEach(function (v) { v.mesh.geometry.translate(-0.18, -0.78, -0.14); v.mesh.position.set(0.18, 0.78, 0.14); });
  [pulm, pulmL, pulmR].forEach(function (v) { v.mesh.geometry.translate(0.36, -0.80, -0.46); v.mesh.position.set(-0.36, 0.80, 0.46); });

  /* ---------------------------------------------------------------- blood */
  /* Particles ride a curve at a speed set by flowAt. They are invisible while
     the valve they cross is shut, because the model says no blood moves. */
  function stream(points, color, count) {
    var curve = new THREE.CatmullRomCurve3(points.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
    var pos = new Float32Array(count * 3), u = new Float32Array(count), jit = [];
    for (var i = 0; i < count; i++) {
      u[i] = Math.random();
      jit.push(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.16));
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    /* drawn on top of the walls: the flow is a readout, not a thing hidden inside a tube */
    var mat = new THREE.PointsMaterial({ color: color, size: 0.13, transparent: true, opacity: 0,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    var pts = new THREE.Points(geo, mat);
    pts.renderOrder = 10;
    root.add(pts);
    var tmp = new THREE.Vector3();
    return { update: function (dt, flow) {           /* flow in mL/s, ≥ 0 */
      var target = Math.min(1, flow / 160) * 0.95;
      mat.opacity += (target - mat.opacity) * 0.28;
      var speed = flow / 700;                        /* curve-lengths per second */
      for (var i = 0; i < count; i++) {
        u[i] += dt * speed * (0.75 + 0.5 * ((i * 7919) % 100) / 100);
        if (u[i] > 1) u[i] -= 1;
        curve.getPointAt(u[i], tmp).add(jit[i]);
        pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
      }
      geo.attributes.position.needsUpdate = true;
    } };
  }
  var outL = stream([[0.45, -0.30, 0.05], [0.18, 0.78, 0.14], [0.14, 1.70, 0.20], [-0.20, 2.48, 0.10], [-0.86, 2.42, -0.06], [-1.22, 1.70, -0.30]], 0xff6b5a, 90);
  var inL  = stream([[0.62, 1.55, -0.30], [0.58, 0.68, -0.28], [0.55, -0.55, 0.00]], 0xff8a7a, 60);
  var outR = stream([[-0.60, -0.40, 0.30], [-0.36, 0.80, 0.46], [-0.50, 1.50, 0.66], [-0.34, 2.02, 0.56]], 0x8fb0ff, 70);
  var inR  = stream([[-0.74, 1.45, 0.02], [-0.70, 0.60, 0.06], [-0.62, -0.55, 0.28]], 0xa9c0ff, 60);

  /* --------------------------------------------------------------- update */
  var edvRatio = h.esv / h.edv;
  var last = null;

  function apply(s) {
    /* Ventricles: volume ratio f = V/EDV. Split the shrink so that radial² ×
       longitudinal = f, with the long axis shortening less than the radius. */
    var f = s.volume / h.edv;
    var kr = Math.pow(f, 0.36), ky = Math.pow(f, 0.28);
    LV.scale.set(LV.userData.r.x * kr, LV.userData.r.y * ky, LV.userData.r.z * kr);
    RV.scale.set(RV.userData.r.x * kr, RV.userData.r.y * ky, RV.userData.r.z * kr);
    /* the LV twists ~12° base-to-apex as it empties */
    LV.rotation.y = -0.21 * (1 - s.fill);
    RV.rotation.y = -0.08 * (1 - s.fill);
    /* wall thickens visibly on the emissive channel as it squeezes */
    LV.material.emissiveIntensity = 0.16 * (1 - s.fill);
    RV.material.emissiveIntensity = 0.12 * (1 - s.fill);

    /* Atria: 0..1 fill → ~35 % volume swing, floor fixed. */
    var va = 0.65 + 0.35 * s.atrialFill;
    var ar = Math.pow(va, 0.25), ay = Math.pow(va, 0.5);
    LA.scale.set(LA.userData.r.x * ar, LA.userData.r.y * ay, LA.userData.r.z * ar);
    RA.scale.set(RA.userData.r.x * ar, RA.userData.r.y * ay, RA.userData.r.z * ar);

    mitral.set(s.valves.mitral);
    tricuspid.set(s.valves.tricuspid);
    aortic.set(s.valves.aortic);
    pulmonic.set(s.valves.pulmonary);

    /* Vessels swell with their pressure, 0 at diastolic, 1 at systolic. */
    var pa = (s.pressure.ao - h.dbp) / Math.max(1, h.sbp - h.dbp);
    var pp = (s.pressure.pa - h.pad) / Math.max(1, h.pas - h.pad);
    var ka = 1 + 0.055 * C.util.clamp(pa, 0, 1), kp = 1 + 0.07 * C.util.clamp(pp, 0, 1);
    [aorta, brach, carot].forEach(function (v) { v.mesh.scale.setScalar(ka); });
    [pulm, pulmL, pulmR].forEach(function (v) { v.mesh.scale.setScalar(kp); });
  }

  var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var tOffset = 0, prev = t0, speed = opts.speed || 1;
  function now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }

  function frame() {
    var n = now(), dt = Math.min(0.05, (n - prev) / 1000); prev = n;
    var t = (n - t0) * speed + tOffset;
    var s = C.state(t, h);
    apply(s);
    var out = Math.max(0, s.flow), inn = Math.max(0, -s.flow);
    outL.update(dt, out); outR.update(dt, out);
    inL.update(dt, inn);  inR.update(dt, inn);
    last = s;
    controls.update();
    renderer.render(scene, camera);
    api.raf = requestAnimationFrame(frame);
  }

  var api = {
    scene: scene, camera: camera, renderer: renderer, controls: controls,
    hemo: function () { return h; },
    state: function () { return last; },
    /* change rate without a jump: keep the same fraction through the beat */
    setRate: function (hr, contractility, filling) {
      var tNow = (now() - t0) * speed + tOffset;
      var frac = ((tNow % h.timing.cycleMs) + h.timing.cycleMs) % h.timing.cycleMs / h.timing.cycleMs;
      h = C.hemodynamics(hr, contractility || h.contractility, filling || h.filling);
      edvRatio = h.esv / h.edv;
      t0 = now(); tOffset = frac * h.timing.cycleMs;
    },
    resize: function (w, h2) {
      camera.aspect = w / h2; camera.updateProjectionMatrix(); renderer.setSize(w, h2, false);
    },
    dispose: function () { cancelAnimationFrame(api.raf); renderer.dispose(); }
  };
  frame();
  return api;
};
