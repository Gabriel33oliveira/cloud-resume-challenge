// Scroll-driven particle scene.
// One set of particles morphs between four shapes as the page scrolls:
// AWS-region globe (hero, draggable) -> galaxy (about) -> globe (experience) -> project flowchart (projects) -> orb (contact).
// Light pulses travel along the globe arcs and the flowchart arrows.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const canvas = document.getElementById('universe');
const labelLayer = document.querySelector('.scene-labels');
const caption = document.querySelector('.scene-caption');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const BLUE = new THREE.Vector3(0.36, 0.62, 1.0);   // #5b9dff
const GREEN = new THREE.Vector3(0.0, 0.85, 0.64);  // #00d9a3

// ---------- Stages: which shape sits behind which section ----------
// x and y are fractions of the visible half-width / half-height.
const STAGES = [
  { el: '#top',            shape: 2, side: 'right',  y: 0.0,  s: 1.0,  o: 1.0,  rx: 0.32, caption: '' },
  { el: '#about',          shape: 1, side: 'right',  y: 0.1,  s: 1.0,  o: 0.95, rx: 0.62, caption: '02 / Same particles, new shape' },
  { el: '#experience',     shape: 2, side: 'right',  y: 0.0,  s: 1.0,  o: 1.0,  rx: 0.32, caption: '03 / All 34 AWS Regions, arcs from us-east-2 (Ohio)' },
  { el: '#education',      shape: 2, side: 'right',  y: 0.0,  s: 0.92, o: 0.8,  rx: 0.32, caption: '03 / All 34 AWS Regions, arcs from us-east-2 (Ohio)' },
  { el: '#projects',       shape: 3, side: 'right',  y: 0.0,  s: 1.0,  o: 1.0,  rx: 0.05, caption: '04 / The three projects as AWS data flows' },
  { el: '#skills',         shape: 3, side: 'center', y: 0.0,  s: 1.05, o: 0.2,  rx: 0.05, caption: '' },
  { el: '#certifications', shape: 3, side: 'right',  y: 0.0,  s: 0.95, o: 0.75, rx: 0.05, caption: '04 / The three projects as AWS data flows' },
  { el: '#contact',        shape: 0, side: 'center', y: 0.0,  s: 0.85, o: 0.5,  rx: 0.15, caption: '' },
];
// Rough half-width and half-height of each shape (orb, galaxy, globe, flowchart), used to fit it beside the text.
const SHAPE_HALF_W = [2.2, 2.5, 2.1, 2.75];
const SHAPE_HALF_H = [2.2, 1.7, 2.1, 2.25];

// ---------- Deterministic random, so the shapes look the same on every visit ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260923);
const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const randomUnit = () => {
  const z = rand() * 2 - 1;
  const a = rand() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), z, r * Math.sin(a)];
};

// ---------- Geography helpers for the globe ----------
const GLOBE_R = 2.0;
function latLon(lat, lon, r = GLOBE_R) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  // lon 0 faces the camera (+z); the shader spin rotates it into view.
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}

