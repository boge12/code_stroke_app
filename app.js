// ============================================================
// app.js — Code Stroke Triage App State Machine
// ============================================================

'use strict';

// ── State ────────────────────────────────────────────────────
const STATE = {
  sessions: [],
  current: null,
};

const STEPS = [
  'home',
  'step-label',
  'step-timing',
  'step-abs-contra',
  'step-rel-contra',
  'step-history',
  'step-quick-screen',
  'step-nihss',
  'step-posterior',
  'step-syndrome',
  'step-ct',
  'step-decision',
  'step-consent',
  'step-note',
];

const NIHSS_ORDER = ['1a','1b','1c','2','3','4','5a','5b','6a','6b','7','8','9','10','11'];

// ── Side Screens (reference material; not part of linear flow) ──
const SIDE_SCREENS = ['step-mimics','step-syndrome-ref','step-nihss-ref','step-algorithm'];
let SIDE_RETURN_TO = null;

window.goToSide = function(sideId) {
  SIDE_RETURN_TO = (STATE.current && STATE.current.currentStep) || (document.querySelector('.screen.active') || {id:'home'}).id.replace('screen-','') || 'home';
  // hide all screens, show side screen
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + sideId);
  if (!screen) return;
  screen.classList.add('active');
  window.scrollTo(0,0);
  // render content
  if (sideId === 'step-mimics') renderMimics('mimics');
  else if (sideId === 'step-syndrome-ref') renderSyndromeRef();
  else if (sideId === 'step-nihss-ref') renderNihssRef();
  else if (sideId === 'step-algorithm') renderAlgorithm();
  // hide algo chip on side screen (it IS the algo screen sometimes, or avoid double nav)
  const chip = document.getElementById('algo-chip');
  if (chip) chip.style.display = sideId === 'step-algorithm' ? 'none' : '';
};

window.goBackFromSide = function() {
  const target = SIDE_RETURN_TO || 'home';
  SIDE_RETURN_TO = null;
  if (target === 'home') { goTo('home'); renderHome(); }
  else goToStep(target);
};

window.switchMimicsTab = function(which) {
  document.querySelectorAll('#screen-step-mimics .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === which);
  });
  renderMimics(which);
};

// ── Session Helpers ──────────────────────────────────────────
function newSession() {
  return {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    label: '',
    onsetKnown: null, // 'yes' | 'no' | 'wakeup'
    onsetTime: null,
    lsn: null, // last seen normal ISO string (bedtime for wakeup)
    lsw: null, // last seen well ISO string
    wakeTime: null, // time found/woke up (wakeup strokes only)
    absContra: {}, // id -> true/false
    relContra: {}, // id -> 'yes'|'no'|'unknown'
    relNotes: {},  // id -> string note
    nihss: {},     // id -> value (number or 'UN')
    nihssCurrentIdx: 0,
    ctClear: null,
    ctHemType: null,
    aspects: null,
    ctaDone: null,
    lvo: null,
    lvoVessel: null,
    collaterals: null,
    perfusion: false,
    actionsDone: {},
    weightKg: null,
    bpMedUsed: null,
    consentWith: '',
    sdmName: '',
    tnkGiven: null,
    tnkTime: null,
    evtDecision: null,
    syndromes: [],
    note: '',
    decisionStatus: null, // 'eligible'|'relative'|'ineligible'
    currentStep: 'home',
    corticalScreen: { gaze: false, aphasia: false, neglect: false, hemiparesis: false },
    posteriorScreen: { fiveD: null, vertigoFocal: null, gaitAtaxia: null, verticalGazeSkew: null },
    relevantHistory: {}, // id -> { val: 'yes'|'no'|null|string|number, detail: string }
    nihssReassess: null,
  };
}

function saveState() {
  try {
    localStorage.setItem('codestroke_sessions', JSON.stringify(STATE.sessions));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('codestroke_sessions');
    if (raw) STATE.sessions = JSON.parse(raw);
  } catch(e) { STATE.sessions = []; }
}

function saveCurrentSession() {
  if (!STATE.current) return;
  const idx = STATE.sessions.findIndex(s => s.id === STATE.current.id);
  if (idx >= 0) STATE.sessions[idx] = STATE.current;
  else STATE.sessions.unshift(STATE.current);
  // keep last 20
  STATE.sessions = STATE.sessions.slice(0, 20);
  saveState();
}

// ── Utilities ────────────────────────────────────────────────
function fmt(dt) {
  if (!dt) return '–';
  const d = new Date(dt);
  return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(dt) {
  if (!dt) return '–';
  const d = new Date(dt);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function elapsedMin(isoString) {
  if (!isoString) return null;
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.round(diff / 60000);
}

function elapsedLabel(min) {
  if (min === null) return '–';
  if (min < 0) return 'Future time — check input';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min ago`;
  return `${h}h ${m}min ago`;
}

function timePickerToISO(value, refDate) {
  // value = "HH:MM"
  if (!value) return null;
  const [hh, mm] = value.split(':').map(Number);
  const d = refDate ? new Date(refDate) : new Date();
  d.setHours(hh, mm, 0, 0);
  // if this is in the future (more than 5 min) — assume yesterday
  if (d.getTime() > Date.now() + 5 * 60000) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString();
}

function getNIHSSTotal(nihss) {
  let total = 0;
  for (const id of NIHSS_ORDER) {
    const v = nihss[id];
    if (typeof v === 'number') total += v;
  }
  return total;
}

function formatTimeValue(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── Navigation ───────────────────────────────────────────────
function goTo(stepId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + stepId);
  if (screen) {
    screen.classList.add('active');
    window.scrollTo(0,0);
  }
  if (STATE.current) {
    STATE.current.currentStep = stepId;
    saveCurrentSession();
  }
  updateHeader(stepId);
  updateProgress(stepId);
  const chip = document.getElementById('algo-chip');
  if (chip) chip.style.display = (stepId === 'home' || SIDE_SCREENS.includes(stepId)) ? 'none' : '';
}

function updateHeader(stepId) {
  const header = document.getElementById('main-header');
  const backBtn = document.getElementById('back-btn');
  const title = document.getElementById('header-title');
  const badge = document.getElementById('nihss-badge');

  const titles = {
    'home': 'Code Stroke',
    'step-label': 'Step 1 — Patient',
    'step-timing': 'Step 2 — Timing',
    'step-abs-contra': 'Step 3 — Absolute CIs',
    'step-rel-contra': 'Step 4 — Relative CIs',
    'step-history': 'Step 5 — Relevant History',
    'step-quick-screen': 'Step 6 — Cortical / LVO Screen',
    'step-nihss': 'Step 7 — NIHSS Assessment',
    'step-posterior': 'Step 8 — Posterior Circulation',
    'step-syndrome': 'Step 9 — Syndrome',
    'step-ct': 'Step 10 — CT Results',
    'step-decision': 'Step 11 — Decision',
    'step-consent': 'Step 12 — Consent',
    'step-note': 'Step 13 — EMR Note',
  };

  title.textContent = titles[stepId] || 'Code Stroke';
  backBtn.style.display = stepId === 'home' ? 'none' : '';

  if (STATE.current && stepId !== 'home') {
    const total = getNIHSSTotal(STATE.current.nihss);
    badge.textContent = `NIHSS ${total}`;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

function updateProgress(stepId) {
  const bar = document.getElementById('progress-fill');
  const stepNums = STEPS.indexOf(stepId);
  const pct = stepNums <= 0 ? 0 : Math.round((stepNums / (STEPS.length - 1)) * 100);
  bar.style.width = pct + '%';
}

// ── Home Screen ──────────────────────────────────────────────
function renderHome() {
  const list = document.getElementById('sessions-list');
  list.innerHTML = '';

  if (STATE.sessions.length === 0) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">🩺</span><p>No recent cases.<br>Tap "New Code Stroke" to begin.</p></div>`;
    return;
  }

  for (const sess of STATE.sessions) {
    const total = getNIHSSTotal(sess.nihss || {});
    const severity = window.getNIHSSSeverity(total);
    const decStatus = sess.decisionStatus;
    let chipClass = 'chip-pending';
    let chipLabel = 'In progress';
    if (decStatus === 'eligible') { chipClass = 'chip-yes'; chipLabel = 'TNK Eligible'; }
    else if (decStatus === 'relative') { chipClass = 'chip-rel'; chipLabel = 'Relative CIs'; }
    else if (decStatus === 'ineligible') { chipClass = 'chip-no'; chipLabel = 'Not Eligible'; }

    const item = document.createElement('div');
    item.className = 'case-item';
    item.innerHTML = `
      <div class="case-icon">🧠</div>
      <div class="case-info">
        <div class="case-date">${fmtDate(sess.createdAt)}</div>
        <div class="case-label">${sess.label || 'Unnamed case'}</div>
        <div class="case-meta">NIHSS ${total} — ${severity.label}</div>
      </div>
      <div class="case-decision"><span class="decision-chip ${chipClass}">${chipLabel}</span></div>
    `;
    item.addEventListener('click', () => {
      STATE.current = sess;
      goTo(sess.currentStep || 'step-timing');
    });
    list.appendChild(item);
  }
}

// ── Step: Label ──────────────────────────────────────────────
function renderLabel() {
  const inp = document.getElementById('label-input');
  inp.value = STATE.current.label || '';
  inp.addEventListener('input', () => {
    STATE.current.label = inp.value;
    saveCurrentSession();
  });
}

// ── Step: Timing ─────────────────────────────────────────────
function renderTiming() {
  const onsetBtns = document.querySelectorAll('.onset-btn');
  const onsetInp = document.getElementById('onset-time-input');
  const wakeInp = document.getElementById('wake-time-input');

  function refresh() {
    const isWakeup = STATE.current.onsetKnown === 'wakeup';

    onsetBtns.forEach(b => {
      b.classList.toggle('selected', b.dataset.onset === STATE.current.onsetKnown);
    });

    // Show/hide wake time section and update LKN label
    document.getElementById('wake-time-section').style.display = isWakeup ? '' : 'none';
    document.getElementById('wakeup-guidance').style.display = isWakeup ? '' : 'none';
    document.getElementById('lkn-label').textContent = isWakeup ? 'Bedtime / Last Seen Well' : 'Last Known Normal (LKN)';
    document.getElementById('lkn-hint').textContent = isWakeup
      ? 'When did the patient fall asleep (last confirmed symptom-free)?'
      : 'When was the patient last known to be at their baseline / symptom-free?';

    const lsnMin = elapsedMin(STATE.current.lsn);
    const wakeMin = elapsedMin(STATE.current.wakeTime);

    // For wakeup strokes, TNK window is based on wake time; EVT based on LKN
    const windowMin = isWakeup ? wakeMin : lsnMin;
    const badge = document.getElementById('timing-window-badge');

    if (windowMin === null) {
      badge.className = 'time-window-badge window-close';
      badge.innerHTML = isWakeup ? 'Enter wake/found time above to calculate window' : 'Enter LKN time above to calculate window';
    } else if (windowMin <= 270) {
      badge.className = 'time-window-badge window-open';
      badge.innerHTML = isWakeup
        ? `✅ TNK WINDOW OPEN — ${elapsedLabel(wakeMin)} since found/woke`
        : `✅ TNK WINDOW OPEN — ${elapsedLabel(lsnMin)} from LKN`;
    } else if (windowMin <= 1440) {
      badge.className = 'time-window-badge window-close';
      badge.innerHTML = isWakeup
        ? `⚠️ >4.5h since found (${elapsedLabel(wakeMin)}) — standard TNK closed`
        : `⚠️ TNK WINDOW CLOSED (${elapsedLabel(lsnMin)}) — EVT may still be possible`;
    } else {
      badge.className = 'time-window-badge window-expired';
      badge.innerHTML = `🚫 >24 hours — likely outside treatment windows`;
    }

    document.getElementById('elapsed-lsn').textContent = lsnMin !== null ? elapsedLabel(lsnMin) : '–';
    if (document.getElementById('elapsed-wake')) {
      document.getElementById('elapsed-wake').textContent = wakeMin !== null ? elapsedLabel(wakeMin) : '–';
    }

    // Wake-up stroke guidance card
    if (isWakeup) {
      const guidanceBody = document.getElementById('wakeup-guidance-body');
      if (wakeMin === null) {
        guidanceBody.innerHTML = '<em>Enter wake/found time to see treatment guidance.</em>';
      } else if (wakeMin <= 270) {
        guidanceBody.innerHTML = `
          <div style="color:#81c784; font-weight:700; margin-bottom:6px">✅ Found &lt;4.5h ago — treat as known onset</div>
          <div>TNK window is open based on wake/found time. Proceed as standard ischaemic stroke if no contraindications.</div>`;
      } else if (wakeMin <= 1440) {
        guidanceBody.innerHTML = `
          <div style="color:#ffd54f; font-weight:700; margin-bottom:6px">⚠️ Found &gt;4.5h ago — imaging-guided selection required</div>
          <ul style="padding-left:16px; margin:0">
            <li><strong>MRI DWI-FLAIR mismatch:</strong> DWI lesion visible but FLAIR negative → infarct &lt;4.5h old → TNK may be appropriate (WAKE-UP trial)</li>
            <li><strong>CT Perfusion:</strong> Significant penumbra with small core → discuss with OTN/EVT centre</li>
            <li><strong>EVT:</strong> If LVO present, EVT window uses LKN (bedtime) — may be within 24h</li>
          </ul>`;
      } else {
        guidanceBody.innerHTML = `<div style="color:#ef5350; font-weight:700">🚫 >24h since found — outside standard treatment windows</div>`;
      }
    }

    if (STATE.current.lsn) onsetInp.value = formatTimeValue(STATE.current.lsn);
    if (STATE.current.wakeTime && wakeInp) wakeInp.value = formatTimeValue(STATE.current.wakeTime);
  }

  onsetBtns.forEach(b => {
    b.addEventListener('click', () => {
      STATE.current.onsetKnown = b.dataset.onset;
      saveCurrentSession();
      refresh();
    });
  });

  onsetInp.addEventListener('change', () => {
    STATE.current.lsn = timePickerToISO(onsetInp.value);
    saveCurrentSession();
    refresh();
  });

  if (wakeInp) {
    wakeInp.addEventListener('change', () => {
      STATE.current.wakeTime = timePickerToISO(wakeInp.value);
      saveCurrentSession();
      refresh();
    });
  }

  refresh();

  // Live update every 30 seconds
  const interval = setInterval(() => {
    if (document.getElementById('screen-step-timing').classList.contains('active')) refresh();
    else clearInterval(interval);
  }, 30000);
}

// ── Step: Absolute Contraindications ─────────────────────────
function renderAbsContra() {
  const container = document.getElementById('abs-contra-list');
  container.innerHTML = '';

  for (const item of window.ABS_CONTRA) {
    const val = STATE.current.absContra[item.id];
    const div = document.createElement('div');
    div.className = `check-item ${val === true ? 'flagged-yes' : ''}`;
    div.id = `abs-${item.id}`;
    div.innerHTML = `
      <div class="check-header">
        <div class="check-label">${item.label}</div>
        <div class="check-buttons">
          <button class="yn-btn ${val === true ? 'yes-active' : ''}" data-item="${item.id}" data-val="yes">YES</button>
          <button class="yn-btn ${val === false ? 'no-active' : ''}" data-item="${item.id}" data-val="no">NO</button>
        </div>
      </div>
      <div class="check-detail">${item.detail}</div>
    `;

    div.querySelector('.check-header').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      div.querySelector('.check-detail').classList.toggle('open');
    });

    div.querySelectorAll('.yn-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isYes = btn.dataset.val === 'yes';
        // Toggle: click same button again = clear
        if ((isYes && val === true) || (!isYes && val === false)) {
          STATE.current.absContra[item.id] = undefined;
        } else {
          STATE.current.absContra[item.id] = isYes;
        }
        saveCurrentSession();
        renderAbsContra();
        refreshAbsSummary();
      });
    });

    container.appendChild(div);
  }

  refreshAbsSummary();
}

