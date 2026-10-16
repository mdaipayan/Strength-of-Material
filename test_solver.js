/**
 * Automated test suite for Strength of Materials — Unit 4: Slope and Deflection of Beams
 * Verified against closed-form structural engineering theory.
 */

function normalise(loads) {
  const out = [];
  (loads || []).forEach(l => {
    if (l.kind === 'point' || l.kind === 'moment') { out.push(l); return; }
    if (l.kind === 'udl') { out.push({ kind: 'udl', x1: l.x1, x2: l.x2, w: l.w }); return; }
    if (l.kind === 'uvl') {
      const w1 = l.w1, w2 = l.w2;
      if (Math.abs(w1) > 1e-12) out.push({ kind: 'udl', x1: l.x1, x2: l.x2, w: w1 });
      const amp = w2 - w1;
      if (Math.abs(amp) > 1e-12) out.push({ kind: 'tri', x1: l.x1, x2: l.x2, amp });
    }
  });
  return out;
}

function solveDefl(cfg) {
  const L = +cfg.L, EI = cfg.EI, loads = normalise(cfg.loads || []);
  let sumW = 0, sumWx = 0, sumM = 0;
  loads.forEach(l => {
    if (l.kind === 'point') { sumW += l.P; sumWx += l.P * l.x; }
    else if (l.kind === 'udl') { const len = l.x2 - l.x1, W = l.w * len; sumW += W; sumWx += W * (l.x1 + len / 2); }
    else if (l.kind === 'tri') { const len = l.x2 - l.x1, W = 0.5 * l.amp * len; sumW += W; sumWx += W * (l.x1 + 2 * len / 3); }
    else if (l.kind === 'moment') { sumM += l.M; }
  });

  const reactions = [], couples = loads.filter(l => l.kind === 'moment').map(l => ({ x: l.x, M: l.M }));
  let fixM = null;
  if (cfg.type === 'cantL') {
    reactions.push({ x: 0, R: sumW, label: 'A' });
    fixM = -(sumWx + sumM);
    couples.push({ x: 0, M: fixM });
  } else if (cfg.type === 'cantR') {
    reactions.push({ x: L, R: sumW, label: 'B' });
    fixM = sumWx - sumW * L + sumM;
  } else {
    const d = cfg.xb - cfg.xa;
    if (Math.abs(d) < 1e-12) throw new Error('Supports cannot be coincident');
    const Rb = (sumWx - sumW * cfg.xa + sumM) / d;
    reactions.push({ x: cfg.xa, R: sumW - Rb, label: 'A' }, { x: cfg.xb, R: Rb, label: 'B' });
  }

  const mac = (x, a, n) => x > a ? Math.pow(x - a, n) : 0;
  const active = r => !(cfg.type === 'cantR' && r.x >= L - 1e-9);

  const series = (x, k) => {
    let v = 0;
    reactions.forEach(r => { if (active(r)) v += r.R * mac(x, r.x, k + 1) / (k === 1 ? 2 : 6); });
    loads.forEach(l => {
      if (l.kind === 'point') v -= l.P * mac(x, l.x, k + 1) / (k === 1 ? 2 : 6);
      else if (l.kind === 'udl') {
        const f = k === 1 ? 6 : 24, p = k === 1 ? 3 : 4;
        v -= l.w * mac(x, l.x1, p) / f;
        v += l.w * mac(x, l.x2, p) / f;
      } else if (l.kind === 'tri') {
        const len = l.x2 - l.x1, s = l.amp / len;
        if (k === 1) {
          v -= s * mac(x, l.x1, 4) / 24;
          v += s * mac(x, l.x2, 4) / 24;
          v += l.amp * mac(x, l.x2, 3) / 6;
        } else {
          v -= s * mac(x, l.x1, 5) / 120;
          v += s * mac(x, l.x2, 5) / 120;
          v += l.amp * mac(x, l.x2, 4) / 24;
        }
      }
    });
    couples.forEach(c => { v += k === 1 ? c.M * mac(x, c.x, 1) : c.M * mac(x, c.x, 2) / 2; });
    return v;
  };

  const h = x => series(x, 1), g = x => series(x, 2);
  let C1, C2;
  if (cfg.type === 'cantL') {
    C1 = -h(0);
    C2 = -g(0);
  } else if (cfg.type === 'cantR') {
    C1 = -h(L);
    C2 = -(g(L) + C1 * L);
  } else {
    C1 = -(g(cfg.xb) - g(cfg.xa)) / (cfg.xb - cfg.xa);
    C2 = -(g(cfg.xa) + C1 * cfg.xa);
  }

  return {
    reactions,
    fixM,
    C1,
    C2,
    theta: x => (h(x) + C1) / EI,
    y: x => (g(x) + C1 * x + C2) / EI
  };
}

