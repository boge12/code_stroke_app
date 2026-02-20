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
  'step-syndrome',
  'step-ct',
  'step-decision',
  'step-consent',
  'step-note',
];

const NIHSS_ORDER = ['1a','1b','1c','2','3','4','5a','5b','6a','6b','7','8','9','10','11'];

// ── Session Helpers ──────────────────────────────────────────
function newSession() {
  return {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    label: '',
    onsetKnown: null, // 'yes' | 'no' | 'wakeup'
    onsetTime: null,
    lsn: null, // last seen normal ISO string
    lsw: null, // last seen well ISO string
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
}

function updateHeader(stepId) {
  const header = document.getElementById('main-header');
  const backBtn = document.getElementById('back-btn');
  const title = document.getElementById('header-title');
  const badge = document.getElementById('nihss-badge');

  const titles = {
    'home': 'Code Stroke',
    'step-label': 'Step 1 of 9 — Patient',
    'step-timing': 'Step 2 — Timing',
    'step-abs-contra': 'Step 3 — Absolute CIs',
    'step-rel-contra': 'Step 4 — History / Relative CIs',
    'step-nihss': 'Step 5 — NIHSS Assessment',
    'step-syndrome': 'Step 6 — Syndrome',
    'step-ct': 'Step 7 — CT Results',
    'step-decision': 'Step 8 — Decision',
    'step-consent': 'Step 9 — Consent',
    'step-note': 'Step 10 — EMR Note',
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

  function refresh() {
    onsetBtns.forEach(b => {
      b.classList.toggle('selected', b.dataset.onset === STATE.current.onsetKnown);
    });

    const lsnMin = elapsedMin(STATE.current.lsn);

    // Window status
    const badge = document.getElementById('timing-window-badge');
    if (lsnMin === null) {
      badge.className = 'time-window-badge window-close';
      badge.innerHTML = 'Enter LKN time above to calculate window';
    } else if (lsnMin <= 270) {
      badge.className = 'time-window-badge window-open';
      badge.innerHTML = `✅ TNK WINDOW OPEN — ${elapsedLabel(lsnMin)} from LKN`;
    } else if (lsnMin <= 1440) {
      badge.className = 'time-window-badge window-close';
      badge.innerHTML = `⚠️ TNK WINDOW CLOSED (${elapsedLabel(lsnMin)}) — EVT may still be possible`;
    } else {
      badge.className = 'time-window-badge window-expired';
      badge.innerHTML = `🚫 >24 hours — likely outside treatment windows`;
    }

    document.getElementById('elapsed-lsn').textContent = lsnMin !== null ? elapsedLabel(lsnMin) : '–';

    if (STATE.current.lsn) onsetInp.value = formatTimeValue(STATE.current.lsn);
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
  const container = document.getElementById('rel-contra-list');
  container.innerHTML = '';

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
}

// ── Step: NIHSS ───────────────────────────────────────────────
let nihssCurrentIdx = 0;

function renderNIHSS() {
  nihssCurrentIdx = STATE.current.nihssCurrentIdx || 0;
  renderNIHSSItem();
  renderNIHSSTabs();
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

  container.innerHTML = `
    <div class="nihss-item-header">
      <div class="nihss-item-number">Item ${nihssCurrentIdx + 1} of ${NIHSS_ORDER.length}</div>
      <div class="nihss-item-name">${item.shortName}</div>
    </div>

    <div class="nihss-section">
      <div class="nihss-section-title">How to Examine</div>
      <ul class="nihss-instructions">
        ${item.examInstructions.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>

    ${item.lookFor ? `
    <div class="nihss-section">
      <div class="nihss-section-title">What to Look For</div>
      <div class="nihss-look-for">${item.lookFor}</div>
    </div>` : ''}

    ${item.svg ? `
    <div class="nihss-section">
      <div class="nihss-section-title">Visual Aid</div>
      ${item.svg}
    </div>` : ''}

    ${item.note ? `<div class="nihss-note">⚠️ ${item.note}</div>` : ''}

    <div class="nihss-section mt-16">
      <div class="nihss-section-title">Select Score</div>
      <div class="score-options">${scoresHtml}</div>
    </div>
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
      // All done
      computeSyndromes();
      renderSyndrome();
      goTo('step-syndrome');
    }
  };

  // NIHSS Done button
  const allDone = NIHSS_ORDER.every(id => STATE.current.nihss[id] !== undefined);
  const doneBtn = document.getElementById('nihss-done-btn');
  if (allDone) {
    doneBtn.style.display = '';
    doneBtn.onclick = () => {
      computeSyndromes();
      renderSyndrome();
      goTo('step-syndrome');
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

  document.getElementById('syndrome-nihss-total').innerHTML = `
    <div class="status-banner status-blue">
      <span class="status-icon">🧠</span>
      <div class="status-body">
        <div class="status-title">NIHSS ${total} — ${severity.label}</div>
        <div class="status-detail" style="color: ${severity.color}">
          ${total < 5 ? '⚠️ Below typical TNK threshold (NIHSS >4). Consider if deficits are disabling.' : ''}
          ${total >= 22 ? '🚨 Severe — confirm no early extensive infarct on CT. EVT critical.' : ''}
        </div>
        ${total < 5 ? `<div class="status-detail" style="margin-top:8px; color: var(--text-dim); font-size:13px">
          <strong>Examples of disabling deficits even at low NIHSS:</strong><br>
          • Isolated hand weakness preventing writing/typing<br>
          • Language deficit affecting communication<br>
          • Hemianopia affecting ability to drive or work<br>
          • Dominant hand motor deficit in a surgeon/musician<br>
          • Aphasia of any severity in a person who relies on verbal communication<br>
          • Any deficit the patient/SDM considers functionally significant
        </div>` : ''}
      </div>
    </div>
  `;

  const container = document.getElementById('syndrome-list');
  container.innerHTML = '';

  if (STATE.current.syndromes.length === 0) {
    container.innerHTML = `<div class="card"><p class="text-sm">Pattern does not clearly match a specific syndrome. Review NIHSS scores or consider atypical/mixed presentation.</p></div>`;
    return;
  }

  STATE.current.syndromes.forEach((syn, i) => {
    const card = document.createElement('div');
    card.className = 'syndrome-card';
    card.innerHTML = `
      <span class="syndrome-rank">${i === 0 ? 'Most Likely' : `Also Consider #${i+1}`}</span>
      <div class="syndrome-name">${syn.name}</div>
      <div class="syndrome-sub">${syn.subtitle} · ${syn.territory}</div>
      <ul class="syndrome-features">${syn.features.map(f => `<li>${f}</li>`).join('')}</ul>
      ${syn.lvoRisk ? `<div class="lvo-flag">🚨 LVO Possible — Urgent CTA</div>` : ''}
      <div class="text-sm mt-8">CTA: ${syn.ctaExpect}</div>
    `;
    container.appendChild(card);
  });
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
  const total = getNIHSSTotal(s.nihss);
  const anyAbsCI = Object.values(s.absContra).some(v => v === true);
  const aspectsOk = s.aspects === null || s.aspects >= 6;
  const ctClear = s.ctClear === 'yes';
  const relCIs = window.REL_CONTRA.filter(r => s.relContra[r.id] === 'yes');
  const withinWindow = lsnMin !== null && lsnMin <= 270;
  const nihssAboveThreshold = total >= 5;

  // TNK decision
  let tnkStatus, tnkBannerClass, tnkIcon;
  if (anyAbsCI || !ctClear || !aspectsOk) {
    tnkStatus = 'ineligible';
    tnkBannerClass = 'status-red';
    tnkIcon = '🚫';
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
  if (!withinWindow && lsnMin !== null) reasons.push(`Outside 4.5h window (${elapsedLabel(lsnMin)} from LKN)`);
  if (!ctClear) reasons.push('CT not clear / hemorrhage on imaging');
  if (!aspectsOk) reasons.push(`ASPECTS ${s.aspects} < 6`);
  if (relCIs.length > 0) reasons.push(...relCIs.map(r => r.label));
  if (!nihssAboveThreshold) reasons.push(`NIHSS ${total} — below typical threshold (consider if disabling: e.g. isolated hand weakness, language deficit, hemianopia, or any deficit functionally significant to the patient)`);

  const tnkLabel = tnkStatus === 'eligible' ? 'ELIGIBLE FOR TNK' : tnkStatus === 'relative' ? 'RELATIVE CONTRAINDICATIONS' : 'NOT ELIGIBLE FOR TNK';

  // EVT decision
  const evtWindow = lsnMin !== null && lsnMin <= 1440;
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
}

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
  Suggested syndrome: ${synd}
${nihssLines}

CONTRAINDICATIONS:
  Absolute: ${absFlags ? '\n' + absFlags : 'None identified'}
  Relative: ${relFlags ? '\n' + relFlags : 'None identified'}

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

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    const currentStep = STATE.current ? STATE.current.currentStep : 'home';
    const idx = STEPS.indexOf(currentStep);
    if (idx <= 0) { goTo('home'); renderHome(); }
    else {
      const prev = STEPS[idx - 1];
      if (prev === 'home') { goTo('home'); renderHome(); return; }
      goToStep(prev);
    }
  });

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
  switch(stepId) {
    case 'step-label': renderLabel(); break;
    case 'step-timing': renderTiming(); break;
    case 'step-abs-contra': renderAbsContra(); break;
    case 'step-rel-contra': renderRelContra(); break;
    case 'step-nihss': renderNIHSS(); break;
    case 'step-syndrome': renderSyndrome(); break;
    case 'step-ct': renderCT(); break;
    case 'step-decision': renderDecision(); break;
    case 'step-consent': renderConsent(); break;
    case 'step-note': renderNote(); break;
  }
  goTo(stepId);
}

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