function refreshAbsSummary() {
  const anyYes = Object.values(STATE.current.absContra).some(v => v === true);
  const summary = document.getElementById('abs-summary');
  if (anyYes) {
    summary.innerHTML = `<div class="status-banner status-red">
      <span class="status-icon">🚫</span>
      <div class="status-body">
        <div class="status-title">ABSOLUTE CONTRAINDICATION TO TNK</div>
        <div class="status-detail">TNK is contraindicated. You may still assess the patient for EVT eligibility — continue through the workflow.</div>
      </div>
    </div>`;
  } else {
    const anyAnswered = Object.values(STATE.current.absContra).some(v => v !== undefined);
    if (anyAnswered) {
      summary.innerHTML = `<div class="status-banner status-green">
        <span class="status-icon">✅</span>
        <div class="status-body"><div class="status-title">No absolute contraindications identified</div></div>
      </div>`;
    } else {
      summary.innerHTML = '';
    }
  }
}

// ── Step: Relative Contraindications ─────────────────────────
function renderRelContra() {
  // Glucose banner (nudge)
  const glucoseBanner = document.getElementById('glucose-banner');
  if (glucoseBanner) {
    glucoseBanner.innerHTML = `<div class="mimic-banner"><strong>Check glucose FIRST.</strong> Hypoglycemia is the most common stroke mimic — target 3.5–22.2 mmol/L before reading NIHSS.</div>`;
  }

  const container = document.getElementById('rel-contra-list');
  container.innerHTML = '';

  function updateDoacPrompt() {
    const prompt = document.getElementById('doac-reversal-prompt');
    if (!prompt) return;
    const rc = STATE.current.relContra || {};
    const showDoac = rc.doac === 'yes' || rc.warfarin === 'yes';
    if (!showDoac) { prompt.innerHTML = ''; return; }
    const options = window.DOAC_REVERSAL || [];
    const footer = window.DOAC_REVERSAL_FOOTER || '';
    const rows = options.map(opt => {
      const drug = opt.drug || opt.agent || opt.name || '';
      const reversal = opt.reversal || opt.agent || '';
      const dose = opt.dose || '';
      const notes = opt.notes || opt.caveat || opt.detail || '';
      return `<tr><td>${drug}</td><td>${reversal}</td><td>${dose}</td><td>${notes}</td></tr>`;
    }).join('');
    prompt.innerHTML = `
      <details class="check-detail open" open>
        <summary style="font-weight:700; cursor:pointer; padding:10px 0; color:var(--yellow)">💉 DOAC / Warfarin reversal options</summary>
        <div style="overflow-x:auto; margin-top:8px">
          <table class="finding-table">
            <thead><tr><th>Drug</th><th>Reversal</th><th>Dose</th><th>Notes</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${footer ? `<div class="text-sm" style="margin-top:8px; color:var(--text-dim)">${footer}</div>` : ''}
      </details>`;
  }

  for (const item of window.REL_CONTRA) {
    const val = STATE.current.relContra[item.id];
    const div = document.createElement('div');
    div.className = `check-item ${val === 'yes' ? 'flagged-rel' : ''}`;

    div.innerHTML = `
      <div class="check-header">
        <div class="check-label">${item.label}</div>
        <div class="check-buttons">
          <button class="yn-btn ${val === 'yes' ? 'yes-active' : ''}" data-item="${item.id}" data-val="yes">YES</button>
          <button class="yn-btn ${val === 'no' ? 'no-active' : ''}" data-item="${item.id}" data-val="no">NO</button>
          <button class="yn-btn ${val === 'unknown' ? 'unknown-active' : ''}" data-item="${item.id}" data-val="unknown">?</button>
        </div>
      </div>
      <div class="check-detail">
        ${item.detail}
        ${val === 'yes' ? `<div class="mt-8"><input type="text" class="rel-note-inp" placeholder="Add note (optional)…" value="${(STATE.current.relNotes[item.id] || '')}"></div>` : ''}
      </div>
    `;

    div.querySelector('.check-header').addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      div.querySelector('.check-detail').classList.toggle('open');
    });

    const noteInp = div.querySelector('.rel-note-inp');
    if (noteInp) {
      noteInp.addEventListener('input', () => {
        STATE.current.relNotes[item.id] = noteInp.value;
        saveCurrentSession();
      });
    }

    div.querySelectorAll('.yn-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        STATE.current.relContra[item.id] = btn.dataset.val;
        saveCurrentSession();
        renderRelContra();
        updateDoacPrompt();
      });
    });

    container.appendChild(div);
  }

  // Summary
  const yesCount = Object.values(STATE.current.relContra).filter(v => v === 'yes').length;
  const summary = document.getElementById('rel-summary');
  if (yesCount > 0) {
    summary.innerHTML = `<div class="status-banner status-yellow">
      <span class="status-icon">⚠️</span>
      <div class="status-body">
        <div class="status-title">${yesCount} relative contraindication${yesCount > 1 ? 's' : ''} present</div>
        <div class="status-detail">Clinical judgment required. Consider calling OTN Telestroke for borderline cases.</div>
      </div>
    </div>`;
  } else {
    summary.innerHTML = '';
  }

  updateDoacPrompt();
}

// ── Visual Field Guided Widget ────────────────────────────────
// Module-level state (not persisted — score is what gets saved)
const vfState = {
  canFollow: null,       // 'yes' | 'no'
  quadrants: { UL: null, UR: null, LL: null, LR: null },
};

function vfCalcScore(q) {
  const answered = Object.values(q).filter(v => v !== null).length;
  if (answered < 4) return null; // not ready
  const missing = Object.keys(q).filter(k => q[k] === false);
  if (missing.length === 0) return 0;
  if (missing.length === 1) return 1;
  if (missing.length === 2) {
    // Complete hemianopia = both quadrants on the same side
    const leftMissing = missing.includes('UL') && missing.includes('LL');
    const rightMissing = missing.includes('UR') && missing.includes('LR');
    return (leftMissing || rightMissing) ? 2 : 1;
  }
  return 3; // 3 or 4 quadrants missing
}

function vfScoreLabel(score) {
  return ['Normal', 'Partial hemianopia', 'Complete hemianopia', 'Bilateral hemianopia'][score] ?? '–';
}

function renderVFWidget(container, currentVal) {
  const q = vfState.quadrants;
  const score = vfCalcScore(q);

  const method = vfState.canFollow === 'yes'
    ? 'Fix gaze on your nose. Wiggle fingers in each quadrant.'
    : 'Blink-to-threat: advance hand from outer edge toward each eye.';

  // Step 1: follow commands
  const step1Html = `
    <div class="vf-step">
      <div class="vf-question">Can the patient follow commands?</div>
      <div class="vf-btn-row">
        <button class="vf-yn ${vfState.canFollow === 'yes' ? 'vf-yn-active' : ''}" data-vf-follow="yes">Yes</button>
        <button class="vf-yn ${vfState.canFollow === 'no' ? 'vf-yn-active' : ''}" data-vf-follow="no">No</button>
      </div>
    </div>`;

  // Step 2: quadrant grid (shown after follow answered)
  const step2Html = vfState.canFollow ? `
    <div class="vf-step">
      <div class="vf-method">${vfState.canFollow === 'yes' ? '👁 Confrontation:' : '✋ Blink-to-threat:'} ${method}</div>
      <div class="vf-question" style="margin-top:10px">Which quadrants responded?</div>
      <div class="vf-grid">
        ${['UL','UR','LL','LR'].map(k => {
          const labels = { UL:'Upper L', UR:'Upper R', LL:'Lower L', LR:'Lower R' };
          const state = q[k];
          return `<button class="vf-quad${state === true ? ' vf-yes' : state === false ? ' vf-no' : ''}" data-vf-quad="${k}">
            <span class="vf-quad-name">${labels[k]}</span>
            <span class="vf-quad-state">${state === true ? '✓' : state === false ? '✗' : '?'}</span>
          </button>`;
        }).join('')}
      </div>
    </div>` : '';

  // Step 3: result (shown when all 4 answered)
  const step3Html = score !== null ? `
    <div class="vf-result ${score === 0 ? 'vf-result-ok' : score <= 1 ? 'vf-result-warn' : 'vf-result-bad'}">
      <div class="vf-result-score">Score ${score}</div>
      <div class="vf-result-label">${vfScoreLabel(score)}</div>
      ${score === 1 && Object.keys(q).filter(k => q[k] === false).length === 2 ? '<div class="vf-result-note">Bilateral partial loss — confirm sides</div>' : ''}
    </div>
    <button class="btn-primary vf-confirm" data-vf-confirm="${score}">Confirm Score ${score} →</button>` : '';

  // Override button if score already set — show change option
  const resetHtml = currentVal !== undefined ? `
    <div class="vf-current">Current score: <strong>${currentVal} — ${vfScoreLabel(currentVal)}</strong>
    <button class="vf-reset">Change</button></div>` : '';

  container.innerHTML = `
    <div class="nihss-item-header">
      <div class="nihss-item-number">Item ${NIHSS_ORDER.indexOf('3') + 1} of ${NIHSS_ORDER.length}</div>
      <div class="nihss-item-name">3 — Visual Fields</div>
    </div>
    ${resetHtml}
    <div class="vf-widget">
      ${step1Html}
      ${step2Html}
      ${step3Html}
    </div>
    <details class="nihss-exam-details" style="margin-top:12px">
      <summary>Scoring reference</summary>
      <div class="vf-ref-table">
        <div class="vf-ref-row"><span class="vf-ref-score vf-ref-0">0</span><span>All 4 respond — Normal</span></div>
        <div class="vf-ref-row"><span class="vf-ref-score vf-ref-1">1</span><span>1 quadrant missing — Partial hemianopia</span></div>
        <div class="vf-ref-row"><span class="vf-ref-score vf-ref-2">2</span><span>Full side missing (same 2 quadrants) — Complete hemianopia</span></div>
        <div class="vf-ref-row"><span class="vf-ref-score vf-ref-3">3</span><span>No response — Bilateral / cortical blindness</span></div>
      </div>
    </details>
  `;

  // Attach handlers
  container.querySelectorAll('[data-vf-follow]').forEach(btn => {
    btn.addEventListener('click', () => {
      vfState.canFollow = btn.dataset.vfFollow;
      // Reset quadrants on method change
      Object.keys(vfState.quadrants).forEach(k => vfState.quadrants[k] = null);
      renderVFWidget(container, STATE.current.nihss['3']);
    });
  });

  container.querySelectorAll('[data-vf-quad]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.vfQuad;
      // Cycle: null → true (yes) → false (no) → null
      if (q[k] === null) q[k] = true;
      else if (q[k] === true) q[k] = false;
      else q[k] = null;
      renderVFWidget(container, STATE.current.nihss['3']);
    });
  });

  const confirmBtn = container.querySelector('[data-vf-confirm]');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const val = parseInt(confirmBtn.dataset.vfConfirm);
      STATE.current.nihss['3'] = val;
      STATE.current.nihssCurrentIdx = nihssCurrentIdx;
      saveCurrentSession();
      renderNIHSSTabs();
      // Update badge
      const total = getNIHSSTotal(STATE.current.nihss);
      document.getElementById('nihss-badge').textContent = `NIHSS ${total}`;
      // Re-render to show confirmed state + auto-advance
      renderVFWidget(container, val);
      document.getElementById('nihss-next').disabled = false;
      setTimeout(() => {
        if (nihssCurrentIdx < NIHSS_ORDER.length - 1) {
          nihssCurrentIdx++;
          STATE.current.nihssCurrentIdx = nihssCurrentIdx;
          saveCurrentSession();
          renderNIHSSItem();
          renderNIHSSTabs();
          window.scrollTo(0, 0);
        }
      }, 600);
    });
  }

  const resetBtn = container.querySelector('.vf-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      STATE.current.nihss['3'] = undefined;
      vfState.canFollow = null;
      Object.keys(vfState.quadrants).forEach(k => vfState.quadrants[k] = null);
      saveCurrentSession();
      renderVFWidget(container, undefined);
      document.getElementById('nihss-next').disabled = true;
    });
  }

  // Nav button state
  document.getElementById('nihss-prev').disabled = nihssCurrentIdx === 0;
  document.getElementById('nihss-next').disabled = STATE.current.nihss['3'] === undefined;
}


