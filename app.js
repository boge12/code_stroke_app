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
  'step-nihss',
  'step-posterior',
  'step-syndrome',
  'step-ct',
  'step-decision',
  'step-consent',
  'step-dispo',
  'step-admit',
  'step-note',
];

const NIHSS_ORDER = ['1a','1b','1c','2','3','4','5a','5b','6a','6b','7','8','9','10','11'];

// ── Side Screens (reference material; not part of linear flow) ──
const SIDE_SCREENS = ['step-mimics','step-syndrome-ref','step-nihss-ref','step-algorithm','step-localization-exam'];
let SIDE_RETURN_TO = null;

const SIDE_TITLES = {
  'step-mimics': 'Mimics & Chameleons',
  'step-syndrome-ref': 'Stroke Syndromes',
  'step-nihss-ref': 'NIHSS Reference',
  'step-algorithm': 'Bedside Algorithm',
};

window.goToSide = function(sideId) {
  SIDE_RETURN_TO = (STATE.current && STATE.current.currentStep) || (document.querySelector('.screen.active') || {id:'home'}).id.replace('screen-','') || 'home';
  // hide all screens, show side screen
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById('screen-' + sideId);
  if (!screen) return;
  screen.classList.add('active');
  window.scrollTo(0,0);
  // Sync main header: reference title, working back button, no progress bar
  document.getElementById('header-title').textContent = SIDE_TITLES[sideId] || 'Reference';
  document.getElementById('back-btn').style.display = '';
  const track = document.getElementById('progress-track');
  if (track) track.style.display = 'none';
  // render content
  if (sideId === 'step-mimics') renderMimics('mimics');
  else if (sideId === 'step-syndrome-ref') renderSyndromeRef();
  else if (sideId === 'step-nihss-ref') renderNihssRef();
  else if (sideId === 'step-algorithm') renderAlgorithm();
  else if (sideId === 'step-localization-exam') renderLocalizationExam();
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
    corticalScreen: { gaze: false, aphasia: false, neglect: false, hemiparesis: false, hemiparesisSide: null },
    posteriorScreen: { fiveD: null, vertigoFocal: null, gaitAtaxia: null, verticalGazeSkew: null },
    relevantHistory: {}, // id -> { val: 'yes'|'no'|null|string|number, detail: string }
    nihssReassess: null,
    workupDone: {},
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
// Next-button gating: returns {ok, reason} for a given step.
function canAdvance(stepId) {
  const s = STATE.current;
  if (!s) return { ok: true };
  if (stepId === 'step-timing') {
    if (!s.onsetKnown) return { ok: false, reason: 'Select onset category to continue.' };
    if (!s.lsn) return { ok: false, reason: s.onsetKnown === 'wakeup' ? 'Enter bedtime / last seen well.' : 'Enter last known normal time.' };
    if (s.onsetKnown === 'wakeup' && !s.wakeTime) return { ok: false, reason: 'Enter wake/found time.' };
  }
  return { ok: true };
}

// Disable/enable a Next button and surface the reason in the shared
// #nav-gate-hint strip above the footer.
function setNextGate(btnId, stepId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const { ok, reason } = canAdvance(stepId);
  btn.disabled = !ok;
  btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  btn.classList.toggle('btn-nav-locked', !ok);
  if (reason) btn.title = reason; else btn.removeAttribute('title');
  const hint = document.getElementById('nav-gate-hint');
  if (hint) {
    hint.textContent = ok ? '' : (reason || '');
    hint.hidden = ok;
  }
}

function clearGateHint() {
  const hint = document.getElementById('nav-gate-hint');
  if (hint) { hint.textContent = ''; hint.hidden = true; }
}

function goTo(stepId) {
  dcUserToggle = null; // fresh default for the disabling verdict on each navigation
  clearGateHint();
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
}

// Always-visible TNK-window clock: elapsed since LKN (or wake/found time for
// wake-up strokes). Yellow approaching the 4.5h cutoff, red once past it.
function updateLknChip() {
  const chip = document.getElementById('lkn-chip');
  if (!chip) return;
  const s = STATE.current;
  const active = document.querySelector('.screen.active');
  const onHome = !active || active.id === 'screen-home';
  if (!s || onHome) { chip.style.display = 'none'; return; }
  const isWakeup = s.onsetKnown === 'wakeup';
  const min = elapsedMin(isWakeup ? s.wakeTime : s.lsn);
  if (min === null || min < 0) { chip.style.display = 'none'; return; }
  const h = Math.floor(min / 60);
  const m = min % 60;
  chip.textContent = `${isWakeup ? 'Found' : 'LKN'} ${h}:${String(m).padStart(2, '0')}`;
  chip.className = 'lkn-chip' + (min > 270 ? ' lkn-over' : min > 225 ? ' lkn-warn' : '');
  chip.style.display = '';
}

function updateHeader(stepId) {
  const header = document.getElementById('main-header');
  const backBtn = document.getElementById('back-btn');
  const title = document.getElementById('header-title');
  const badge = document.getElementById('nihss-badge');

  // Titles are phases matching the real workflow: at the bedside →
  // patient in the scanner → results back, decide → document.
  const titles = {
    'home': 'Code Stroke',
    'step-label': 'Bedside · Patient',
    'step-timing': 'Bedside · Timing',
    'step-abs-contra': 'Bedside · Absolute CIs',
    'step-rel-contra': 'Bedside · Relative CIs',
    'step-nihss': 'Bedside · NIHSS',
    'step-posterior': 'Scanner · Posterior Check',
    'step-syndrome': 'Scanner · Syndrome',
    'step-ct': 'Decide · CT Results',
    'step-decision': 'Decide · TNK / EVT',
    'step-consent': 'Treat · Consent & TNK',
    'step-dispo': 'Dispo · Destination',
    'step-admit': 'Dispo · Admission Orders',
    'step-note': 'Document · EMR Note',
  };

  title.textContent = titles[stepId] || 'Code Stroke';
  backBtn.style.display = stepId === 'home' ? 'none' : '';

  // Slim progress bar — how far through the workflow
  const track = document.getElementById('progress-track');
  const fill = document.getElementById('progress-fill');
  if (track && fill) {
    const idx = STEPS.indexOf(stepId);
    if (idx > 0) {
      track.style.display = '';
      fill.style.width = `${Math.round((idx / (STEPS.length - 1)) * 100)}%`;
    } else {
      track.style.display = 'none';
    }
  }

  if (STATE.current && stepId !== 'home') {
    const total = getNIHSSTotal(STATE.current.nihss);
    badge.textContent = `NIHSS ${total}`;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }

  updateLknChip();
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
      goToStep(sess.currentStep || 'step-timing');
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
    } else if (windowMin <= 540) {
      badge.className = 'time-window-badge window-close';
      badge.innerHTML = isWakeup
        ? `⚠️ >4.5h since found (${elapsedLabel(wakeMin)}) — TNK needs imaging selection (DWI-FLAIR / CTP)`
        : `⚠️ Standard TNK window closed (${elapsedLabel(lsnMin)}) — 4.5–9h: imaging-based selection with stroke expert; EVT ≤24h`;
    } else if (windowMin <= 1440) {
      badge.className = 'time-window-badge window-close';
      badge.innerHTML = isWakeup
        ? `⚠️ >4.5h since found (${elapsedLabel(wakeMin)}) — standard TNK closed`
        : `⚠️ TNK WINDOW CLOSED (${elapsedLabel(lsnMin)}) — EVT may still be possible ≤24h`;
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

    updateLknChip();
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

  const applyGate = () => setNextGate('timing-next', 'step-timing');
  refresh();
  applyGate();
  onsetBtns.forEach(b => b.addEventListener('click', applyGate));
  onsetInp.addEventListener('change', applyGate);
  if (wakeInp) wakeInp.addEventListener('change', applyGate);

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

  // Baseline mRS — the one keeper from the removed Relevant History step
  // (EVT requires pre-stroke mRS ≤ 2)
  STATE.current.relevantHistory = STATE.current.relevantHistory || {};
  const mrsVal = (STATE.current.relevantHistory.baseline_mrs || {}).val;
  const mrsChoices = [
    { v: '0', lbl: '0 — No symptoms' },
    { v: '1', lbl: '1 — No significant disability' },
    { v: '2', lbl: '2 — Slight disability' },
    { v: '3', lbl: '3 — Moderate' },
    { v: '4', lbl: '4 — Moderately severe' },
    { v: '5', lbl: '5 — Severe' },
  ];
  const mrsCard = document.createElement('div');
  mrsCard.className = 'card qs-card';
  mrsCard.style.marginTop = '14px';
  mrsCard.innerHTML = `
    <div class="qs-card-title">Baseline function / pre-stroke mRS</div>
    <div class="qs-card-sub">EVT criteria require pre-stroke mRS ≤ 2. Not independent at baseline? Treatment may still be considered case-by-case — review risks/benefits and goals of care with a stroke expert (CSBPR).</div>
    <div class="mrs-grid">
      ${mrsChoices.map(c => `<button class="mrs-pill${mrsVal === c.v ? ' active' : ''}" data-val="${c.v}">${c.lbl}</button>`).join('')}
    </div>`;
  mrsCard.querySelectorAll('.mrs-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const rh = STATE.current.relevantHistory;
      rh.baseline_mrs = rh.baseline_mrs || {};
      rh.baseline_mrs.val = rh.baseline_mrs.val === btn.dataset.val ? null : btn.dataset.val;
      saveCurrentSession();
      renderRelContra();
    });
  });
  container.appendChild(mrsCard);

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

