/*
 * sound.js — lub-dub, synthesised.
 *
 * A heart sound is not the muscle. It is the valves slamming and the column of
 * blood behind them ringing: a short, low, damped thud with a broadband click
 * at the front. So that is what this builds — a noise burst through a low
 * bandpass, plus a falling sine, both under a fast envelope.
 *
 * The first sound is the two inlet valves shutting as the ventricles begin to
 * squeeze, and is longer and lower. The second is the two outlet valves
 * snapping shut against arterial pressure, and is shorter and higher. Their
 * spacing on the page is systole, which is why the gap between them barely
 * changes when you double the rate while the gap after them collapses.
 *
 * Nothing is created until the first deliberate click, because a browser will
 * not start audio without one and should not.
 */
(function (root) {
  'use strict';

  var HEART = (root.HEART = root.HEART || {});

  function Heartbeat() {
    this.ctx = null;
    this.gain = null;
    this.noise = null;
    this.enabled = false;
  }

  Heartbeat.prototype.ensure = function () {
    if (this.ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.9;
    this.gain.connect(this.ctx.destination);

    /* one second of white noise, reused for every beat */
    var n = Math.floor(this.ctx.sampleRate);
    var buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    var ch = buf.getChannelData(0);
    for (var i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return true;
  };

  Heartbeat.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    if (on) {
      if (!this.ensure()) { this.enabled = false; return false; }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    return this.enabled;
  };

  /* kind is 1 for S1 or 2 for S2; strength scales with how hard the beat is */
  Heartbeat.prototype.beat = function (kind, strength) {
    if (!this.enabled || !this.ctx) return;
    var ctx = this.ctx, t = ctx.currentTime + 0.001;
    var s = Math.max(0.2, Math.min(1.6, strength || 1));
    var first = kind === 1;
    var dur = first ? 0.135 : 0.085;
    var f0 = first ? 62 : 88;
    var level = (first ? 0.55 : 0.42) * s;

    var env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(level, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    env.connect(this.gain);

    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0 * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + dur);
    osc.connect(env);
    osc.start(t); osc.stop(t + dur + 0.02);

    var src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = first ? 150 : 235;
    bp.Q.value = 1.1;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(level * 0.75, t + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
    src.connect(bp); bp.connect(ng); ng.connect(this.gain);
    src.start(t); src.stop(t + dur + 0.02);
  };

  HEART.Heartbeat = Heartbeat;
})(typeof globalThis !== 'undefined' ? globalThis : this);