let nihssCurrentIdx = 0;

function renderNIHSS() {
  nihssCurrentIdx = STATE.current.nihssCurrentIdx || 0;
  STATE.current.corticalScreen = STATE.current.corticalScreen || { gaze: false, aphasia: false, neglect: false, hemiparesis: false };
  renderNIHSSItem();
  renderNIHSSTabs();
}

function renderCorticalQuickScreen(containerId) {
  const container = document.getElementById(containerId || 'cortical-pills');
  if (!container) return;
  const items = window.CORTICAL_LVO_SCREEN || [];
  if (!items.length) { container.innerHTML = ''; return; }
  STATE.current.corticalScreen = STATE.current.corticalScreen || { gaze: false, aphasia: false, neglect: false, hemiparesis: false };
  const cs = STATE.current.corticalScreen;
  container.innerHTML = items.map(item => {
    const key = item.key || item.id;
    const label = item.label || item.name || key;
    const active = !!cs[key];
    return `<button class="cortical-pill${active ? ' active' : ''}" data-cortical="${key}" style="padding:8px 12px; border-radius:20px; border:1px solid var(--border); background:${active ? 'var(--blue)' : 'var(--card)'}; color:${active ? '#fff' : 'var(--text)'}; cursor:pointer; font-size:13px; font-weight:600; margin:4px">${label}</button>`;
  }).join('');
  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.gap = '6px';
  container.querySelectorAll('[data-cortical]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.cortical;
      STATE.current.corticalScreen[k] = !STATE.current.corticalScreen[k];
      saveCurrentSession();
      renderCorticalQuickScreen(containerId);
    });
  });
}

// ── Quick Screen step (pre-NIHSS: cortical only) ──────────────
function renderQuickScreen() {
  const host = document.getElementById('quick-screen-content');
  if (!host) return;
  STATE.current.corticalScreen = STATE.current.corticalScreen || { gaze: false, aphasia: false, neglect: false, hemiparesis: false };

  const rule = window.CORTICAL_LVO_RULE || 'Any one cortical sign + NIHSS ≥ 6 → presume LVO.';

  host.innerHTML = `
    <div class="card qs-card">
      <div class="qs-card-title">⚡ Cortical quick screen — LVO flags</div>
      <div class="qs-card-sub">Tap any sign that's present. ${rule}</div>
      <div id="cortical-pills"></div>
    </div>
  `;

  renderCorticalQuickScreen('cortical-pills');
}

// ── Posterior Circulation step (post-NIHSS) ───────────────────
function renderPosterior() {
  const host = document.getElementById('posterior-content');
  if (!host) return;
  STATE.current.posteriorScreen = STATE.current.posteriorScreen || { fiveD: null, vertigoFocal: null, gaitAtaxia: null, verticalGazeSkew: null };

  const posteriorRedFlags = window.POSTERIOR_RED_FLAGS || [];
  const posteriorItems = [
    { key: 'fiveD', label: 'Any of the 5 Ds? (Dysphagia, Dysarthria, Diplopia, Dysmetria, Decreased LOC)' },
    { key: 'vertigoFocal', label: "Vertigo + any focal sign (crossed sensory, limb ataxia, Horner's, facial numbness)?" },
    { key: 'gaitAtaxia', label: 'Cannot sit or stand unaided / truncal ataxia?' },
    { key: 'verticalGazeSkew', label: 'Vertical gaze palsy, skew deviation, or direction-changing nystagmus?' },
  ];

  host.innerHTML = `
    <div class="card qs-card">
      <div class="qs-card-title">🧠 Posterior circulation check</div>
      <div class="qs-card-sub">NIHSS underscores posterior strokes. Tap YES for any that apply.</div>
      <div id="posterior-check">
        ${posteriorItems.map(it => {
          const val = STATE.current.posteriorScreen[it.key];
          const yesActive = val === true;
          const noActive = val === false;
          return `
          <div class="qs-toggle-row">
            <div class="qs-toggle-label">${it.label}</div>
            <div class="qs-toggle-pills">
              <button class="qs-toggle-pill yes${yesActive ? ' active' : ''}" data-qs-key="${it.key}" data-qs-val="true">Yes</button>
              <button class="qs-toggle-pill no${noActive ? ' active' : ''}" data-qs-key="${it.key}" data-qs-val="false">No</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div id="hints-prompt-qs" style="margin-top:10px"></div>
      ${posteriorRedFlags.length ? `
        <details style="margin-top:10px">
          <summary style="cursor:pointer; font-size:13px; color:var(--text-dim); font-weight:600">More posterior red flags</summary>
          <ul style="padding-left:18px; margin-top:8px; line-height:1.7; font-size:13px; color:var(--text-dim)">
            ${posteriorRedFlags.map(x => `<li>${x}</li>`).join('')}
          </ul>
        </details>` : ''}
    </div>
  `;

  wirePosteriorToggles();
}

function wirePosteriorToggles() {
  document.querySelectorAll('[data-qs-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.qsKey;
      const v = btn.dataset.qsVal === 'true';
      STATE.current.posteriorScreen[k] = v;
      saveCurrentSession();
      renderPosterior();
    });
  });
  const hp = document.getElementById('hints-prompt-qs');
  if (!hp) return;
  const anyYes = Object.values(STATE.current.posteriorScreen).some(v => v === true);
  if (anyYes) {
    hp.innerHTML = `<button class="hints-prompt" onclick="goToSide('step-nihss-ref'); setTimeout(()=>{const el=document.getElementById('hints-section'); if(el) el.scrollIntoView({behavior:'smooth'});},120);" style="padding:10px 14px; border-radius:8px; border:1px solid var(--blue); background:transparent; color:var(--blue); font-weight:600; cursor:pointer">📖 Open HINTS exam reference →</button>`;
  } else {
    hp.innerHTML = '';
  }
}

// ── Relevant History step (post-Rel-CI) ───────────────────────
function renderHistory() {
  const host = document.getElementById('history-content');
  if (!host) return;
  STATE.current.relevantHistory = STATE.current.relevantHistory || {};
  const rh = STATE.current.relevantHistory;
  const items = (window.RELEVANT_HISTORY_ITEMS || []).filter(it => !it.showIf || it.showIf(STATE.current));

  host.innerHTML = items.map(it => {
    const entry = rh[it.id] || {};
    if (it.type === 'text') {
      const val = entry.val || '';
      return `
        <div class="card qs-card">
          <div class="qs-card-title">${it.ask}</div>
          <div class="qs-card-sub">${it.why}</div>
          <input type="text" class="rh-text" data-rh-id="${it.id}" placeholder="${it.placeholder || ''}" value="${val.replace(/"/g, '&quot;')}">
        </div>`;
    }
    if (it.type === 'yesno') {
      const val = entry.val;
      const yes = val === 'yes';
      const no = val === 'no';
      const detail = entry.detail || '';
      return `
        <div class="card qs-card">
          <div class="qs-card-title">${it.ask}</div>
          <div class="qs-card-sub">${it.why}</div>
          <div class="qs-toggle-pills">
            <button class="qs-toggle-pill yes${yes ? ' active' : ''}" data-rh-yn="${it.id}" data-rh-val="yes">Yes</button>
            <button class="qs-toggle-pill no${no ? ' active' : ''}" data-rh-yn="${it.id}" data-rh-val="no">No</button>
          </div>
          ${yes && it.detail ? `<input type="text" class="rh-text" data-rh-id="${it.id}" data-rh-detail="1" placeholder="${it.detail}" value="${detail.replace(/"/g, '&quot;')}" style="margin-top:10px">` : ''}
        </div>`;
    }
    if (it.type === 'mrs') {
      const val = entry.val;
      const choices = [
        { v: '0', lbl: '0 — No symptoms' },
        { v: '1', lbl: '1 — No significant disability' },
        { v: '2', lbl: '2 — Slight disability' },
        { v: '3', lbl: '3 — Moderate' },
        { v: '4', lbl: '4 — Moderately severe' },
        { v: '5', lbl: '5 — Severe' },
      ];
      return `
        <div class="card qs-card">
          <div class="qs-card-title">${it.ask}</div>
          <div class="qs-card-sub">${it.why}</div>
          <div class="mrs-grid">
            ${choices.map(c => `<button class="mrs-pill${val === c.v ? ' active' : ''}" data-rh-mrs="${it.id}" data-rh-val="${c.v}">${c.lbl}</button>`).join('')}
          </div>
        </div>`;
    }
    return '';
  }).join('');

  wireHistoryInputs();
}

function wireHistoryInputs() {
  document.querySelectorAll('[data-rh-yn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.rhYn;
      const val = btn.dataset.rhVal;
      const rh = STATE.current.relevantHistory;
      rh[id] = rh[id] || {};
      rh[id].val = rh[id].val === val ? null : val;
      saveCurrentSession();
      renderHistory();
    });
  });
  document.querySelectorAll('[data-rh-mrs]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.rhMrs;
      const val = btn.dataset.rhVal;
      const rh = STATE.current.relevantHistory;
      rh[id] = rh[id] || {};
      rh[id].val = rh[id].val === val ? null : val;
      saveCurrentSession();
      renderHistory();
    });
  });
  document.querySelectorAll('.rh-text').forEach(inp => {
    inp.addEventListener('input', () => {
      const id = inp.dataset.rhId;
      const rh = STATE.current.relevantHistory;
      rh[id] = rh[id] || {};
      if (inp.dataset.rhDetail) rh[id].detail = inp.value;
      else rh[id].val = inp.value;
      saveCurrentSession();
    });
  });
}

function updateLvoBanner() {
  const banner = document.getElementById('lvo-banner');
  if (!banner) return;
  const total = getNIHSSTotal(STATE.current.nihss || {});
  const cs = STATE.current.corticalScreen || {};
  const anyChecked = Object.values(cs).some(v => v === true);
  if (total >= 6 && anyChecked) {
    banner.innerHTML = `
      <div class="lvo-banner" style="margin-top:12px; padding:12px; border-radius:10px; background:#7f1d1d; color:#fff; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
        <div style="font-weight:700; flex:1">🚨 Presumed LVO — activate EVT pathway</div>
        <button class="btn-primary" onclick="goToStep('step-ct')" style="background:#fff; color:#7f1d1d">Activate EVT pathway →</button>
      </div>`;
  } else {
    banner.innerHTML = '';
  }
}

function renderNIHSSTabs() {
  const tabs = document.getElementById('nihss-tabs');
  tabs.innerHTML = '';
  for (let i = 0; i < NIHSS_ORDER.length; i++) {
    const id = NIHSS_ORDER[i];
    const tab = document.createElement('div');
    tab.className = `step-tab${i === nihssCurrentIdx ? ' current' : ''}${STATE.current.nihss[id] !== undefined ? ' done' : ''}`;
    tab.textContent = id;
    tab.addEventListener('click', () => {
      nihssCurrentIdx = i;
      STATE.current.nihssCurrentIdx = i;
      saveCurrentSession();
      renderNIHSSItem();
      renderNIHSSTabs();
    });
    tabs.appendChild(tab);
  }

  // Scroll the current tab into view
  const currentTab = tabs.children[nihssCurrentIdx];
  if (currentTab) {
    setTimeout(() => {
      currentTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  }
}

function renderNIHSSItem() {
  const item = window.NIHSS_ITEMS.find(it => it.id === NIHSS_ORDER[nihssCurrentIdx]);
  if (!item) return;

  const container = document.getElementById('nihss-item-container');
  const currentVal = STATE.current.nihss[item.id];

  // Item 3: Visual Fields — use guided widget
  if (item.id === '3') {
    renderVFWidget(container, currentVal);
    return;
  }
  const total = getNIHSSTotal(STATE.current.nihss);
  const severity = window.getNIHSSSeverity(total);

  // Update badge
  document.getElementById('nihss-badge').textContent = `NIHSS ${total}`;

  let scoresHtml = item.scores.map(s => `
    <button class="score-btn${currentVal === s.value ? ' selected' : ''}${s.value === 'UN' ? ' un-btn' : ''}" data-value="${s.value}">
      <span class="score-num">${s.value}</span>
      <div>
        <div class="score-label">${s.label}</div>
        <div class="score-desc">${s.description}</div>
      </div>
    </button>
  `).join('');

  // Exam instructions collapsed into a single tap-to-expand details element
  const instrHtml = item.examInstructions.map(i => `<li>${i}</li>`).join('');
  const lookForHtml = item.lookFor ? `<p class="nihss-look-for" style="margin-top:8px">${item.lookFor}</p>` : '';

  // Optional enrichment panels (only render if present on item)
  let extrasHtml = '';
  if (Array.isArray(item.caveats) && item.caveats.length) {
    extrasHtml += `<details class="nihss-extras"><summary>📝 Caveats</summary><ul>${item.caveats.map(c => `<li>${c}</li>`).join('')}</ul></details>`;
  }
  if (Array.isArray(item.rubric) && item.rubric.length) {
    extrasHtml += `<details class="nihss-extras"><summary>📖 Textbook rubric</summary><table class="rubric-table"><thead><tr><th>Score</th><th>Criteria</th></tr></thead><tbody>${item.rubric.map(r => `<tr><td>${r.score}</td><td>${r.criteria}</td></tr>`).join('')}</tbody></table></details>`;
  }
  if (item.localizationPearl) {
    extrasHtml += `<details class="nihss-extras"><summary>🧠 Localization pearl</summary><p>${item.localizationPearl}</p></details>`;
  }
  if (Array.isArray(item.functionalClues) && item.functionalClues.length) {
    extrasHtml += `<details class="nihss-extras"><summary>🔍 Functional weakness clues</summary><ul>${item.functionalClues.map(c => `<li>${c}</li>`).join('')}</ul></details>`;
  }

  container.innerHTML = `
    <div class="nihss-item-header">
      <div class="nihss-item-number">Item ${nihssCurrentIdx + 1} of ${NIHSS_ORDER.length}</div>
      <div class="nihss-item-name">${item.shortName}</div>
    </div>

    <details class="nihss-exam-details">
      <summary>How to examine</summary>
      <ul class="nihss-instructions">${instrHtml}</ul>
      ${lookForHtml}
    </details>

    ${item.note ? `<div class="nihss-note">⚠️ ${item.note}</div>` : ''}

    <div class="nihss-section mt-16">
      <div class="nihss-section-title">Select Score</div>
      ${item.svg ? `<div class="nihss-svg-strip" aria-hidden="true">${item.svg}</div>` : ''}
      <div class="score-options">${scoresHtml}</div>
    </div>
    ${extrasHtml}
  `;

  // Score buttons
  container.querySelectorAll('.score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let val = btn.dataset.value;
      if (val !== 'UN') val = parseFloat(val);
      STATE.current.nihss[item.id] = val;
      STATE.current.nihssCurrentIdx = nihssCurrentIdx;
      saveCurrentSession();
      renderNIHSSItem();
      renderNIHSSTabs();
      // Auto-advance after short delay
      setTimeout(() => {
        if (nihssCurrentIdx < NIHSS_ORDER.length - 1) {
          nihssCurrentIdx++;
          STATE.current.nihssCurrentIdx = nihssCurrentIdx;
          saveCurrentSession();
          renderNIHSSItem();
          renderNIHSSTabs();
          document.getElementById('screen-step-nihss').scrollTop = 0;
          window.scrollTo(0, 0);
        }
      }, 600);
    });
  });

  // Nav buttons
  document.getElementById('nihss-prev').disabled = nihssCurrentIdx === 0;
  document.getElementById('nihss-next').disabled = currentVal === undefined;

  document.getElementById('nihss-prev').onclick = () => {
    if (nihssCurrentIdx > 0) {
      nihssCurrentIdx--;
      STATE.current.nihssCurrentIdx = nihssCurrentIdx;
      saveCurrentSession();
      renderNIHSSItem();
      renderNIHSSTabs();
      window.scrollTo(0, 0);
    }
  };

  document.getElementById('nihss-next').onclick = () => {
    if (nihssCurrentIdx < NIHSS_ORDER.length - 1) {
      nihssCurrentIdx++;
      STATE.current.nihssCurrentIdx = nihssCurrentIdx;
      saveCurrentSession();
      renderNIHSSItem();
      renderNIHSSTabs();
      window.scrollTo(0, 0);
    } else {
      // All done → posterior circulation check
      computeSyndromes();
      renderPosterior();
      goTo('step-posterior');
    }
  };

  // NIHSS Done button
  const allDone = NIHSS_ORDER.every(id => STATE.current.nihss[id] !== undefined);
  const doneBtn = document.getElementById('nihss-done-btn');
  if (allDone) {
    doneBtn.style.display = '';
    doneBtn.onclick = () => {
      computeSyndromes();
      renderPosterior();
      goTo('step-posterior');
    };
  } else {
    doneBtn.style.display = 'none';
  }

}

// ── Step: Syndrome ────────────────────────────────────────────
function computeSyndromes() {
  STATE.current.syndromes = window.getSyndromeSuggestions(STATE.current.nihss);
  saveCurrentSession();
}

function renderSyndrome() {
  // Always recompute in case NIHSS scores changed
  computeSyndromes();
  const total = getNIHSSTotal(STATE.current.nihss);
  const severity = window.getNIHSSSeverity(total);

  const minorNote = total <= 5
    ? `<div class="status-detail" style="margin-top:4px; font-size:13px">Consider TNK if deficit is disabling: hand weakness, aphasia, hemianopia, or functionally significant to the patient.</div>`
    : '';
  const severeNote = total >= 22
    ? `<div class="status-detail" style="margin-top:4px; font-size:13px; color:#ef9a9a">🚨 Severe — confirm no extensive early infarct on CT. EVT critical.</div>`
    : '';

  document.getElementById('syndrome-nihss-total').innerHTML = `
    <div class="status-banner status-blue">
      <span class="status-icon">🧠</span>
      <div class="status-body">
        <div class="status-title">NIHSS ${total} — ${severity.label}</div>
        ${total <= 5 ? '<div class="status-detail">≤5 mild — consider TNK only if deficit is disabling.</div>' : ''}
        ${severeNote}${minorNote}
      </div>
    </div>
  `;

  const container = document.getElementById('syndrome-list');
  container.innerHTML = '';

  // Only show syndromes with confidence ≥ 2
  const matches = STATE.current.syndromes.filter(s => s.confidence >= 2);

  // Empty-match banner
  const emptyHint = document.getElementById('empty-match-hint');
  if (emptyHint) {
    if (matches.length === 0) {
      const linkHtml = total >= 1
        ? `<div class="status-detail" style="margin-top:6px"><a href="#" onclick="event.preventDefault(); goToSide('step-mimics');" style="color:#fff; text-decoration:underline; font-weight:600">Review stroke mimics →</a></div>`
        : '';
      emptyHint.innerHTML = `
        <div class="status-banner status-yellow">
          <span class="status-icon">⚠️</span>
          <div class="status-body">
            <div class="status-title">Pattern doesn't clearly fit one territory</div>
            <div class="status-detail">May be atypical, mixed, functional, or scores incomplete. Use clinical judgment.</div>
            ${linkHtml}
          </div>
        </div>`;
    } else {
      emptyHint.innerHTML = '';
    }
  }

  if (matches.length === 0) {
    container.innerHTML = `<div class="card"><p class="text-sm">Pattern doesn't clearly fit one territory — may be atypical, mixed, or scores incomplete. Use clinical judgment.</p></div>`;
    // Still render sanity-check below
    renderSyndromeSanityCheck();
    return;
  }

  matches.forEach((syn, i) => {
    const card = document.createElement('div');
    card.className = 'syndrome-card';
    const rankLabel = i === 0
      ? `<span class="syndrome-rank">Most likely</span>`
      : `<span class="syndrome-rank syndrome-rank-alt">Also consider</span>`;
    card.innerHTML = `
      ${rankLabel}
      <div class="syndrome-name">${syn.name}</div>
      <div class="syndrome-sub">${syn.subtitle} · ${syn.territory}</div>
      ${syn.lvoRisk ? `<div class="lvo-flag">🚨 LVO risk — urgent CTA</div>` : ''}
      <ul class="syndrome-features">${syn.features.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="text-sm mt-8" style="color:var(--text-dim)">Imaging: ${syn.ctaExpect}</div>
    `;
    container.appendChild(card);
  });

  renderSyndromeSanityCheck();
}