// NIHSS item id → cortical flag key
const NIHSS_TO_CORTICAL = { '2': 'gaze', '9': 'aphasia', '11': 'neglect' };

function syncCorticalFromNIHSS() {
  const n = STATE.current.nihss || {};
  const cs = STATE.current.corticalScreen = STATE.current.corticalScreen
    || { gaze: false, aphasia: false, neglect: false, hemiparesis: false, hemiparesisSide: null };
  cs.gaze    = Number(n['2'])  >= 1;
  cs.aphasia = Number(n['9'])  >= 1;
  cs.neglect = Number(n['11']) >= 1;
  const anyL = Number(n['5a']) >= 1 || Number(n['6a']) >= 1;
  const anyR = Number(n['5b']) >= 1 || Number(n['6b']) >= 1;
  cs.hemiparesis = anyL || anyR;
  if (cs.hemiparesis) {
    if (anyL && !anyR) cs.hemiparesisSide = 'L';
    else if (anyR && !anyL) cs.hemiparesisSide = 'R';
    // bilateral or already-picked: leave current value (preserves user choice)
  } else {
    cs.hemiparesisSide = null;
  }
}

function renderNIHSS() {
  nihssCurrentIdx = STATE.current.nihssCurrentIdx || 0;
  STATE.current.corticalScreen = STATE.current.corticalScreen || { gaze: false, aphasia: false, neglect: false, hemiparesis: false, hemiparesisSide: null };
  if (!('hemiparesisSide' in STATE.current.corticalScreen)) STATE.current.corticalScreen.hemiparesisSide = null;
  renderNIHSSItem();
  renderNIHSSTabs();
}

