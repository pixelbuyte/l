/*
 * sun.js — sunrise and sunset, computed locally.
 *
 * The routine has two constraints that move with the year: the walk has to be
 * finished before sunset, and the evening reading starts after it. So the plan
 * cannot use a fixed clock time for either. This implements the NOAA solar
 * position equations, which are accurate to about a minute for latitudes below
 * roughly 65 degrees — far better than this schedule needs.
 *
 * No network, no lookup table. Works as a browser global (window.DAY.sun) and
 * under Node through the same global, so the tests exercise shipped code.
 */
(function (root) {
  'use strict';

  var DAY = (root.DAY = root.DAY || {});

  var RAD = Math.PI / 180;
  function rad(d) { return d * RAD; }
  function deg(r) { return r / RAD; }

  /* Julian day at 00:00 UT for a Gregorian calendar date. */
  function julianDay(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) +
           Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
  }

  /*
   * Everything below follows the NOAA spreadsheet, term for term, so the
   * intermediate names are theirs rather than anything friendlier.
   */
  function solar(jd) {
    var t = (jd - 2451545) / 36525;

    var meanLong = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
    if (meanLong < 0) meanLong += 360;

    var meanAnom = 357.52911 + t * (35999.05029 - 0.0001537 * t);
    var eccent = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

    var centre = Math.sin(rad(meanAnom)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
                 Math.sin(rad(2 * meanAnom)) * (0.019993 - 0.000101 * t) +
                 Math.sin(rad(3 * meanAnom)) * 0.000289;

    var trueLong = meanLong + centre;
    var appLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * t));

    var meanObliq = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
    var obliq = meanObliq + 0.00256 * Math.cos(rad(125.04 - 1934.136 * t));

    var declination = deg(Math.asin(Math.sin(rad(obliq)) * Math.sin(rad(appLong))));

    var vary = Math.tan(rad(obliq / 2)) * Math.tan(rad(obliq / 2));
    var eqTime = 4 * deg(
      vary * Math.sin(2 * rad(meanLong)) -
      2 * eccent * Math.sin(rad(meanAnom)) +
      4 * eccent * vary * Math.sin(rad(meanAnom)) * Math.cos(2 * rad(meanLong)) -
      0.5 * vary * vary * Math.sin(4 * rad(meanLong)) -
      1.25 * eccent * eccent * Math.sin(2 * rad(meanAnom))
    );

    return { declination: declination, eqTime: eqTime };
  }

  /*
   * Hour angle, in degrees, from solar noon to the moment the centre of the sun
   * sits at the given zenith. 90.833 is the usual sunrise/sunset zenith: half a
   * degree of solar disc plus about 34 minutes of arc of refraction.
   *
   * Returns null inside the polar day or polar night, where the sun never
   * reaches that zenith and no crossing exists to return.
   */
  function hourAngle(lat, declination, zenith) {
    var c = Math.cos(rad(zenith)) / (Math.cos(rad(lat)) * Math.cos(rad(declination))) -
            Math.tan(rad(lat)) * Math.tan(rad(declination));
    if (c > 1 || c < -1) return null;
    return deg(Math.acos(c));
  }

  /*
   * Sun times for one calendar date at one place, in minutes after local
   * midnight. tzOffset is minutes east of UTC — the negation of what
   * Date#getTimezoneOffset gives you.
   *
   * date: {y, m, d} with m as 1-12.
   */
  function times(date, lat, lng, tzOffset) {
    var jd = julianDay(date.y, date.m, date.d);
    // Recompute at local solar noon rather than at midnight UT; the declination
    // moves enough over a day to matter near the solstices.
    var s = solar(jd + (720 - tzOffset) / 1440);

    var noon = 720 - 4 * lng - s.eqTime + tzOffset;
    var ha = hourAngle(lat, s.declination, 90.833);
    var civil = hourAngle(lat, s.declination, 96);

    return {
      solarNoon: noon,
      sunrise: ha === null ? null : noon - 4 * ha,
      sunset: ha === null ? null : noon + 4 * ha,
      duskCivil: civil === null ? null : noon + 4 * civil,
      dawnCivil: civil === null ? null : noon - 4 * civil,
      declination: s.declination,
      // True through the polar day, false through the polar night, null when
      // the sun rises and sets as usual.
      alwaysUp: ha === null ? s.declination * lat > 0 : null
    };
  }

  DAY.sun = {
    julianDay: julianDay,
    hourAngle: hourAngle,
    times: times
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