function renderSyndromeSanityCheck() {
  const host = document.getElementById('single-territory-sanity-check');
  if (!host) return;
  host.innerHTML = `
    <div class="sanity-check-card card" style="margin-top:12px">
      <div class="card-title">🧐 Self-check</div>
      <ul style="padding-left:18px; font-size:14px; line-height:1.8; color:var(--text-dim)">
        <li>Do the signs fit a single vascular territory? <a href="#" onclick="event.preventDefault(); goToSide('step-syndrome-ref');" style="color:var(--blue); text-decoration:underline">Review syndromes →</a></li>
        <li>Have I checked for functional clues? <a href="#" onclick="event.preventDefault(); goToSide('step-nihss-ref'); setTimeout(()=>{ var el=document.getElementById('nihss-ref-functional-clues'); if(el) el.scrollIntoView({behavior:'smooth'}); },100);" style="color:var(--blue); text-decoration:underline">Functional clues →</a></li>
        <li>Was the deficit sudden + maximal at onset? <a href="#" onclick="event.preventDefault(); goToSide('step-mimics');" style="color:var(--blue); text-decoration:underline">Mimics to consider →</a></li>
      </ul>
    </div>`;
}

// ── Step: CT ──────────────────────────────────────────────────
function renderCT() {
  const s = STATE.current;

  // CT clear buttons
  document.querySelectorAll('.ct-clear-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.ctClear);
    btn.addEventListener('click', () => {
      s.ctClear = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    });
  });

  document.getElementById('ct-hemorrhage-section').style.display = s.ctClear === 'no' ? '' : 'none';

  // ASPECTS
  const aspInp = document.getElementById('aspects-input');
  aspInp.value = s.aspects !== null ? s.aspects : '';
  aspInp.addEventListener('change', () => {
    const v = parseInt(aspInp.value);
    s.aspects = isNaN(v) ? null : Math.max(0, Math.min(10, v));
    saveCurrentSession();
    refreshAspects();
  });
  refreshAspects();

  // CTA
  document.querySelectorAll('.cta-done-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.ctaDone);
    btn.addEventListener('click', () => {
      s.ctaDone = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    });
  });

  document.getElementById('lvo-section').style.display = s.ctaDone === 'yes' ? '' : 'none';

  document.querySelectorAll('.lvo-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.lvo);
    btn.addEventListener('click', () => {
      s.lvo = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    });
  });

  document.getElementById('lvo-vessel-section').style.display = s.lvo === 'yes' ? '' : 'none';

  document.querySelectorAll('.vessel-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.vessel === s.lvoVessel);
    btn.addEventListener('click', () => {
      s.lvoVessel = btn.dataset.vessel;
      saveCurrentSession();
    });
  });

  document.querySelectorAll('.collateral-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.collaterals);
    btn.addEventListener('click', () => {
      s.collaterals = btn.dataset.val;
      saveCurrentSession();
    });
  });
}

function refreshAspects() {
  const s = STATE.current;
  const msg = document.getElementById('aspects-msg');
  if (s.aspects === null) { msg.textContent = ''; return; }
  if (s.aspects < 6) {
    msg.innerHTML = '<span style="color:#ef9a9a">⚠️ ASPECTS <6 — Contraindication to TNK. Large core infarct.</span>';
  } else {
    msg.innerHTML = `<span style="color:#81c784">ASPECTS ${s.aspects} — Within acceptable range (≥6)</span>`;
  }
}

// Toggle buttons helper
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('toggle-btn')) {
    const grp = e.target.dataset.group;
    document.querySelectorAll(`.toggle-btn[data-group="${grp}"]`).forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
  }
});

