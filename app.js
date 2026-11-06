// ============================================================
// app.js — Code Stroke
// Timeline-anchored bedside flow: LKW clock drives the nav.
// Screens: hub · timing · indications · contraindications ·
//          NIHSS (one item per page, + patient cards) · syndrome · CT/CTA ·
//          decision · consent
// Clinical content lives in data.js; this file is UI + state only.
// ============================================================

'use strict';

const ORDER = ['1a', '1b', '1c', '2', '3', '4', '5a', '5b', '6a', '6b', '7', '8', '9', '10', '11'];

const STEP_TITLES = {
  timing: 'TIMING',
  history: 'HISTORY',
  indications: 'TNK INDICATIONS',
  contra: 'CONTRAINDICATIONS',
  nihss: 'NIHSS',
  syndrome: 'SYNDROME',
  ct: 'CT / CTA',
  decision: 'DECISION',
  consent: 'CONSENT & TNK',
  management: 'MANAGEMENT',
};

// Reconciled CSBPR Box 5B + local protocol wording (see chats/chat1.md).
const CONTRA = [
  { header: 'ABSOLUTE — EITHER ONE EXCLUDES TNK', tag: 'CSBPR BOX 5B', color: 'acc', items: [
    { id: 'a1', label: 'Active hemorrhage at a non-compressible site — or any condition increasing risk of major hemorrhage', detail: 'Not including menses or minor superficial bleeding. If in doubt, weigh risk vs benefit.' },
    { id: 'a2', label: 'Any intracranial hemorrhage — or brain parenchyma neoplasm — on imaging', detail: 'Any hemorrhage on CT or MRI is an absolute contraindication to TNK.' },
  ] },
  { header: 'RELATIVE · HISTORICAL', tag: 'CLINICAL JUDGMENT', items: [
    { id: 'hich', label: 'History of intracranial hemorrhage', detail: 'Prior ICH significantly increases re-bleeding risk. Discuss risk:benefit with telestroke.' },
    { id: 'trauma', label: 'Ischemic stroke, STEMI, serious head or spinal trauma — past 3 months', detail: 'Risk varies with severity. Discuss with telestroke.' },
    { id: 'surg', label: 'Major surgery (cardiac, thoracic, abdominal, orthopedic) — past 14 days', detail: 'Risk varies according to the procedure.' },
    { id: 'gigu', label: 'GI or urinary tract hemorrhage — past 21 days', detail: 'Recent GI/GU bleeding increases re-bleeding risk.' },
    { id: 'art', label: 'Arterial puncture, non-compressible site — past 7 days', detail: 'E.g. subclavian or femoral arterial line — hematoma risk.' },
  ] },
  { header: 'RELATIVE · CLINICAL', items: [
    { id: 'sah', label: 'Symptoms suggestive of subarachnoid hemorrhage', detail: 'Thunderclap headache, meningism — image and reconsider diagnosis.' },
    { id: 'mimic', label: 'Symptoms from a non-ischemic condition — seizure with Todd’s paralysis, severe hypo/hyperglycemia', detail: 'Seizure itself is NOT a contraindication to reperfusion (CSBPR 5.5) — the concern is a mimic. If strong evidence of ischemic stroke, proceed.' },
    { id: 'htn', label: 'Refractory hypertension — <185/110 cannot be achieved to initiate thrombolysis', detail: 'Labetalol 10 mg IV, hydralazine 10 mg IV, or nicardipine 5 mg/h. If target cannot be achieved and maintained, TNK is not safe.' },
    { id: 'dissect', label: 'Clinical picture suggestive of arterial dissection or infective endocarditis', detail: 'Both raise hemorrhage/embolic concerns — stroke expert consult.' },
    { id: 'doac', label: 'Currently prescribed and taking a DOAC', detail: 'With DOAC level testing + reversal agents, thrombolysis may be considered with hematology. Otherwise direct EVT if eligible. Record time of last dose.' },
  ] },
  { header: 'RELATIVE · LABORATORY', items: [
    { id: 'gluc', label: 'Glucose <2.7 or >22.2 mmol/L — likely metabolic mimic', detail: 'Correct and reassess; if deficits persist, may proceed.' },
    { id: 'plt', label: 'Platelets <100,000 /mm³', detail: 'Higher likelihood of serious bleeding.' },
    { id: 'inr', label: 'INR >1.7', detail: 'Coagulopathy from warfarin or other cause — discuss with telestroke.' },
  ] },
];

const DISABLING_CRITERIA = [
  'Complete hemianopsia (≥2 on NIHSS item 3) or severe aphasia (≥2 on item 9)',
  'Visual or sensory extinction (≥1 on item 11)',
  'Any weakness limiting sustained effort against gravity (≥2 on item 5 or 6)',
  'Any deficits leading to a total NIHSS >5',
  'Any remaining deficit considered potentially disabling by the patient and treating practitioner — clinical judgment required',
];

const VESSELS = ['ICA-T', 'M1', 'M2', 'ACA/A1', 'A2', 'P1', 'P2', 'Basilar'];

// ── State ────────────────────────────────────────────────────
// Cases live in a list so multiple patients can run in parallel; the
// active case's fields are flattened onto S while it's open.
const STORAGE_KEY = 'codeStroke.cases.v1';
const LEGACY_KEY = 'codeStroke.case.v1';
const MAX_CASES = 30;

function defaultLkw() {
  // Seed with the current time (clock reads 0:00) — the first act of a new
  // case is documenting the real last-known-well time on the Timing screen.
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function blankCase() {
  return {
    label: '',
    lkw: defaultLkw(),
    onset: 'yes',
    history: {
      deficit: '',
      baselineMrs: '',
      glucose: '',
      sbp: '',
      dbp: '',
      anticoag: '',
      anticoagName: '',
      anticoagLastDose: '',
      seizure: '',
      notes: '',
    },
    contra: {},
    contraOpen: {},
    nihss: {},
    nihssExternal: '',
    nihssTeaching: false,
    syndromeReviewed: false,
    idx: 0,
    ct: null,
    aspects: '',
    lvo: null,
    vessel: null,
    collat: null,
    weight: '75',
    consentWith: null,
    tnk: null,
    tnkTime: '',
    management: {
      npo: false,
      strokeUnit: false,
      rhythm: false,
      postTnkImaging: false,
      antithrombotic: false,
      rehab: false,
    },
    managementDone: false,
  };
}

const CASE_FIELDS = Object.keys(blankCase());
let CASES = [];

const S = Object.assign({ screen: 'home', theme: 'light', folds: {}, caseId: null, card: null, cardRot: false }, blankCase());

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: S.theme, cases: CASES }));
  } catch (e) { /* private mode / quota — the app still works, it just won't persist */ }
}

function save() {
  // Copy the active case's fields from S back into its list entry.
  const entry = CASES.find(c => c.id === S.caseId);
  if (entry) for (const k of CASE_FIELDS) entry[k] = S[k];
  persist();
}

function sanitizeCase(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const shape = blankCase();
  const out = Object.assign({}, shape);
  for (const k of CASE_FIELDS) {
    const v = raw[k];
    if (v === undefined) continue;
    const wantsObject = shape[k] !== null && typeof shape[k] === 'object';
    const isObject = v !== null && typeof v === 'object' && !Array.isArray(v);
    if (wantsObject !== isObject) continue; // shape drifted — keep the default
    out[k] = v;
  }
  out.id = typeof raw.id === 'string' ? raw.id : 'c' + Date.now() + Math.random().toString(36).slice(2, 7);
  out.createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
  if (typeof out.idx !== 'number' || out.idx < 0 || out.idx > 14) out.idx = 0;
  return out;
}

function load() {
  // The app always opens on the home screen with the case list.
  S.screen = 'home';
  let raw = null, legacy = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    legacy = localStorage.getItem(LEGACY_KEY);
  } catch (e) { return; }
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (saved.theme === 'dark') S.theme = 'dark';
        if (Array.isArray(saved.cases)) CASES = saved.cases.map(sanitizeCase).filter(Boolean);
      }
    } catch (e) { /* corrupted list — start empty */ }
  }
  if (legacy) {
    // Migrate the old single-case store into the list once.
    try {
      const one = sanitizeCase(JSON.parse(legacy));
      if (one && !CASES.length) { CASES.push(one); persist(); }
    } catch (e) { /* ignore */ }
    try { localStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
  }
}

function openCase(id) {
  const entry = CASES.find(c => c.id === id);
  if (!entry) return;
  for (const k of CASE_FIELDS) S[k] = entry[k];
  S.caseId = id;
  S.folds = {};
}

function newCase() {
  // A fresh case starts on Timing with LKW seeded to now.
  const entry = Object.assign(blankCase(), {
    id: 'c' + Date.now() + Math.random().toString(36).slice(2, 7),
    createdAt: Date.now(),
  });
  CASES.unshift(entry);
  if (CASES.length > MAX_CASES) CASES.length = MAX_CASES;
  openCase(entry.id);
  S.screen = 'timing';
  persist();
}

function resetCase() {
  // RESET clears the active case's workup in place, keeping its identity
  // (id, created time, label) and the entered weight.
  const { label, weight } = S;
  for (const k of CASE_FIELDS) S[k] = blankCase()[k];
  S.label = label;
  S.weight = weight;
  S.folds = {};
  S.screen = 'timing';
  save();
}