function findMaxDeflection(res, L) {
  const theta = res.theta;
  const y = res.y;
  const candidates = [0, L];

  // Sample along span to bracket all stationary roots theta(x) = 0
  const steps = 100;
  for (let i = 0; i < steps; i++) {
    const x1 = L * i / steps;
    const x2 = L * (i + 1) / steps;
    const t1 = theta(x1);
    const t2 = theta(x2);
    if (Math.abs(t1) < 1e-12) {
      candidates.push(x1);
    } else if (t1 * t2 < 0) {
      // Bracketed root: refine with bisection + secant
      let a = x1, b = x2, fa = t1;
      for (let iter = 0; iter < 40; iter++) {
        const mid = (a + b) / 2;
        if (Math.abs(b - a) < 1e-7) {
          candidates.push(mid);
          break;
        }
        const fmid = theta(mid);
        if (Math.abs(fmid) < 1e-12) {
          candidates.push(mid);
          break;
        }
        if (fa * fmid < 0) {
          b = mid;
        } else {
          a = mid;
          fa = fmid;
        }
      }
    }
  }

  let maxAbsDefl = 0, maxX = 0, maxY = 0, isRoot = false;
  candidates.forEach(x => {
    const val = -y(x); // downward positive
    if (Math.abs(val) >= maxAbsDefl) {
      maxAbsDefl = Math.abs(val);
      maxX = x;
      maxY = val;
      isRoot = Math.abs(theta(x)) < 1e-5;
    }
  });
  return { maxX, maxY, maxAbsDefl, isRoot };
}

// Automated Test Runner
const results = [];
function test(id, description, got, expected, tol = 1e-5) {
  const diff = Math.abs(got - expected);
  const denom = Math.max(Math.abs(expected), 1e-9);
  const relDiff = diff / denom;
  const pass = relDiff <= tol || diff <= 1e-6;
  results.push({ id, description, got, expected, pass, relDiff });
  console.log(`${pass ? '[PASS]' : '[FAIL]'} ${id}: ${description} (got: ${got.toExponential(4)}, want: ${expected.toExponential(4)})`);
}

const EI = 6.75e13; // 200,000 MPa * 337.5e6 mm4

// 1. Cantilever with end point load
const t1 = solveDefl({ type: 'cantL', L: 3000, EI, loads: [{ kind: 'point', x: 3000, P: 20000 }] });
test('Test 1a', 'Cantilever tip deflection (point load at tip)', -t1.y(3000), 20000 * Math.pow(3000, 3) / (3 * EI));
test('Test 1b', 'Cantilever tip slope (point load at tip)', -t1.theta(3000), 20000 * Math.pow(3000, 2) / (2 * EI));
test('Test 1c', 'Cantilever fixed-end boundary conditions (y=0, theta=0)', Math.abs(t1.y(0)) + Math.abs(t1.theta(0)), 0);

// 2. Cantilever with full-span UDL
const t2 = solveDefl({ type: 'cantL', L: 4000, EI, loads: [{ kind: 'udl', x1: 0, x2: 4000, w: 10 }] });
test('Test 2a', 'Cantilever tip deflection (full UDL)', -t2.y(4000), 10 * Math.pow(4000, 4) / (8 * EI));
test('Test 2b', 'Cantilever tip slope (full UDL)', -t2.theta(4000), 10 * Math.pow(4000, 3) / (6 * EI));

// 3. Cantilever with point load away from free end (a = 3000, L = 5000)
const t3 = solveDefl({ type: 'cantL', L: 5000, EI, loads: [{ kind: 'point', x: 3000, P: 30000 }] });
const want3Tip = 30000 * Math.pow(3000, 2) * (3 * 5000 - 3000) / (6 * EI);
test('Test 3a', 'Cantilever point load away from tip: tip deflection', -t3.y(5000), want3Tip);
test('Test 3b', 'Cantilever point load away from tip: tip slope equals slope at load', -t3.theta(5000), 30000 * Math.pow(3000, 2) / (2 * EI));