// ── Live LVO banner on the NIHSS screen ───────────────────────
// The former standalone cortical screen's job, done automatically:
// flags sync from NIHSS scores, and the EVT alert fires the moment
// a cortical sign + NIHSS ≥ 6 coexist.
function updateNihssLvoBanner() {
  const host = document.getElementById('nihss-lvo-banner');
  if (!host || !STATE.current) return;
  syncCorticalFromNIHSS();
  const total = getNIHSSTotal(STATE.current.nihss);
  const cs = STATE.current.corticalScreen || {};
  const anyCortical = ['gaze', 'aphasia', 'neglect', 'hemiparesis'].some(k => cs[k] === true);
  if (anyCortical && total >= 6) {
    host.innerHTML = `
      <div class="status-banner status-red" style="margin-bottom:10px">
        <span class="status-icon">🚨</span>
        <div class="status-body">
          <div class="status-title">Presumed LVO — activate EVT pathway now</div>
          <div class="status-detail">Cortical sign + NIHSS ≥6. Do not wait for CTA to make the call.</div>
        </div>
      </div>`;
  } else {
    host.innerHTML = `<div class="qs-rule-banner" style="margin-bottom:10px"><span class="qs-rule-icon">⚡</span><span>${window.CORTICAL_LVO_RULE || 'Any one cortical sign + NIHSS ≥ 6 → presume LVO.'}</span></div>`;
  }
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

  const ps = STATE.current.posteriorScreen;
  const anyYes = Object.values(ps).some(v => v === true);
  const allNo = ['fiveD', 'vertigoFocal', 'gaitAtaxia', 'verticalGazeSkew'].every(k => ps[k] === false);
  const vertigoYes = ps.vertigoFocal === true;

  // Verdict: a positive screen must change what happens next
  let verdictHtml = '';
  if (anyYes) {
    verdictHtml = `
      <div class="status-banner status-yellow" style="margin-top:12px; margin-bottom:0">
        <span class="status-icon">🚨</span>
        <div class="status-body">
          <div class="status-title">Posterior circulation suspected — this changes 4 things</div>
          <div class="status-detail" style="line-height:1.7">
            1. Treat as potentially <strong>disabling even with a low NIHSS</strong> — posterior strokes under-score.<br>
            2. Confirm CTA covers <strong>vertebrals + basilar</strong> — basilar occlusion is an EVT indication (≤24h).<br>
            3. CT is poor in the posterior fossa — if CT/CTA unrevealing, <strong>MRI DWI or admit. Do NOT discharge.</strong><br>
            4. Vertigo-predominant? Do the <strong>HINTS exam</strong> before calling it peripheral.
          </div>
          <button onclick="goToSide('step-nihss-ref'); setTimeout(()=>{const el=document.getElementById('hints-section'); if(el){el.open=true; el.scrollIntoView({behavior:'smooth'});}},120);" style="margin-top:8px; padding:10px 14px; border-radius:8px; border:1px solid currentColor; background:transparent; color:inherit; font-weight:600; cursor:pointer">📖 HINTS exam reference →</button>
        </div>
      </div>`;
  } else if (allNo) {
    verdictHtml = `
      <div class="status-banner status-green" style="margin-top:12px; margin-bottom:0">
        <span class="status-icon">✅</span>
        <div class="status-body"><div class="status-title">No posterior red flags — continue</div></div>
      </div>`;
  }

  host.innerHTML = `
    <div class="card qs-card">
      <div class="qs-card-title">🧠 Posterior circulation check</div>
      <div class="qs-card-sub">Why this step: NIHSS misses posterior strokes — a basilar occlusion can score 2. Four taps to catch what it missed.</div>
      <div id="posterior-check">
        ${posteriorItems.map(it => {
          const val = ps[it.key];
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
      ${verdictHtml}
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
    btn.onclick = () => {
      const k = btn.dataset.qsKey;
      const v = btn.dataset.qsVal === 'true';
      // Tap the active pill again to clear
      STATE.current.posteriorScreen[k] = STATE.current.posteriorScreen[k] === v ? null : v;
      saveCurrentSession();
      renderPosterior();
    };
  });
}

function updateLvoBanner() {
  const banner = document.getElementById('lvo-banner');
  if (!banner) return;
  syncCorticalFromNIHSS();
  const total = getNIHSSTotal(STATE.current.nihss || {});
  const cs = STATE.current.corticalScreen || {};
  const anyChecked = Object.values(cs).some(v => v === true);
  if (total >= 6 && anyChecked) {
    banner.innerHTML = `
      <div class="lvo-banner" style="margin-top:12px; padding:12px; border-radius:10px; background:var(--red-dark); color:#fff; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
        <div style="font-weight:700; flex:1">🚨 Presumed LVO — activate EVT pathway</div>
        <button class="btn-primary" onclick="goToStep('step-ct')" style="background:#fff; color:var(--red-dark)">Activate EVT pathway →</button>
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

  updateNihssLvoBanner();
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

  // Cortical-flag hint: if this NIHSS item is linked to a cortical flag that's
  // already set AND the current score is 0/undefined, show a yellow prompt.
  const cs = STATE.current.corticalScreen || {};
  let corticalHintHtml = '';
  const hintFor = NIHSS_TO_CORTICAL[item.id];
  const scoreZeroOrBlank = currentVal === undefined || Number(currentVal) === 0;
  if (hintFor && cs[hintFor] && scoreZeroOrBlank) {
    corticalHintHtml = `<div class="mimic-banner"><span class="mimic-icon">⚠️</span><div class="mimic-body"><strong>Cortical flag:</strong> ${hintFor} was marked present on the cortical screen. Score accordingly.</div></div>`;
  } else if (cs.hemiparesis && scoreZeroOrBlank) {
    const side = cs.hemiparesisSide;
    const isLeftItem = item.id === '5a' || item.id === '6a';
    const isRightItem = item.id === '5b' || item.id === '6b';
    if ((side === 'L' && isLeftItem) || (side === 'R' && isRightItem)) {
      corticalHintHtml = `<div class="mimic-banner"><span class="mimic-icon">⚠️</span><div class="mimic-body"><strong>Cortical flag:</strong> dense ${side === 'L' ? 'left' : 'right'} hemiparesis was marked present. Score accordingly.</div></div>`;
    }
  }

  container.innerHTML = `
    <div class="nihss-item-header">
      <div class="nihss-item-number">Item ${nihssCurrentIdx + 1} of ${NIHSS_ORDER.length}</div>
      <div class="nihss-item-name">${item.shortName}</div>
    </div>

    ${corticalHintHtml}

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
      syncCorticalFromNIHSS();
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

  const severeNote = total >= 22
    ? `<div class="status-detail" style="margin-top:4px; font-size:13px; color:#ef9a9a">🚨 Severe — confirm no extensive early infarct on CT. EVT critical.</div>`
    : '';

  document.getElementById('syndrome-nihss-total').innerHTML = `
    <div class="status-banner status-blue">
      <span class="status-icon">🧠</span>
      <div class="status-body">
        <div class="status-title">NIHSS ${total} — ${severity.label}</div>
        ${total <= 5 ? '<div class="status-detail">≤5 mild — TNK only if the deficit is disabling. Run the checklist below.</div>' : ''}
        ${severeNote}
      </div>
    </div>
    ${total <= 5 ? buildDisablingChecklist() : ''}
  `;
  if (total <= 5) {
    wireDisablingChecklist(document.getElementById('syndrome-nihss-total'), renderSyndrome);
  }

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

// Persisted self-check — tap the box to tick, tap → to open the reference
function renderSyndromeSanityCheck() {
  const host = document.getElementById('single-territory-sanity-check');
  if (!host) return;
  const s = STATE.current;
  s.syndromeSelfCheck = s.syndromeSelfCheck || { territory: false, functional: false, sudden: false };
  const sc = s.syndromeSelfCheck;
  const items = [
    { id: 'territory', label: 'Signs fit ONE vascular territory', side: 'step-syndrome-ref' },
    { id: 'functional', label: 'Functional-weakness clues checked', side: 'step-nihss-ref', anchor: 'nihss-ref-functional-clues' },
    { id: 'sudden', label: 'Sudden onset, maximal at start — else think mimic', side: 'step-mimics' },
  ];
  host.innerHTML = `
    <div class="card" style="margin-top:12px; padding:12px 16px">
      <div class="card-title" style="margin-bottom:4px">🧐 Self-check</div>
      ${items.map(it => `
        <div class="checklist-action">
          <div class="action-checkbox${sc[it.id] ? ' done' : ''}" data-sc-id="${it.id}">${sc[it.id] ? '✓' : ''}</div>
          <div class="action-text">${it.label}</div>
          <button class="sc-link" data-sc-link="${it.side}" data-sc-anchor="${it.anchor || ''}" aria-label="Open reference">→</button>
        </div>`).join('')}
    </div>`;
  host.querySelectorAll('[data-sc-id]').forEach(box => {
    box.onclick = () => {
      sc[box.dataset.scId] = !sc[box.dataset.scId];
      saveCurrentSession();
      renderSyndromeSanityCheck();
    };
  });
  host.querySelectorAll('[data-sc-link]').forEach(btn => {
    btn.onclick = () => {
      const anchor = btn.dataset.scAnchor;
      goToSide(btn.dataset.scLink);
      if (anchor) setTimeout(() => { const el = document.getElementById(anchor); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 120);
    };
  });
}

// ── Step: CT ──────────────────────────────────────────────────
function renderCT() {
  const s = STATE.current;

  // Positive posterior screen → CTA coverage reminder
  const postReminder = document.getElementById('ct-posterior-reminder');
  if (postReminder) {
    const postYes = Object.values(s.posteriorScreen || {}).some(v => v === true);
    postReminder.innerHTML = postYes
      ? `<div class="status-banner status-yellow">
          <span class="status-icon">🧠</span>
          <div class="status-body">
            <div class="status-title">Posterior screen was positive</div>
            <div class="status-detail">Confirm CTA covers vertebrals + basilar. If CT/CTA unrevealing → MRI DWI or admit — do not discharge.</div>
          </div>
        </div>`
      : '';
  }

  // CT clear buttons (onclick assignment — renderCT re-runs on every click,
  // so addEventListener here would stack duplicate handlers)
  document.querySelectorAll('.ct-clear-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.ctClear);
    btn.onclick = () => {
      s.ctClear = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    };
  });

  document.getElementById('ct-hemorrhage-section').style.display = s.ctClear === 'no' ? '' : 'none';

  // ASPECTS
  const aspInp = document.getElementById('aspects-input');
  aspInp.value = s.aspects !== null ? s.aspects : '';
  aspInp.onchange = () => {
    const v = parseInt(aspInp.value);
    s.aspects = isNaN(v) ? null : Math.max(0, Math.min(10, v));
    saveCurrentSession();
    refreshAspects();
  };
  refreshAspects();

  // CTA
  document.querySelectorAll('.cta-done-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.ctaDone);
    btn.onclick = () => {
      s.ctaDone = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    };
  });

  document.getElementById('lvo-section').style.display = s.ctaDone === 'yes' ? '' : 'none';

  document.querySelectorAll('.lvo-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.lvo);
    btn.onclick = () => {
      s.lvo = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    };
  });

  document.getElementById('lvo-vessel-section').style.display = s.lvo === 'yes' ? '' : 'none';

  document.querySelectorAll('.vessel-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.vessel === s.lvoVessel);
    btn.onclick = () => {
      s.lvoVessel = btn.dataset.vessel;
      saveCurrentSession();
      renderCT();
    };
  });

  // Medium-vessel occlusions: EVT not uniformly supported (CSBPR 5.4.1 CC6)
  const mvNote = document.getElementById('medium-vessel-note');
  if (mvNote) {
    mvNote.innerHTML = ['M2', 'A2', 'P2'].includes(s.lvoVessel)
      ? `<div class="nihss-note" style="margin-bottom:12px">⚠️ Medium-vessel occlusion (${s.lvoVessel}) — EVT not uniformly supported by trials. Decide after consultation between stroke expert and neurointerventionalist (CSBPR 2025).</div>`
      : '';
  }

  document.querySelectorAll('.collateral-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.val === s.collaterals);
    btn.onclick = () => {
      s.collaterals = btn.dataset.val;
      saveCurrentSession();
      renderCT();
    };
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
// Admission labs & workup — tickable, persisted, printed in the note
const ADMIT_WORKUP_ITEMS = [
  { id: 'bloodwork', label: 'Bloodwork: CBC, lytes, Cr, glucose, lipid panel, HbA1c, TSH, troponin' },
  { id: 'ecg', label: 'ECG (if not already done) — look for AFib' },
  { id: 'holter', label: 'Extended cardiac monitoring (Holter or telemetry × 48–72h) — AFib screening' },
  { id: 'echo', label: 'Echocardiogram (TTE; consider TEE if young or cryptogenic)' },
  { id: 'carotid', label: 'Carotid Doppler / CTA neck (if not done with initial CTA)' },
  { id: 'mri', label: 'MRI brain with DWI (if diagnosis uncertain or to define territory)' },
];

function buildPostStrokeManagement(s, tnkStatus, lvoPresent, evtStatus) {
  const total = getNIHSSTotal(s.nihss);
  // Prefer the recorded administration over the predicted eligibility
  const tnkGiven = s.tnkGiven ? s.tnkGiven === 'yes' : (tnkStatus === 'eligible' || tnkStatus === 'relative');

  let scenarioTitle = '';
  let admitTo = '';
  let monitoringItems = [];
  let medItems = [];
  let investigationItems = [];
  let nursingItems = [];
  let evtCareHtml = '';

  // CSBPR Box 5D — pre-EVT / transfer management + post-EVT care
  const buildEvtCare = () => `
    <details class="card card-collapse">
      <summary style="color:#ef9a9a">🚑 Pre-EVT / Transfer · 5</summary>
      <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
        <li>Maintain O₂ sat >92%; intubate only if reduced oxygenation, vomiting, or heavy sedation needed</li>
        <li>Avoid aggressive BP lowering before reperfusion is achieved</li>
        <li>Aim for euthermia and normoglycemia (hyperglycemia is harmful in acute stroke)</li>
        <li>Contrast allergy is NOT an absolute CI — pre-treat: diphenhydramine 50 mg IV + methylprednisolone 40 mg IV (or hydrocortisone 200 mg IV) + famotidine 20 mg IV</li>
        <li>Foley only if essential to reduce movement — never delay reperfusion for it</li>
      </ul>
      <details class="nihss-exam-details" style="margin-top:8px">
        <summary>Post-EVT care (receiving centre / on return)</summary>
        <ul style="padding-left:18px; font-size:13px; line-height:1.7; color:var(--text-dim); margin-top:6px">
          <li>Supine 2–6h, head of bed ≤30°</li>
          <li>Puncture site checks: q15min × 1h → q30min × 1h → q1h × 1–5h; assess distal pulses with vitals</li>
          <li>Suspect site hematoma with bleeding, swelling, pain, or unexplained ↓Hb → prolonged manual compression + STAT CBC (repeat q4–6h); persistent → CTA/ultrasound ± vascular surgery</li>
          <li>Suspect retroperitoneal hemorrhage with back pain, flank bruising (Grey Turner), periumbilical ecchymosis (Cullen), hypotension/tachycardia → 3-phase CT abdomen, resuscitate</li>
          <li>Neurologic deterioration → STAT CT + CTA (hemorrhagic conversion vs. reocclusion — reocclusion may need repeat EVT)</li>
          <li>Check creatinine — contrast-induced nephropathy; nephrology if identified</li>
          <li>Post-EVT BP target is individualized (recanalization achieved, thrombolysis given, complications, baseline BP)</li>
        </ul>
      </details>
    </details>`;

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
    evtCareHtml = buildEvtCare();
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
    evtCareHtml = buildEvtCare();
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
  investigationItems = ADMIT_WORKUP_ITEMS;

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

  // One banner, then one-line rows — every section carries its count,
  // nothing opens unless tapped.
  const section = (icon, title, color, items) => `
    <details class="card card-collapse">
      <summary style="color:${color}">${icon} ${title} · ${items.length}</summary>
      <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
        ${items.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </details>`;

  const wd = s.workupDone = s.workupDone || {};
  const workupDoneCount = investigationItems.filter(it => wd[it.id]).length;

  return `
    <div class="status-banner status-blue">
      <span class="status-icon">🏥</span>
      <div class="status-body">
        <div class="status-title">${scenarioTitle}</div>
        <div class="status-detail">Admit to: ${admitTo}</div>
      </div>
    </div>

    ${evtCareHtml}

    ${section('📊', 'Monitoring', 'var(--blue)', monitoringItems)}
    ${section('💊', 'Medications', 'var(--yellow)', medItems)}
    <details class="card card-collapse">
      <summary style="color:var(--purple)" id="workup-summary">🔬 Labs & Workup · ${workupDoneCount}/${investigationItems.length} ordered</summary>
      <div id="workup-checklist">
        ${investigationItems.map(it => `
        <div class="checklist-action">
          <div class="action-checkbox${wd[it.id] ? ' done' : ''}" data-workup="${it.id}">${wd[it.id] ? '✓' : ''}</div>
          <div class="action-text">${it.label}</div>
        </div>`).join('')}
      </div>
    </details>
    ${section('🩺', 'Nursing / Allied Health', 'var(--green)', nursingItems)}
  `;
}

// ── Step: Disposition ─────────────────────────────────────────
function renderDispo() {
  const host = document.getElementById('dispo-content');
  if (!host) return;
  host.innerHTML = `
    <div class="card">
      <div class="card-title">Where does this patient go?</div>
      <ul style="padding-left:18px; font-size:15px; line-height:2">
        <li>TNK only → <strong>ICU admission</strong></li>
        <li>EVT candidate → <strong>Critical Care Transport + EVT centre</strong></li>
        <li>Day (08:00+): GIM/Neuro team</li>
        <li>After midnight: ED runs workflow until morning</li>
        <li>Ajax/Pickering EMS → Oshawa campus</li>
        <li>Bowmanville: CT/CTA only — no EVT on site</li>
      </ul>
    </div>

    <div class="card">
      <div class="card-title">Calls & Actions</div>
      <div id="action-checklist">${buildActionChecklist()}</div>
    </div>

    <div class="card">
      <div class="card-title">OTN Telestroke</div>
      <p class="text-sm" style="margin-bottom:0">Call for: borderline, atypical, posterior circulation, or relative CIs. Low threshold — OTN is there to help.</p>
    </div>`;
  setupActionChecklist();
}

// ── Step: Admission Orders ────────────────────────────────────
function renderAdmit() {
  const host = document.getElementById('admit-content');
  if (!host) return;
  const s = STATE.current;
  const tnkStatus = s.decisionStatus || 'ineligible';
  const lvoPresent = s.lvo === 'yes';
  const lsnMin = elapsedMin(s.lsn);
  const aspectsOk = s.aspects === null || s.aspects >= 6;
  const evtStatus = (lvoPresent && lsnMin !== null && lsnMin <= 1440 && aspectsOk) ? 'eligible' : 'none';

  let bpHtml = '';
  const bp = window.BP_TARGETS || [];
  if (bp.length) {
    const rows = bp.map(row => `<tr><td>${row.scenario || row.context || row.label || ''}</td><td>${row.target || row.targetBP || row.bp || ''}</td><td>${row.notes || row.rationale || row.detail || ''}</td></tr>`).join('');
    bpHtml = `
      <details class="card card-collapse">
        <summary style="color:var(--yellow)">💢 BP targets by scenario</summary>
        <div style="overflow-x:auto">
          <table class="finding-table">
            <thead><tr><th>Scenario</th><th>Target</th><th>Notes</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </details>`;
  }

  host.innerHTML = buildPostStrokeManagement(s, tnkStatus, lvoPresent, evtStatus) + bpHtml;

  host.querySelectorAll('[data-workup]').forEach(box => {
    box.onclick = () => {
      const wd = STATE.current.workupDone;
      wd[box.dataset.workup] = !wd[box.dataset.workup];
      saveCurrentSession();
      box.classList.toggle('done', wd[box.dataset.workup]);
      box.textContent = wd[box.dataset.workup] ? '✓' : '';
      const sum = document.getElementById('workup-summary');
      if (sum) {
        const done = ADMIT_WORKUP_ITEMS.filter(it => wd[it.id]).length;
        sum.textContent = `🔬 Labs & Workup · ${done}/${ADMIT_WORKUP_ITEMS.length} ordered`;
      }
    };
  });
}

// "Is the deficit disabling?" framework card — shared by the Syndrome,
// Decision, and Bedside Algorithm screens.
function buildDisablingCard(open) {
  const d = window.DISABLING_DEFICIT;
  if (!d) return '';
  return `
    <details class="card card-collapse"${open ? ' open' : ''}>
      <summary>🎯 Is the deficit disabling?</summary>
      <div class="status-banner status-blue" style="margin-bottom:10px">
        <span class="status-icon">🎯</span>
        <div class="status-body"><div class="status-detail" style="font-weight:600">${d.coreQuestion}</div></div>
      </div>
      <p class="text-sm" style="margin-bottom:10px; color:var(--text-dim)">${d.proxyNote}</p>
      <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim); margin-bottom:10px">
        ${d.lowScoreTraps.map(t => `<li>${t}</li>`).join('')}
      </ul>
      <p class="text-sm" style="margin-bottom:10px; color:var(--text-dim)">${d.nonDisabling}</p>
      <div style="font-size:14px; line-height:1.6; margin-bottom:10px"><strong>Practical rule:</strong> ${d.practicalRule}</div>
      <div style="font-size:14px; line-height:1.6; margin-bottom:10px; color:var(--blue)"><strong>Borderline low-NIHSS:</strong> ${d.borderline}</div>
      <div class="nihss-note">⚠️ ${d.caution}</div>
    </details>`;
}

// Thrombolysis complication management (CSBPR 5.2/5.6) — Decision + Consent screens
function buildTnkComplicationsCard() {
  const c = window.TNK_COMPLICATIONS;
  if (!c) return '';
  return `
    <details class="card card-collapse">
      <summary>🚨 Thrombolysis complications — emergency management</summary>
      <p class="text-sm" style="margin-bottom:10px; color:var(--text-dim)">${c.intro}</p>
      ${c.scenarios.map(sc => `
        <div style="margin-bottom:12px">
          <div style="font-size:14px; font-weight:700; margin-bottom:6px">${sc.title}</div>
          <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
            ${sc.items.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>`).join('')}
    </details>`;
}

// TNK inclusion criteria + EVT 4-criteria eligibility (CSBPR Box 5B / 5.4)
function buildEligibilityCard() {
  const inc = window.TNK_INCLUSION || [];
  const evt = window.EVT_CRITERIA;
  return `
    <details class="card card-collapse">
      <summary>📘 TNK / EVT eligibility criteria (CSBPR)</summary>
      <div style="font-size:14px; font-weight:700; margin-bottom:6px">TNK inclusion (Box 5B)</div>
      <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim); margin-bottom:8px">
        ${inc.map(i => `<li>${i}</li>`).join('')}
      </ul>
      <p class="text-sm" style="margin-bottom:12px; color:var(--text-dim)">${window.EXTENDED_WINDOW_NOTE || ''}</p>
      ${evt ? `
        <div style="font-size:14px; font-weight:700; margin-bottom:6px; padding-top:10px; border-top:1px solid var(--border)">${evt.intro}</div>
        ${evt.criteria.map(cr => `
          <div style="margin-bottom:8px">
            <div style="font-size:13px; font-weight:700; color:var(--blue)">${cr.name}</div>
            <ul style="padding-left:18px; font-size:14px; line-height:1.7; color:var(--text-dim)">
              ${cr.items.map(i => `<li>${i}</li>`).join('')}
            </ul>
          </div>`).join('')}
        <details class="nihss-exam-details" style="margin-top:8px">
          <summary>Key EVT principles</summary>
          <ul style="padding-left:18px; font-size:13px; line-height:1.7; color:var(--text-dim); margin-top:6px">
            ${evt.notes.map(n => `<li>${n}</li>`).join('')}
          </ul>
        </details>` : ''}
    </details>`;
}

// ── Disabling-deficit checklist (interactive, low-NIHSS cases) ──
// Six taps → verdict. Prose framework stays one tap away.
const DISABLING_CHECK_ITEMS = [
  { id: 'aphasia', short: 'aphasia', label: 'Aphasia — any language deficit?', hint: 'wrecks communication / return to work' },
  { id: 'hemianopia', short: 'hemianopia', label: 'Hemianopia / visual field cut?', hint: "can't drive, can't read" },
  { id: 'hand', short: 'hand weakness', label: 'Hand weakness — dominant hand or occupation-critical?', hint: 'career-ending for a surgeon or musician' },
  { id: 'ataxia', short: 'ataxia', label: 'Ataxia — cannot walk / stand unaided?', hint: 'falls, loss of independence' },
  { id: 'swallow', short: 'swallow/speech', label: 'Dysphagia, or facial droop affecting swallow / speech?', hint: '' },
  { id: 'independence', short: 'patient-specific needs', label: 'Deficit takes away something THIS patient needs?', hint: 'job, driving, living alone — anchor to their baseline' },
];

function disablingVerdict(dc) {
  const vals = DISABLING_CHECK_ITEMS.map(it => dc[it.id]);
  const answered = vals.filter(v => v === true || v === false).length;
  if (vals.some(v => v === true)) return 'disabling';
  if (answered === DISABLING_CHECK_ITEMS.length) return 'nondisabling';
  return answered === 0 ? 'empty' : 'partial';
}

// Inner content (rows + verdict + cautions) shared by both surfaces.
// Full checklist lives on the Syndrome screen (scanner thinking time);
// the Decision screen shows a collapsed one-line verdict that expands
// only if the assessment is incomplete or the user opens it.
function buildDisablingInner() {
  const s = STATE.current;
  s.disablingCheck = s.disablingCheck || {};
  const dc = s.disablingCheck;
  const verdict = disablingVerdict(dc);

  let verdictHtml = '';
  if (verdict === 'disabling') {
    const hits = DISABLING_CHECK_ITEMS.filter(it => dc[it.id] === true).map(it => it.short);
    verdictHtml = `<div class="status-banner status-green" style="margin-top:10px">
      <span class="status-icon">✅</span>
      <div class="status-body">
        <div class="status-title">DISABLING deficit — treat as thrombolysis-eligible</div>
        <div class="status-detail">${hits.join(' · ')}. Low NIHSS does not exclude treatment.</div>
      </div>
    </div>`;
  } else if (verdict === 'nondisabling') {
    verdictHtml = `<div class="status-banner status-yellow" style="margin-top:10px">
      <span class="status-icon">🤔</span>
      <div class="status-body">
        <div class="status-title">Likely NON-disabling</div>
        <div class="status-detail">Re-examine serially — and call OTN Telestroke before withholding if any doubt.</div>
      </div>
    </div>`;
  }

  const rows = DISABLING_CHECK_ITEMS.map(it => {
    const val = dc[it.id];
    return `
      <div class="qs-toggle-row">
        <div class="qs-toggle-label">${it.label}${it.hint ? `<div style="font-size:12px; color:var(--text-dim); margin-top:2px">${it.hint}</div>` : ''}</div>
        <div class="qs-toggle-pills">
          <button class="qs-toggle-pill yes${val === true ? ' active' : ''}" data-dc-id="${it.id}" data-dc-val="yes">Yes</button>
          <button class="qs-toggle-pill no${val === false ? ' active' : ''}" data-dc-id="${it.id}" data-dc-val="no">No</button>
        </div>
      </div>`;
  }).join('');

  const d = window.DISABLING_DEFICIT || {};
  return `
      <div class="qs-card-sub">If permanent, would it stop this patient's normal daily activities or independent living? Any YES = disabling.</div>
      ${rows}
      ${verdictHtml}
      <div class="nihss-note" style="margin-top:10px">⚠️ Before committing: not rapidly improving on serial exam, and not a mimic (post-ictal, hypoglycemia).</div>
      <details class="nihss-exam-details" style="margin-top:8px; margin-bottom:0">
        <summary>Full framework (CSBPR)</summary>
        <p style="margin:8px 0; font-size:13px; color:var(--text-dim)">${d.proxyNote || ''}</p>
        <p style="margin:8px 0; font-size:13px; color:var(--text-dim)">${d.nonDisabling || ''}</p>
        <p style="margin:8px 0; font-size:13px; color:var(--text-dim)"><strong>Practical rule:</strong> ${d.practicalRule || ''}</p>
        <p style="margin:8px 0; font-size:13px; color:var(--blue)"><strong>Borderline:</strong> ${d.borderline || ''}</p>
      </details>`;
}

// Syndrome screen: the full interactive card
function buildDisablingChecklist() {
  return `
    <div class="card qs-card">
      <div class="qs-card-title">🎯 Is the deficit disabling?</div>
      ${buildDisablingInner()}
    </div>`;
}

// Decision screen: one-line verdict, expanded only when incomplete
// (or when the user opens it to change answers)
let dcUserToggle = null; // reset on navigation in goTo()

function buildDisablingCollapsed() {
  const dc = (STATE.current.disablingCheck = STATE.current.disablingCheck || {});
  const verdict = disablingVerdict(dc);
  const summaryLabel = verdict === 'disabling'
    ? `🎯 Disabling? — YES (${DISABLING_CHECK_ITEMS.filter(it => dc[it.id] === true).map(it => it.short).join(', ')})`
    : verdict === 'nondisabling'
      ? '🎯 Disabling? — assessed non-disabling'
      : '🎯 Disabling? — incomplete, tap to assess';
  const open = dcUserToggle !== null ? dcUserToggle : (verdict === 'empty' || verdict === 'partial');
  return `
    <details class="card card-collapse" id="dc-details"${open ? ' open' : ''}>
      <summary>${summaryLabel}</summary>
      ${buildDisablingInner()}
    </details>`;
}

function wireDisablingChecklist(host, rerender) {
  host.querySelectorAll('[data-dc-id]').forEach(btn => {
    btn.onclick = () => {
      const dc = STATE.current.disablingCheck;
      const val = btn.dataset.dcVal === 'yes';
      dc[btn.dataset.dcId] = dc[btn.dataset.dcId] === val ? null : val;
      saveCurrentSession();
      rerender();
    };
  });
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
    if (tnkWindowMin <= 540) {
      reasons.push('4.5–9h: TNK may still be possible via advanced imaging selection (CTP / MRI) with a stroke expert — do not delay EVT decisions');
    }
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
      <div class="card-title">TNK — Dose & BP</div>
      <label>Patient Weight (kg)</label>
      <div class="weight-row">
        <input type="number" id="weight-input" placeholder="e.g. 75" min="30" max="200" value="${s.weightKg || ''}">
        <span class="unit">kg</span>
      </div>
      <div id="dose-result" class="dose-result" style="display:none"></div>
      <div style="font-size:15px; font-weight:700; margin:10px 0 4px; color:var(--yellow)">Pre-TNK: &lt;185/110 mmHg</div>
      <div style="font-size:15px; font-weight:700; margin-bottom:8px; color:#81c784">Post-TNK: SBP &lt;160, DBP &lt;80 — avoid hypotension</div>
      <details class="nihss-exam-details" style="margin-bottom:8px">
        <summary>BP drug dosing</summary>
        ${window.BP_MEDS.map(m => `<div style="padding:8px 0; border-bottom:1px solid var(--border)">
          <span style="font-weight:700">${m.drug}:</span> ${m.dose}<br>
          <span style="font-size:13px;color:var(--text-dim)">${m.notes}</span>
        </div>`).join('')}
      </details>
      <p class="text-sm" style="margin-bottom:0; color:var(--text-dim)">⏱ ${window.DOOR_TO_NEEDLE || 'Door-to-needle target: ≤30 min median.'}</p>
    </div>`;
  }

  document.getElementById('decision-content').innerHTML = `
    <div class="status-banner ${tnkBannerClass}">
      <span class="status-icon">${tnkIcon}</span>
      <div class="status-body">
        <div class="status-title">${tnkLabel}</div>
        ${reasons.length > 0 ? `<div class="status-detail">${reasons.map(r => `• ${r}`).join('<br>')}</div>` : ''}
      </div>
    </div>

    ${total <= 5 ? buildDisablingCollapsed() : ''}

    ${Object.values(s.posteriorScreen || {}).some(v => v === true) ? `
    <div class="status-banner status-yellow">
      <span class="status-icon">🧠</span>
      <div class="status-body">
        <div class="status-title">Posterior screen was positive</div>
        <div class="status-detail">Basilar occlusion is an EVT indication (≤24h). A low NIHSS may still be disabling. If imaging unrevealing → MRI DWI or admit.</div>
      </div>
    </div>` : ''}

    ${evtBanner}

    ${tnkDoseBPHtml}

    ${s.tnkGiven === 'yes' ? buildTnkComplicationsCard() : ''}

    ${buildEligibilityCard()}
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

  if (total <= 5) {
    wireDisablingChecklist(document.getElementById('decision-content'), renderDecision);
    const det = document.getElementById('dc-details');
    if (det) det.ontoggle = () => { dcUserToggle = det.open; };
  }

  // LVO banner: fires when any cortical flag + NIHSS ≥ 6
  updateLvoBanner();

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
          <div class="deterioration-banner" style="margin-top:12px; padding:14px; border-radius:10px; background:var(--red-dark); color:#fff; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
            <div style="font-weight:700; flex:1">⚠️ ≥4-point NIHSS increase (Δ ${delta}) — URGENT re-imaging indicated</div>
            <button class="btn-primary" onclick="goToStep('step-ct')" style="background:#fff; color:var(--red-dark)">Re-imaging →</button>
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
    <details class="nihss-exam-details" style="margin-bottom:16px">
      <summary>Sample consent discussion script (CSBPR 2022/2025)</summary>
    <div class="nihss-look-for" style="margin-top:10px; margin-bottom:0">
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
    </details>
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

  const compHost = document.getElementById('consent-complications');
  if (compHost) compHost.innerHTML = buildTnkComplicationsCard();
}

// ── Step: Note ────────────────────────────────────────────────
// "Did I miss anything?" — everything left unanswered in the workflow,
// each with the step to jump back to. Advisory only, never blocking.
function collectGaps() {
  const s = STATE.current;
  const gaps = [];
  if (!s) return gaps;

  if (!s.onsetKnown) {
    gaps.push({ label: 'Onset type not selected (known / unknown / wake-up)', step: 'step-timing' });
  } else if (s.onsetKnown === 'wakeup') {
    if (!s.lsn) gaps.push({ label: 'Bedtime / last seen well not entered', step: 'step-timing' });
    if (!s.wakeTime) gaps.push({ label: 'Wake / found time not entered', step: 'step-timing' });
  } else if (s.onsetKnown === 'yes' && !s.lsn) {
    gaps.push({ label: 'Last known normal time not entered', step: 'step-timing' });
  }

  const absOpen = window.ABS_CONTRA.filter(a => s.absContra[a.id] === undefined).length;
  if (absOpen) gaps.push({ label: `${absOpen} absolute contraindication item${absOpen > 1 ? 's' : ''} unanswered`, step: 'step-abs-contra' });

  const relOpen = window.REL_CONTRA.filter(r => s.relContra[r.id] === undefined).length;
  if (relOpen) gaps.push({ label: `${relOpen} relative contraindication item${relOpen > 1 ? 's' : ''} unanswered`, step: 'step-rel-contra' });

  const mrs = ((s.relevantHistory || {}).baseline_mrs || {}).val;
  if (mrs === null || mrs === undefined || mrs === '') {
    gaps.push({ label: 'Baseline pre-stroke mRS not recorded (EVT requires ≤2)', step: 'step-rel-contra' });
  }

  const unscored = NIHSS_ORDER.filter(id => s.nihss[id] === undefined);
  if (unscored.length) gaps.push({ label: `NIHSS item${unscored.length > 1 ? 's' : ''} ${unscored.join(', ')} not scored`, step: 'step-nihss' });

  if (!unscored.length && getNIHSSTotal(s.nihss) <= 5) {
    const dv = disablingVerdict(s.disablingCheck || {});
    if (dv === 'empty' || dv === 'partial') {
      gaps.push({ label: 'Disabling-deficit checklist not completed (NIHSS ≤5)', step: 'step-decision' });
    }
  }

  const ps = s.posteriorScreen || {};
  const postOpen = ['fiveD', 'vertigoFocal', 'gaitAtaxia', 'verticalGazeSkew'].filter(k => ps[k] === null || ps[k] === undefined).length;
  if (postOpen) gaps.push({ label: `Posterior circulation check — ${postOpen} question${postOpen > 1 ? 's' : ''} unanswered`, step: 'step-posterior' });

  if (s.ctClear === null) gaps.push({ label: 'CT head result not recorded', step: 'step-ct' });
  if (s.aspects === null) gaps.push({ label: 'ASPECTS not entered', step: 'step-ct' });
  if (s.ctaDone === null) gaps.push({ label: 'CTA done / not done not recorded', step: 'step-ct' });
  if (s.ctaDone === 'yes' && s.lvo === null) gaps.push({ label: 'LVO present / absent not recorded', step: 'step-ct' });

  if ((s.decisionStatus === 'eligible' || s.decisionStatus === 'relative') && !s.weightKg) {
    gaps.push({ label: 'Weight not entered — TNK dose not calculated', step: 'step-decision' });
  }

  if (s.tnkGiven === null) {
    gaps.push({ label: 'TNK given / not given not recorded', step: 'step-consent' });
  } else if (s.tnkGiven === 'yes') {
    if (!s.tnkTime) gaps.push({ label: 'TNK administration time not recorded', step: 'step-consent' });
    if (!s.consentWith) gaps.push({ label: 'Consent (patient vs SDM) not recorded', step: 'step-consent' });
  }

  return gaps;
}

function renderGapCheck() {
  const host = document.getElementById('note-gap-check');
  if (!host) return;
  const gaps = collectGaps();
  if (!gaps.length) {
    host.innerHTML = `
      <div class="status-banner status-green">
        <span class="status-icon">🛡</span>
        <div class="status-body"><div class="status-title">Nothing missed — all workflow items answered</div></div>
      </div>`;
    return;
  }
  host.innerHTML = `
    <div class="status-banner status-yellow">
      <span class="status-icon">🛡</span>
      <div class="status-body">
        <div class="status-title">${gaps.length} item${gaps.length > 1 ? 's' : ''} not yet answered</div>
        <div class="status-detail">Tap to jump back — or copy the note as-is if intentional.</div>
      </div>
    </div>
    <div class="card" style="padding:8px 14px">
      ${gaps.map(g => `
        <button class="gap-row" onclick="goToStep('${g.step}')">
          <span class="gap-label">${g.label}</span>
          <span class="gap-arrow">→</span>
        </button>`).join('')}
    </div>`;
}

function renderNote() {
  const note = generateNote();
  STATE.current.note = note;
  saveCurrentSession();
  document.getElementById('note-output').textContent = note;
  renderGapCheck();
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
  })()}${(() => {
    const dc = s.disablingCheck || {};
    const v = disablingVerdict(dc);
    if (v === 'empty') return '';
    const yes = DISABLING_CHECK_ITEMS.filter(it => dc[it.id] === true).map(it => it.short);
    if (v === 'disabling') return `\n  Disabling deficit: YES — ${yes.join(', ')}`;
    if (v === 'nondisabling') return '\n  Disabling deficit: assessed as non-disabling';
    return '\n  Disabling deficit: assessment incomplete';
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

ADMISSION WORKUP:
${ADMIT_WORKUP_ITEMS.map(it => `  [${(s.workupDone || {})[it.id] ? 'x' : ' '}] ${it.label}`).join('\n')}

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
      <div class="mimic-banner" style="padding:12px; border-radius:10px; background:rgba(255,159,10,0.9); color:#fff; margin-bottom:12px; font-weight:600">Check glucose FIRST — hypoglycemia is the most common mimic. Target: 3.5–22.2 mmol/L.</div>
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
      <div class="mimic-banner" style="padding:12px; border-radius:10px; background:var(--red-dark); color:#fff; margin-bottom:12px; font-weight:600">Strokes can look like mimics. If the story is sudden focal change and CT/CTA unrevealing: MRI DWI or admit for observation — DO NOT discharge.</div>
      ${camCards}
      <div class="card" style="background:var(--red-dark); color:#fff">
        <div class="card-title" style="color:#fff">🛡 Safety-net</div>
        <p class="text-sm">Key chameleons: isolated vertigo (posterior circulation), isolated limb shaking (limb-shaking TIA), confusional state (thalamic / bilateral PCA), pure sensory loss, post-ictal Todd's presenting after unwitnessed seizure. When the story is sudden and stereotyped — do not discharge. MRI DWI or admit for observation.</p>
      </div>`;
  }
}