// ── Post-Stroke Admission Management ─────────────────────────
function buildPostStrokeManagement(s, tnkStatus, lvoPresent, evtStatus) {
  const total = getNIHSSTotal(s.nihss);
  const tnkGiven = tnkStatus === 'eligible' || tnkStatus === 'relative';

  let scenarioTitle = '';
  let admitTo = '';
  let monitoringItems = [];
  let medItems = [];
  let investigationItems = [];
  let nursingItems = [];

  // Determine scenario
  if (tnkGiven && lvoPresent) {
    scenarioTitle = 'Post-TNK + EVT Transfer';
    admitTo = 'ICU pending transfer → Critical Care Transport to EVT centre';
    monitoringItems = [
      'Neuro vitals q15min × 2h, then q30min × 6h, then q1h × 16h',
      'BP monitoring: SBP <160, DBP <80 — avoid hypotension',
      'Continuous cardiac monitoring — telemetry',
      'Repeat NIHSS at 24h post-TNK',
      'Monitor for signs of hemorrhagic conversion (new headache, nausea, worsening neuro exam)',
    ];
    medItems = [
      'NO anticoagulants or antiplatelets for 24 hours post-TNK',
      'NO central lines, arterial lines, or NG tubes for 24 hours',
      'BP: continue labetalol/nicardipine if needed to maintain targets',
      'Hold ASA/clopidogrel until 24h CT head confirms no hemorrhage',
      'DVT prophylaxis: SCDs only (no LMWH until 24h post-TNK + imaging clear)',
    ];
  } else if (tnkGiven) {
    scenarioTitle = 'Post-TNK — No EVT Required';
    admitTo = 'ICU / Stroke Unit';
    monitoringItems = [
      'Neuro vitals q15min × 2h, then q30min × 6h, then q1h × 16h',
      'BP monitoring: SBP <160, DBP <80 — avoid hypotension',
      'Continuous cardiac monitoring — telemetry',
      'Repeat NIHSS at 24h',
      'CT head at 24h (before starting antiplatelets)',
      'Monitor for hemorrhagic conversion',
    ];
    medItems = [
      'NO anticoagulants or antiplatelets for 24 hours post-TNK',
      'NO invasive procedures (central lines, arterial lines, NG tubes, Foley) for 24h if avoidable',
      'After 24h CT head clear: start ASA 160mg then 81mg daily',
      'Start statin (atorvastatin 40–80mg) if not contraindicated',
      'DVT prophylaxis: SCDs only until 24h post-TNK + imaging clear, then LMWH',
      'Glycemic control: target 5–10 mmol/L, insulin sliding scale if needed',
    ];
  } else if (lvoPresent && evtStatus === 'eligible') {
    scenarioTitle = 'EVT Candidate — No TNK';
    admitTo = 'Transfer to EVT centre via Critical Care Transport';
    monitoringItems = [
      'Neuro vitals q15min until transfer',
      'Continuous cardiac monitoring',
      'BP: permissive hypertension up to 220/120 (no TNK given)',
      'Repeat NIHSS post-EVT per receiving centre protocol',
    ];
    medItems = [
      'ASA 160mg once EVT completed and hemorrhage excluded (per EVT centre)',
      'Statin (atorvastatin 40–80mg)',
      'DVT prophylaxis: SCDs, LMWH per EVT centre protocol',
    ];
  } else {
    scenarioTitle = 'Acute Ischemic Stroke — Medical Management';
    admitTo = total >= 5 ? 'Stroke Unit / Monitored Bed' : 'Stroke Unit / GIM Ward';
    monitoringItems = [
      'Neuro vitals q1h × 24h, then q4h',
      'Continuous cardiac monitoring × 24h minimum',
      'BP: permissive hypertension up to 220/120 (no TNK given)',
      'If BP >220/120: labetalol 10mg IV or nicardipine, target 15% reduction',
      'Repeat NIHSS at 24h',
    ];
    medItems = [
      'ASA 160mg loading dose, then 81mg daily',
      'Consider dual antiplatelet (ASA + clopidogrel 300mg load then 75mg daily × 21 days) if minor stroke (NIHSS ≤3) and high-risk TIA',
      'Statin: atorvastatin 40–80mg daily (target LDL <1.8 mmol/L)',
      'DVT prophylaxis: SCDs + LMWH (enoxaparin 40mg SC daily) if immobile',
      'Glycemic control: target 5–10 mmol/L',
      'Treat fever aggressively (target normothermia)',
    ];
  }

  // Common investigations and nursing for all scenarios
  investigationItems = [
    'Bloodwork: CBC, lytes, Cr, glucose, lipid panel, HbA1c, TSH, troponin',
    'ECG (if not already done) — look for AFib',
    'Extended cardiac monitoring (Holter or telemetry × 48–72h) — AFib screening',
    'Echocardiogram (TTE; consider TEE if young or cryptogenic)',
    'Carotid Doppler / CTA neck (if not done with initial CTA)',
    'MRI brain with DWI (if diagnosis uncertain or to define stroke territory)',
    'Fasting lipids + HbA1c if not recent',
  ];

  nursingItems = [
    'Swallowing screen before any PO intake (risk of aspiration)',
    'HOB flat to 30° (unless heart failure / aspiration risk — then 30°)',
    'DVT prevention: SCDs, early mobilization when safe',
    'Fall precautions',
    'Skin integrity assessment (immobile patients)',
    'PT/OT/SLP referral within 24–48h',
    'Social work / discharge planning referral',
    'Smoking cessation counseling if applicable',
  ];

  return `
    <div class="card">
      <div class="card-title">Post-Stroke Admission Management</div>
      <div class="status-banner status-blue" style="margin-bottom:12px">
        <span class="status-icon">🏥</span>
        <div class="status-body">
          <div class="status-title">${scenarioTitle}</div>
          <div class="status-detail">Admit to: ${admitTo}</div>
        </div>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:14px; font-weight:700; color:var(--blue); margin-bottom:6px">📊 Monitoring</div>
        <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
          ${monitoringItems.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:14px; font-weight:700; color:var(--yellow); margin-bottom:6px">💊 Medications</div>
        <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
          ${medItems.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-bottom:14px">
        <div style="font-size:14px; font-weight:700; color:var(--purple); margin-bottom:6px">🔬 Investigations</div>
        <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
          ${investigationItems.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>

      <div>
        <div style="font-size:14px; font-weight:700; color:var(--green); margin-bottom:6px">🩺 Nursing / Allied Health</div>
        <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
          ${nursingItems.map(i => `<li>${i}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ── Step: Decision ───────────────────────────────────────────
function renderDecision() {
  const s = STATE.current;
  const lsnMin = elapsedMin(s.lsn);
  const isWakeup = s.onsetKnown === 'wakeup';
  // For wakeup strokes: TNK window from wake/found time; EVT window from LKN (bedtime)
  const wakeMin = elapsedMin(s.wakeTime);
  const tnkWindowMin = isWakeup ? wakeMin : lsnMin;
  // EVT window always uses earliest known time (LKN or wake time, whichever is less)
  const evtWindowMin = isWakeup
    ? (lsnMin !== null ? lsnMin : wakeMin)
    : lsnMin;
  const total = getNIHSSTotal(s.nihss);
  const anyAbsCI = Object.values(s.absContra).some(v => v === true);
  const aspectsOk = s.aspects === null || s.aspects >= 6;
  const ctClear = s.ctClear === 'yes';
  const relCIs = window.REL_CONTRA.filter(r => s.relContra[r.id] === 'yes');
  const withinWindow = tnkWindowMin !== null && tnkWindowMin <= 270;
  // Wake-up with no wake time entered: cannot confirm TNK window
  const wakeupNeedsImaging = isWakeup && (wakeMin === null || wakeMin > 270);
  const nihssAboveThreshold = total >= 5;

  // TNK decision
  let tnkStatus, tnkBannerClass, tnkIcon;
  if (anyAbsCI || !ctClear || !aspectsOk) {
    tnkStatus = 'ineligible';
    tnkBannerClass = 'status-red';
    tnkIcon = '🚫';
  } else if (wakeupNeedsImaging) {
    // Wake-up stroke with no wake time or >4.5h — needs imaging selection
    tnkStatus = 'relative';
    tnkBannerClass = 'status-yellow';
    tnkIcon = '🌙';
  } else if (!withinWindow) {
    tnkStatus = 'ineligible';
    tnkBannerClass = 'status-red';
    tnkIcon = '⏰';
  } else if (relCIs.length > 0) {
    tnkStatus = 'relative';
    tnkBannerClass = 'status-yellow';
    tnkIcon = '⚠️';
  } else {
    tnkStatus = 'eligible';
    tnkBannerClass = 'status-green';
    tnkIcon = '✅';
  }

  STATE.current.decisionStatus = tnkStatus;
  saveCurrentSession();

  // TNK reasons
  const reasons = [];
  if (anyAbsCI) reasons.push('Absolute contraindication present');
  if (wakeupNeedsImaging) {
    if (wakeMin === null) reasons.push('Wake-up stroke — enter wake/found time to assess TNK window');
    else reasons.push(`Wake-up stroke found ${elapsedLabel(wakeMin)} ago — requires imaging selection (MRI DWI-FLAIR mismatch or CT perfusion)`);
  } else if (!withinWindow && tnkWindowMin !== null) {
    reasons.push(`Outside 4.5h window (${elapsedLabel(tnkWindowMin)} from ${isWakeup ? 'found/wake time' : 'LKN'})`);
  }
  if (!ctClear) reasons.push('CT not clear / hemorrhage on imaging');
  if (!aspectsOk) reasons.push(`ASPECTS ${s.aspects} < 6`);
  if (relCIs.length > 0) reasons.push(...relCIs.map(r => r.label));
  if (!nihssAboveThreshold) reasons.push(`NIHSS ${total} — below typical threshold (consider if deficits are disabling)`);

  const tnkLabel = tnkStatus === 'eligible' ? 'ELIGIBLE FOR TNK'
    : tnkStatus === 'relative' ? (wakeupNeedsImaging ? 'WAKE-UP STROKE — IMAGING SELECTION REQUIRED' : 'RELATIVE CONTRAINDICATIONS')
    : 'NOT ELIGIBLE FOR TNK';

  // EVT decision — use EVT window (LKN for wakeup, LKN for known)
  const evtWindow = evtWindowMin !== null && evtWindowMin <= 1440;
  const lvoPresent = s.lvo === 'yes';
  let evtStatus = 'none';
  let evtBanner = '';
  if (lvoPresent && evtWindow && aspectsOk) {
    evtStatus = 'eligible';
    evtBanner = `<div class="status-banner status-green">
      <span class="status-icon">✅</span>
      <div class="status-body">
        <div class="status-title">EVT CANDIDATE</div>
        <div class="status-detail">LVO confirmed (${s.lvoVessel || 'vessel unspecified'}), within 24h window, ASPECTS ${s.aspects !== null ? s.aspects : '?'}<br>→ Contact EVT centre + Critical Care Transport</div>
      </div>
    </div>`;
  } else if (lvoPresent && evtWindow && s.aspects !== null && s.aspects < 6) {
    evtStatus = 'discuss';
    evtBanner = `<div class="status-banner status-yellow">
      <span class="status-icon">⚠️</span>
      <div class="status-body">
        <div class="status-title">LARGE CORE — DISCUSS WITH EVT CENTRE</div>
        <div class="status-detail">ASPECTS ${s.aspects} (3–5). Recent trials (SELECT-2, TENSION, ANGEL-ASPECT) support EVT benefit even with large core. Call EVT centre for case discussion.</div>
      </div>
    </div>`;
  } else if (!lvoPresent && s.ctaDone === 'yes') {
    evtBanner = `<div class="status-banner status-blue">
      <span class="status-icon">ℹ️</span>
      <div class="status-body"><div class="status-title">NO LVO on CTA</div><div class="status-detail">EVT not indicated. Consider OTN Telestroke if clinical picture is atypical.</div></div>
    </div>`;
  } else if (s.ctaDone !== 'yes') {
    evtBanner = `<div class="status-banner status-blue">
      <span class="status-icon">ℹ️</span>
      <div class="status-body"><div class="status-title">CTA not yet completed</div></div>
    </div>`;
  }

  // Build TNK dose + BP management cards only if eligible or relative
  let tnkDoseBPHtml = '';
  if (tnkStatus === 'eligible' || tnkStatus === 'relative') {
    tnkDoseBPHtml = `
    <div class="card">
      <div class="card-title">TNK Dose Calculator</div>
      <label>Patient Weight (kg)</label>
      <div class="weight-row">
        <input type="number" id="weight-input" placeholder="e.g. 75" min="30" max="200" value="${s.weightKg || ''}">
        <span class="unit">kg</span>
      </div>
      <div id="dose-result" class="dose-result" style="display:none"></div>
    </div>

    <div class="card">
      <div class="card-title">BP Management</div>
      <div style="font-size:15px; font-weight:700; margin-bottom:8px; color:var(--yellow)">Pre-TNK Target: &lt;185/110 mmHg</div>
      ${window.BP_MEDS.map(m => `<div style="padding:8px 0; border-bottom:1px solid var(--border)">
        <span style="font-weight:700">${m.drug}:</span> ${m.dose}<br>
        <span style="font-size:13px;color:var(--text-dim)">${m.notes}</span>
      </div>`).join('')}
      <div style="margin-top:12px; font-size:15px; font-weight:700; color:#81c784">Post-TNK: SBP &lt;160, DBP &lt;80 — Avoid hypotension</div>
    </div>`;
  }

  // Post-stroke admission management recommendations
  const postStrokeMgmt = buildPostStrokeManagement(s, tnkStatus, lvoPresent, evtStatus);

  document.getElementById('decision-content').innerHTML = `
    <div class="status-banner ${tnkBannerClass}">
      <span class="status-icon">${tnkIcon}</span>
      <div class="status-body">
        <div class="status-title">${tnkLabel}</div>
        ${reasons.length > 0 ? `<div class="status-detail">${reasons.map(r => `• ${r}`).join('<br>')}</div>` : ''}
      </div>
    </div>

    ${evtBanner}

    ${tnkDoseBPHtml}

    <div class="card">
      <div class="card-title">Lakeridge Actions</div>
      <div id="action-checklist">
        ${buildActionChecklist()}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Disposition</div>
      <ul style="padding-left:18px; font-size:15px; line-height:2">
        <li>TNK only → <strong>ICU admission</strong></li>
        <li>EVT candidate → <strong>Critical Care Transport + EVT centre</strong></li>
        <li>Day (08:00+): GIM/Neuro team</li>
        <li>After midnight: ED runs workflow until morning</li>
        <li>Ajax/Pickering EMS → Oshawa campus</li>
        <li>Bowmanville: CT/CTA only — no EVT on site</li>
      </ul>
    </div>

    ${postStrokeMgmt}

    <div class="card">
      <div class="card-title">OTN Telestroke</div>
      <p class="text-sm" style="margin-bottom:8px">Call for: borderline cases, atypical presentations, posterior circulation, or when relative CIs present. Low threshold — OTN is there to help.</p>
    </div>
  `;

  // Set weight value after DOM injection (only if dose calculator is visible)
  const weightInp = document.getElementById('weight-input');
  if (weightInp) {
    if (s.weightKg) weightInp.value = s.weightKg;
    refreshDose();
    weightInp.addEventListener('input', (e) => {
      STATE.current.weightKg = parseFloat(e.target.value) || null;
      saveCurrentSession();
      refreshDose();
    });
  }

  setupActionChecklist();

  // LVO banner: fires when any cortical flag + NIHSS ≥ 6
  updateLvoBanner();

  // BP targets card
  const bpCard = document.getElementById('bp-targets-card');
  if (bpCard) {
    const bp = window.BP_TARGETS || [];
    if (bp.length) {
      const rows = bp.map(row => {
        const scenario = row.scenario || row.context || row.label || '';
        const target = row.target || row.targetBP || row.bp || '';
        const notes = row.notes || row.rationale || row.detail || '';
        return `<tr><td>${scenario}</td><td>${target}</td><td>${notes}</td></tr>`;
      }).join('');
      bpCard.innerHTML = `
        <details class="card" open>
          <summary style="font-weight:700; cursor:pointer; color:var(--yellow); padding:4px 0">💢 BP targets by scenario</summary>
          <div style="overflow-x:auto; margin-top:8px">
            <table class="finding-table">
              <thead><tr><th>Scenario</th><th>Target</th><th>Notes</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </details>`;
    } else {
      bpCard.innerHTML = '';
    }
  }

  // NIHSS reassessment input
  const reassessInp = document.getElementById('nihss-reassess-input');
  if (reassessInp) {
    if (s.nihssReassess !== null && s.nihssReassess !== undefined) {
      reassessInp.value = s.nihssReassess;
    }
    reassessInp.onchange = window.saveNihssReassess;
  }

  // Deterioration banner
  const detBanner = document.getElementById('deterioration-banner');
  if (detBanner) {
    const baseline = total;
    const reassess = s.nihssReassess;
    if (typeof reassess === 'number' && !isNaN(reassess)) {
      const delta = reassess - baseline;
      if (delta >= 4) {
        detBanner.innerHTML = `
          <div class="deterioration-banner" style="margin-top:12px; padding:14px; border-radius:10px; background:#7f1d1d; color:#fff; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
            <div style="font-weight:700; flex:1">⚠️ ≥4-point NIHSS increase (Δ ${delta}) — URGENT re-imaging indicated</div>
            <button class="btn-primary" onclick="goToStep('step-ct')" style="background:#fff; color:#7f1d1d">Re-imaging →</button>
          </div>`;
      } else {
        detBanner.innerHTML = '';
      }
    } else {
      detBanner.innerHTML = '';
    }
  }
}

window.saveNihssReassess = function() {
  const inp = document.getElementById('nihss-reassess-input');
  if (!inp) return;
  const v = parseInt(inp.value);
  STATE.current.nihssReassess = isNaN(v) ? null : v;
  saveCurrentSession();
  renderDecision();
};

function buildActionChecklist() {
  const actions = [
    { id: 'otn', label: 'OTN Telestroke — call for borderline/atypical/posterior cases' },
    { id: 'evt', label: 'EVT centre contacted (St. Michael\'s / TWH / Sunnybrook) + Critical Care Transport' },
    { id: 'epic', label: 'EPIC Phase 1 orders (ED) + Phase 2 (physician) completed' },
    { id: 'sdm', label: 'SDM identified for consent discussion' },
    { id: 'icu', label: 'ICU / stroke unit bed booked' },
  ];
  return actions.map(a => `
    <div class="checklist-action">
      <div class="action-checkbox${STATE.current.actionsDone[a.id] ? ' done' : ''}" data-action="${a.id}">${STATE.current.actionsDone[a.id] ? '✓' : ''}</div>
      <div class="action-text">${a.label}</div>
    </div>
  `).join('');
}

function setupActionChecklist() {
  document.querySelectorAll('.action-checkbox').forEach(box => {
    box.addEventListener('click', () => {
      const id = box.dataset.action;
      STATE.current.actionsDone[id] = !STATE.current.actionsDone[id];
      saveCurrentSession();
      box.classList.toggle('done', STATE.current.actionsDone[id]);
      box.textContent = STATE.current.actionsDone[id] ? '✓' : '';
    });
  });
}

function refreshDose() {
  const result = document.getElementById('dose-result');
  if (!result) return;
  const kg = STATE.current.weightKg;
  const dose = window.getTNKDose(kg);
  if (dose) {
    result.style.display = '';
    result.textContent = `TNK dose: ${dose} mg IV bolus (0.25 mg/kg × ${kg} kg, max 25 mg)`;
  } else {
    result.style.display = 'none';
  }
}

// ── Step: Consent ─────────────────────────────────────────────
function renderConsent() {
  const s = STATE.current;
  const total = getNIHSSTotal(s.nihss);
  const lsnMin = elapsedMin(s.lsn);

  document.getElementById('consent-summary').innerHTML = `
    <div class="nihss-look-for" style="margin-bottom:16px">
      <strong>Sample Consent Discussion (based on CSBPR 2022/2025):</strong><br><br>
      <em>Adapt to your clinical scenario — this is a template to guide your discussion.</em><br><br>
      "This patient presents with an acute ischemic stroke with an NIHSS of <strong>${total}</strong> (${window.getNIHSSSeverity(total).label}). Time from last known normal is approximately <strong>${lsnMin !== null ? elapsedLabel(lsnMin) : '?'}</strong>.<br><br>

      <strong>What is tenecteplase (TNK)?</strong><br>
      TNK is a clot-dissolving medication given as a single IV injection. It works to break up the blood clot causing the stroke. It is most effective when given as early as possible within the treatment window.<br><br>

      <strong>Benefits:</strong><br>
      • TNK significantly improves the chance of a good functional outcome — for every 100 patients treated, approximately 10–15 additional patients will recover to functional independence compared to no treatment (NNT ~7–10)<br>
      • The earlier TNK is given, the greater the benefit — every 15 minutes saved improves outcomes<br>
      • Without treatment, a moderate-to-severe ischemic stroke carries a high risk of permanent disability<br><br>

      <strong>Risks:</strong><br>
      • The main risk is symptomatic intracranial hemorrhage (sICH) — approximately <strong>2–6%</strong> of treated patients<br>
      • Of those who develop sICH, it can be fatal in up to <strong>50%</strong> of cases (~1–3% overall mortality risk from sICH)<br>
      • Risk increases with: higher NIHSS score, older age, elevated blood glucose, longer time to treatment, and early ischemic changes on CT<br>
      • Other bleeding complications (GI, skin, gum bleeding) are possible but usually manageable<br><br>

      <strong>Without treatment:</strong><br>
      • Approximately 50–60% of untreated patients with moderate-severe stroke will have significant long-term disability<br>
      • There is no effective alternative to thrombolysis for dissolving the clot (EVT addresses large vessel occlusions but does not replace TNK)"<br><br>

      I discussed risks and benefits with the <strong>${s.consentWith === 'sdm' ? `SDM (${s.sdmName || '___'})` : 'patient'}</strong>. They understood and ${s.tnkGiven === 'yes' ? 'consented to' : 'were informed about'} treatment.
    </div>
  `;

  const sdmName = document.getElementById('sdm-name');
  const tnkGivenBtns = document.querySelectorAll('.tnk-given-btn');
  const consentPersonBtns = document.querySelectorAll('.consent-person-btn');
  const tnkTimeInp = document.getElementById('tnk-time');

  sdmName.value = s.sdmName || '';
  if (s.tnkTime) tnkTimeInp.value = formatTimeValue(s.tnkTime);

  tnkGivenBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.given === s.tnkGiven);
    btn.addEventListener('click', () => {
      s.tnkGiven = btn.dataset.given;
      saveCurrentSession();
      tnkGivenBtns.forEach(b => b.classList.toggle('selected', b.dataset.given === s.tnkGiven));
    });
  });

  consentPersonBtns.forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.person === s.consentWith);
    btn.addEventListener('click', () => {
      s.consentWith = btn.dataset.person;
      saveCurrentSession();
      consentPersonBtns.forEach(b => b.classList.toggle('selected', b.dataset.person === s.consentWith));
    });
  });

  sdmName.addEventListener('input', () => { s.sdmName = sdmName.value; saveCurrentSession(); });
  tnkTimeInp.addEventListener('change', () => {
    s.tnkTime = timePickerToISO(tnkTimeInp.value);
    saveCurrentSession();
  });
}