// 4. Both orientations of UVL on cantilever
// 4a: peak at fixed end (w1=20, w2=0, L=5000)
const t4a = solveDefl({ type: 'cantL', L: 5000, EI, loads: [{ kind: 'uvl', x1: 0, x2: 5000, w1: 20, w2: 0 }] });
test('Test 4a', 'Cantilever UVL peak at fixed end (wL4/30EI)', -t4a.y(5000), 20 * Math.pow(5000, 4) / (30 * EI));
// 4b: peak at free end (w1=0, w2=20, L=5000)
const t4b = solveDefl({ type: 'cantL', L: 5000, EI, loads: [{ kind: 'uvl', x1: 0, x2: 5000, w1: 0, w2: 20 }] });
test('Test 4b', 'Cantilever UVL peak at free end (11wL4/120EI)', -t4b.y(5000), 11 * 20 * Math.pow(5000, 4) / (120 * EI));

// 5. Simply supported beam with central point load
const t5 = solveDefl({ type: 'ss', L: 6000, xa: 0, xb: 6000, EI, loads: [{ kind: 'point', x: 3000, P: 40000 }] });
test('Test 5a', 'Simply supported central point load midspan deflection (WL3/48EI)', -t5.y(3000), 40000 * Math.pow(6000, 3) / (48 * EI));
test('Test 5b', 'Simply supported central point load end slope (|theta_A| = WL2/16EI)', -t5.theta(0), 40000 * Math.pow(6000, 2) / (16 * EI));
test('Test 5c', 'Symmetry check: slope at mid-span = 0', t5.theta(3000), 0);

// 6. Simply supported beam with full-span UDL
const t6 = solveDefl({ type: 'ss', L: 8000, xa: 0, xb: 8000, EI, loads: [{ kind: 'udl', x1: 0, x2: 8000, w: 12 }] });
test('Test 6a', 'Simply supported full UDL midspan deflection (5wL4/384EI)', -t6.y(4000), 5 * 12 * Math.pow(8000, 4) / (384 * EI));
test('Test 6b', 'Simply supported full UDL end slope (|theta_A| = wL3/24EI)', -t6.theta(0), 12 * Math.pow(8000, 3) / (24 * EI));

// 7. Simply supported beam with off-centre point load
const a7 = 2000, b7 = 4000, L7 = 6000, W7 = 30000;
const t7 = solveDefl({ type: 'ss', L: L7, xa: 0, xb: L7, EI, loads: [{ kind: 'point', x: a7, P: W7 }] });
test('Test 7a', 'Off-centre point load: Reaction R_A = W*b/L', t7.reactions[0].R, W7 * b7 / L7);
test('Test 7b', 'Off-centre point load: Reaction R_B = W*a/L', t7.reactions[1].R, W7 * a7 / L7);
test('Test 7c', 'Off-centre point load: |theta_A| = Wab(L+b)/6EIL', -t7.theta(0), W7 * a7 * b7 * (L7 + b7) / (6 * EI * L7));
test('Test 7d', 'Off-centre point load: |theta_B| = Wab(L+a)/6EIL', t7.theta(L7), W7 * a7 * b7 * (L7 + a7) / (6 * EI * L7));
test('Test 7e', 'Off-centre point load: Deflection under load Wa2b2/3EIL', -t7.y(a7), W7 * a7 * a7 * b7 * b7 / (3 * EI * L7));
const bs7 = Math.min(a7, b7);
const wantMax7 = W7 * bs7 * Math.pow(L7 * L7 - bs7 * bs7, 1.5) / (9 * Math.sqrt(3) * EI * L7);
const max7 = findMaxDeflection(t7, L7);
test('Test 7f', 'Off-centre point load: True maximum deflection by root refinement', max7.maxAbsDefl, wantMax7, 1e-4);