function deleteCase(id) {
  CASES = CASES.filter(c => c.id !== id);
  if (S.caseId === id) S.caseId = null;
  persist();
}

// ── Helpers ──────────────────────────────────────────────────
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setPath(path, value) {
  const parts = String(path || '').split('.');
  let obj = S;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;
}

function elapsedMinFor(lkwStr) {
  const parts = String(lkwStr || '').split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  const now = new Date();
  const lkw = new Date();
  lkw.setHours(h, m, 0, 0);
  let d = Math.round((now - lkw) / 60000);
  if (d < 0) d += 1440;
  return d;
}

function elapsedMin() { return elapsedMinFor(S.lkw); }

function fmtDate(ts) {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ' · ' +
    String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// Home-list summary of a stored case: status word + tone for the chip.
function caseStatus(c) {
  const absYes = CONTRA[0].items.some(it => c.contra[it.id] === 'yes');
  const relYes = CONTRA.slice(1).flatMap(g => g.items).filter(it => c.contra[it.id] === 'yes').length;
  if (c.tnk === 'yes') return { word: 'TNK GIVEN', tone: 'ok' };
  if (c.tnk === 'no') return { word: 'NO TNK', tone: 'dim' };
  if (absYes || c.ct === 'hem') return { word: 'CONTRAINDICATED', tone: 'acc' };
  if (relYes) return { word: relYes + ' FLAG' + (relYes > 1 ? 'S' : ''), tone: 'warn' };
  return { word: 'IN PROGRESS', tone: 'dim' };
}

function fmt(min) {
  return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
}

function builtInTotal() {
  return ORDER.reduce((t, id) => t + (typeof S.nihss[id] === 'number' ? S.nihss[id] : 0), 0);
}

function externalNihss() {
  if (S.nihssExternal === '' || S.nihssExternal === null || S.nihssExternal === undefined) return null;
  const n = Number(S.nihssExternal);
  return Number.isFinite(n) && n >= 0 && n <= 42 ? n : null;
}

function total() {
  const external = externalNihss();
  return external !== null ? external : builtInTotal();
}

function scoredCount() {
  return ORDER.filter(id => S.nihss[id] !== undefined).length;
}

// Recolor the legacy dark-theme diagrams to the app's tokens (works in light + dark).
const SVG_COLOR_MAP = {
  '#1a2e44': 'var(--pp)', '#0d1f2d': 'var(--pp)', '#060e16': 'var(--pp)', '#0d1420': 'var(--pp)',
  '#4fc3f7': 'var(--ink)', '#fff': 'var(--ink)', '#ffffff': 'var(--ink)', '#aaa': 'var(--dim)',
  '#ffd54f': 'var(--warn)', '#f9a825': 'var(--warn)',
  '#ef5350': 'var(--acc)', '#ef9a9a': 'var(--acc)', '#e040fb': 'var(--accT)',
  '#81c784': 'var(--ok)', '#4caf50': 'var(--ok)',
};

function themeSvg(svg) {
  let out = svg;
  for (const from of Object.keys(SVG_COLOR_MAP)) out = out.split(from).join(SVG_COLOR_MAP[from]);
  // strip colored emoji glyphs (they render as distracting system-colored icons)
  return out.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '');
}

// ── Icons ────────────────────────────────────────────────────
function chevRight(size, stroke, cls) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
    '" stroke-width="2.5"' + (cls ? ' class="' + cls + '"' : '') + '><path d="M9 18l6-6-6-6"></path></svg>';
}
function chevRightThin(size, cls) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
    (cls ? ' class="' + cls + '"' : '') + '><path d="M9 18l6-6-6-6"></path></svg>';
}
function arrowRight(size, stroke) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
    '" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>';
}
function chevDown(size) {
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>';
}
const ICON_BACK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"></path></svg>';
const ICON_SUN = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
const ICON_MOON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
const ICON_ROTATE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 13a8.5 8.5 0 1 1-2.5-7"></path><path d="M20 3v4h-4"></path></svg>';

// ── Derived case values ──────────────────────────────────────
function compute() {
  const min = elapsedMin() ?? 0;
  const builtInTot = builtInTotal();
  const external = externalNihss();
  const tot = external !== null ? external : builtInTot;
  const scored = scoredCount();
  const nihssReady = external !== null || scored === 15;

  const relYes = CONTRA.slice(1).flatMap(g => g.items).filter(it => S.contra[it.id] === 'yes');
  const absYes = CONTRA[0].items.some(it => S.contra[it.id] === 'yes');
  const aspects = S.aspects === '' ? null : Number(S.aspects);

  const sev = nihssReady && window.getNIHSSSeverity ? window.getNIHSSSeverity(tot) : { label: '—' };
  const dose = window.getTNKDose ? window.getTNKDose(parseFloat(S.weight)) : null;

  // AHA/ASA disabling criteria — item-level criteria come from the built-in
  // NIHSS if used; total NIHSS can also come from MDCalc.
  const g = id => (typeof S.nihss[id] === 'number' ? S.nihss[id] : 0);
  const motor = Math.max(g('5a'), g('5b'), g('6a'), g('6b'));
  const dis = [
    { met: g('3') >= 2, t: 'complete hemianopsia' },
    { met: g('9') >= 2, t: 'severe aphasia' },
    { met: g('11') >= 1, t: 'extinction' },
    { met: motor >= 2, t: 'anti-gravity weakness' },
    { met: nihssReady && tot > 5, t: 'NIHSS >5' },
  ].filter(d => d.met);

  const withinWindow = min <= 270;
  const ctClear = S.ct === 'clear';
  const aspectsOk = aspects === null || aspects >= 6;

  let verdict, vBadge, vBadgeBg, vColor;
  if (absYes || S.ct === 'hem') {
    verdict = 'No TNK'; vBadge = 'CONTRAINDICATED'; vBadgeBg = 'var(--acc)'; vColor = 'var(--ink)';
  } else if (!withinWindow) {
    verdict = 'Imaging selection'; vBadge = 'OUTSIDE 4.5 H'; vBadgeBg = '#7d7979'; vColor = 'var(--ink)';
  } else if (S.ct !== 'clear') {
    verdict = 'Awaiting CT'; vBadge = 'PENDING'; vBadgeBg = '#7d7979'; vColor = 'var(--dim)';
  } else if (!aspectsOk) {
    verdict = 'Consult — large core'; vBadge = 'ASPECTS <6'; vBadgeBg = 'var(--warn)'; vColor = 'var(--ink)';
  } else if (relYes.length) {
    verdict = 'Give TNK — judgment';
    vBadge = relYes.length + ' RELATIVE FLAG' + (relYes.length > 1 ? 'S' : '');
    vBadgeBg = 'var(--warn)'; vColor = 'var(--acc)';
  } else {
    verdict = 'Give TNK'; vBadge = 'ELIGIBLE'; vBadgeBg = 'var(--ok)'; vColor = 'var(--acc)';
  }

  const evtCandidate = S.lvo === 'yes' && min <= 1440 && (aspects === null || aspects >= 3);

  const decisionRows = [
    { k: withinWindow ? 'PASS' : 'FAIL', kColor: withinWindow ? 'var(--ok)' : 'var(--accT)',
      t: 'Window — ' + fmt(min) + ' since LKW' + (withinWindow ? ', <4:30' : ' — 4.5–9 h needs CTP/MRI selection') },
    { k: ctClear ? 'PASS' : (S.ct === 'hem' ? 'FAIL' : '—'),
      kColor: ctClear ? 'var(--ok)' : (S.ct === 'hem' ? 'var(--accT)' : 'var(--dim2)'),
      t: 'CT ' + (ctClear ? 'clear' : S.ct === 'hem' ? 'hemorrhage' : 'pending') + (aspects !== null ? ' · ASPECTS ' + aspects : '') },
    { k: absYes ? 'FAIL' : 'PASS', kColor: absYes ? 'var(--accT)' : 'var(--ok)',
      t: absYes ? 'Absolute contraindication present' : 'No absolute contraindications' },
    { k: relYes.length ? 'FLAG' : 'PASS', kColor: relYes.length ? 'var(--warn)' : 'var(--ok)',
      t: relYes.length ? relYes.length + ' relative — clinical judgment' : 'No relative contraindications',
      sub: relYes.length ? relYes.map(r => r.label.split(' — ')[0]).join(' · ') : '' },
    { k: dis.length ? 'MET' : '—', kColor: dis.length ? 'var(--ok)' : 'var(--dim2)',
      t: 'Disabling deficit — ' + (dis.length ? dis.length + ' criterion' + (dis.length > 1 ? 's' : '') + ' met' : 'not auto-determined; use clinical judgment'),
      sub: dis.length ? dis.map(d => d.t).join(' · ') : '' },
  ];

  const matches = (scored > 3 && window.getSyndromeSuggestions ? window.getSyndromeSuggestions(S.nihss) : [])
    .filter(m => m.confidence >= 2).slice(0, 3);

  const relSub = absYes
    ? 'ABSOLUTE contraindication'
    : (relYes.length ? relYes.length + ' relative flag' + (relYes.length > 1 ? 's' : '') : 'none flagged');

  const h = S.history || {};
  const historyDone = !!(h.deficit || h.baselineMrs !== '' || h.glucose || h.sbp || h.anticoag);
  const historySub = [
    h.baselineMrs !== '' ? 'mRS ' + h.baselineMrs : null,
    h.glucose ? 'glucose ' + h.glucose : null,
    h.sbp ? 'BP ' + h.sbp + '/' + (h.dbp || '?') : null,
    h.anticoag ? h.anticoag : null,
  ].filter(Boolean).join(' · ') || 'focused stroke history';

  const steps = [
    { id: 'timing', name: 'Timing',
      sub: (S.onset === 'yes' ? 'Known onset' : S.onset === 'wakeup' ? 'Wake-up stroke' : 'Unknown onset') + ' · LKW ' + S.lkw,
      done: true },
    { id: 'history', name: 'History + baseline', sub: historySub, done: historyDone },
    { id: 'contra', name: 'Contraindications', sub: relSub, done: Object.keys(S.contra).length > 0 },
    { id: 'nihss', name: 'NIHSS',
      sub: external !== null ? 'MDCalc ' + external + ' pts' :
        scored === 0 ? 'MDCalc or teaching mode' :
        scored < 15 ? builtInTot + ' pts · item ' + (S.idx + 1) + ' of 15' : builtInTot + ' pts · ' + sev.label,
      done: nihssReady },
    { id: 'syndrome', name: 'Localization / syndrome', sub: matches.length ? matches[0].name : 'clinical pattern + reference', done: !!S.syndromeReviewed },
    { id: 'ct', name: 'CT / CTA',
      sub: S.ct
        ? ('CT ' + S.ct + (aspects !== null ? ' · ASPECTS ' + aspects : '') +
           (S.lvo === 'yes' ? ' · LVO ' + (S.vessel || '') : S.lvo === 'no' ? ' · no LVO' : ''))
        : 'order on arrival',
      done: !!S.ct },
    { id: 'decision', name: 'Decision — TNK / EVT', sub: S.ct ? verdict : 'DTN target ≤30 min', done: S.tnk !== null },
    { id: 'consent', name: 'Consent & TNK',
      sub: S.tnk === 'yes' ? 'TNK given ' + (S.tnkTime || '') : S.tnk === 'no' ? 'not given' : '',
      done: S.tnk !== null },
    { id: 'management', name: 'Acute management',
      sub: S.managementDone ? 'acute plan complete' : 'post-reperfusion / stroke unit care',
      done: !!S.managementDone },
  ];

  return {
    min, tot, builtInTot, externalNihss: external, nihssReady, scored, sev, dose, aspects, relYes, absYes, dis,
    withinWindow, ctClear, verdict, vBadge, vBadgeBg, vColor,
    evtCandidate, decisionRows, matches, steps,
  };
}