// Very coarse continent outlines, [lon, lat]. Enough to read as Earth from a distance.
const LAND = [
  [[-168,66],[-162,70],[-140,70],[-120,74],[-95,72],[-80,73],[-62,60],[-56,52],[-66,45],[-70,41],[-76,35],[-81,31],[-80,25],[-84,30],[-90,29],[-97,26],[-97,21],[-92,18],[-87,21],[-84,15],[-83,9],[-77,8],[-80,7],[-86,12],[-92,14],[-105,20],[-110,23],[-115,30],[-118,34],[-124,40],[-124,48],[-130,55],[-140,60],[-152,58],[-165,55]],
  [[-73,78],[-60,82],[-30,83],[-20,75],[-40,65],[-50,62],[-60,70]],
  [[-77,8],[-72,12],[-62,10],[-52,5],[-50,0],[-35,-6],[-39,-15],[-41,-22],[-48,-26],[-58,-34],[-62,-39],[-65,-45],[-68,-52],[-72,-54],[-75,-48],[-73,-38],[-71,-30],[-70,-18],[-76,-14],[-81,-5],[-80,0]],
  [[-10,36],[-9,43],[-2,44],[-5,48],[2,51],[8,54],[10,58],[5,62],[15,69],[28,71],[40,67],[60,69],[70,73],[80,73],[100,78],[113,74],[130,71],[140,72],[160,70],[180,68],[180,62],[163,58],[156,51],[142,53],[140,46],[135,43],[129,35],[127,38],[122,40],[122,31],[120,24],[110,20],[108,16],[105,10],[100,13],[100,3],[104,1],[98,8],[94,16],[90,22],[80,15],[77,8],[72,20],[67,24],[57,25],[56,27],[50,30],[48,29],[56,24],[59,22],[52,16],[44,12],[43,17],[35,28],[34,31],[36,36],[27,37],[26,40],[23,36],[19,40],[12,44],[15,40],[16,38],[8,44],[3,43],[-1,37],[-5,36]],
  [[-17,21],[-16,28],[-10,30],[-6,36],[10,37],[11,33],[20,31],[32,31],[34,28],[43,12],[51,12],[40,-2],[40,-15],[35,-24],[32,-29],[27,-34],[20,-35],[18,-30],[12,-17],[13,-6],[9,-1],[9,4],[4,6],[-8,4],[-13,8],[-17,14]],
  [[114,-22],[122,-18],[130,-12],[137,-12],[137,-16],[142,-11],[146,-19],[153,-26],[150,-37],[141,-38],[135,-34],[131,-31],[115,-34],[113,-26]],
  [[-5,50],[1,51],[0,53],[-2,57],[-5,58],[-6,56],[-3,54],[-5,52]],
  [[-10,52],[-6,52],[-6,55],[-10,54]],
  [[130,31],[134,34],[140,35],[142,40],[141,45],[145,44],[141,41],[140,36],[135,33]],
  [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
  [[109,1],[117,7],[119,1],[116,-4],[110,-3]],
  [[95,5],[98,4],[106,-6],[104,-5]],
  [[166,-46],[172,-41],[178,-38],[174,-42],[169,-47]],
];
function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const isLand = (lon, lat) => LAND.some((p) => inPoly(lon, lat, p));

// All 34 AWS Regions available to a standard account (docs.aws.amazon.com, checked Sep 2026).
// GovCloud and China need separate accounts, so they are left out.
// Ohio is home (Toledo) and Sao Paulo is where Gabriel started, so those two keep their label on.
const REGION_TABLE = [
  ['us-east-1', 38.9, -77.4, 'N. Virginia'], ['us-east-2', 40.0, -83.0, 'Ohio', true],
  ['us-west-1', 37.4, -121.9, 'N. California'], ['us-west-2', 45.8, -119.7, 'Oregon'],
  ['af-south-1', -33.9, 18.4, 'Cape Town'], ['ap-east-1', 22.3, 114.2, 'Hong Kong'],
  ['ap-east-2', 25.0, 121.5, 'Taipei'], ['ap-south-1', 19.1, 72.9, 'Mumbai'],
  ['ap-south-2', 17.4, 78.5, 'Hyderabad'], ['ap-southeast-1', 1.35, 103.8, 'Singapore'],
  ['ap-southeast-2', -33.9, 151.2, 'Sydney'], ['ap-southeast-3', -6.2, 106.8, 'Jakarta'],
  ['ap-southeast-4', -37.8, 145.0, 'Melbourne'], ['ap-southeast-5', 3.1, 101.7, 'Malaysia'],
  ['ap-southeast-6', -36.8, 174.8, 'New Zealand'], ['ap-southeast-7', 13.8, 100.5, 'Thailand'],
  ['ap-northeast-1', 35.7, 139.7, 'Tokyo'], ['ap-northeast-2', 37.6, 127.0, 'Seoul'],
  ['ap-northeast-3', 34.7, 135.5, 'Osaka'], ['ca-central-1', 45.5, -73.6, 'Canada Central'],
  ['ca-west-1', 51.0, -114.1, 'Calgary'], ['eu-central-1', 50.1, 8.7, 'Frankfurt'],
  ['eu-central-2', 47.4, 8.5, 'Zurich'], ['eu-west-1', 53.3, -6.3, 'Ireland'],
  ['eu-west-2', 51.5, -0.1, 'London'], ['eu-west-3', 48.9, 2.35, 'Paris'],
  ['eu-south-1', 45.5, 9.2, 'Milan'], ['eu-south-2', 41.6, -0.9, 'Spain'],
  ['eu-north-1', 59.3, 18.1, 'Stockholm'], ['il-central-1', 32.1, 34.8, 'Tel Aviv'],
  ['me-south-1', 26.1, 50.6, 'Bahrain'], ['me-central-1', 24.5, 54.4, 'UAE'],
  ['mx-central-1', 20.6, -100.4, 'Mexico Central'], ['sa-east-1', -23.5, -46.6, 'São Paulo', true],
];
const REGIONS = Object.fromEntries(REGION_TABLE.map(([code, lat, lon, name, fixed]) => [
  code, { code, lat, lon, name, fixed: !!fixed, label: `${code} · ${name}` },
]));
const ARCS = [
  ['us-east-2', 'us-east-1'], ['us-east-2', 'us-west-2'], ['us-east-2', 'sa-east-1'],
  ['us-east-2', 'eu-west-1'], ['us-east-2', 'ca-central-1'], ['us-east-2', 'mx-central-1'],
  ['us-east-1', 'eu-central-1'], ['eu-west-1', 'eu-central-1'], ['eu-central-1', 'il-central-1'],
  ['il-central-1', 'me-central-1'], ['me-central-1', 'ap-south-1'], ['ap-south-1', 'ap-southeast-1'],
  ['ap-southeast-1', 'ap-southeast-2'], ['us-west-2', 'ap-northeast-1'], ['ap-northeast-1', 'ap-east-1'],
  ['sa-east-1', 'af-south-1'], ['af-south-1', 'eu-west-2'],
];

// ---------- Flowchart: the three AWS projects, one lane each, read left to right ----------
const COL = [-2.2, -1.1, 0, 1.1, 2.2];
const NODE_HALF = 0.22;
const LANE_HALF_W = 2.68;
const LANES = [
  { title: 'This site · Live', tone: 'live', top: 2.2, bottom: 0.28 },
  { title: 'Data pipeline · In progress', tone: 'progress', top: 0.05, bottom: -1.02 },
  { title: 'VPC app · Planned', tone: 'planned', top: -1.2, bottom: -2.22, planned: true },
];
const FLOW_NODES = [
  // This site: visitors reach S3 through CloudFront, GitHub Actions deploys to S3,
  // and the footer's visitor counter goes through API Gateway, Lambda and DynamoDB.
  { id: 'visitor', label: 'Visitor', icon: 'user', x: COL[0], y: 1.15, lane: 0 },
  { id: 'cf', label: 'CloudFront', icon: 'cdn', x: COL[1], y: 1.52, lane: 0 },
  { id: 's3a', label: 'S3', icon: 'bucket', x: COL[2], y: 1.52, lane: 0 },
  { id: 'gha', label: 'GitHub Actions', icon: 'play', x: COL[3], y: 1.52, lane: 0 },
  { id: 'apia', label: 'API Gateway', icon: 'api', x: COL[1], y: 0.78, lane: 0 },
  { id: 'lambdaa', label: 'Lambda', icon: 'lambda', x: COL[2], y: 0.78, lane: 0 },
  { id: 'ddba', label: 'DynamoDB', icon: 'db', x: COL[3], y: 0.78, lane: 0 },
  // Data pipeline
  { id: 'csv', label: 'CSV', icon: 'doc', x: COL[0], y: -0.5, lane: 1 },
  { id: 's3b', label: 'S3', icon: 'bucket', x: COL[1], y: -0.5, lane: 1 },
  { id: 'lambdab', label: 'Lambda', icon: 'lambda', x: COL[2], y: -0.5, lane: 1 },
  { id: 'ddbb', label: 'DynamoDB', icon: 'db', x: COL[3], y: -0.5, lane: 1 },
  { id: 'apib', label: 'API Gateway', icon: 'api', x: COL[4], y: -0.5, lane: 1 },
  // VPC app
  { id: 'users', label: 'Users', icon: 'user', x: COL[0], y: -1.7, lane: 2 },
  { id: 'alb', label: 'ALB', icon: 'alb', x: COL[1], y: -1.7, lane: 2 },
  { id: 'ec2', label: 'EC2', icon: 'chip', x: COL[2], y: -1.7, lane: 2 },
  { id: 'rds', label: 'RDS', icon: 'db', x: COL[3], y: -1.7, lane: 2 },
];
const flowNode = Object.fromEntries(FLOW_NODES.map((n) => [n.id, n]));
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// Edges leave the side of one box and enter the side of the next, with an elbow when rows differ.
const FLOW_EDGES = [
  ['visitor', 'cf'], ['visitor', 'apia'], ['cf', 's3a'], ['gha', 's3a'], ['apia', 'lambdaa'], ['lambdaa', 'ddba'],
  ['csv', 's3b'], ['s3b', 'lambdab'], ['lambdab', 'ddbb'], ['ddbb', 'apib'],
  ['users', 'alb'], ['alb', 'ec2'], ['ec2', 'rds'],
].map(([a, b]) => {
  const A = flowNode[a];
  const B = flowNode[b];
  const dir = Math.sign(B.x - A.x) || 1;
  const gap = NODE_HALF + 0.06;
  const start = V(A.x + dir * gap, A.y);
  const end = V(B.x - dir * gap, B.y);
  let pts = [start, end];
  if (Math.abs(A.y - B.y) > 0.01) {
    const mx = (start.x + end.x) / 2;
    pts = [start, V(mx, A.y), V(mx, B.y), end];
  }
  return { pts, planned: !!LANES[A.lane].planned };
});

function polylineLength(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return cum;
}
function pointAt(pts, cum, s) {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < s) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  return pts[i - 1].clone().lerp(pts[i], THREE.MathUtils.clamp((s - cum[i - 1]) / seg, 0, 1));
}
function resample(pts, n) {
  const cum = polylineLength(pts);
  const L = cum[cum.length - 1];
  return Array.from({ length: n + 1 }, (_, k) => pointAt(pts, cum, (k / n) * L));
}
function roundedRect(cx, cy, hw, hh, r, seg = 4) {
  const pts = [];
  [[cx + hw - r, cy + hh - r, 0], [cx - hw + r, cy + hh - r, 0.5], [cx - hw + r, cy - hh + r, 1], [cx + hw - r, cy - hh + r, 1.5]]
    .forEach(([x, y, a0]) => {
      for (let k = 0; k <= seg; k++) {
        const a = (a0 + (k / seg) * 0.5) * Math.PI;
        pts.push(V(x + Math.cos(a) * r, y + Math.sin(a) * r));
      }
    });
  pts.push(pts[0].clone());
  return pts;
}
function arc(cx, cy, rx, ry, a0, a1, n = 18) {
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = a0 + ((a1 - a0) * k) / n;
    return V(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  });
}
// Simple line icons, drawn in a -1..1 box and scaled into the node.
function iconStrokes(type, cx, cy) {
  const s = NODE_HALF * 0.58;
  const P = Math.PI;
  const L = (...xy) => { const out = []; for (let i = 0; i < xy.length; i += 2) out.push(V(xy[i], xy[i + 1])); return out; };
  const shapes = {
    user: [arc(0, 0.38, 0.3, 0.3, 0, 2 * P), arc(0, -0.8, 0.65, 0.62, 0.15 * P, 0.85 * P)],
    cdn: [arc(0, 0, 0.8, 0.8, 0, 2 * P, 28), arc(0, 0, 0.34, 0.8, 0, 2 * P), L(-0.8, 0, 0.8, 0)],
    bucket: [arc(0, 0.55, 0.75, 0.22, 0, 2 * P), L(-0.75, 0.55, -0.5, -0.7), L(0.75, 0.55, 0.5, -0.7), arc(0, -0.7, 0.5, 0.15, P, 2 * P)],
    play: [arc(0, 0, 0.8, 0.8, 0, 2 * P, 28), L(-0.25, 0.4, 0.42, 0, -0.25, -0.4, -0.25, 0.4)],
    api: [L(-0.15, 0.55, -0.7, 0, -0.15, -0.55), L(0.15, 0.55, 0.7, 0, 0.15, -0.55)],
    lambda: [L(-0.5, 0.8, -0.2, 0.8, 0.55, -0.8), L(0.08, -0.02, -0.45, -0.8)],
    db: [arc(0, 0.6, 0.65, 0.2, 0, 2 * P), L(-0.65, 0.6, -0.65, -0.6), L(0.65, 0.6, 0.65, -0.6), arc(0, -0.6, 0.65, 0.2, P, 2 * P), arc(0, 0, 0.65, 0.2, P, 2 * P)],
    doc: [L(-0.55, 0.8, 0.25, 0.8, 0.6, 0.45, 0.6, -0.8, -0.55, -0.8, -0.55, 0.8), L(0.25, 0.8, 0.25, 0.45, 0.6, 0.45), L(-0.32, 0.1, 0.38, 0.1), L(-0.32, -0.22, 0.38, -0.22), L(-0.32, -0.52, 0.2, -0.52)],
    alb: [arc(-0.55, 0, 0.18, 0.18, 0, 2 * P), L(-0.37, 0, 0.45, 0.55), L(-0.37, 0, 0.45, 0), L(-0.37, 0, 0.45, -0.55), arc(0.58, 0.55, 0.12, 0.12, 0, 2 * P, 10), arc(0.58, 0, 0.12, 0.12, 0, 2 * P, 10), arc(0.58, -0.55, 0.12, 0.12, 0, 2 * P, 10)],
    chip: [L(-0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5), L(-0.2, -0.2, 0.2, -0.2, 0.2, 0.2, -0.2, 0.2, -0.2, -0.2),
      L(-0.25, 0.5, -0.25, 0.78), L(0.25, 0.5, 0.25, 0.78), L(-0.25, -0.5, -0.25, -0.78), L(0.25, -0.5, 0.25, -0.78),
      L(0.5, 0.25, 0.78, 0.25), L(0.5, -0.25, 0.78, -0.25), L(-0.5, 0.25, -0.78, 0.25), L(-0.5, -0.25, -0.78, -0.25)],
  };
  return shapes[type].map((pts) => pts.map((p) => V(cx + p.x * s, cy + p.y * s)));
}
function arrowHead(pts) {
  const E = pts[pts.length - 1];
  const d = E.clone().sub(pts[pts.length - 2]).normalize();
  const back = E.clone().addScaledVector(d, -0.09);
  const perp = V(-d.y, d.x);
  return [back.clone().addScaledVector(perp, 0.055), E.clone(), back.clone().addScaledVector(perp, -0.055)];
}
// Everything the flowchart particles are strung along. Colour: 0 blue, 1 green, above 1 fades to white.
function flowStrokes() {
  const out = [];
  const toneColor = { live: 0.8, progress: 0.18, planned: 0.06 };
  LANES.forEach((l) => out.push({
    pts: roundedRect(0, (l.top + l.bottom) / 2, LANE_HALF_W, (l.top - l.bottom) / 2, 0.08),
    w: 0.5, size: 0.5, color: toneColor[l.tone], dash: l.planned ? [0.1, 0.08] : null,
  }));
  FLOW_NODES.forEach((n) => {
    const planned = !!LANES[n.lane].planned;
    const k = planned ? 0.65 : 1;
    out.push({ pts: roundedRect(n.x, n.y, NODE_HALF, NODE_HALF, 0.05), w: 2.0, size: 0.95 * k, color: planned ? 0.08 : toneColor[LANES[n.lane].tone] + 0.1 });
    iconStrokes(n.icon, n.x, n.y).forEach((pts) => out.push({ pts, w: 3.2, size: 0.85 * k, color: planned ? 0.3 : 1.15 }));
  });
  FLOW_EDGES.forEach((e) => {
    const k = e.planned ? 0.65 : 1;
    out.push({ pts: e.pts, w: 1.0, size: 0.7 * k, color: e.planned ? 0.06 : 0.3, dash: e.planned ? [0.07, 0.06] : null });
    out.push({ pts: arrowHead(e.pts), w: 2.2, size: 0.85 * k, color: e.planned ? 0.1 : 0.9 });
  });
  return out;
}

