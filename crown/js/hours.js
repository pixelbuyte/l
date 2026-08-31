/* Open-or-not, in Worcester time.
 *
 * The one piece of real logic on this page. A visitor in London looking this
 * up at 3am wants to know whether the shop is open *there*, so every reading
 * goes through the shop's own wall clock rather than the browser's.
 *
 * Minutes past midnight throughout. A closing time of 1440 means midnight
 * tonight, which is exactly what this shop does, so the arithmetic never has
 * to wrap and there is no midnight special case to get wrong.
 */

(function (root) {
  'use strict';

  var TZ = 'America/New_York';

  // The shop's wall clock as minutes past its own midnight. `exact` is false
  // when the engine has no timezone data and we had to fall back to the
  // visitor's clock — callers can then decline to make a hard claim.
  function wallClock(date, tz) {
    var d = date || new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz || TZ, hour12: false, hour: '2-digit', minute: '2-digit'
      }).formatToParts(d);
      var out = {};
      for (var i = 0; i < parts.length; i++) out[parts[i].type] = parts[i].value;
      // Some engines render midnight as hour 24; fold it back to 0.
      var h = parseInt(out.hour, 10) % 24;
      var m = parseInt(out.minute, 10);
      if (isNaN(h) || isNaN(m)) throw new Error('unparsed');
      return { minutes: h * 60 + m, exact: true };
    } catch (e) {
      return { minutes: d.getHours() * 60 + d.getMinutes(), exact: false };
    }
  }

  function fmtClock(mins) {
    var m = ((Math.round(mins) % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    var ap = h >= 12 ? 'pm' : 'am';
    var h12 = (h % 12) === 0 ? 12 : h % 12;
    return h12 + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ap;
  }

  // hours: { open, close } in minutes. Returns { state, label, minutesLeft }.
  // state is one of open | closing | closed. "closing" is the last hour, which
  // is the only window where the difference actually changes what you do.
  function status(nowMinutes, hours) {
    var open = hours.open, close = hours.close;
    var n = ((Math.round(nowMinutes) % 1440) + 1440) % 1440;

    if (n >= open && n < close) {
      var left = close - n;
      var closesAt = close >= 1440 ? 'midnight' : fmtClock(close);
      if (left <= 60) {
        return { state: 'closing', minutesLeft: left,
                 label: 'Closing in ' + left + ' min' };
      }
      return { state: 'open', minutesLeft: left, label: 'Open · until ' + closesAt };
    }

    // Shut. Minutes until the next opening, which may be later today or
    // tomorrow morning — this shop keeps the same hours every day.
    var until = n < open ? open - n : (1440 - n) + open;
    return { state: 'closed', minutesLeft: until, label: 'Closed · opens ' + fmtClock(open) };
  }

  var API = { wallClock: wallClock, fmtClock: fmtClock, status: status, TZ: TZ };

  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.CrownHours = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