// ── Step: Note ────────────────────────────────────────────────
function renderNote() {
  const note = generateNote();
  STATE.current.note = note;
  saveCurrentSession();
  document.getElementById('note-output').textContent = note;
}

function generateNote() {
  const s = STATE.current;
  const total = getNIHSSTotal(s.nihss);
  const severity = window.getNIHSSSeverity(total);
  const lsnMin = elapsedMin(s.lsn);
  const now = new Date().toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short', hour12: false });

  const nihssLines = NIHSS_ORDER.map(id => {
    const item = window.NIHSS_ITEMS.find(i => i.id === id);
    const val = s.nihss[id];
    const scoreObj = item ? item.scores.find(sc => sc.value === val) : null;
    const label = scoreObj ? scoreObj.label : (val !== undefined ? String(val) : 'not scored');
    return `  ${id.padEnd(4)} ${val !== undefined ? val : '–'} — ${label}`;
  }).join('\n');

  const absFlags = window.ABS_CONTRA.filter(a => s.absContra[a.id] === true).map(a => `    • ${a.label}`).join('\n');
  const relFlags = window.REL_CONTRA.filter(r => s.relContra[r.id] === 'yes').map(r => {
    const note = s.relNotes[r.id] ? ` (${s.relNotes[r.id]})` : '';
    return `    • ${r.label}${note}`;
  }).join('\n');

  const synd = (s.syndromes || []).slice(0,2).map(sy => sy.name).join(' / ') || 'Pattern unclear';

  const dose = window.getTNKDose(s.weightKg);
  const tnkLine = s.tnkGiven === 'yes'
    ? `TNK given: ${dose ? dose + ' mg' : '? mg'} IV bolus at ${s.tnkTime ? fmt(s.tnkTime) : '?'}`
    : s.tnkGiven === 'no' ? 'TNK NOT given'
    : 'TNK decision pending';

  const evtLine = s.lvo === 'yes'
    ? `EVT candidate — LVO: ${s.lvoVessel || '?'}, ASPECTS ${s.aspects !== null ? s.aspects : '?'}`
    : s.ctaDone === 'yes' ? 'EVT not indicated — no LVO on CTA'
    : 'CTA pending / EVT decision deferred';

  const otnDone = s.actionsDone['otn'] ? 'Yes' : 'Not required';
  const evtCentre = s.actionsDone['evt'] ? 'Contacted' : 'Not contacted';

  const consentLine = s.tnkGiven === 'yes'
    ? `Discussed risks and benefits with ${s.consentWith === 'sdm' ? `SDM (${s.sdmName || 'name not recorded'})` : 'patient'}. Risks explained including ~6% sICH risk (~15% fatal). Consent obtained.`
    : 'Consent discussion documented above.';

  return `CODE STROKE NOTE — ${now}
${'─'.repeat(50)}

TIMING:
  Last known normal: ${s.lsn ? fmt(s.lsn) : '?'} (${lsnMin !== null ? elapsedLabel(lsnMin) : 'unknown'})
  TNK window (4.5h): ${lsnMin !== null ? (lsnMin <= 270 ? 'OPEN' : 'CLOSED') : 'Unknown'}
  EVT window (24h): ${lsnMin !== null ? (lsnMin <= 1440 ? 'OPEN' : 'CLOSED') : 'Unknown'}

NIHSS SCORE: ${total} — ${severity.label}
  Suggested syndrome: ${synd}${(() => {
    const cs = s.corticalScreen || {};
    const flagged = Object.keys(cs).filter(k => cs[k] === true);
    if (flagged.length) return `\n  Cortical LVO flags: ${flagged.join(', ')}`;
    return '';
  })()}${(() => {
    const ps = s.posteriorScreen || {};
    const yes = Object.keys(ps).filter(k => ps[k] === true);
    if (yes.length) return `\n  Posterior red flags: ${yes.join(', ')}`;
    return '';
  })()}${(s.nihssReassess !== null && s.nihssReassess !== undefined)
    ? `\n  Reassessment NIHSS: ${s.nihssReassess} (baseline ${total}) — delta Δ ${s.nihssReassess - total}`
    : ''}
${nihssLines}

CONTRAINDICATIONS:
  Absolute: ${absFlags ? '\n' + absFlags : 'None identified'}
  Relative: ${relFlags ? '\n' + relFlags : 'None identified'}

RELEVANT HISTORY:${(() => {
    const items = window.RELEVANT_HISTORY_ITEMS || [];
    const rh = s.relevantHistory || {};
    const lines = [];
    const mrsLabel = { '0':'0 — No symptoms', '1':'1 — No significant disability', '2':'2 — Slight disability', '3':'3 — Moderate', '4':'4 — Moderately severe', '5':'5 — Severe' };
    for (const it of items) {
      if (it.showIf && !it.showIf(s)) continue;
      const entry = rh[it.id];
      if (!entry || entry.val === null || entry.val === undefined || entry.val === '') continue;
      if (it.type === 'text') lines.push(`    • ${it.ask} ${entry.val}`);
      else if (it.type === 'yesno') {
        const d = entry.detail ? ` — ${entry.detail}` : '';
        lines.push(`    • ${it.ask} ${entry.val.toUpperCase()}${d}`);
      } else if (it.type === 'mrs') {
        lines.push(`    • Baseline mRS: ${mrsLabel[entry.val] || entry.val}`);
      }
    }
    return lines.length ? '\n' + lines.join('\n') : ' None recorded';
  })()}

IMAGING:
  CT Head: ${s.ctClear === 'yes' ? 'No hemorrhage' : s.ctClear === 'no' ? `Hemorrhage present (${s.ctHemType || 'type ?'})` : 'Pending'}
  ASPECTS: ${s.aspects !== null && s.aspects !== undefined ? s.aspects : 'Pending'}
  CTA: ${s.ctaDone === 'yes' ? (s.lvo === 'yes' ? `LVO — ${s.lvoVessel || 'vessel ?'}, collaterals: ${s.collaterals || '?'}` : 'No LVO') : 'Pending / not done'}

TREATMENT DECISION:
  ${tnkLine}
  Weight: ${s.weightKg ? s.weightKg + ' kg' : '?'} | Dose: ${dose ? dose + ' mg' : '?'} mg (0.25 mg/kg)
  ${evtLine}

BP MANAGEMENT:
  Pre-treatment target: <185/110 mmHg
  Post-TNK target: SBP <160, DBP <80 — avoid hypotension

PLAN:
  - Disposition: ${s.tnkGiven === 'yes' ? 'ICU admission for post-TNK monitoring' : s.actionsDone['evt'] ? 'Transfer to EVT centre' : 'Admission / further assessment'}
  - OTN Telestroke: ${otnDone}
  - EVT centre: ${evtCentre}
  - EPIC orders: Phase 1 (ED) + Phase 2 (physician)

CONSENT:
  ${consentLine}
${'─'.repeat(50)}
Generated by Code Stroke Triage App — Lakeridge Health`;
}