// ── Fragments ────────────────────────────────────────────────
function foldOpen(id) { return S.folds[id] ? ' open' : ''; }

function screenHeader(c) {
  const showBadge = c.nihssReady && ['nihss', 'syndrome', 'ct', 'decision', 'consent', 'management'].includes(S.screen);
  const badgeTotal = (S.screen === 'nihss' && S.nihssTeaching) ? c.builtInTot : c.tot;
  // Browsing the indications reference from the welcome screen goes back
  // there; everywhere else, back means the timeline hub.
  const backTo = (S.screen === 'indications' && S.prev === 'home') ? 'home' : 'hub';
  return '' +
    '<div class="sc-bar">' +
      '<button class="back-btn" data-act="go" data-arg="' + backTo + '" aria-label="Back">' + ICON_BACK + '</button>' +
      '<span class="sc-title">' + esc(STEP_TITLES[S.screen] || '') + '</span>' +
      (showBadge ? '<span class="nihss-badge">NIHSS ' + badgeTotal + '</span>' : '') +
      '<span class="clk-chip">' + esc(fmt(c.min)) + '</span>' +
    '</div>';
}

function footerPrimary(target, label, big) {
  return '<div class="footer">' +
    '<button class="btn-primary' + (big ? ' btn-primary--lg' : '') + '" data-act="go" data-arg="' + target + '">' +
      esc(label) + arrowRight(18, '#fff') +
    '</button></div>';
}

function footerDark(target, label, large) {
  return '<div class="footer">' +
    '<button class="btn-dark' + (large ? ' btn-dark--lg' : '') + '" data-act="go" data-arg="' + target + '">' +
      esc(label) + arrowRight(18, 'currentColor') +
    '</button></div>';
}

function segRow(items, current, act, extraClass) {
  return '<div class="seg' + (extraClass ? ' ' + extraClass : '') + '">' +
    items.map(o =>
      '<button class="seg-btn" data-act="' + act + '" data-arg="' + esc(o.v) + '" aria-pressed="' + (current === o.v) + '">' +
        esc(o.label) + '</button>').join('') +
    '</div>';
}

// ── Screens ──────────────────────────────────────────────────
function viewHome() {
  const rows = CASES.map(cs => {
    const min = elapsedMinFor(cs.lkw) ?? 0;
    const scored = ORDER.filter(id => cs.nihss[id] !== undefined).length;
    const ext = cs.nihssExternal === '' ? null : Number(cs.nihssExternal);
    const hasExternal = Number.isFinite(ext) && ext >= 0 && ext <= 42;
    const tot = hasExternal ? ext : ORDER.reduce((t, id) => t + (typeof cs.nihss[id] === 'number' ? cs.nihss[id] : 0), 0);
    const hasNihss = hasExternal || scored > 0;
    const st = caseStatus(cs);
    const meta = [
      'LKW ' + cs.lkw,
      fmt(min) + ' elapsed',
      hasNihss ? 'NIHSS ' + tot : null,
      cs.tnk === 'yes' && cs.tnkTime ? 'TNK ' + cs.tnkTime : null,
    ].filter(Boolean).join(' · ');
    return '' +
      '<div class="case-row">' +
        '<button class="case-open" data-act="open-case" data-arg="' + esc(cs.id) + '">' +
          '<span class="tl-label">' +
            '<span class="case-top">' +
              '<span class="case-name">' + esc(cs.label || 'Unlabelled patient') + '</span>' +
              '<span class="case-chip case-chip--' + st.tone + '">' + esc(st.word) + '</span>' +
            '</span>' +
            '<span class="tl-sub">' + esc(fmtDate(cs.createdAt) + ' — ' + meta) + '</span>' +
          '</span>' +
        '</button>' +
        '<button class="case-del" data-act="del-case" data-arg="' + esc(cs.id) + '" aria-label="Delete case">&#x2715;</button>' +
      '</div>';
  }).join('');

  return '' +
    '<div class="hub-bar">' +
      '<span class="brand">CODE STROKE</span>' +
      '<div class="hub-actions">' +
        '<button class="icon-btn" data-act="toggleTheme" aria-label="Toggle dark mode">' +
          (S.theme === 'dark' ? ICON_SUN : ICON_MOON) +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="body body--welcome">' +
      '<div class="wel-hero">' +
        '<div class="wel-rule"></div>' +
        '<h1 class="wel-title">Code<br>Stroke</h1>' +
        '<div class="wel-sub">Bedside thrombolysis pathway — last known well to TNK / EVT decision. CSBPR 2022/2025.</div>' +
      '</div>' +
      '<div class="eyebrow eyebrow--section">PATIENTS</div>' +
      (CASES.length
        ? '<div class="case-list">' + rows + '</div>'
        : '<div class="case-empty">No cases yet. Tap "New code stroke" to begin.</div>') +
      '<div class="eyebrow eyebrow--section">REFERENCE</div>' +
      '<button class="ref-row ref-row--flat" data-act="go" data-arg="indications">TNK indications' + chevRightThin(16) + '</button>' +
      '<div class="wel-disclaimer">This tool does not replace clinical judgement.</div>' +
    '</div>' +
    '<div class="footer footer--hub">' +
      '<button class="btn-primary btn-primary--lg" data-act="new-case">New code stroke' + arrowRight(20, '#fff') + '</button>' +
    '</div>';
}