// ---------- Shape builders ----------
// Each writes position, size and colour for every particle, for one shape slot.
// Colour: 0 = blue, 1 = green, 1..2 fades to near white.
function buildShapes(count) {
  const pos = [0, 1, 2, 3].map(() => new Float32Array(count * 3));
  const size = new Float32Array(count * 4);
  const color = new Float32Array(count * 4);
  const rnd = new Float32Array(count);
  const scatter = new Float32Array(count * 3);

  const set = (shape, i, x, y, z, s, c) => {
    pos[shape][i * 3] = x; pos[shape][i * 3 + 1] = y; pos[shape][i * 3 + 2] = z;
    size[i * 4 + shape] = s;
    color[i * 4 + shape] = c;
  };

  for (let i = 0; i < count; i++) {
    rnd[i] = rand();
    const [sx, sy, sz] = randomUnit();
    scatter[i * 3] = sx; scatter[i * 3 + 1] = sy; scatter[i * 3 + 2] = sz;
  }

  // 0. Orb: a lumpy sphere shell with a sparse core.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const shell = Math.floor(count * 0.86);
  for (let i = 0; i < count; i++) {
    if (i < shell) {
      const y = 1 - (i / (shell - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      const d = [Math.cos(th) * r, y, Math.sin(th) * r];
      const n = 0.5 * Math.sin(d[0] * 4 + d[1] * 2) + 0.5 * Math.sin(d[1] * 5 - d[2] * 3);
      const rad = 2.0 * (1 + 0.09 * n) + (rand() - 0.5) * 0.08;
      set(0, i, d[0] * rad, d[1] * rad, d[2] * rad, 0.75 + rand() * 0.6, 0.12 + (y + 1) * 0.42 + rand() * 0.1);
    } else {
      const [x, y, z] = randomUnit();
      const rad = 1.7 * Math.cbrt(rand());
      set(0, i, x * rad, y * rad, z * rad, 0.45, 0.35);
    }
  }

  // 1. Galaxy: three spiral arms in the XZ plane, bright core, loose halo.
  const ARMS = 3;
  for (let i = 0; i < count; i++) {
    const roll = rand();
    if (roll < 0.1) {
      const r = 0.45 * Math.pow(rand(), 1.6);
      const [x, y, z] = randomUnit();
      set(1, i, x * r, y * r * 0.45, z * r, 1.1 + rand() * 0.5, 1.35 + rand() * 0.4);
    } else if (roll < 0.17) {
      const [x, y, z] = randomUnit();
      const r = 2.2 + rand() * 1.4;
      set(1, i, x * r, y * r * 0.4, z * r, 0.4 + rand() * 0.3, 0.3 + rand() * 0.6);
    } else {
      const r = 0.3 + Math.pow(rand(), 1.35) * 2.7;
      const branch = ((i % ARMS) / ARMS) * Math.PI * 2;
      const spin = r * 1.15;
      const spread = 0.28 + r * 0.1;
      const jx = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread;
      const jy = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread * 0.35;
      const jz = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * spread;
      const c = r < 0.9 ? 1.25 - r * 1.2 : 0.17 + ((r - 0.9) / 2.1) * 0.85;
      set(1, i, Math.cos(branch + spin) * r + jx, jy, Math.sin(branch + spin) * r + jz, 0.5 + rand() * 0.8, c + rand() * 0.08);
    }
  }

  // 2. Globe: land dots on a lat/lon grid, a faint ocean shell, bright region clusters.
  const land = [];
  const step = 1.15;
  for (let lat = -56; lat <= 80; lat += step) {
    const ring = Math.max(1, Math.floor((360 / step) * Math.cos(THREE.MathUtils.degToRad(lat))));
    for (let k = 0; k < ring; k++) {
      const lon = -180 + (k / ring) * 360;
      if (isLand(lon, lat)) land.push(latLon(lat, lon));
    }
  }
  // Every region gets a small bright knot; the two home regions get a bigger one.
  const regionList = Object.values(REGIONS).flatMap((r) => (r.fixed ? [r, r, r] : [r]));
  const regionCount = Math.floor(count * 0.045);
  const landCount = Math.floor(count * 0.64);
  const oceanCount = count - regionCount - landCount;
  let gi = 0;
  for (let k = 0; k < regionCount; k++, gi++) {
    const reg = regionList[k % regionList.length];
    const c = latLon(reg.lat, reg.lon, GLOBE_R * 1.01);
    const sp = reg.fixed ? 0.03 : 0.022;
    set(2, gi, c.x + gauss() * sp, c.y + gauss() * sp, c.z + gauss() * sp, (reg.fixed ? 1.2 : 0.9) + rand() * 0.7, (reg.fixed ? 1.3 : 1.05) + rand() * 0.3);
  }
  for (let k = 0; k < landCount; k++, gi++) {
    const p = land[Math.floor((k / landCount) * land.length)];
    set(2, gi, p.x + gauss() * 0.006, p.y + gauss() * 0.006, p.z + gauss() * 0.006, 0.75 + rand() * 0.35, 0.55 + rand() * 0.4);
  }
  for (let k = 0; k < oceanCount; k++, gi++) {
    const y = 1 - (k / (oceanCount - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * k;
    set(2, gi, Math.cos(th) * r * GLOBE_R * 0.995, y * GLOBE_R * 0.995, Math.sin(th) * r * GLOBE_R * 0.995, 0.4, 0.02);
  }

  // 3. Flowchart: particles strung along lane boxes, service boxes, icons and arrows.
  const strokes = flowStrokes().map((st) => ({ ...st, cum: polylineLength(st.pts) }));
  const weights = strokes.map((st) => st.cum[st.cum.length - 1] * st.w);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const fillCount = Math.floor(count * 0.03);
  const dustCount = Math.floor(count * 0.04);
  const strokeCount = count - fillCount - dustCount;
  let ni = 0;
  strokes.forEach((st, idx) => {
    const L = st.cum[st.cum.length - 1];
    const n = idx === strokes.length - 1 ? strokeCount - ni : Math.floor((weights[idx] / totalW) * strokeCount);
    for (let k = 0; k < n; k++, ni++) {
      let d = ((k + rand() * 0.9) / n) * L;
      if (st.dash) {
        // Squeeze each dash period's points into its visible part.
        const period = st.dash[0] + st.dash[1];
        d = Math.floor(d / period) * period + (d % period) * (st.dash[0] / period);
      }
      const p = pointAt(st.pts, st.cum, d);
      set(3, ni, p.x + gauss() * 0.006, p.y + gauss() * 0.006, gauss() * 0.02, st.size * (0.8 + rand() * 0.4), st.color + rand() * 0.08);
    }
  });
  for (let k = 0; k < fillCount; k++, ni++) {
    const nd = FLOW_NODES[k % FLOW_NODES.length];
    const planned = !!LANES[nd.lane].planned;
    set(3, ni, nd.x + (rand() * 2 - 1) * NODE_HALF * 0.85, nd.y + (rand() * 2 - 1) * NODE_HALF * 0.85, gauss() * 0.03, 0.35, planned ? 0.04 : 0.2);
  }
  for (; ni < count; ni++) {
    set(3, ni, (rand() * 2 - 1) * 3.4, (rand() * 2 - 1) * 2.6, (rand() * 2 - 1) * 0.8, 0.3, 0.3);
  }

  return { pos, size, color, rnd, scatter };
}

// ---------- Shaders ----------
const particleVertex = /* glsl */ `
  attribute vec3 aOrb;
  attribute vec3 aGalaxy;
  attribute vec3 aGlobe;
  attribute vec3 aNet;
  attribute vec4 aSize;
  attribute vec4 aColor;
  attribute float aRand;
  attribute vec3 aScatter;

  uniform float uTime;
  uniform float uT;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uOpacity;
  uniform float uMouseStrength;
  uniform vec3 uMouse;
  uniform vec4 uFromW;
  uniform vec4 uToW;
  uniform vec4 uSpin;

  varying float vColor;
  varying float vAlpha;
  varying float vGlow;

  vec3 rotY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  }

  void main() {
    // The orb breathes: a slow travelling wave along each point's normal.
    vec3 n = normalize(aOrb + 1e-5);
    float wave = sin(aOrb.x * 2.6 + uTime * 0.9) * sin(aOrb.y * 2.2 - uTime * 0.7) * sin(aOrb.z * 2.4 + uTime * 0.5);
    vec3 orb = rotY(aOrb + n * wave * 0.16, uSpin.x);
    vec3 gal = rotY(aGalaxy, uSpin.y);
    vec3 glb = rotY(aGlobe, uSpin.z);
    vec3 net = rotY(aNet, uSpin.w);

    vec3 from = orb * uFromW.x + gal * uFromW.y + glb * uFromW.z + net * uFromW.w;
    vec3 to   = orb * uToW.x   + gal * uToW.y   + glb * uToW.z   + net * uToW.w;

    // Each particle starts its trip at a slightly different moment, and the
    // cloud blows outward mid-flight before settling into the next shape.
    float t = clamp((uT - aRand * 0.4) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 pos = mix(from, to, t);
    pos += aScatter * sin(t * 3.14159) * 1.1;
    pos += aScatter * 0.025 * sin(uTime * 0.6 + aRand * 40.0);

    float size = mix(dot(aSize, uFromW), dot(aSize, uToW), t);
    vColor = mix(dot(aColor, uFromW), dot(aColor, uToW), t);

    // Pointer: particles near the cursor lean away and light up.
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vec2 dm = world.xy - uMouse.xy;
    float md = length(dm);
    float mf = smoothstep(1.2, 0.0, md) * uMouseStrength;
    world.xy += (dm / max(md, 0.001)) * mf * 0.32;
    vGlow = mf;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * size * uPixelRatio / -mv.z, 16.0 * uPixelRatio);

    // Points on the far side of the shape are dimmer, which sells the depth.
    float center = (viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
    vAlpha = uOpacity * mix(0.2, 1.0, smoothstep(-2.2, 1.2, mv.z - center));
    vAlpha *= 0.78 + 0.22 * sin(uTime * 1.4 + aRand * 60.0);
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uBlue;
  uniform vec3 uGreen;
  varying float vColor;
  varying float vAlpha;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    a *= a;
    vec3 col = mix(uBlue, uGreen, clamp(vColor, 0.0, 1.0));
    col = mix(col, vec3(0.9, 0.97, 1.0), clamp(vColor - 1.0, 0.0, 1.0));
    col += vGlow * 0.7;
    gl_FragColor = vec4(col * a * vAlpha, 1.0);
  }
`;

const lineVertex = /* glsl */ `
  attribute float aT;
  attribute float aOff;
  varying float vT;
  varying float vOff;
  varying float vFade;
  void main() {
    vT = aT;
    vOff = aOff;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float center = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
    vFade = mix(0.12, 1.0, smoothstep(-2.0, 1.0, mv.z - center));
    gl_Position = projectionMatrix * mv;
  }
`;

const lineFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uHead;
  varying float vT;
  varying float vOff;
  varying float vFade;
  void main() {
    float head = fract(uTime * uSpeed + vOff);
    float d = head - vT;
    float tail = step(0.0, d) * exp(-d * 9.0);
    vec3 col = mix(uColor, uHead, tail);
    gl_FragColor = vec4(col * (0.24 + tail * 1.2) * vFade * uOpacity, 1.0);
  }
`;

const spriteVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uTwinkle;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(aSize * uPixelRatio * 24.0 / -mv.z, 24.0 * uPixelRatio);
    float center = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
    vAlpha = mix(1.0, 0.45 + 0.55 * sin(uTime * (0.6 + aPhase) + aPhase * 30.0), uTwinkle);
    vAlpha *= mix(1.0, smoothstep(-2.0, 1.0, mv.z - center), 1.0 - uTwinkle);
  }
`;

const spriteFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * a;
    gl_FragColor = vec4(uColor * a * vAlpha * uOpacity, 1.0);
  }
`;

// ---------- Scene ----------
function main() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const small = () => window.innerWidth < 820;
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  const COUNT = small() ? 9000 : lowPower ? 14000 : 22000;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 8);

  const stage = new THREE.Group();
  scene.add(stage);

  // Particles
  const data = buildShapes(COUNT);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.pos[0], 3));
  geo.setAttribute('aOrb', new THREE.BufferAttribute(data.pos[0], 3));
  geo.setAttribute('aGalaxy', new THREE.BufferAttribute(data.pos[1], 3));
  geo.setAttribute('aGlobe', new THREE.BufferAttribute(data.pos[2], 3));
  geo.setAttribute('aNet', new THREE.BufferAttribute(data.pos[3], 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(data.size, 4));
  geo.setAttribute('aColor', new THREE.BufferAttribute(data.color, 4));
  geo.setAttribute('aRand', new THREE.BufferAttribute(data.rnd, 1));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(data.scatter, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);

  const pUniforms = {
    uTime: { value: 0 },
    uT: { value: 0 },
    uSize: { value: 26 },
    uPixelRatio: { value: 1 },
    uOpacity: { value: 1 },
    uMouseStrength: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uFromW: { value: new THREE.Vector4(1, 0, 0, 0) },
    uToW: { value: new THREE.Vector4(1, 0, 0, 0) },
    uSpin: { value: new THREE.Vector4() },
    uBlue: { value: BLUE },
    uGreen: { value: GREEN },
  };
  const particles = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: pUniforms,
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  stage.add(particles);

  // Lines with travelling light, plus a bright "packet" riding each pulse.
  function makeLines(polylines, color, head, speed) {
    const SEG = polylines[0].length - 1;
    const verts = new Float32Array(polylines.length * SEG * 2 * 3);
    const ts = new Float32Array(polylines.length * SEG * 2);
    const offs = new Float32Array(polylines.length * SEG * 2);
    const offsets = polylines.map(() => rand());
    let v = 0;
    polylines.forEach((pts, li) => {
      for (let s = 0; s < SEG; s++) {
        [pts[s], pts[s + 1]].forEach((p, k) => {
          verts[v * 3] = p.x; verts[v * 3 + 1] = p.y; verts[v * 3 + 2] = p.z;
          ts[v] = (s + k) / SEG;
          offs[v] = offsets[li];
          v++;
        });
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    g.setAttribute('aOff', new THREE.BufferAttribute(offs, 1));
    const uniforms = {
      uTime: { value: 0 }, uSpeed: { value: speed }, uOpacity: { value: 0 },
      uColor: { value: color }, uHead: { value: head },
    };
    const lines = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      uniforms, vertexShader: lineVertex, fragmentShader: lineFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));

    const packetPos = new Float32Array(polylines.length * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(packetPos, 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(polylines.length).fill(2.6), 1));
    pg.setAttribute('aPhase', new THREE.BufferAttribute(new Float32Array(polylines.length), 1));
    const packetUniforms = {
      uPixelRatio: pUniforms.uPixelRatio, uTime: { value: 0 }, uTwinkle: { value: 0 },
      uColor: { value: head }, uOpacity: { value: 0 },
    };
    const packets = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: packetUniforms, vertexShader: spriteVertex, fragmentShader: spriteFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    packets.frustumCulled = false;

    const group = new THREE.Group();
    group.add(lines, packets);
    stage.add(group);

    return {
      group,
      update(time, opacity) {
        group.visible = opacity > 0.002;
        if (!group.visible) return;
        uniforms.uTime.value = time;
        uniforms.uOpacity.value = opacity;
        packetUniforms.uOpacity.value = opacity;
        polylines.forEach((pts, li) => {
          const h = (((time * speed + offsets[li]) % 1) + 1) % 1;
          const f = h * SEG;
          const i0 = Math.min(Math.floor(f), SEG - 1);
          const p = pts[i0].clone().lerp(pts[i0 + 1], f - i0);
          packetPos[li * 3] = p.x; packetPos[li * 3 + 1] = p.y; packetPos[li * 3 + 2] = p.z;
        });
        pg.attributes.position.needsUpdate = true;
      },
    };
  }

  const arcPolylines = ARCS.map(([a, b]) => {
    const A = latLon(REGIONS[a].lat, REGIONS[a].lon).normalize();
    const B = latLon(REGIONS[b].lat, REGIONS[b].lon).normalize();
    const angle = A.angleTo(B);
    const lift = 0.18 + angle * 0.28;
    const pts = [];
    for (let k = 0; k <= 64; k++) {
      const t = k / 64;
      // Spherical interpolation, lifted off the surface in the middle of the trip.
      const p = A.clone().multiplyScalar(Math.sin((1 - t) * angle)).add(B.clone().multiplyScalar(Math.sin(t * angle))).divideScalar(Math.sin(angle));
      pts.push(p.multiplyScalar(GLOBE_R * 1.01 + Math.sin(t * Math.PI) * lift));
    }
    return pts;
  });
  const globeLines = makeLines(arcPolylines, new THREE.Vector3(0.25, 0.5, 0.9), new THREE.Vector3(0.75, 1.0, 0.92), 0.28);
  const flowLive = FLOW_EDGES.filter((e) => !e.planned).map((e) => resample(e.pts, 40));
  const flowPlanned = FLOW_EDGES.filter((e) => e.planned).map((e) => resample(e.pts, 40));
  const netLines = makeLines(flowLive, new THREE.Vector3(0.3, 0.55, 1.0), new THREE.Vector3(0.7, 1.0, 0.9), 0.45);
  const plannedLines = makeLines(flowPlanned, new THREE.Vector3(0.3, 0.4, 0.6), new THREE.Vector3(0.6, 0.7, 0.85), 0.3);

  // Distant stars, always there.
  const STARS = small() ? 500 : 1100;
  const starPos = new Float32Array(STARS * 3);
  const starSize = new Float32Array(STARS);
  const starPhase = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    // A slab of stars well behind the scene. Nothing may sit near the camera:
    // a point a few units from the lens would be drawn hundreds of pixels wide.
    starPos[i * 3] = (rand() - 0.5) * 90;
    starPos[i * 3 + 1] = (rand() - 0.5) * 56;
    starPos[i * 3 + 2] = -14 - rand() * 30;
    starSize[i] = 2 + rand() * 5 * (rand() < 0.1 ? 2 : 1);
    starPhase[i] = rand();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
  const starUniforms = {
    uPixelRatio: pUniforms.uPixelRatio, uTime: { value: 0 }, uTwinkle: { value: 1 },
    uColor: { value: new THREE.Vector3(0.75, 0.85, 1.0) }, uOpacity: { value: 0.9 },
  };
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    uniforms: starUniforms, vertexShader: spriteVertex, fragmentShader: spriteFragment,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(stars);

  // ---------- HTML labels pinned to 3D points ----------
  const labels = [];
  function addLabel(text, local, shape, cls, extra = {}) {
    const el = document.createElement('span');
    el.className = 'scene-label ' + cls;
    el.textContent = text;
    labelLayer.appendChild(el);
    const lb = { el, local, shape, facing: shape === 2, sx: 0, sy: 0, face: 1, ...extra };
    labels.push(lb);
    return lb;
  }
  const regionLabels = [];
  if (labelLayer) {
    Object.values(REGIONS).forEach((r) => {
      regionLabels.push(addLabel(r.label, latLon(r.lat, r.lon, GLOBE_R * 1.02), 2, 'is-region' + (r.fixed ? ' is-home' : ''), { region: r }));
    });
    FLOW_NODES.forEach((n) => addLabel(n.label, V(n.x, n.y - NODE_HALF - 0.14), 3, 'is-node' + (LANES[n.lane].planned ? ' is-planned' : '')));
    LANES.forEach((l) => addLabel(l.title, V(-LANE_HALF_W + 0.12, l.top - 0.13), 3, 'is-lane tone-' + l.tone));
  }

  // ---------- Layout and scroll mapping ----------
  let W = 0, H = 0, halfW = 1, halfH = 1, keys = [], maxScroll = 1;
  const stageEls = STAGES.map((s) => document.querySelector(s.el));
  const stacked = () => window.innerWidth < 1024;

  function measure() {
    const vh = window.innerHeight;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    let prev = -1;
    keys = stageEls.map((el, i) => {
      let k = i === 0 || !el ? 0 : el.getBoundingClientRect().top + window.scrollY - vh * 0.55;
      k = Math.min(Math.max(k, prev + 1), maxScroll - (STAGES.length - 1 - i));
      prev = k;
      return k;
    });
    // Right edge of each section's text column, so the shape never sits on top of the copy.
    STAGES.forEach((st, i) => {
      const el = stageEls[i];
      const col = el && (el.querySelector('.hero-content') || el.firstElementChild);
      st.colRight = col ? col.getBoundingClientRect().right : W / 2;
    });
  }

  // Where a stage's shape goes: x position, scale, and an extra dimming factor.
  function place(st) {
    const hw = SHAPE_HALF_W[st.shape];
    const hh = SHAPE_HALF_H[st.shape];
    const fitH = (halfH * 0.84) / hh;
    const centered = (dim) => ({ x: 0, scale: Math.min(st.s, 1.1) * Math.min(fitH, (halfW * 0.92) / hw), dim });
    if (stacked()) return centered(0.5);
    if (st.side === 'center') return { ...centered(1), scale: st.s * Math.min(fitH, (halfW * 0.9) / hw) };
    const left = ((st.colRight / W) * 2 - 1) * halfW + 0.35;
    const right = halfW - 0.3;
    const fitW = (right - left) / (2 * hw);
    if (fitW < 0.55) return centered(0.45);
    return { x: (left + right) / 2, scale: st.s * Math.min(fitH, fitW), dim: 1 };
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, small() ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    pUniforms.uPixelRatio.value = dpr;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    measure();
    needsRender = true;
  }

  function stageFromScroll(y) {
    const vh = window.innerHeight;
    for (let i = 0; i < keys.length - 1; i++) {
      if (y < keys[i + 1]) {
        const win = Math.min(vh * 0.7, keys[i + 1] - keys[i]);
        return i + THREE.MathUtils.clamp((y - (keys[i + 1] - win)) / win, 0, 1);
      }
    }
    return keys.length - 1;
  }

  // ---------- Pointer: glow, hover and drag-to-spin ----------
  const ndc = new THREE.Vector2(0, 0);
  const smoothNdc = new THREE.Vector2(0, 0);
  const ORIGIN2 = new THREE.Vector2(0, 0);
  const pointer = { x: -1, y: -1 };
  let pointerActive = false;
  let mouseStrength = 0;
  let globeWeight = 0;
  const drag = { active: false, moved: 0, lastX: 0, lastY: 0, yaw: 0, pitch: 0, vel: 0 };
  const rootCls = document.documentElement.classList;
  const centerV = new THREE.Vector3();

  // Is this screen point inside the globe's disc?
  function overGlobe(x, y) {
    if (globeWeight < 0.6) return false;
    centerV.setFromMatrixPosition(stage.matrixWorld);
    const dist = camera.position.distanceTo(centerV);
    centerV.project(camera);
    const cx = ((centerV.x + 1) / 2) * W;
    const cy = ((1 - centerV.y) / 2) * H;
    const rpx = ((GLOBE_R * stage.scale.x) / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * (H / 2);
    return Math.hypot(x - cx, y - cy) < rpx * 1.02;
  }

  if (finePointer && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      ndc.set((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1);
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointerActive = true;
      if (drag.active) {
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        drag.yaw += dx * 0.0065;
        drag.pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.004, -0.55, 0.55);
        drag.vel = THREE.MathUtils.clamp(lerp(drag.vel, dx * 0.0065 * 60, 0.5), -5, 5);
        drag.moved += Math.abs(dx) + Math.abs(dy);
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
      }
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { pointerActive = false; });

    window.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || rootCls.contains('is-editing')) return;
      if (e.target.closest('a, button, input, textarea, label, [contenteditable="true"]')) return;
      if (!overGlobe(e.clientX, e.clientY)) return;
      e.preventDefault();
      drag.active = true;
      drag.moved = 0;
      drag.vel = 0;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      rootCls.add('globe-dragging');
    });
    const release = () => {
      if (!drag.active) return;
      drag.active = false;
      rootCls.remove('globe-dragging');
      // A click without a drag gives the globe a spin.
      if (drag.moved < 4) drag.vel = 2.6;
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  // ---------- Loop ----------
  let sv = stageFromScroll(window.scrollY);
  let needsRender = true;
  let captionIndex = -1;
  let globeClock = 0;
  let time = 0;
  let last = performance.now();
  let hoverRegion = null;
  const tmp = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lerp = THREE.MathUtils.lerp;
  const ease = (t) => t * t * (3 - 2 * t);
  const UP = THREE.Object3D.DEFAULT_UP;

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { needsRender = true; }, { passive: true });
  window.addEventListener('load', measure);
  // Label widths are cached for the collision check; re-measure once the web fonts arrive.
  if (document.fonts) document.fonts.ready.then(() => { measure(); regionLabels.forEach((lb) => { lb.bw = 0; }); });
  new ResizeObserver(measure).observe(document.body);

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    requestAnimationFrame(frame);
    if (reduceMotion && !needsRender) return;
    needsRender = false;

    const target = stageFromScroll(window.scrollY);
    if (reduceMotion) {
      sv = Math.round(target);
    } else {
      time += dt;
      sv += (target - sv) * (1 - Math.exp(-dt * 4));
    }

    const i = Math.min(Math.floor(sv), STAGES.length - 1);
    const f = sv - i;
    const A = STAGES[i];
    const B = STAGES[Math.min(i + 1, STAGES.length - 1)];
    const e = ease(f);

    // Shape morph
    pUniforms.uFromW.value.set(+(A.shape === 0), +(A.shape === 1), +(A.shape === 2), +(A.shape === 3));
    pUniforms.uToW.value.set(+(B.shape === 0), +(B.shape === 1), +(B.shape === 2), +(B.shape === 3));
    pUniforms.uT.value = f;
    const weight = (shape) => (A.shape === shape ? 1 - e : 0) + (B.shape === shape ? e : 0);
    globeWeight = weight(2);

    // Globe spin: auto-rotation, plus whatever the visitor adds by dragging.
    // It restarts facing the Americas each time you arrive, so Ohio and Sao Paulo come first.
    if (globeWeight > 0.01) {
      globeClock += dt;
    } else {
      globeClock = 0;
      drag.yaw = 0;
      drag.pitch = 0;
      drag.vel = 0;
    }
    if (!drag.active) {
      drag.yaw += drag.vel * dt;
      drag.vel *= Math.exp(-dt * 2.2);
      drag.pitch *= Math.exp(-dt * 1.2);
    }
    const globeSpin = THREE.MathUtils.degToRad(83) - globeClock * 0.07 + drag.yaw;
    const netSpin = Math.sin(time * 0.18) * 0.1;

    // Where the shape sits on screen
    const pA = place(A);
    const pB = place(B);
    const mobile = stacked();
    stage.position.set(lerp(pA.x, pB.x, e), lerp(A.y, B.y, e) * halfH, 0);
    stage.scale.setScalar(lerp(pA.scale, pB.scale, e));
    smoothNdc.lerp(pointerActive && !drag.active ? ndc : ORIGIN2, 1 - Math.exp(-dt * 3));
    stage.rotation.set(lerp(A.rx, B.rx, e) - smoothNdc.y * 0.08 + drag.pitch * globeWeight, smoothNdc.x * 0.14, 0);
    const stageO = lerp(A.o, B.o, e) * lerp(pA.dim, pB.dim, e);
    pUniforms.uOpacity.value = stageO;

    pUniforms.uSpin.value.set(time * 0.08, time * 0.06, globeSpin, netSpin);
    globeLines.group.rotation.y = globeSpin;
    netLines.group.rotation.y = netSpin;
    plannedLines.group.rotation.y = netSpin;
    pUniforms.uTime.value = time;
    starUniforms.uTime.value = time;
    stars.rotation.y = window.scrollY * 0.00008 + time * 0.004;

    const lineO = Math.min(1, stageO * 1.1);
    globeLines.update(time, Math.pow(globeWeight, 3) * lineO);
    const wFlow = Math.pow(weight(3), 3) * lineO;
    netLines.update(time, wFlow);
    plannedLines.update(time, wFlow * 0.35);

    // Pointer glow, softer while dragging so the globe keeps its shape.
    const glowTarget = pointerActive ? (drag.active ? 0.25 : 1) : 0;
    mouseStrength += (glowTarget - mouseStrength) * (1 - Math.exp(-dt * 4));
    pUniforms.uMouseStrength.value = mouseStrength;
    if (pointerActive) {
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, hit)) pUniforms.uMouse.value.copy(hit);
    }

    // Camera drifts a little with the pointer.
    camera.position.x = lerp(camera.position.x, smoothNdc.x * 0.25, 0.1);
    camera.position.y = lerp(camera.position.y, smoothNdc.y * 0.15, 0.1);
    camera.lookAt(0, 0, 0);

    stage.updateMatrixWorld();
    renderer.render(scene, camera);

    // Grab cursor when the pointer is over the globe.
    const canGrab = pointerActive && !drag.active && overGlobe(pointer.x, pointer.y);
    rootCls.toggle('globe-hover', canGrab);

    // Labels follow their 3D anchor. They only show while the shape is up front,
    // not when it is dimmed behind a full-width section like Skills.
    if (labels.length) {
      const spins = [0, 0, globeSpin, netSpin];
      const labelsOn = mobile ? 0 : THREE.MathUtils.smoothstep(stageO, 0.45, 0.7);
      camera.getWorldPosition(camPos);
      labels.forEach((lb) => {
        lb.w = Math.pow(weight(lb.shape), 4) * labelsOn;
        if (lb.w < 0.01) return;
        tmp.copy(lb.local).applyAxisAngle(UP, spins[lb.shape]).applyMatrix4(stage.matrixWorld);
        lb.face = 1;
        if (lb.facing) {
          tmpN.copy(lb.local).applyAxisAngle(UP, spins[lb.shape]).transformDirection(stage.matrixWorld);
          lb.face = THREE.MathUtils.smoothstep(tmpN.dot(camPos.clone().sub(tmp).normalize()), 0.15, 0.45);
        }
        tmp.project(camera);
        lb.sx = ((tmp.x + 1) / 2) * W;
        lb.sy = ((1 - tmp.y) / 2) * H;
      });

      // Hovering near a region dot always shows its name, even where names crowd.
      hoverRegion = null;
      if (pointerActive && globeWeight > 0.6) {
        let best = 22;
        regionLabels.forEach((lb) => {
          if (lb.w < 0.01 || lb.face < 0.5) return;
          const d = Math.hypot(lb.sx - pointer.x, lb.sy - pointer.y);
          if (d < best) { best = d; hoverRegion = lb; }
        });
      }

      // Every region is named, but where they crowd (Europe, East Asia) a name only
      // shows if it doesn't collide with one already placed. Priority: the hovered
      // region, then Ohio and Sao Paulo, then whichever faces the camera most.
      const placed = [];
      const culled = new Set();
      regionLabels
        .filter((lb) => lb.w >= 0.01 && lb.face > 0.05)
        .sort((a, b) => (b === hoverRegion) - (a === hoverRegion) || b.region.fixed - a.region.fixed || b.face - a.face)
        .forEach((lb) => {
          if (!lb.bw) lb.bw = lb.el.offsetWidth;
          // Names sit right of their dot, or flip to the left when they would run off screen.
          lb.flip = lb.sx + 12 + lb.bw > W - 12;
          const box = lb.flip
            ? { x0: lb.sx - 12 - lb.bw, x1: lb.sx - 8, y0: lb.sy - 9, y1: lb.sy + 9 }
            : { x0: lb.sx + 8, x1: lb.sx + 12 + lb.bw, y0: lb.sy - 9, y1: lb.sy + 9 };
          const hitsOther = placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0);
          if (hitsOther && lb !== hoverRegion) culled.add(lb);
          else placed.push(box);
        });

      labels.forEach((lb) => {
        let op = lb.w * lb.face;
        if (culled.has(lb)) op = 0;
        if (op > 0.01) lb.el.style.transform = `translate3d(${lb.sx}px, ${lb.sy}px, 0)`;
        lb.el.style.opacity = op.toFixed(3);
        lb.el.style.visibility = op > 0.01 ? 'visible' : 'hidden';
        lb.el.classList.toggle('is-hovered', lb === hoverRegion);
        if (lb.region) lb.el.classList.toggle('is-flipped', !!lb.flip);
      });
    }

    // Caption names what is on screen.
    const ci = Math.round(sv);
    if (caption && ci !== captionIndex) {
      captionIndex = ci;
      caption.classList.remove('is-shown');
      clearTimeout(caption._t);
      caption._t = setTimeout(() => {
        caption.textContent = STAGES[ci].caption;
        if (STAGES[ci].caption) caption.classList.add('is-shown');
      }, reduceMotion ? 0 : 180);
    }
  }

  resize();
  sv = reduceMotion ? Math.round(stageFromScroll(window.scrollY)) : stageFromScroll(window.scrollY);
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
    rootCls.add('scene-ready');
  });
}

main();
