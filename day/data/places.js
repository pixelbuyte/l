/*
 * places.js — a coordinate for the timezone the browser is already in.
 *
 * Sunset needs a latitude and a longitude, and asking for the browser's
 * location on first load to draw a schedule would be a rude way to open. The
 * timezone is already known, costs no permission, and puts you within a degree
 * or two of the right answer — close enough that sunset is a minute or so out,
 * which is inside the tolerance of "before it gets dark".
 *
 * Anything not in this table falls back to a longitude derived from the UTC
 * offset, which is exact at the centre of a zone and never worse than about
 * half an hour. Either way the sunset can be overridden by hand on the page,
 * and pressing the location button replaces the guess with the real thing.
 */
(function (root) {
  'use strict';

  var DAY = (root.DAY = root.DAY || {});

  DAY.places = {
    'America/New_York':   [40.71, -74.01, 'New York'],
    'America/Detroit':    [42.33, -83.05, 'Detroit'],
    'America/Toronto':    [43.65, -79.38, 'Toronto'],
    'America/Halifax':    [44.65, -63.57, 'Halifax'],
    'America/Chicago':    [41.88, -87.63, 'Chicago'],
    'America/Winnipeg':   [49.90, -97.14, 'Winnipeg'],
    'America/Denver':     [39.74, -104.99, 'Denver'],
    'America/Edmonton':   [53.55, -113.49, 'Edmonton'],
    'America/Phoenix':    [33.45, -112.07, 'Phoenix'],
    'America/Los_Angeles': [34.05, -118.24, 'Los Angeles'],
    'America/Vancouver':  [49.28, -123.12, 'Vancouver'],
    'America/Anchorage':  [61.22, -149.90, 'Anchorage'],
    'Pacific/Honolulu':   [21.31, -157.86, 'Honolulu'],
    'America/Mexico_City': [19.43, -99.13, 'Mexico City'],
    'America/Bogota':     [4.71, -74.07, 'Bogotá'],
    'America/Lima':       [-12.05, -77.04, 'Lima'],
    'America/Santiago':   [-33.45, -70.67, 'Santiago'],
    'America/Sao_Paulo':  [-23.55, -46.63, 'São Paulo'],
    'America/Argentina/Buenos_Aires': [-34.60, -58.38, 'Buenos Aires'],
    'Atlantic/Reykjavik': [64.15, -21.94, 'Reykjavík'],
    'Europe/London':      [51.51, -0.13, 'London'],
    'Europe/Dublin':      [53.35, -6.26, 'Dublin'],
    'Europe/Lisbon':      [38.72, -9.14, 'Lisbon'],
    'Europe/Madrid':      [40.42, -3.70, 'Madrid'],
    'Europe/Paris':       [48.86, 2.35, 'Paris'],
    'Europe/Brussels':    [50.85, 4.35, 'Brussels'],
    'Europe/Amsterdam':   [52.37, 4.90, 'Amsterdam'],
    'Europe/Berlin':      [52.52, 13.40, 'Berlin'],
    'Europe/Zurich':      [47.38, 8.54, 'Zürich'],
    'Europe/Rome':        [41.90, 12.50, 'Rome'],
    'Europe/Vienna':      [48.21, 16.37, 'Vienna'],
    'Europe/Prague':      [50.08, 14.44, 'Prague'],
    'Europe/Budapest':    [47.50, 19.04, 'Budapest'],
    'Europe/Belgrade':    [44.79, 20.45, 'Belgrade'],
    'Europe/Warsaw':      [52.23, 21.01, 'Warsaw'],
    'Europe/Stockholm':   [59.33, 18.07, 'Stockholm'],
    'Europe/Oslo':        [59.91, 10.75, 'Oslo'],
    'Europe/Copenhagen':  [55.68, 12.57, 'Copenhagen'],
    'Europe/Helsinki':    [60.17, 24.94, 'Helsinki'],
    'Europe/Athens':      [37.98, 23.73, 'Athens'],
    'Europe/Bucharest':   [44.43, 26.10, 'Bucharest'],
    'Europe/Kyiv':        [50.45, 30.52, 'Kyiv'],
    'Europe/Kiev':        [50.45, 30.52, 'Kyiv'],
    'Europe/Istanbul':    [41.01, 28.98, 'Istanbul'],
    'Europe/Moscow':      [55.76, 37.62, 'Moscow'],
    'Africa/Casablanca':  [33.57, -7.59, 'Casablanca'],
    'Africa/Algiers':     [36.75, 3.06, 'Algiers'],
    'Africa/Tunis':       [36.81, 10.18, 'Tunis'],
    'Africa/Accra':       [5.60, -0.19, 'Accra'],
    'Africa/Lagos':       [6.52, 3.38, 'Lagos'],
    'Africa/Cairo':       [30.04, 31.24, 'Cairo'],
    'Africa/Khartoum':    [15.50, 32.56, 'Khartoum'],
    'Africa/Addis_Ababa': [9.01, 38.76, 'Addis Ababa'],
    'Africa/Nairobi':     [-1.29, 36.82, 'Nairobi'],
    'Africa/Johannesburg': [-26.20, 28.05, 'Johannesburg'],
    'Asia/Jerusalem':     [31.78, 35.22, 'Jerusalem'],
    'Asia/Beirut':        [33.89, 35.50, 'Beirut'],
    'Asia/Amman':         [31.95, 35.93, 'Amman'],
    'Asia/Baghdad':       [33.31, 44.36, 'Baghdad'],
    'Asia/Kuwait':        [29.38, 47.99, 'Kuwait City'],
    'Asia/Riyadh':        [24.71, 46.68, 'Riyadh'],
    'Asia/Qatar':         [25.29, 51.53, 'Doha'],
    'Asia/Dubai':         [25.20, 55.27, 'Dubai'],
    'Asia/Tehran':        [35.69, 51.39, 'Tehran'],
    'Asia/Baku':          [40.41, 49.87, 'Baku'],
    'Asia/Karachi':       [24.86, 67.01, 'Karachi'],
    'Asia/Tashkent':      [41.30, 69.24, 'Tashkent'],
    'Asia/Almaty':        [43.24, 76.89, 'Almaty'],
    'Asia/Kolkata':       [28.61, 77.21, 'New Delhi'],
    'Asia/Calcutta':      [28.61, 77.21, 'New Delhi'],
    'Asia/Colombo':       [6.93, 79.86, 'Colombo'],
    'Asia/Kathmandu':     [27.72, 85.32, 'Kathmandu'],
    'Asia/Dhaka':         [23.81, 90.41, 'Dhaka'],
    'Asia/Yangon':        [16.87, 96.20, 'Yangon'],
    'Asia/Bangkok':       [13.76, 100.50, 'Bangkok'],
    'Asia/Ho_Chi_Minh':   [10.82, 106.63, 'Ho Chi Minh City'],
    'Asia/Jakarta':       [-6.21, 106.85, 'Jakarta'],
    'Asia/Kuala_Lumpur':  [3.14, 101.69, 'Kuala Lumpur'],
    'Asia/Singapore':     [1.35, 103.82, 'Singapore'],
    'Asia/Manila':        [14.60, 120.98, 'Manila'],
    'Asia/Hong_Kong':     [22.32, 114.17, 'Hong Kong'],
    'Asia/Shanghai':      [31.23, 121.47, 'Shanghai'],
    'Asia/Taipei':        [25.03, 121.57, 'Taipei'],
    'Asia/Seoul':         [37.57, 126.98, 'Seoul'],
    'Asia/Tokyo':         [35.68, 139.69, 'Tokyo'],
    'Australia/Perth':    [-31.95, 115.86, 'Perth'],
    'Australia/Adelaide': [-34.93, 138.60, 'Adelaide'],
    'Australia/Brisbane': [-27.47, 153.03, 'Brisbane'],
    'Australia/Sydney':   [-33.87, 151.21, 'Sydney'],
    'Australia/Melbourne': [-37.81, 144.96, 'Melbourne'],
    'Pacific/Auckland':   [-36.85, 174.76, 'Auckland']
  };

  /*
   * Best guess at where this browser is, without asking anyone.
   * tzOffset is minutes east of UTC.
   */
  DAY.guessPlace = function (zone, tzOffset) {
    var hit = DAY.places[zone];
    if (hit) return { lat: hit[0], lng: hit[1], place: hit[2], exact: true };
    // A time zone is fifteen degrees of longitude wide and its offset is
    // defined from its centre, so this is right to within half a zone.
    var name = zone ? String(zone).split('/').pop().replace(/_/g, ' ') : 'here';
    return { lat: 40, lng: (tzOffset || 0) / 4, place: name, exact: false };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