function viewHub(c) {
  const currentIdx = c.steps.findIndex(st => !st.done);
  const activeIdx = currentIdx === -1 ? c.steps.length - 1 : currentIdx;
  const resumeIdx = currentIdx === -1 ? c.steps.length - 1 : currentIdx;
  const barPct = Math.min(100, (c.min / 1440) * 100).toFixed(1) + '%';

  const rows = c.steps.map((st, i) => {
    const current = i === activeIdx;
    const dotSize = current ? '14px' : '12px';
    const dotBg = current ? 'var(--acc)' : st.done ? 'var(--ink)' : 'transparent';
    const dotBorder = (st.done || current) ? 'none' : '2px solid var(--dim2)';
    const nameColor = current ? 'var(--accT)' : st.done ? 'var(--ink)' : 'var(--dim2)';
    return '' +
      '<div class="tl-rail">' +
        '<div class="tl-dot" style="width:' + dotSize + ';height:' + dotSize + ';background:' + dotBg + ';border:' + dotBorder + '"></div>' +
        '<div class="tl-line"></div>' +
      '</div>' +
      '<button class="tl-btn" data-act="go" data-arg="' + st.id + '">' +
        '<span class="tl-label">' +
          '<span class="tl-name" style="color:' + nameColor + '">' + esc(st.name) + '</span>' +
          (st.sub ? '<span class="tl-sub">' + esc(st.sub) + '</span>' : '') +
        '</span>' +
        chevRight(18, 'currentColor', 'chev') +
      '</button>';
  }).join('');

  return '' +
    '<div class="hub-bar">' +
      '<button class="back-btn back-btn--hub" data-act="go" data-arg="home" aria-label="All patients">' + ICON_BACK + '</button>' +
      '<span class="brand">CODE STROKE</span>' +
      '<div class="hub-actions">' +
        (S.label ? '<span class="pt-chip">' + esc(S.label) + '</span>' : '') +
        '<button class="icon-btn" data-act="toggleTheme" aria-label="Toggle dark mode">' +
          (S.theme === 'dark' ? ICON_SUN : ICON_MOON) +
        '</button>' +
        '<button class="reset-btn" data-act="reset">RESET</button>' +
      '</div>' +
    '</div>' +
    '<div class="clock-block">' +
      '<div class="eyebrow">SINCE LKW ' + esc(S.lkw) + '</div>' +
      '<div class="clock-big">' + esc(fmt(c.min)) + '</div>' +
      '<div class="clock-meta">' +
        (c.min <= 270
          ? '<span>TNK window closes in <strong>' + esc(c.min < 270 ? fmt(270 - c.min) : '0:00') + '</strong></span>'
          : '<span class="shut">Standard TNK window closed — imaging-based selection 4.5–9 h</span>') +
        '<span>EVT ≤24 h</span>' +
      '</div>' +
      '<div class="bar-wrap">' +
        '<div class="bar">' +
          '<div class="bar-fill" style="width:' + barPct + '"></div>' +
          '<div class="bar-tick" style="left:18.75%"></div>' +
          '<div class="bar-tick" style="left:37.5%"></div>' +
        '</div>' +
        '<div class="bar-labels"><span>0</span><span class="t45">4.5h TNK</span><span class="t9">9h</span><span class="t24">24h EVT</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="tl-scroll"><div class="tl">' + rows + '</div></div>' +
    '<div class="ref-row-wrap">' +
      '<button class="ref-row" data-act="go" data-arg="indications">TNK indications — reference' + chevRightThin(16) + '</button>' +
    '</div>' +
    '<div class="footer footer--hub">' +
      '<button class="btn-primary btn-primary--lg" data-act="go" data-arg="' + c.steps[resumeIdx].id + '">' +
        esc('Resume — ' + c.steps[resumeIdx].name) + arrowRight(20, '#fff') +
      '</button>' +
    '</div>';
}

function viewTiming(c) {
  const opts = [
    { v: 'yes', label: 'Known onset — witnessed', sub: 'Clock runs from last known well' },
    { v: 'wakeup', label: 'Wake-up stroke', sub: 'Clock from bedtime / last seen normal — NOT waking. Imaging may still qualify.' },
    { v: 'no', label: 'Unknown onset', sub: 'Clock from last time seen at baseline. Imaging may still qualify.' },
  ];
  const open = c.min <= 270;
  const winHead = open
    ? 'TNK window open — ' + fmt(c.min) + ' from LKW'
    : c.min <= 540 ? 'Standard window closed — ' + fmt(c.min) : 'Outside standard windows — ' + fmt(c.min);
  const winSub = open
    ? 'Closes in ' + fmt(270 - c.min) + '. EVT window to 24 h.'
    : c.min <= 540
      ? '4.5–9 h: tissue-based selection with stroke expert (CTP / MRI). EVT ≤24 h — do not delay EVT decisions.'
      : 'EVT may remain possible ≤24 h with LVO + favourable CTP/collaterals (DAWN/DEFUSE-3).';

  return screenHeader(c) +
    '<div class="body body--timing">' +
      '<div class="eyebrow">PATIENT</div>' +
      '<input class="input-label" type="text" maxlength="24" placeholder="Initials · room (optional)" value="' + esc(S.label) + '" data-field="label" data-focus="label" aria-label="Patient label">' +
      '<div class="eyebrow" style="margin-top:18px">ONSET</div>' +
      '<h2 class="screen-h2">When was the patient last normal?</h2>' +
      '<div class="stack">' +
        opts.map(o =>
          '<button class="opt-btn" data-act="onset" data-arg="' + o.v + '" aria-pressed="' + (S.onset === o.v) + '">' +
            esc(o.label) + '<span class="opt-sub">' + esc(o.sub) + '</span>' +
          '</button>').join('') +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label" for="lkw-input">' +
          (S.onset === 'wakeup' ? 'LKW — BEDTIME / LAST SEEN NORMAL' : 'LAST KNOWN WELL (LKW)') +
        '</label>' +
        '<input id="lkw-input" class="input-lg" type="time" value="' + esc(S.lkw) + '" data-field="lkw" data-focus="lkw">' +
      '</div>' +
      '<div class="window-card' + (open ? '' : ' window-card--shut') + '">' +
        '<div class="window-eyebrow">WINDOW</div>' +
        '<div class="window-head">' + esc(winHead) + '</div>' +
        '<div class="window-sub">' + esc(winSub) + '</div>' +
      '</div>' +
      (S.onset !== 'yes'
        ? '<div class="note-card">' +
            '<div class="note-title">Imaging can bypass the LKW clock</div>' +
            '<div class="note-text">Document LKW as onset, then let imaging decide eligibility:</div>' +
            '<div class="note-bullet"><span class="mark">›</span><span><strong>TNK</strong> — if treatable within 4.5 h of symptom recognition + salvageable tissue: DWI-FLAIR mismatch (WAKE-UP) or CT/MR perfusion mismatch (EXTEND)</span></div>' +
            '<div class="note-bullet"><span class="mark">›</span><span><strong>EVT</strong> — LKW ≤24 h with CTA-confirmed LVO + favourable CTP/collaterals (DAWN/DEFUSE-3)</span></div>' +
          '</div>'
        : '') +
      '<details class="fold-rule" data-fold="box5a"' + foldOpen('box5a') + '>' +
        '<summary>Window summary — CSBPR Box 5A' + chevDown(16) + '</summary>' +
        '<div class="fold-body">' +
          '&lt;4.5 h — TNK window open · 4.5–6 h — select patients, advanced imaging (CTP/MRI) · 6–9 h — stroke expert, tissue-based selection · &lt;24 h + LVO — EVT window · Wake-up/unknown onset: clock runs from LKW (bedtime / last seen normal); DWI-FLAIR or perfusion mismatch may allow TNK within 4.5 h of symptom recognition. Door-to-needle ≤30 min median.' +
        '</div>' +
      '</details>' +
    '</div>' +
    footerPrimary('history', 'Focused history');
}

