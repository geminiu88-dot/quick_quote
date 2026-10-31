// Reads a Code 128 barcode whose end is cut off by the edge of the label.
// Long sample codes (e.g. B75398A~TTSC) are printed wider than the label, so
// the check character and the stop pattern are missing and normal scanners
// (ZBar, ZXing, the phone's own) refuse them. This reader starts at the start
// pattern and reads characters until the bars stop making sense. With no
// check character it can misread, so the caller must only accept a result
// that is a known 货号.
//
// cut128(gray, w, h) -> list of {text, complete, headless, count}, most often
// seen first. complete = the stop pattern was seen, so nothing is missing at
// the end. headless = the start was cut off too (labels printed wider than the
// label on both sides): characters read from the middle, so the first ones may
// be missing; only readings that contain a ~ are kept.
// gray: one brightness value (0-255) per pixel, row by row.

var CUT128 = (function () {
  var PATTERNS = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 ' +
    '221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 ' +
    '223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 ' +
    '131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 ' +
    '113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 ' +
    '312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 ' +
    '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 ' +
    '121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 ' +
    '131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232')
    .split(' ').map(function (p) { return p.split('').map(Number); });
  var STOP = [2, 3, 3, 1, 1, 1, 2];

  // Edge-to-edge widths (bar+space, space+bar...) don't change when the
  // printer makes bars thinner and spaces wider.
  function edges(w) { return [w[0] + w[1], w[1] + w[2], w[2] + w[3], w[3] + w[4]]; }
  var EDGES = PATTERNS.map(edges);

  // Best pattern for 6 widths, or -1 when nothing fits well.
  function match(w) {
    var total = w[0] + w[1] + w[2] + w[3] + w[4] + w[5];
    var m = edges(w).map(function (e) { return e * 11 / total; });
    var best = -1, bestErr = 1e9, second = 1e9;
    for (var p = 0; p < EDGES.length; p++) {
      var err = 0;
      for (var j = 0; j < 4; j++) err += Math.abs(m[j] - EDGES[p][j]);
      // tie-break between patterns with the same edges: compare bar sums
      var bars = (w[0] + w[2] + w[4]) * 11 / total, pb = PATTERNS[p][0] + PATTERNS[p][2] + PATTERNS[p][4];
      err += Math.abs(bars - pb) * 0.25;
      if (err < bestErr) { second = bestErr; bestErr = err; best = p; }
      else if (err < second) second = err;
    }
    return bestErr < 1.4 ? best : -1;
  }

  // Code values -> text, following code sets A, B, C and their switches.
  function toText(values) {
    var set = values[0] === 103 ? 'A' : values[0] === 104 ? 'B' : 'C', out = '', shift = false;
    for (var i = 1; i < values.length; i++) {
      var v = values[i], cur = shift ? (set === 'A' ? 'B' : 'A') : set;
      shift = false;
      if (cur === 'C') {
        if (v < 100) out += (v < 10 ? '0' : '') + v;
        else if (v === 100) set = 'B'; else if (v === 101) set = 'A';
      } else {
        if (v < 96) out += cur === 'B' ? String.fromCharCode(32 + v)
                                       : String.fromCharCode(v < 64 ? 32 + v : v - 64);
        else if (v === 98) shift = true;
        else if (v === 99) set = 'C';
        else if (v === 100 && cur === 'A') set = 'B';
        else if (v === 101 && cur === 'B') set = 'A';
      }
    }
    return out;
  }

  // Run lengths of one row: [dark?, width] pairs, threshold from nearby min/max.
  function runs(line) {
    var n = line.length, R = 40, out = [], dark = [], i, j;
    for (i = 0; i < n; i++) {
      var lo = 255, hi = 0;
      for (j = Math.max(0, i - R); j < Math.min(n, i + R); j += 2) {
        if (line[j] < lo) lo = line[j];
        if (line[j] > hi) hi = line[j];
      }
      dark.push(hi - lo > 40 ? line[i] < (lo + hi) / 2 : line[i] < 100);
    }
    var start = 0;
    for (i = 1; i <= n; i++) {
      if (i === n || dark[i] !== dark[start]) { out.push(dark[start], i - start); start = i; }
    }
    return out;
  }

  // Read characters from every start pattern found in one list of widths.
  function readWidths(isDark, w, found) {
    for (var s = 0; s + 6 <= w.length; s++) {
      if (!isDark[s]) continue;
      var v = match(w.slice(s, s + 6));
      if (v < 103) continue;
      // quiet zone: the space before the start must be wide
      var unit = (w[s] + w[s + 1] + w[s + 2] + w[s + 3] + w[s + 4] + w[s + 5]) / 11;
      if (s > 0 && w[s - 1] < unit * 4) continue;
      var values = [v], k = s + 6, stopped = false;
      while (k + 6 <= w.length) {
        var seven = w.slice(k, k + 7);
        if (seven.length === 7 && isStop(seven)) { stopped = true; break; }
        var c = match(w.slice(k, k + 6));
        if (c < 0 || c > 102) break;
        values.push(c); k += 6;
      }
      if (values.length < 3) continue;
      // With a stop pattern the last value is the check character; without
      // one we can't tell, so offer both readings.
      if (stopped) found.push(toText(values.slice(0, -1)) + '\u0001');
      else { found.push(toText(values)); found.push(toText(values.slice(0, -1))); }
    }
  }
  // Start cut off: try every position, read as many characters as fit, and
  // guess the code set (B or C) the run began in.
  function readHeadless(isDark, w, found) {
    for (var s = 0; s + 30 <= w.length; s++) {
      if (!isDark[s]) continue;
      var values = [], k = s;
      while (k + 6 <= w.length) {
        var c = match(w.slice(k, k + 6));
        if (c < 0 || c > 102) break;
        values.push(c); k += 6;
      }
      if (values.length < 5) continue;
      [104, 105].forEach(function (startSet) {
        var t = toText([startSet].concat(values));
        if (t.indexOf('~') >= 0) found.push(t + '\u0002');
      });
      s = k - 1;   // continue after this run
    }
  }
  function isStop(w) {
    var total = 0; for (var i = 0; i < 7; i++) total += w[i];
    var m = edges(w).map(function (e) { return e * 13 / total; }), e = edges(STOP), err = 0;
    for (var j = 0; j < 4; j++) err += Math.abs(m[j] - e[j]);
    return err < 1.4;
  }

  return function cut128(gray, w, h) {
    var found = [];
    for (var y = Math.round(h * 0.2); y < h * 0.8; y += 4) {
      var line = gray.subarray(y * w, y * w + w), r = runs(line);
      var isDark = [], widths = [];
      for (var i = 0; i < r.length; i += 2) { isDark.push(r[i]); widths.push(r[i + 1]); }
      var before = found.length;
      readWidths(isDark, widths, found);
      readWidths(isDark.slice().reverse(), widths.slice().reverse(), found);   // label upside down
      if (found.length === before) {
        readHeadless(isDark, widths, found);
        readHeadless(isDark.slice().reverse(), widths.slice().reverse(), found);
      }
    }
    // most often seen first
    var count = {};
    found.forEach(function (t) { if (t) count[t] = (count[t] || 0) + 1; });
    return Object.keys(count).sort(function (a, b) { return count[b] - count[a] || b.length - a.length; })
      .map(function (t) {
        var mark = t.slice(-1), done = mark === '\u0001', headless = mark === '\u0002';
        return {text: done || headless ? t.slice(0, -1) : t, complete: done, headless: headless, count: count[t]};
      });
  };
})();
if (typeof module !== 'undefined') module.exports = CUT128;
