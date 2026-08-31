#!/usr/bin/env node
/*
 * Build a deploy variant whose binary assets load from a CDN base URL instead
 * of from alongside the page.
 *
 * This exists for one reason: some deploy targets accept only inlined file
 * contents, which makes shipping several hundred kilobytes of WebP and WOFF2
 * impractical. The repository itself keeps plain relative paths — correct for
 * GitHub Pages, for a git-linked host, and for opening index.html off disk —
 * and this rewrites them for those targets only. It never writes back into the
 * source tree.
 *
 *   node crown/tools/make-deploy.js <asset-base-url> [out-dir]
 */
'use strict';
var fs = require('fs');
var path = require('path');

var base = (process.argv[2] || '').replace(/\/+$/, '');
var out = process.argv[3] || path.join(__dirname, '..', '..', '.deploy');
if (!base) {
  console.error('usage: make-deploy.js <asset-base-url> [out-dir]');
  process.exit(2);
}

var src = path.join(__dirname, '..');
var TEXT = ['index.html', 'css/crown.css', 'css/fonts.css', 'data/place.js',
            'js/hours.js', 'js/app.js'];

// img/ and fonts/ are the only directories holding binaries. The optional
// leading ../ is how fonts.css reaches them from inside css/.
var ASSET = /(?:\.\.\/)?((?:img|fonts)\/[\w.-]+\.(?:webp|woff2|svg))/g;

fs.rmSync(out, { recursive: true, force: true });
var rewritten = 0;
TEXT.forEach(function (rel) {
  var body = fs.readFileSync(path.join(src, rel), 'utf8');
  var next = body.replace(ASSET, function (_, p) { rewritten++; return base + '/' + p; });
  var dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, next);
});
console.log('wrote ' + TEXT.length + ' files to ' + out + ', ' + rewritten + ' asset urls rewritten');