// ── Side-screen renderers (reference material) ────────────────
function renderMimics(tab) {
  const host = document.getElementById('mimics-content');
  if (!host) return;
  tab = tab || 'mimics';

  if (tab === 'mimics') {
    const mimics = window.STROKE_MIMICS || [];
    const redFlags = window.MIMIC_RED_FLAGS || [];
    const redFlagsHtml = redFlags.length
      ? `<div class="card"><div class="card-title">🚩 Red flags that suggest mimic</div><ul style="padding-left:18px; line-height:1.8; color:var(--text-dim); font-size:14px">${redFlags.map(r => `<li>${r}</li>`).join('')}</ul></div>`
      : '';
    const mimicCards = mimics.map(m => `
      <details class="check-item" style="margin-bottom:8px">
        <summary style="font-weight:700; cursor:pointer; padding:10px 0">${m.name || m.label || ''}</summary>
        <div class="check-detail open" style="padding:6px 0 10px">
          ${m.keyFeatures ? `<div style="margin-bottom:6px"><strong>Key features:</strong> ${Array.isArray(m.keyFeatures) ? `<ul style="padding-left:18px; margin:4px 0">${m.keyFeatures.map(f => `<li>${f}</li>`).join('')}</ul>` : m.keyFeatures}</div>` : ''}
          ${m.clues ? `<div style="margin-bottom:6px"><strong>Clues:</strong> ${Array.isArray(m.clues) ? `<ul style="padding-left:18px; margin:4px 0">${m.clues.map(c => `<li>${c}</li>`).join('')}</ul>` : m.clues}</div>` : ''}
          ${m.ruleOutTest ? `<div><strong>Rule-out test:</strong> ${m.ruleOutTest}</div>` : ''}
        </div>
      </details>`).join('');

    host.innerHTML = `
      <div class="mimic-banner" style="padding:12px; border-radius:10px; background:#78350f; color:#fff; margin-bottom:12px; font-weight:600">Check glucose FIRST — hypoglycemia is the most common mimic. Target: 3.5–22.2 mmol/L.</div>
      ${redFlagsHtml}
      ${mimicCards}
      <div class="card">
        <div class="card-title">🔎 Diagnostic approach</div>
        <ol style="padding-left:20px; line-height:2; font-size:14px; color:var(--text-dim)">
          <li>Check glucose</li>
          <li>Assess NIHSS consistency with anatomy</li>
          <li>NCCT head (rule out hemorrhage / established infarct)</li>
          <li>CTA head + neck (LVO / dissection)</li>
          <li>MRI DWI if diagnosis uncertain</li>
        </ol>
      </div>
      <div class="card" style="background:#1e3a8a; color:#fff">
        <p class="text-sm">If sudden, focal, stereotyped stroke story — do not over-withhold TNK for fear of a mimic. Mimic ICH rate on TNK is very low (~0.5%). Confirm with OTN Telestroke if uncertain.</p>
      </div>`;
  } else {
    const chams = window.STROKE_CHAMELEONS || [];
    const camCards = chams.map(c => {
      const title = c.presentation || c.name || c.label || '';
      const terr = c.territory ? `<div style="margin-bottom:6px"><strong>Likely territory:</strong> ${c.territory}</div>` : '';
      const why = c.whyMissed ? `<div><strong>Why it's missed:</strong> ${c.whyMissed}</div>` : '';
      return `
      <details class="check-item" style="margin-bottom:8px">
        <summary style="font-weight:700; cursor:pointer; padding:10px 0">${title}</summary>
        <div class="check-detail open" style="padding:6px 0 10px">
          ${terr}${why}
        </div>
      </details>`;
    }).join('');

    host.innerHTML = `
      <div class="mimic-banner" style="padding:12px; border-radius:10px; background:#7f1d1d; color:#fff; margin-bottom:12px; font-weight:600">Strokes can look like mimics. If the story is sudden focal change and CT/CTA unrevealing: MRI DWI or admit for observation — DO NOT discharge.</div>
      ${camCards}
      <div class="card" style="background:#7f1d1d; color:#fff">
        <div class="card-title" style="color:#fff">🛡 Safety-net</div>
        <p class="text-sm">Key chameleons: isolated vertigo (posterior circulation), isolated limb shaking (limb-shaking TIA), confusional state (thalamic / bilateral PCA), pure sensory loss, post-ictal Todd's presenting after unwitnessed seizure. When the story is sudden and stereotyped — do not discharge. MRI DWI or admit for observation.</p>
      </div>`;
  }
}

function renderSyndromeRef() {
  const host = document.getElementById('syndrome-ref-content');
  if (!host) return;
  const details = window.SYNDROME_DETAILS || {};

  function synCard(syn) {
    if (!syn) return '';
    const table = Array.isArray(syn.featuresTable)
      ? `<table class="finding-table"><thead><tr><th>Finding</th><th>Explanation</th></tr></thead><tbody>${syn.featuresTable.map(r => {
          const a = r.finding || r.sign || r[0] || '';
          const b = r.explanation || r.detail || r.mechanism || r[1] || '';
          return `<tr><td>${a}</td><td>${b}</td></tr>`;
        }).join('')}</tbody></table>`
      : '';
    const mimics = Array.isArray(syn.mimicsToConsider) && syn.mimicsToConsider.length
      ? `<div style="margin-top:8px"><strong>Mimics to consider:</strong> <ul style="padding-left:18px">${syn.mimicsToConsider.map(m => `<li>${m}</li>`).join('')}</ul></div>`
      : '';
    const note = syn.sourceNote ? `<div class="text-sm" style="color:var(--text-dim); margin-top:6px; font-style:italic">${syn.sourceNote}</div>` : '';
    return `
      <details class="check-item" style="margin-bottom:8px">
        <summary style="font-weight:700; cursor:pointer; padding:10px 0">${syn.name || ''}</summary>
        <div class="check-detail open" style="padding:6px 0 10px">
          ${syn.anatomy ? `<div><strong>Anatomy:</strong> ${syn.anatomy}</div>` : ''}
          ${syn.vascularSupply ? `<div style="margin-top:4px"><strong>Vascular supply:</strong> ${syn.vascularSupply}</div>` : ''}
          ${table ? `<div style="overflow-x:auto; margin-top:8px">${table}</div>` : ''}
          ${mimics}
          ${note}
        </div>
      </details>`;
  }

  // Dedupe by object identity so aliases pointing to the same syndrome object render once per section
  function collect(ids) {
    const seen = new Set();
    const out = [];
    for (const id of ids) {
      const syn = details[id];
      if (!syn || seen.has(syn)) continue;
      seen.add(syn);
      out.push(synCard(syn));
    }
    return out.join('');
  }

  const allIds = Object.keys(details);
  const pick = (predicate) => allIds.filter(predicate);

  const anteriorIds = pick(id => /mca|aca|ant_choroidal|anterior_choroidal|gerstmann/i.test(id));
  const posteriorIds = pick(id => /^pca$|pca_|_pca|bao|top_basilar|top_of_basilar|anton|balint|^posterior$/i.test(id));
  const lacunarIds = pick(id => /lacunar|pure_motor|pure_sensory|sensorimotor|dysarthria|ataxic/i.test(id));
  const brainstemIds = pick(id => /wallenberg|medial_medullary|foville|marie_foix|weber|claude|benedikt|lateral_medullary|lateral_pontine|medial_pontine|midbrain/i.test(id));
  const spinalIds = pick(id => /spinal/i.test(id));

  const ruleOf4 = window.BRAINSTEM_RULE_OF_4;
  let ruleHtml = '';
  if (ruleOf4) {
    const rows = Array.isArray(ruleOf4)
      ? ruleOf4.map(r => `<li>${r}</li>`).join('')
      : (ruleOf4.rules || []).map(r => `<li>${r}</li>`).join('');
    const intro = ruleOf4.intro || ruleOf4.title || 'Rule of 4';
    ruleHtml = `<div class="card"><div class="card-title">🧱 ${intro}</div><ul style="padding-left:18px; line-height:1.8; font-size:14px; color:var(--text-dim)">${rows}</ul>${ruleOf4.footer ? `<div class="text-sm" style="margin-top:6px; color:var(--text-dim)">${ruleOf4.footer}</div>` : ''}</div>`;
  }

  host.innerHTML = `
    <details class="card" open>
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Anterior circulation</summary>
      <div style="margin-top:10px">${collect(anteriorIds) || '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>'}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Posterior circulation</summary>
      <div style="margin-top:10px">${collect(posteriorIds) || '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>'}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Lacunar syndromes</summary>
      <div style="margin-top:10px">${collect(lacunarIds) || '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>'}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Brainstem syndromes</summary>
      <div style="margin-top:10px">
        ${ruleHtml}
        ${collect(brainstemIds) || '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>'}
      </div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Spinal cord</summary>
      <div style="margin-top:10px">${collect(spinalIds) || '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>'}</div>
    </details>`;
}

function renderNihssRef() {
  const host = document.getElementById('nihss-ref-content');
  if (!host) return;

  const gen = window.NIHSS_GENERAL_RULES || [];
  const sev = window.NIHSS_SEVERITY || [];
  const notAssessed = window.NIHSS_NOT_ASSESSED || [];
  const hintsExam = window.HINTS_EXAM || [];
  const hintsRule = window.HINTS_RULE || '';
  const funcClues = window.NIHSS_FUNCTIONAL_CLUES || [];
  const pearls = window.NIHSS_EXAM_PEARLS || [];
  const useful = window.NIHSS_CLINICAL_USE || [];
  const limits = window.NIHSS_LIMITATIONS || [];

  const listify = (arr) => Array.isArray(arr) && arr.length
    ? `<ul style="padding-left:18px; line-height:1.8; font-size:14px; color:var(--text-dim)">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`
    : '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>';

  const sevRows = sev.map(b => `
    <div style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; background:${b.color}; color:#000; margin-bottom:6px; font-weight:600">
      <span style="min-width:60px">${b.min}–${b.max}</span>
      <span>${b.label}</span>
    </div>`).join('');

  const hintsTable = hintsExam.length
    ? `<div style="overflow-x:auto"><table class="finding-table">
        <thead><tr><th>Test</th><th>Peripheral</th><th>Central (stroke)</th></tr></thead>
        <tbody>${hintsExam.map(r => {
          const test = r.test || r.name || '';
          const peripheral = r.peripheral || r.benign || '';
          const central = r.central || r.stroke || r.dangerous || '';
          return `<tr><td>${test}</td><td>${peripheral}</td><td>${central}</td></tr>`;
        }).join('')}</tbody>
      </table></div>`
    : '';

  host.innerHTML = `
    <details class="card" open>
      <summary style="font-weight:700; font-size:16px; cursor:pointer">General rules</summary>
      <div style="margin-top:10px">${listify(gen)}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Severity bands</summary>
      <div style="margin-top:10px">${sevRows || '<p class="text-sm" style="color:var(--text-dim)">No entries available.</p>'}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">What NIHSS does NOT assess</summary>
      <div style="margin-top:10px">${listify(notAssessed)}</div>
    </details>
    <details class="card" id="hints-section">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Blind-spot supplement: HINTS exam</summary>
      <div style="margin-top:10px">
        ${hintsTable}
        ${hintsRule ? `<div class="text-sm" style="margin-top:8px; color:var(--text-dim)"><strong>Rule:</strong> ${hintsRule}</div>` : ''}
      </div>
    </details>
    <details class="card" id="nihss-ref-functional-clues">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Functional weakness clues</summary>
      <div style="margin-top:10px">${listify(funcClues)}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Misc exam pearls</summary>
      <div style="margin-top:10px">${listify(pearls)}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Clinical use</summary>
      <div style="margin-top:10px">${listify(useful)}</div>
    </details>
    <details class="card">
      <summary style="font-weight:700; font-size:16px; cursor:pointer">Limitations</summary>
      <div style="margin-top:10px">${listify(limits)}</div>
    </details>`;
}

