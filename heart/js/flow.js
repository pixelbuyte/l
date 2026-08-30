/*
 * flow.js — the blood.
 *
 * Each route in anatomy.js names a path in the SVG. This walks particles along
 * those paths at a speed taken from the cycle model, so nothing moves through a
 * valve while that valve is shut. It is the one part of the drawing that would
 * look wrong immediately if the model were wrong, which makes it the best thing
 * on the page for catching a mistake in the model.
 *
 * Positions come from getPointAtLength on the real path element, so a route can
 * be redrawn in the markup and the blood follows it without anything here
 * changing.
 */
(function (root) {
  'use strict';

  var HEART = (root.HEART = root.HEART || {});
  var NS = 'http://www.w3.org/2000/svg';

  var TINT = {
    venous:   { core: '#a2456b', edge: '#5d1c38' },
    arterial: { core: '#ff5a63', edge: '#a8121f' }
  };

  function Flow(svg, layer) {
    this.svg = svg;
    this.layer = layer;
    this.routes = [];
    this.enabled = true;

    var defs = HEART.anatomy.routes;
    for (var i = 0; i < defs.length; i++) {
      var el = svg.getElementById(defs[i].path);
      if (!el) continue;
      this.routes.push({
        def: defs[i],
        el: el,
        len: el.getTotalLength(),
        cells: [],
        since: 999,         /* path-fraction travelled since the last cell was released */
        gap: 0.08           /* and how far it should travel before the next one */
      });
    }
  }

  /*
   * How fast blood should be moving on each kind of route right now, as a
   * fraction of the route per second. Gated routes stop dead when their valve
   * is shut; the venous returns never quite stop, because veins do not have a
   * valve to stop them.
   */
  Flow.prototype.gateValue = function (gate, st) {
    switch (gate) {
      case 'av':     return st.valves.mitral;
      case 'semi':   return st.valves.aortic;
      case 'inflow': return 0.42 + 0.58 * st.valves.tricuspid;
      default:       return 0.60 + 0.40 * st.valves.aortic;
    }
  };

  Flow.prototype.step = function (st, hr, dt) {
    if (!this.enabled) { this.clear(); return; }
    /* A racing heart moves blood faster, but not in proportion — the vessels
       are the same size, so velocity rises with the square root of the work. */
    var tempo = Math.pow(hr / 72, 0.7);

    for (var i = 0; i < this.routes.length; i++) {
      var r = this.routes[i], d = r.def;
      var gate = this.gateValue(d.gate, st);
      /* A cell released a moment ago has not reached a downstream branch yet,
         so the far side of a bifurcation lags behind the valve that fed it. */
      if (d.delay) gate = Math.max(gate, d.delay * this.gateValue(d.gate, st));
      var v = gate * d.rate * 0.30 * tempo;

      var advance = v * dt;
      var j;
      for (j = r.cells.length - 1; j >= 0; j--) {
        r.cells[j].s += advance * r.cells[j].k;
        if (r.cells[j].s >= 1) r.cells.splice(j, 1);
      }

      r.since += advance;
      if (v > 0.006 && r.since > r.gap && r.cells.length < 17) {
        r.since = 0;
        r.gap = 0.06 + Math.random() * 0.07;
        r.cells.push({
          s: 0,
          k: 0.86 + Math.random() * 0.30,   /* cells near a wall run slower */
          o: 0.55 + Math.random() * 0.45,
          r: 2.0 + Math.random() * 1.7
        });
      }
    }
  };

  Flow.prototype.draw = function () {
    if (!this.enabled) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < this.routes.length; i++) {
      var r = this.routes[i], tint = TINT[r.def.tint];
      for (var j = 0; j < r.cells.length; j++) {
        var c = r.cells[j];
        var p = r.el.getPointAtLength(c.s * r.len);
        /* fade in and out at the ends of a route so cells do not pop into
           existence in the middle of a chamber */
        var fade = Math.min(1, c.s * 9) * Math.min(1, (1 - c.s) * 9);
        var el = document.createElementNS(NS, 'circle');
        el.setAttribute('cx', p.x.toFixed(1));
        el.setAttribute('cy', p.y.toFixed(1));
        el.setAttribute('r', c.r.toFixed(1));
        el.setAttribute('fill', tint.core);
        el.setAttribute('stroke', tint.edge);
        el.setAttribute('stroke-width', '0.8');
        el.setAttribute('opacity', (c.o * fade).toFixed(2));
        frag.appendChild(el);
      }
    }
    this.layer.textContent = '';
    this.layer.appendChild(frag);
  };

  Flow.prototype.clear = function () {
    for (var i = 0; i < this.routes.length; i++) this.routes[i].cells.length = 0;
    this.layer.textContent = '';
  };

  Flow.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    if (!on) this.clear();
  };

  HEART.Flow = Flow;
})(typeof globalThis !== 'undefined' ? globalThis : this);