function viewHistory(c) {
  const h = S.history || {};
  const anticoagOpts = [
    { v: 'none', label: 'None' },
    { v: 'warfarin', label: 'Warfarin' },
    { v: 'doac', label: 'DOAC' },
    { v: 'other', label: 'Other' },
  ];

  return screenHeader(c) +
    '<div class="body body--history">' +
      '<div class="eyebrow">PRESENTING DEFICIT</div>' +
      '<textarea class="input-textarea" rows="3" placeholder="Sudden aphasia + right face/arm weakness..." data-field="history.deficit" data-focus="history-deficit">' + esc(h.deficit) + '</textarea>' +

      '<div class="history-grid">' +
        '<div class="field">' +
          '<label class="field-label">PRE-STROKE mRS</label>' +
          '<select class="input-select" data-field="history.baselineMrs" data-focus="history-mrs">' +
            '<option value="">Select</option>' +
            [0,1,2,3,4,5].map(v => '<option value="' + v + '"' + (String(h.baselineMrs) === String(v) ? ' selected' : '') + '>' + v + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">GLUCOSE (mmol/L)</label>' +
          '<input class="input-compact" inputmode="decimal" type="number" step="0.1" min="0" value="' + esc(h.glucose) + '" data-field="history.glucose" data-focus="history-glucose">' +
        '</div>' +
      '</div>' +

      '<div class="eyebrow eyebrow--section">BLOOD PRESSURE</div>' +
      '<div class="bp-entry">' +
        '<input class="input-compact" inputmode="numeric" type="number" min="0" placeholder="SBP" value="' + esc(h.sbp) + '" data-field="history.sbp" data-focus="history-sbp">' +
        '<span class="bp-slash">/</span>' +
        '<input class="input-compact" inputmode="numeric" type="number" min="0" placeholder="DBP" value="' + esc(h.dbp) + '" data-field="history.dbp" data-focus="history-dbp">' +
        '<span class="bp-unit">mmHg</span>' +
      '</div>' +
      ((Number(h.sbp) >= 185 || Number(h.dbp) >= 110) && h.sbp
        ? '<div class="history-alert">Above thrombolysis BP threshold — lower BP and reassess before IV thrombolysis.</div>'
        : '') +

      '<div class="eyebrow eyebrow--section">ANTICOAGULATION</div>' +
      '<div class="seg seg--wrap">' +
        anticoagOpts.map(o => '<button class="seg-btn" data-act="history-anticoag" data-arg="' + o.v + '" aria-pressed="' + (h.anticoag === o.v) + '">' + o.label + '</button>').join('') +
      '</div>' +
      (h.anticoag && h.anticoag !== 'none'
        ? '<div class="history-grid history-grid--spaced">' +
            '<div class="field"><label class="field-label">DRUG / DOSE</label><input class="input-compact input-compact--full" type="text" placeholder="e.g. apixaban 5 mg BID" value="' + esc(h.anticoagName) + '" data-field="history.anticoagName" data-focus="history-drug"></div>' +
            '<div class="field"><label class="field-label">LAST DOSE</label><input class="input-compact input-compact--full" type="text" placeholder="e.g. 08:00 today" value="' + esc(h.anticoagLastDose) + '" data-field="history.anticoagLastDose" data-focus="history-dose"></div>' +
          '</div>'
        : '') +

      '<div class="eyebrow eyebrow--section">SEIZURE AT ONSET?</div>' +
      segRow([{ v: 'no', label: 'No' }, { v: 'yes', label: 'Yes' }, { v: 'unknown', label: 'Unknown' }], h.seizure, 'history-seizure') +
      (h.seizure === 'yes'
        ? '<div class="note-card"><div class="note-title">Seizure is not itself an exclusion</div><div class="note-text">The key question is whether the persistent deficit is from ischemic stroke versus a post-ictal mimic. Continue imaging and stroke assessment.</div></div>'
        : '') +

      '<div class="eyebrow eyebrow--section">OTHER TIME-SENSITIVE HISTORY</div>' +
      '<textarea class="input-textarea" rows="3" placeholder="Recent surgery/bleeding/trauma/stroke, pregnancy, endocarditis concern, baseline deficits..." data-field="history.notes" data-focus="history-notes">' + esc(h.notes) + '</textarea>' +
      '<div class="history-hint">The next screen is the formal thrombolysis contraindication checklist. Do not delay CT/CTA to complete non-essential history.</div>' +
    '</div>' +
    footerPrimary('contra', 'Contraindications');
}

function viewContra(c) {
  const groups = CONTRA.map(gr =>
    '<div class="grp-head">' +
      '<span class="grp-title' + (gr.color === 'acc' ? ' grp-title--acc' : '') + '">' + esc(gr.header) + '</span>' +
      (gr.tag ? '<span class="grp-tag">' + esc(gr.tag) + '</span>' : '') +
    '</div>' +
    '<div class="grp-list">' +
      gr.items.map(it => {
        const v = S.contra[it.id];
        const showDetail = !!S.contraOpen[it.id] || v === 'yes';
        return '<div class="ci-row">' +
          '<div class="ci-line">' +
            '<button class="ci-label" data-act="ci-detail" data-arg="' + it.id + '" aria-expanded="' + showDetail + '">' + esc(it.label) + '</button>' +
            '<span class="ci-btns">' +
              '<button class="ci-btn ci-btn--yes" data-act="ci" data-arg="' + it.id + ':yes" aria-pressed="' + (v === 'yes') + '">YES</button>' +
              '<button class="ci-btn ci-btn--no" data-act="ci" data-arg="' + it.id + ':no" aria-pressed="' + (v === 'no') + '">NO</button>' +
              '<button class="ci-btn ci-btn--un" data-act="ci" data-arg="' + it.id + ':un" aria-pressed="' + (v === 'un') + '" aria-label="Unknown">?</button>' +
            '</span>' +
          '</div>' +
          (showDetail ? '<div class="ci-detail">' + esc(it.detail) + '</div>' : '') +
        '</div>';
      }).join('') +
    '</div>').join('');

  const summary = c.absYes
    ? 'TNK excluded — absolute CI'
    : c.relYes.length
      ? c.relYes.length + ' relative flag' + (c.relYes.length > 1 ? 's' : '') + ' — judgment, not a stop'
      : 'Nothing flagged';
  const summaryClass = c.absYes ? ' contra-summary--abs' : c.relYes.length ? ' contra-summary--flag' : '';

  return screenHeader(c) +
    '<div class="body body--contra">' +
      '<div class="contra-banner' + (c.absYes ? ' contra-banner--abs' : '') + '">' +
        (c.absYes
          ? 'ABSOLUTE contraindication — TNK excluded. Continue: EVT may still be an option.'
          : 'Check glucose FIRST — hypoglycemia is the most common mimic. Tap any item for why it matters.') +
      '</div>' +
      groups +
    '</div>' +
    '<div class="footer footer--split">' +
      '<div class="contra-summary' + summaryClass + '">' + esc(summary) + '</div>' +
      '<button class="btn-dark-sm" data-act="go" data-arg="nihss">NIHSS' + arrowRight(18, 'currentColor') + '</button>' +
    '</div>';
}

function viewNihss(c) {
  if (!S.nihssTeaching) {
    return screenHeader(c) +
      '<div class="body body--nihss-choice">' +
        '<div class="mdcalc-card">' +
          '<div class="mdcalc-eyebrow">BEDSIDE MODE</div>' +
          '<div class="mdcalc-title">NIHSS in MDCalc</div>' +
          '<div class="mdcalc-sub">Use the calculator you already know, then enter the total here so the rest of this case carries the score forward.</div>' +
          '<a class="mdcalc-open" href="https://www.mdcalc.com/calc/715/nih-stroke-scale-score-nihss" target="_blank" rel="noopener">Open MDCalc NIHSS' + arrowRight(18, 'currentColor') + '</a>' +
        '</div>' +
        '<div class="field nihss-total-field">' +
          '<label class="field-label">NIHSS TOTAL FROM MDCALC</label>' +
          '<input class="input-num" type="number" inputmode="numeric" min="0" max="42" placeholder="0–42" value="' + esc(S.nihssExternal) + '" data-field="nihssExternal" data-focus="nihss-external" aria-label="NIHSS total from MDCalc">' +
        '</div>' +
        (c.externalNihss !== null
          ? '<div class="nihss-imported"><span>NIHSS ' + c.externalNihss + '</span><span>' + esc(c.sev.label) + '</span></div>'
          : '') +
        '<div class="nihss-mode-divider"><span>OR</span></div>' +
        '<button class="teaching-mode-btn" data-act="nihss-teaching">' +
          '<span><strong>Built-in NIHSS teaching mode</strong><small>Item-by-item examination instructions, scoring caveats and patient cards.</small></span>' +
          chevRightThin(18, 'chev') +
        '</button>' +
        (c.scored > 0
          ? '<div class="teaching-progress">Teaching mode progress: ' + c.scored + '/15 items · built-in total ' + c.builtInTot + '</div>'
          : '') +
        '<div class="nihss-note">A total score alone cannot localize the lesion. The next screen provides syndrome/localization reference; automatic pattern matching is available when the built-in item-level NIHSS is completed.</div>' +
      '</div>' +
      footerPrimary('syndrome', 'Localization & syndrome');
  }

  const tabs = ORDER.map((id, i) => {
    const cls = i === S.idx ? ' tab--current' : S.nihss[id] !== undefined ? ' tab--done' : '';
    return '<button class="tab' + cls + '" data-act="tab" data-arg="' + i + '" aria-label="NIHSS item ' + id + '"><span>' + id + '</span></button>';
  }).join('');

  const id = ORDER[S.idx];
  const it = (window.NIHSS_ITEMS || []).find(x => x.id === id) || { scores: [], examInstructions: [] };
  const val = S.nihss[id];
  const pitfalls = [].concat(it.caveats || [], it.functionalClues || []);

  const guide =
    '<details class="fold-card" data-fold="guide"' + foldOpen('guide') + '>' +
      '<summary>How to test &amp; interpret' + chevDown(16) + '</summary>' +
      '<div class="fold-body">' +
        '<div class="guide-h">PERFORM</div>' +
        (it.examInstructions || []).map(t => '<div class="guide-step"><span class="mark">›</span><span>' + esc(t) + '</span></div>').join('') +
        (it.svg ? '<div class="svg-box" aria-hidden="true">' + themeSvg(it.svg) + '</div>' : '') +
        (it.lookFor ? '<div class="guide-h guide-h--later">INTERPRET</div><div class="interpret">' + esc(it.lookFor) + '</div>' : '') +
        (pitfalls.length ? '<div class="guide-h guide-h--later">PITFALLS</div>' : '') +
        pitfalls.map(t => '<div class="pitfall"><span class="mark--warn">!</span><span>' + esc(t) + '</span></div>').join('') +
      '</div>' +
    '</details>';

  const cards = (window.NIHSS_CARDS || []).filter(k => k.item === id);
  const cardBtn = cards.length
    ? '<button class="card-btn" data-act="cards" data-arg="' + esc(cards[0].id) + '">' +
        '<span><span class="card-btn-l">SHOW TO PATIENT</span>' +
        '<span class="card-btn-t">' + esc(cards.map(k => k.tab).join(' · ')) + '</span></span>' +
        chevRightThin(18, 'chev') +
      '</button>'
    : '';

  const scores = (it.scores || []).map(sc =>
    '<button class="score-btn" data-act="score" data-arg="' + esc(sc.value) + '" aria-pressed="' + (val === sc.value) + '">' +
      '<span class="score-val">' + esc(sc.value) + '</span>' +
      '<span><span class="score-label">' + esc(sc.label) + '</span>' +
      '<span class="score-desc">' + esc(sc.description) + '</span></span>' +
    '</button>').join('');

  return screenHeader(c) +
    '<div class="teaching-topbar"><button data-act="nihss-teaching">‹ Use MDCalc instead</button><span>' + c.scored + '/15 scored</span></div>' +
    '<div class="tabs">' + tabs + '</div>' +
    '<div class="body body--nihss">' +
      '<div class="item">' +
        '<div class="item-head">' +
          '<div><div class="eyebrow">ITEM ' + (S.idx + 1) + ' OF 15</div>' +
          '<h3 class="item-name">' + esc(it.shortName || id) + '</h3></div>' +
          (val !== undefined ? '<span class="item-score">+' + esc(val) + '</span>' : '') +
        '</div>' +
        cardBtn +
        guide +
        (it.note ? '<div class="item-note">' + esc(it.note) + '</div>' : '') +
        '<div class="scores">' + scores + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="nihss-foot">' +
      '<div class="nf-total"><div class="nf-total-l">NIHSS</div><div class="nf-total-v">' + c.builtInTot + '</div></div>' +
      '<button class="nf-prev" data-act="nihss-prev">‹ ' + esc(S.idx === 0 ? 'Back' : ORDER[S.idx - 1]) + '</button>' +
      '<button class="nf-next" data-act="nihss-next">' +
        esc(S.idx < 14 ? 'Next — ' + ORDER[S.idx + 1] : 'Syndrome') + arrowRight(18, 'currentColor') +
      '</button>' +
    '</div>';
}

// Full-screen NIHSS stimuli for items 9 + 10. The sheet stays white in both
// themes — these are printed test materials the patient has to see and read.
function viewCards() {
  const cards = window.NIHSS_CARDS || [];
  const i = Math.max(0, cards.findIndex(k => k.id === S.card));
  const k = cards[i] || {};
  const prev = cards[i - 1];
  const next = cards[i + 1];
  const item = ORDER[S.idx];

  const tabs = cards.map(x =>
    '<button class="card-tab" data-act="card" data-arg="' + esc(x.id) + '" aria-pressed="' + (x.id === k.id) + '">' +
      '<span class="ct-item">' + esc(x.item) + '</span>' + esc(x.tab) +
    '</button>').join('');

  let sheet;
  if (k.image) {
    sheet = '<img class="card-img" src="' + esc(k.image) + '" alt="' + esc(k.alt || '') + '">' +
      (k.credit ? '<span class="card-credit">' + esc(k.credit) + '</span>' : '');
  } else if (k.lines) {
    sheet = '<div class="card-lines">' + k.lines.map(t => '<div class="card-line">' + esc(t) + '</div>').join('') + '</div>';
  } else {
    sheet = '<div class="card-words">' + (k.words || []).map(t => '<div class="card-word">' + esc(t) + '</div>').join('') + '</div>';
  }

  return '' +
    '<div class="sc-bar">' +
      '<button class="back-btn" data-act="cards-close" aria-label="Back to NIHSS item ' + esc(item) + '">' + ICON_BACK + '</button>' +
      '<span class="sc-title">SHOW TO PATIENT</span>' +
      '<button class="rot-btn" data-act="card-rot" aria-pressed="' + S.cardRot + '" aria-label="Rotate card">' + ICON_ROTATE + 'ROTATE</button>' +
    '</div>' +
    '<div class="card-tabs">' + tabs + '</div>' +
    '<div class="card-ask"><span class="card-ask-l">ASK</span>' + esc(k.ask || '') + '</div>' +
    '<div class="card-stage' + (S.cardRot ? ' card-stage--rot' : '') + '">' +
      '<div class="card-sheet">' + sheet + '</div>' +
    '</div>' +
    '<div class="card-foot">' +
      '<button class="nf-prev" data-act="card-step" data-arg="-1">‹ ' + esc(prev ? prev.tab : 'Item ' + item) + '</button>' +
      '<button class="nf-next" data-act="card-step" data-arg="1">' +
        esc(next ? 'Next — ' + next.tab : 'Score item ' + item) + arrowRight(18, 'currentColor') +
      '</button>' +
    '</div>';
}

function viewIndications(c) {
  const items = (window.TNK_INCLUSION || []).map((t, i) =>
    '<div class="ind-row"><span class="ind-n">' + (i + 1) + '</span><span class="ind-t">' + t + '</span></div>').join('');

  return screenHeader(c) +
    '<div class="body body--indications">' +
      '<div class="eyebrow">CSBPR · PATIENT SELECTION</div>' +
      '<h2 class="screen-h2 screen-h2--tight">Indications for TNK</h2>' +
      '<div class="stack">' + items + '</div>' +
      '<div class="ext-note">' + (window.EXTENDED_WINDOW_NOTE || '') + '</div>' +
      '<div class="dtn-note">' + esc(window.DOOR_TO_NEEDLE || '') + '</div>' +
      '<details class="fold-card fold-card--spaced" data-fold="disabling"' + foldOpen('disabling') + '>' +
        '<summary>What counts as a disabling deficit? (AHA/ASA)' + chevDown(16) + '</summary>' +
        '<div class="fold-body">' +
          DISABLING_CRITERIA.map(t => '<div class="dis-row"><span class="mark">›</span><span>' + esc(t) + '</span></div>').join('') +
        '</div>' +
      '</details>' +
    '</div>' +
    footerDark('contra', 'Contraindications');
}

function viewSyndrome(c) {
  const cards = c.matches.map((m, i) =>
    '<div class="syn-card' + (i === 0 ? ' syn-card--top' : '') + '">' +
      '<div class="syn-rank">' + (i === 0 ? 'MOST LIKELY' : 'ALSO CONSIDER') + '</div>' +
      '<div class="syn-name">' + esc(m.name) + '</div>' +
      '<div class="syn-sub">' + esc(m.subtitle) + ' · ' + esc(m.territory) + '</div>' +
      (m.lvoRisk ? '<div class="lvo-tag">LVO RISK — URGENT CTA</div>' : '') +
      '<div class="syn-feats">' +
        (m.features || []).map(f => '<div class="feat"><span class="mark">·</span><span>' + esc(f) + '</span></div>').join('') +
      '</div>' +
      '<div class="syn-img">Imaging: ' + esc(m.ctaExpect) + '</div>' +
    '</div>').join('');

  const quickIds = ['left_mca_m1','right_mca_m1','left_aca','right_aca','pca','bao','wallenberg','lacunar_pure_motor','lacunar_pure_sensory'];
  const quick = (window.STROKE_SYNDROMES || []).filter(x => quickIds.includes(x.id));
  const quickRows = quick.map(m =>
    '<details class="syndrome-ref">' +
      '<summary><span><strong>' + esc(m.name) + '</strong><small>' + esc(m.subtitle) + '</small></span>' + chevDown(16) + '</summary>' +
      '<div class="syndrome-ref-body">' +
        (m.features || []).map(f => '<div class="feat"><span class="mark">·</span><span>' + esc(f) + '</span></div>').join('') +
        '<div class="syn-img">Imaging: ' + esc(m.ctaExpect) + '</div>' +
      '</div>' +
    '</details>').join('');

  return screenHeader(c) +
    '<div class="body body--syndrome">' +
      '<div class="tot-card">' +
        '<div><div class="tot-eyebrow">NIHSS TOTAL</div><div class="tot-v">' + (c.nihssReady ? c.tot : '—') + '</div></div>' +
        '<div class="tot-r"><div class="tot-eyebrow">SEVERITY</div><div class="sev-v">' + esc(c.sev.label) + '</div></div>' +
      '</div>' +
      (c.dis.length
        ? '<div class="dis-card">' +
            '<div class="dis-title">Potentially disabling deficit</div>' +
            '<div class="dis-list">' + esc(c.dis.map(d => d.t).join(' · ')) + '</div>' +
          '</div>'
        : '') +
      '<div class="eyebrow eyebrow--section">LOCALIZATION</div>' +
      (c.matches.length
        ? '<div class="pattern-note">Automatic suggestions from the item-level NIHSS pattern:</div>' + cards
        : '<div class="no-match">MDCalc provides the total score but not the item pattern to this app. Localize from the examination: cortical signs (aphasia/neglect/gaze/field cut) → anterior circulation; crossed cranial nerve/body findings, severe vertigo/ataxia or disproportionate LOC → posterior circulation; pure motor/sensory patterns without cortical signs → lacunar until proven otherwise.</div>') +
      '<div class="eyebrow eyebrow--section">QUICK SYNDROME REFERENCE</div>' +
      '<div class="syndrome-ref-list">' + quickRows + '</div>' +
      '<div class="posterior-warning"><strong>Posterior circulation warning:</strong> a low NIHSS does not exclude a clinically important basilar/cerebellar stroke. CTA decisions should follow the syndrome and clinical deficit, not NIHSS alone.</div>' +
    '</div>' +
    '<div class="footer"><button class="btn-primary" data-act="syndrome-next">CT / CTA results' + arrowRight(18, '#fff') + '</button></div>';
}

function viewCt(c) {
  const aspectsMsg = c.aspects === null ? ''
    : c.aspects >= 6
      ? 'ASPECTS ' + c.aspects + ' — within range (≥6)'
      : 'ASPECTS ' + c.aspects + ' — large core: TNK relative CI; EVT may still benefit (3–5) — consult';

  return screenHeader(c) +
    '<div class="body body--ct">' +
      '<div class="eyebrow">CT HEAD — CLEAR OF HEMORRHAGE?</div>' +
      segRow([{ v: 'clear', label: 'Clear' }, { v: 'hem', label: 'Hemorrhage' }, { v: 'pending', label: 'Pending' }], S.ct, 'ct', 'seg--spaced') +
      (S.ct === 'hem'
        ? '<div class="hem-warn">HEMORRHAGE — TNK contraindicated. Assess EVT if warranted; neurosurgery / ICH pathway.</div>'
        : '') +
      '<div class="eyebrow eyebrow--ct-tight">ASPECTS (0–10) — ≥6 SUPPORTS TNK; 3–5 = MODERATE CORE, EVT MAY STILL BENEFIT</div>' +
      '<input class="input-num" type="number" min="0" max="10" placeholder="0–10" value="' + esc(S.aspects) + '" data-field="aspects" data-focus="aspects" aria-label="ASPECTS score">' +
      (aspectsMsg
        ? '<div class="aspects-msg' + (c.aspects >= 6 ? ' aspects-msg--ok' : '') + '">' + esc(aspectsMsg) + '</div>'
        : '') +
      '<div class="eyebrow eyebrow--ct">CTA — LARGE VESSEL OCCLUSION?</div>' +
      segRow([{ v: 'yes', label: 'Yes — LVO' }, { v: 'no', label: 'No LVO' }, { v: 'pending', label: 'CTA pending' }], S.lvo, 'lvo') +
      (S.lvo === 'yes'
        ? '<div class="eyebrow eyebrow--ct-sub">VESSEL</div>' +
          '<div class="vessel-wrap">' +
            VESSELS.map(v =>
              '<button class="vessel-btn" data-act="vessel" data-arg="' + esc(v) + '" aria-pressed="' + (S.vessel === v) + '">' + esc(v) + '</button>').join('') +
          '</div>' +
          (['M2', 'A2', 'P2'].includes(S.vessel)
            ? '<div class="mv-note">Medium-vessel occlusion (' + esc(S.vessel) + ') — EVT not uniformly supported by trials; decide with stroke expert + neurointerventionalist (CSBPR 5.4.1).</div>'
            : '') +
          '<div class="eyebrow eyebrow--ct-sub">COLLATERALS</div>' +
          segRow([{ v: 'good', label: 'Good' }, { v: 'moderate', label: 'Moderate' }, { v: 'poor', label: 'Poor' }], S.collat, 'collat')
        : '') +
    '</div>' +
    footerPrimary('decision', 'Decision — TNK / EVT');
}

function viewDecision(c) {
  const rows = c.decisionRows.map(r =>
    '<div class="d-row">' +
      '<div class="d-k" style="color:' + r.kColor + '">' + esc(r.k) + '</div>' +
      '<div class="d-t">' + esc(r.t) + (r.sub ? '<span class="d-sub">' + esc(r.sub) + '</span>' : '') + '</div>' +
    '</div>').join('');

  return screenHeader(c) +
    '<div class="body body--decision">' +
      '<div class="verdict">' +
        '<span class="v-badge" style="background:' + c.vBadgeBg + '">' + esc(c.vBadge) + '</span>' +
        '<div class="v-text" style="color:' + c.vColor + '">' + esc(c.verdict) + '</div>' +
        (c.dose
          ? '<div class="dose">TNK ' + c.dose + ' mg IV bolus · 0.25 mg/kg × ' + esc(S.weight) + ' kg · max 25 mg</div>'
          : '') +
        '<div class="bp-line">BP &lt;185/110 before, during, and for 24 h after TNK (CSBPR 4.3)</div>' +
        '<div class="weight-row">' +
          '<label class="weight-l" for="weight-input">WEIGHT</label>' +
          '<input id="weight-input" class="weight-in" type="number" min="30" max="200" value="' + esc(S.weight) + '" data-field="weight" data-focus="weight">' +
          '<span class="weight-u">kg</span>' +
        '</div>' +
      '</div>' +
      rows +
      (c.evtCandidate
        ? '<div class="evt">' +
            '<div class="evt-eyebrow">EVT CANDIDATE</div>' +
            '<div class="evt-head">' + esc((S.vessel || 'LVO') + ' occlusion') + '</div>' +
            '<div class="evt-sub">' +
              esc('Within 24 h · ASPECTS ' + (c.aspects !== null ? c.aspects : '?') + (S.collat ? ' · collaterals ' + S.collat : '') + '.') +
              ' Start TNK while the angio suite is prepared — do not wait to judge response.' +
            '</div>' +
            '<button class="evt-btn" data-act="noop">Call EVT centre + critical care transport' + arrowRight(18, 'currentColor') + '</button>' +
          '</div>'
        : '') +
      '<details class="fold-rule fold-rule--tap" data-fold="bp"' + foldOpen('bp') + '>' +
        '<summary>BP targets &amp; drug dosing' + chevDown(16) + '</summary>' +
        '<div class="fold-body fold-body--sm">Labetalol 10 mg IV over 1–2 min (repeat once, max 20 mg pre-TNK) · Hydralazine 10 mg IV (onset 5–15 min) · Nicardipine 5 mg/h IV, titrate, max 15 mg/h. Not eligible for TNK: permissive ≤220/120.</div>' +
      '</details>' +
    '</div>' +
    footerPrimary('consent', 'Consent & give TNK');
}

function viewConsent(c) {
  return screenHeader(c) +
    '<div class="body body--consent">' +
      '<div class="consent-lead">TNK and EVT are <strong>standard of care</strong> — routine emergency consent applies (CSBPR 5.2).</div>' +
      '<div class="eyebrow eyebrow--form">CONSENT DISCUSSED WITH</div>' +
      segRow([{ v: 'patient', label: 'Patient' }, { v: 'sdm', label: 'SDM' }], S.consentWith, 'consentWith') +
      '<details class="fold-rule fold-rule--tap" data-fold="script"' + foldOpen('script') + '>' +
        '<summary>Consent discussion script' + chevDown(16) + '</summary>' +
        '<div class="fold-body fold-body--consent">Benefits: earlier reperfusion improves the chance of functional recovery. Major risk: symptomatic intracranial hemorrhage. Explain the individualized expected benefit/risk and proceed using emergency consent processes and local stroke protocol.</div>' +
      '</details>' +
      '<div class="eyebrow eyebrow--form">TNK GIVEN?</div>' +
      segRow([{ v: 'yes', label: 'YES — given' }, { v: 'no', label: 'NO — not given' }], S.tnk, 'tnk') +
      (S.tnk === 'yes'
        ? '<div class="eyebrow eyebrow--form-tight">TIME GIVEN</div>' +
          '<input class="input-lg" type="time" value="' + esc(S.tnkTime) + '" data-field="tnkTime" data-focus="tnkTime" aria-label="Time TNK given" style="margin-top:0">' +
          '<div class="consent-note">Closely monitor for 24 h. Sudden neurologic deterioration → emergent CT. Avoid antiplatelet therapy for the first 24 h; start only after follow-up brain imaging excludes hemorrhage.</div>'
        : '') +
    '</div>' +
    footerPrimary('management', 'Acute management');
}

function viewManagement(c) {
  const m = S.management || {};
  const items = [
    { id: 'npo', title: 'NPO until swallow screen', sub: 'Validated swallowing screen before oral food, fluids or medications; do not delay reperfusion decisions.' },
    { id: 'strokeUnit', title: 'Stroke unit / monitored stroke care', sub: 'Admit to an acute stroke unit as soon as possible; specialized stroke-unit care is the standard.' },
    { id: 'rhythm', title: '12-lead ECG + rhythm monitoring', sub: 'Assess for AF/flutter and other cardiac causes after reperfusion decisions are secured.' },
    ...(S.tnk === 'yes' ? [
      { id: 'postTnkImaging', title: 'Post-thrombolysis monitoring + brain imaging', sub: 'Monitor closely for 24 h. Any acute deterioration → emergent CT. Obtain follow-up brain imaging before starting antiplatelet therapy.' },
      { id: 'antithrombotic', title: 'Hold antiplatelets for first 24 h', sub: 'After IV thrombolysis, avoid antiplatelet therapy in the first 24 h; initiate only after imaging excludes secondary hemorrhage.' },
    ] : [
      { id: 'antithrombotic', title: 'Start antithrombotic plan when safe', sub: 'If no IV thrombolysis and hemorrhage is excluded, start guideline-directed antiplatelet therapy unless anticoagulation is indicated instead.' },
    ]),
    { id: 'rehab', title: 'Early rehab / secondary-prevention workup', sub: 'PT/OT/SLP assessment, medication reconciliation and etiologic workup once medically stable.' },
  ];

  const checks = items.map(it =>
    '<button class="mgmt-item" data-act="mgmt-check" data-arg="' + it.id + '" aria-pressed="' + !!m[it.id] + '">' +
      '<span class="mgmt-box">' + (m[it.id] ? '✓' : '') + '</span>' +
      '<span><strong>' + esc(it.title) + '</strong><small>' + esc(it.sub) + '</small></span>' +
    '</button>').join('');

  return screenHeader(c) +
    '<div class="body body--management">' +
      (S.managementDone ? '<div class="management-done">Acute management checklist marked complete.</div>' : '') +
      (S.tnk === 'yes'
        ? '<div class="management-banner"><strong>Post-TNK</strong><span>Maintain BP per local post-thrombolysis protocol; CSBPR requires BP below 185/110 during treatment and for the next 24 h.</span></div>'
        : '<div class="management-banner management-banner--neutral"><strong>No TNK recorded</strong><span>Continue stroke-unit care, antithrombotic planning and EVT pathway if applicable.</span></div>') +
      (c.evtCandidate
        ? '<div class="evt evt--management"><div class="evt-eyebrow">EVT PATHWAY ACTIVE</div><div class="evt-head">' + esc(S.vessel || 'LVO') + '</div><div class="evt-sub">Do not delay EVT to assess clinical response to thrombolysis. Continue transfer / angio coordination.</div></div>'
        : '') +
      '<div class="eyebrow eyebrow--section">ACUTE CHECKLIST</div>' +
      '<div class="mgmt-list">' + checks + '</div>' +
      '<details class="fold-rule fold-rule--tap" data-fold="deterioration"' + foldOpen('deterioration') + '>' +
        '<summary>Neurologic deterioration after thrombolysis' + chevDown(16) + '</summary>' +
        '<div class="fold-body fold-body--sm">Emergent CT. If hemorrhage is identified and thrombolytic is still infusing, stop it. Send CBC, INR/PT and type &amp; cross; activate local thrombolysis-associated hemorrhage protocol and specialist support.</div>' +
      '</details>' +
      '<div class="source-links">' +
        '<a href="https://www.strokebestpractices.ca/recommendations/acute-stroke-management/acute-ischemic-stroke-treatment" target="_blank" rel="noopener">CSBPR — acute ischemic stroke treatment</a>' +
        '<a href="https://www.strokebestpractices.ca/recommendations/acute-stroke-management/emergency-department-evaluation-and-management" target="_blank" rel="noopener">CSBPR — ED management</a>' +
        '<a href="https://www.strokebestpractices.ca/recommendations/acute-stroke-management/acute-antithrombotic-therapy" target="_blank" rel="noopener">CSBPR — antithrombotic therapy</a>' +
      '</div>' +
    '</div>' +
    '<div class="footer">' +
      (S.managementDone
        ? '<button class="btn-dark btn-dark--lg" data-act="go" data-arg="hub">Back to timeline' + arrowRight(18, 'currentColor') + '</button>'
        : '<button class="btn-primary btn-primary--lg" data-act="management-done">Mark acute plan complete' + arrowRight(18, '#fff') + '</button>') +
    '</div>';
}

// ── Render ───────────────────────────────────────────────────
const root = document.getElementById('app');
let resetScroll = false;
let advTimer = null;

const VIEWS = {
  home: viewHome,
  hub: viewHub,
  timing: viewTiming,
  history: viewHistory,
  contra: viewContra,
  nihss: viewNihss,
  cards: viewCards,
  indications: viewIndications,
  syndrome: viewSyndrome,
  ct: viewCt,
  decision: viewDecision,
  consent: viewConsent,
  management: viewManagement,
};

function render() {
  const c = compute();

  // preserve scroll position + text-input focus across re-renders (the clock ticks every 30 s)
  const prevBody = root.querySelector('.body, .tl-scroll');
  const prevScroll = prevBody ? prevBody.scrollTop : 0;
  const active = document.activeElement;
  const focusKey = active && active.dataset ? active.dataset.focus : null;
  let selStart = null, selEnd = null;
  if (focusKey) {
    try { selStart = active.selectionStart; selEnd = active.selectionEnd; } catch (e) { /* time inputs disallow selection */ }
  }

  root.setAttribute('data-theme', S.theme);
  // A case screen with no open case (e.g. after a delete) falls back home.
  if (S.screen !== 'home' && S.screen !== 'indications' && !S.caseId) S.screen = 'home';
  root.innerHTML = (VIEWS[S.screen] || viewHome)(c);

  const nextBody = root.querySelector('.body, .tl-scroll');
  if (nextBody) nextBody.scrollTop = resetScroll ? 0 : prevScroll;
  resetScroll = false;

  if (focusKey) {
    const el = root.querySelector('[data-focus="' + focusKey + '"]');
    if (el) {
      el.focus();
      if (selStart !== null) { try { el.setSelectionRange(selStart, selEnd); } catch (e) { /* unsupported input type */ } }
    }
  }
}

function navigate(screen) {
  clearTimeout(advTimer);
  S.prev = S.screen;
  S.screen = screen;
  resetScroll = true;
  window.scrollTo(0, 0);
  render();
}

// ── Events ───────────────────────────────────────────────────
root.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn || !root.contains(btn)) return;
  const act = btn.dataset.act;
  const arg = btn.dataset.arg;

  switch (act) {
    case 'noop':
      return;

    case 'go':
      navigate(arg);
      return;

    case 'toggleTheme':
      S.theme = S.theme === 'dark' ? 'light' : 'dark';
      break;

    case 'reset':
      resetCase();
      resetScroll = true;
      break;

    case 'new-case':
      newCase();
      resetScroll = true;
      break;

    case 'open-case':
      openCase(arg);
      navigate('hub');
      return;

    case 'del-case': {
      const entry = CASES.find(cs => cs.id === arg);
      const who = entry && entry.label ? entry.label : 'this patient';
      if (!window.confirm('Delete ' + who + '? This cannot be undone.')) return;
      deleteCase(arg);
      break;
    }

    case 'onset':
      S.onset = arg;
      break;

    case 'history-anticoag':
      S.history.anticoag = arg;
      break;

    case 'history-seizure':
      S.history.seizure = arg;
      break;

    case 'nihss-teaching':
      S.nihssTeaching = !S.nihssTeaching;
      resetScroll = true;
      break;

    case 'syndrome-next':
      S.syndromeReviewed = true;
      save();
      navigate('ct');
      return;

    case 'mgmt-check':
      S.management[arg] = !S.management[arg];
      break;

    case 'management-done':
      S.managementDone = true;
      save();
      navigate('hub');
      return;

    case 'ci-detail':
      S.contraOpen[arg] = !S.contraOpen[arg];
      break;

    case 'ci': {
      const sep = arg.lastIndexOf(':');
      const id = arg.slice(0, sep);
      const val = arg.slice(sep + 1);
      if (S.contra[id] === val) delete S.contra[id];
      else S.contra[id] = val;
      break;
    }

    case 'tab':
      clearTimeout(advTimer);
      S.idx = Number(arg);
      resetScroll = true;
      window.scrollTo(0, 0);
      break;

    case 'score': {
      const id = ORDER[S.idx];
      // Score values are mostly numbers but the motor + dysarthria items also
      // offer 'UN' (untestable) — look the option up so the type survives.
      const item = (window.NIHSS_ITEMS || []).find(x => x.id === id);
      const opt = item && (item.scores || []).find(sc => String(sc.value) === arg);
      if (!opt) break;
      const value = opt.value;
      clearTimeout(advTimer);
      if (S.nihss[id] === value) {
        delete S.nihss[id];
      } else {
        S.nihss[id] = value;
      }
      S.syndromeReviewed = false;
      if (S.nihss[id] !== undefined) {
        advTimer = setTimeout(() => {
          if (S.idx < 14) {
            S.idx += 1;
            save();
            resetScroll = true;
            window.scrollTo(0, 0);
            render();
          }
        }, 550);
      }
      break;
    }

    case 'nihss-prev':
      clearTimeout(advTimer);
      if (S.idx > 0) { S.idx -= 1; } else { S.screen = 'contra'; }
      resetScroll = true;
      window.scrollTo(0, 0);
      break;

    case 'nihss-next':
      clearTimeout(advTimer);
      if (S.idx < 14) { S.idx += 1; } else { S.screen = 'syndrome'; }
      resetScroll = true;
      window.scrollTo(0, 0);
      break;

    case 'cards':
      S.card = arg;
      S.cardRot = false;
      navigate('cards');
      return;

    case 'cards-close':
      navigate('nihss');
      return;

    case 'card':
      S.card = arg;
      break;

    case 'card-step': {
      // Stepping off either end of the deck returns to the NIHSS item.
      const cards = window.NIHSS_CARDS || [];
      const j = cards.findIndex(k => k.id === S.card) + Number(arg);
      if (j < 0 || j >= cards.length) { navigate('nihss'); return; }
      S.card = cards[j].id;
      break;
    }

    case 'card-rot':
      S.cardRot = !S.cardRot;
      break;

    // Segmented controls select, they don't toggle off — matching the prototype.
    case 'ct': S.ct = arg; break;
    case 'lvo': S.lvo = arg; break;
    case 'vessel': S.vessel = arg; break;
    case 'collat': S.collat = arg; break;
    case 'consentWith': S.consentWith = arg; break;
    case 'tnk': S.tnk = arg; break;

    default:
      return;
  }

  save();
  render();
});

root.addEventListener('input', e => {
  const el = e.target.closest('[data-field]');
  if (!el) return;
  const field = el.dataset.field;
  const value = el.value;

  if (field === 'lkw') S.lkw = value || S.lkw;
  else if (field === 'nihssExternal') {
    S.nihssExternal = value;
    S.syndromeReviewed = false;
  } else if (field && (field.includes('.') || CASE_FIELDS.includes(field))) {
    setPath(field, value);
  } else {
    return;
  }

  save();
  render();
});

// `toggle` doesn't bubble — capture it so folds survive the clock's re-render
root.addEventListener('toggle', e => {
  const d = e.target;
  if (!d || d.tagName !== 'DETAILS' || !d.dataset.fold) return;
  S.folds[d.dataset.fold] = d.open;
}, true);

// ── Boot ─────────────────────────────────────────────────────
load();
render();
setInterval(render, 30000);