function renderAlgorithm() {
  const host = document.getElementById('algorithm-content');
  if (!host) return;
  const algo = window.BEDSIDE_ALGORITHM || {};
  const order = ['0-2','2-5','5-10','10-25','25-60'];

  const bucketHtml = order.map(key => {
    const bucket = algo[key];
    if (!bucket) return '';
    const isArr = Array.isArray(bucket);
    const items = isArr ? bucket : (bucket.items || bucket.actions || []);
    const title = (!isArr && bucket.title) || `${key} min`;
    const rows = items.map(it => {
      const text = typeof it === 'string' ? it : (it.text || it.label || it.action || '');
      const detail = (typeof it === 'object' && it.detail) ? `<div style="font-size:12px; color:var(--text-dim); margin-top:2px">${it.detail}</div>` : '';
      const link = typeof it === 'object' ? it.link : null;
      let arrow = '';
      if (link) {
        const isSide = SIDE_SCREENS.includes(link);
        const fn = isSide ? `goToSide('${link}')` : `goToStep('${link}')`;
        arrow = `<button class="algo-link" onclick="${fn}" style="background:none; border:none; color:var(--blue); font-size:18px; cursor:pointer; padding:0 4px" aria-label="Go">→</button>`;
      }
      return `<div style="display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-bottom:1px solid var(--border)"><div style="flex:1; font-size:14px"><div>${text}</div>${detail}</div>${arrow}</div>`;
    }).join('');
    return `
      <details class="algorithm-bucket card" open>
        <summary style="font-weight:700; font-size:15px; cursor:pointer">⏱ ${title}</summary>
        <div style="margin-top:8px">${rows || '<p class="text-sm" style="color:var(--text-dim)">No items.</p>'}</div>
      </details>`;
  }).join('');

  // Pocket reference cards
  const phq = window.PARALLEL_HISTORY_QUESTIONS;
  let phqHtml = '';
  if (Array.isArray(phq) && phq.length) {
    const rows = phq.map(q => {
      if (typeof q === 'string') return `<div class="phq-item"><div class="phq-ask">${q}</div></div>`;
      const a = q.question || q.q || q.ask || '';
      const b = q.why || q.rationale || q.purpose || '';
      return `<div class="phq-item"><div class="phq-ask">${a}</div>${b ? `<div class="phq-why">${b}</div>` : ''}</div>`;
    }).join('');
    phqHtml = `
      <div class="card">
        <div class="card-title">🗣 Parallel history questions</div>
        <div class="phq-list">${rows}</div>
      </div>`;
  }

  const cortical = window.CORTICAL_LVO_SCREEN || [];
  const corticalRule = window.CORTICAL_LVO_RULE || '';
  const corticalHtml = cortical.length
    ? `<div class="card">
        <div class="card-title">⚡ Cortical quick-screen (LVO)</div>
        <ul style="padding-left:18px; line-height:1.8; font-size:14px; color:var(--text-dim)">${cortical.map(c => `<li>${c.label || c.name || c.key || ''}${c.detail ? ` — ${c.detail}` : ''}</li>`).join('')}</ul>
        ${corticalRule ? `<div class="text-sm" style="margin-top:6px; color:var(--text-dim)"><strong>Rule:</strong> ${corticalRule}</div>` : ''}
      </div>`
    : '';

  const bp = window.BP_TARGETS || [];
  const bpHtml = bp.length
    ? `<div class="card">
        <div class="card-title">💢 BP targets</div>
        <div style="overflow-x:auto"><table class="finding-table"><thead><tr><th>Scenario</th><th>Target</th><th>Notes</th></tr></thead><tbody>${bp.map(r => `<tr><td>${r.scenario || r.context || r.label || ''}</td><td>${r.target || r.bp || ''}</td><td>${r.notes || r.rationale || ''}</td></tr>`).join('')}</tbody></table></div>
      </div>`
    : '';

  const doac = window.DOAC_REVERSAL || [];
  const doacFoot = window.DOAC_REVERSAL_FOOTER || '';
  const doacHtml = doac.length
    ? `<div class="card">
        <div class="card-title">💉 DOAC / anticoag reversal</div>
        <div style="overflow-x:auto"><table class="finding-table"><thead><tr><th>Drug</th><th>Reversal</th><th>Dose</th><th>Notes</th></tr></thead><tbody>${doac.map(r => `<tr><td>${r.drug || r.name || ''}</td><td>${r.reversal || r.agent || ''}</td><td>${r.dose || ''}</td><td>${r.notes || r.caveat || ''}</td></tr>`).join('')}</tbody></table></div>
        ${doacFoot ? `<div class="text-sm" style="margin-top:6px; color:var(--text-dim)">${doacFoot}</div>` : ''}
      </div>`
    : '';

  const postRed = window.POSTERIOR_RED_FLAGS || [];
  const postHtml = postRed.length
    ? `<div class="card"><div class="card-title">🚩 Posterior circulation red flags</div><ul style="padding-left:18px; line-height:1.8; font-size:14px; color:var(--text-dim)">${postRed.map(x => `<li>${x}</li>`).join('')}</ul></div>`
    : '';

  const mimicRed = window.MIMIC_RED_FLAGS || [];
  const mimicHtml = mimicRed.length
    ? `<div class="card"><div class="card-title">🚩 Mimic red flags</div><ul style="padding-left:18px; line-height:1.8; font-size:14px; color:var(--text-dim)">${mimicRed.map(x => `<li>${x}</li>`).join('')}</ul></div>`
    : '';

  const r4 = window.BRAINSTEM_RULE_OF_4;
  let r4Html = '';
  if (r4) {
    const rows = Array.isArray(r4) ? r4 : (r4.rules || []);
    if (rows.length) {
      r4Html = `<div class="card"><div class="card-title">🧱 Brainstem Rule of 4</div><ul style="padding-left:18px; line-height:1.8; font-size:14px; color:var(--text-dim)">${rows.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    }
  }

  const legacyHtml = `
    <div class="card">
      <div class="card-title">📚 Legacy / international CIs (for comparison)</div>
      <p class="text-sm" style="color:var(--text-dim)">International guidelines traditionally cite tPA (alteplase) 0.9 mg/kg (max 90 mg), 10% bolus + 90% over 60 min. This app uses <strong>tenecteplase (TNK) 0.25 mg/kg (max 25 mg) single IV bolus</strong>, now the preferred agent at Lakeridge Health and per 2022/2025 CSBPR.</p>
    </div>`;

  host.innerHTML = `
    ${bucketHtml}
    ${phqHtml}
    ${corticalHtml}
    ${bpHtml}
    ${doacHtml}
    ${postHtml}
    ${mimicHtml}
    ${r4Html}
    ${legacyHtml}
    <div class="card" style="background:#1e3a8a; color:#fff; text-align:center; font-weight:600">
      Mental loop: Is it a stroke? → Where is it? → Can I treat? → When? → Watch for deterioration.
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  loadState();
  renderHome();
  goTo('home');

  // New case button
  document.getElementById('new-case-btn').addEventListener('click', () => {
    STATE.current = newSession();
    STATE.sessions.unshift(STATE.current);
    saveState();
    renderLabel();
    goTo('step-label');
  });

  // Back button (header) + bottom nav back buttons
  function handleBack() {
    const currentStep = STATE.current ? STATE.current.currentStep : 'home';
    const idx = STEPS.indexOf(currentStep);
    if (idx <= 0) { goTo('home'); renderHome(); }
    else {
      const prev = STEPS[idx - 1];
      if (prev === 'home') { goTo('home'); renderHome(); return; }
      goToStep(prev);
    }
  }
  document.getElementById('back-btn').addEventListener('click', handleBack);
  document.querySelectorAll('.nav-back-btn').forEach(btn => btn.addEventListener('click', handleBack));

  // Step navigation buttons
  document.getElementById('label-next').addEventListener('click', () => {
    renderTiming();
    goTo('step-timing');
  });

  document.getElementById('timing-next').addEventListener('click', () => {
    renderAbsContra();
    goTo('step-abs-contra');
  });

  document.getElementById('abs-next').addEventListener('click', () => {
    renderRelContra();
    goTo('step-rel-contra');
  });

  document.getElementById('rel-next').addEventListener('click', () => {
    renderHistory();
    goTo('step-history');
  });

  document.getElementById('history-next').addEventListener('click', () => {
    renderQuickScreen();
    goTo('step-quick-screen');
  });

  document.getElementById('quick-screen-next').addEventListener('click', () => {
    renderNIHSS();
    goTo('step-nihss');
  });

  document.getElementById('posterior-next').addEventListener('click', () => {
    renderSyndrome();
    goTo('step-syndrome');
  });

  document.getElementById('syndrome-next').addEventListener('click', () => {
    renderCT();
    goTo('step-ct');
  });

  document.getElementById('ct-next').addEventListener('click', () => {
    renderDecision();
    goTo('step-decision');
  });

  document.getElementById('decision-next').addEventListener('click', () => {
    renderConsent();
    goTo('step-consent');
  });

  document.getElementById('consent-next').addEventListener('click', () => {
    renderNote();
    goTo('step-note');
  });

  // Copy note button
  document.getElementById('copy-note-btn').addEventListener('click', async () => {
    const text = document.getElementById('note-output').textContent;
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.getElementById('copy-note-btn');
      btn.textContent = '✓ Copied to Clipboard';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy Note to Clipboard';
        btn.classList.remove('copied');
      }, 3000);
    } catch(e) {
      alert('Could not copy automatically. Please long-press the note text and select All → Copy.');
    }
  });

  // Regenerate note on each visit
  document.getElementById('regen-note-btn').addEventListener('click', () => { renderNote(); });

  // Home btn from note screen
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      renderHome();
      goTo('home');
    });
  }

  // Clear all data
  document.getElementById('clear-data-btn').addEventListener('click', () => {
    if (confirm('Clear all saved cases? This cannot be undone.')) {
      STATE.sessions = [];
      STATE.current = null;
      saveState();
      renderHome();
      goTo('home');
    }
  });

  // Cookie Theft Picture — delegated click handler (button is rendered dynamically)
  document.addEventListener('click', (e) => {
    if (e.target.id === 'open-cookie-picture' || e.target.closest('#open-cookie-picture')) {
      showCookiePicture();
    }
  });

  // Cookie overlay close button
  document.getElementById('cookie-overlay-close').addEventListener('click', hideCookiePicture);
}

function goToStep(stepId) {
  // Side screens take their own path (don't corrupt currentStep)
  if (SIDE_SCREENS.includes(stepId)) {
    window.goToSide(stepId);
    return;
  }
  switch(stepId) {
    case 'home': renderHome(); break;
    case 'step-label': renderLabel(); break;
    case 'step-timing': renderTiming(); break;
    case 'step-abs-contra': renderAbsContra(); break;
    case 'step-rel-contra': renderRelContra(); break;
    case 'step-history': renderHistory(); break;
    case 'step-quick-screen': renderQuickScreen(); break;
    case 'step-nihss': renderNIHSS(); break;
    case 'step-posterior': renderPosterior(); break;
    case 'step-syndrome': renderSyndrome(); break;
    case 'step-ct': renderCT(); break;
    case 'step-decision': renderDecision(); break;
    case 'step-consent': renderConsent(); break;
    case 'step-note': renderNote(); break;
  }
  goTo(stepId);
}
window.goToStep = goToStep;

// ── Cookie Theft Picture (NIHSS Item 9) ───────────────────────
// Validated aphasia assessment picture
// Used in NIHSS to assess language / aphasia
window.COOKIE_THEFT_IMG = 'aphasia-image.png';

function showCookiePicture() {
  const overlay = document.getElementById('cookie-overlay');
  const content = document.getElementById('cookie-overlay-content');
  content.innerHTML = `<img src="${window.COOKIE_THEFT_IMG}" alt="Aphasia Assessment Picture" style="width:100%; max-height:80vh; object-fit:contain; border-radius:8px; background:#fff;">`;
  overlay.style.display = 'flex';
}

function hideCookiePicture() {
  document.getElementById('cookie-overlay').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);

// Expose for inline handlers
window.renderHomeGlobal = renderHome;
window.goTo = goTo;