function renderSyndromeRef() {
  const host = document.getElementById('syndrome-ref-content');
  if (!host) return;
  const details = window.SYNDROME_DETAILS || {};

  function synCard(syn, id) {
    if (!syn) return '';
    const name = syn.name || (window.SYNDROME_NAMES || {})[id] || id.replace(/_/g, ' ').toUpperCase();
    const table = Array.isArray(syn.featuresTable)
      ? `<table class="finding-table"><thead><tr><th>Finding</th><th>Side</th></tr></thead><tbody>${syn.featuresTable.map(r => {
          const a = r.finding || r.sign || r[0] || '';
          const b = r.side || r.explanation || r.detail || r.mechanism || r[1] || '';
          return `<tr><td>${a}</td><td>${b}</td></tr>`;
        }).join('')}</tbody></table>`
      : '';
    const mimics = Array.isArray(syn.mimicsToConsider) && syn.mimicsToConsider.length
      ? `<div style="margin-top:8px"><strong>Mimics to consider:</strong> <ul style="padding-left:18px">${syn.mimicsToConsider.map(m => `<li>${m}</li>`).join('')}</ul></div>`
      : '';
    const note = syn.sourceNote ? `<div class="text-sm" style="color:var(--text-dim); margin-top:6px; font-style:italic">${syn.sourceNote}</div>` : '';
    return `
      <details class="check-item" style="margin-bottom:8px">
        <summary style="font-weight:700; cursor:pointer; padding:10px 0">${name}</summary>
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
      out.push(synCard(syn, id));
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
      <p class="text-sm" style="color:var(--text-dim)">International guidelines traditionally cite tPA (alteplase) 0.9 mg/kg (max 90 mg), 10% bolus + 90% over 60 min. This app uses <strong>tenecteplase (TNK) 0.25 mg/kg (max 25 mg) single IV bolus over 5 seconds</strong>, now the preferred agent at Lakeridge Health and per 2022/2025 CSBPR.</p>
      <p class="text-sm" style="color:#ef9a9a; margin-top:8px"><strong>⚠️ Caution:</strong> stroke dosing of alteplase/TNK is NOT the same as the MI or massive-PE protocols.</p>
    </div>`;

  const inHospitalHtml = `
    <div class="card">
      <div class="card-title">🏥 Stroke while already in hospital</div>
      <p class="text-sm" style="color:var(--text-dim)">Patients already in hospital (ED, inpatient unit, clinic, rehab) with sudden new stroke symptoms get the <strong>same rapid pathway</strong> — evaluate without delay for TNK and EVT eligibility (CSBPR 5.3).</p>
    </div>`;

  host.innerHTML = `
    ${bucketHtml}
    ${buildDisablingCard(false)}
    ${buildEligibilityCard()}
    ${buildTnkComplicationsCard()}
    ${phqHtml}
    ${corticalHtml}
    ${bpHtml}
    ${doacHtml}
    ${postHtml}
    ${mimicHtml}
    ${r4Html}
    ${inHospitalHtml}
    ${legacyHtml}
    <div class="card" style="background:#1e3a8a; color:#fff; text-align:center; font-weight:600">
      Mental loop: Is it a stroke? → Where is it? → Can I treat? → When? → Watch for deterioration.
    </div>`;
}

// ── Rapid Localization Exam (2–3 min reference) ─────────────
// Renders window.LOCALIZATION_EXAM as a read-only teaching reference:
// one card per test (prompt / how-to / normal vs abnormal / pearl),
// then the three never-forget rules, then a field-cut vs neglect
// comparison table.
function renderLocalizationExam() {
  const host = document.getElementById('localization-exam-content');
  if (!host) return;
  const exam = window.LOCALIZATION_EXAM;
  if (!exam) { host.innerHTML = '<p class="text-sm">Reference unavailable.</p>'; return; }

  const li = (arr) => (arr || []).map(x => `<li>${x}</li>`).join('');

  const intro = `
    <div class="card">
      <div class="card-title">Rapid Localization Exam · 2–3 min</div>
      <p class="text-sm">${exam.intro || ''}</p>
    </div>`;

  const tests = (exam.tests || []).map(t => `
    <details class="card exam-ref-card" open>
      <summary class="exam-ref-summary">
        <span class="exam-ref-section">${t.section}</span>
        <span class="exam-ref-title">${t.title}</span>
      </summary>
      <div class="exam-ref-body">
        <p class="exam-ref-prompt">${t.prompt}</p>
        ${t.howToTest && t.howToTest.length ? `
          <div class="exam-ref-block">
            <div class="exam-ref-block-title">How to test</div>
            <ul>${li(t.howToTest)}</ul>
          </div>` : ''}
        <div class="exam-ref-columns">
          <div class="exam-ref-col exam-ref-normal">
            <div class="exam-ref-col-title">Normal</div>
            <ul>${li(t.normal)}</ul>
          </div>
          <div class="exam-ref-col exam-ref-abnormal">
            <div class="exam-ref-col-title">Abnormal</div>
            <ul>${li(t.abnormal)}</ul>
          </div>
        </div>
        ${t.pearl ? `<div class="exam-ref-pearl">💡 ${t.pearl}</div>` : ''}
      </div>
    </details>`).join('');

  const rules = (exam.threeRules || []).map(r =>
    `<li><b>${r.term}:</b> ${r.rule}</li>`).join('');
  const rulesCard = rules ? `
    <div class="card">
      <div class="card-title">Three rules to remember</div>
      <ul class="exam-ref-rules">${rules}</ul>
    </div>` : '';

  const fvn = (exam.fieldVsNeglect || []).map(r => `
    <tr><td>${r.sign}</td><td>${r.leftAlone}</td><td>${r.bothTogether}</td><td>${r.vision}</td></tr>
  `).join('');
  const fvnCard = fvn ? `
    <div class="card">
      <div class="card-title">Field cut vs neglect</div>
      <div style="overflow-x:auto"><table class="finding-table">
        <thead><tr><th>Sign</th><th>Side tested alone</th><th>Both together</th><th>Vision</th></tr></thead>
        <tbody>${fvn}</tbody>
      </table></div>
    </div>` : '';

  host.innerHTML = intro + tests + rulesCard + fvnCard;
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  loadState();
  renderHome();
  goTo('home');

  // Keep the header LKN clock ticking
  setInterval(updateLknChip, 30000);

  // Offline chip — reflects navigator.onLine
  const offlineChip = document.getElementById('offline-chip');
  if (offlineChip) {
    const setChip = () => { offlineChip.hidden = navigator.onLine; };
    window.addEventListener('online', setChip);
    window.addEventListener('offline', setChip);
    setChip();
  }

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
    // On a reference side screen, back returns to where the user came from
    const active = document.querySelector('.screen.active');
    if (active && SIDE_SCREENS.includes(active.id.replace('screen-', ''))) {
      window.goBackFromSide();
      return;
    }
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
    renderDispo();
    goTo('step-dispo');
  });

  document.getElementById('dispo-next').addEventListener('click', () => {
    renderAdmit();
    goTo('step-admit');
  });

  document.getElementById('admit-next').addEventListener('click', () => {
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
  // Sessions saved before the Relevant History / Cortical Screen steps were removed
  if (stepId === 'step-history' || stepId === 'step-quick-screen') stepId = 'step-nihss';
  switch(stepId) {
    case 'home': renderHome(); break;
    case 'step-label': renderLabel(); break;
    case 'step-timing': renderTiming(); break;
    case 'step-abs-contra': renderAbsContra(); break;
    case 'step-rel-contra': renderRelContra(); break;
    case 'step-nihss': renderNIHSS(); break;
    case 'step-posterior': renderPosterior(); break;
    case 'step-syndrome': renderSyndrome(); break;
    case 'step-ct': renderCT(); break;
    case 'step-decision': renderDecision(); break;
    case 'step-consent': renderConsent(); break;
    case 'step-dispo': renderDispo(); break;
    case 'step-admit': renderAdmit(); break;
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