// 8. Simply supported beam with UVL (0 at A to w at B, L = 6000, w = 15)
const t8 = solveDefl({ type: 'ss', L: 6000, xa: 0, xb: 6000, EI, loads: [{ kind: 'uvl', x1: 0, x2: 6000, w1: 0, w2: 15 }] });
test('Test 8a', 'SS beam with UVL: Reaction R_A = wL/6', t8.reactions[0].R, 15 * 6000 / 6);
test('Test 8b', 'SS beam with UVL: Reaction R_B = wL/3', t8.reactions[1].R, 15 * 6000 / 3);
test('Test 8c', 'SS beam with UVL: |theta_A| = 7wL3/360EI', -t8.theta(0), 7 * 15 * Math.pow(6000, 3) / (360 * EI));
test('Test 8d', 'SS beam with UVL: |theta_B| = 8wL3/360EI', t8.theta(6000), 8 * 15 * Math.pow(6000, 3) / (360 * EI));
const max8 = findMaxDeflection(t8, 6000);
test('Test 8e', 'SS beam with UVL: Maximum deflection approx 0.00652 wL4/EI', max8.maxAbsDefl, 0.00652 * 15 * Math.pow(6000, 4) / EI, 0.005);

// 9. Partial UDL using Macaulay brackets (20 kN/m over middle 2m of 6m beam)
const t9 = solveDefl({ type: 'ss', L: 6000, xa: 0, xb: 6000, EI, loads: [{ kind: 'udl', x1: 2000, x2: 4000, w: 20 }] });
test('Test 9a', 'Partial UDL: Symmetry of reactions R_A = R_B = 20 kN', t9.reactions[0].R, 20000);
test('Test 9b', 'Partial UDL: Midspan deflection matches Module 12 worked answer (2.5309 mm)', -t9.y(3000), 2.53086, 1e-4);

// 10. Applied couple case (30 kNm clockwise at x = 2000 on 6m beam)
const t10 = solveDefl({ type: 'ss', L: 6000, xa: 0, xb: 6000, EI, loads: [{ kind: 'moment', x: 2000, M: 30e6 }] });
test('Test 10a', 'Applied couple: Vertical reaction R_A = -M0/L (-5 kN)', t10.reactions[0].R, -5000);
test('Test 10b', 'Applied couple: Vertical reaction R_B = +M0/L (+5 kN)', t10.reactions[1].R, 5000);
test('Test 10c', 'Applied couple: Deflection at point of application matches Module 13 (-0.3951 mm)', -t10.y(2000), 0.39506, 1e-4);

// 11. Overhanging beam (L = 6000, xa = 0, xb = 4000, UDL 10 N/mm over full 6000 mm)
const t11 = solveDefl({ type: 'over', L: 6000, xa: 0, xb: 4000, EI, loads: [{ kind: 'udl', x1: 0, x2: 6000, w: 10 }] });
test('Test 11a', 'Overhanging beam: Reaction R_A = 15 kN', t11.reactions[0].R, 15000);
test('Test 11b', 'Overhanging beam: Reaction R_B = 45 kN', t11.reactions[1].R, 45000);
test('Test 11c', 'Overhanging beam: Deflection at free overhang tip x = 6000 matches Module 16 (0.2963 mm)', -t11.y(6000), 0.2963, 1e-3);

// 12. Cantilever fixed at right end (cantR, L = 3000, W = 20000 at x = 0)
const t12 = solveDefl({ type: 'cantR', L: 3000, EI, loads: [{ kind: 'point', x: 0, P: 20000 }] });
test('Test 12a', 'Cantilever fixed at right: Tip deflection at x=0 equals WL3/3EI', -t12.y(0), 20000 * Math.pow(3000, 3) / (3 * EI));
test('Test 12b', 'Cantilever fixed at right: Boundary conditions at fixed end x=L (y=0, theta=0)', Math.abs(t12.y(3000)) + Math.abs(t12.theta(3000)), 0);

// 13. Zero-load case & invalid input validation
const t13 = solveDefl({ type: 'ss', L: 6000, xa: 0, xb: 6000, EI, loads: [] });
test('Test 13a', 'Zero-load case produces exactly zero deflection', -t13.y(3000), 0);
let thrown = false;
try { solveDefl({ type: 'ss', L: 6000, xa: 3000, xb: 3000, EI, loads: [] }); } catch (e) { thrown = true; }
test('Test 13b', 'Coincident supports correctly throw validation error', thrown ? 1 : 0, 1);

// 14. Dimensional conversions check
const kn_m3 = 1; // 1 kN·m³
const n_mm3 = kn_m3 * 1e3 * 1e9; // 10^3 N * 10^9 mm^3 = 10^12 N·mm³
test('Test 14', 'Dimensional conversion 1 kN·m3 equals 10^12 N·mm3', n_mm3, 1e12);

console.log(`\n========================================`);
console.log(`Summary: ${results.filter(r => r.pass).length} of ${results.length} tests passed.`);
console.log(`========================================\n`);
