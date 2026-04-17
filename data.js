// ============================================================
// data.js — All clinical content for Code Stroke Triage App
// Lakeridge Health — CSBPR 2022/2025
// ============================================================

// ── NIHSS ITEMS ─────────────────────────────────────────────
window.NIHSS_ITEMS = [
  {
    id: '1a',
    name: 'Level of Consciousness',
    shortName: '1a — Alertness',
    examInstructions: [
      'Observe the patient as you enter the room.',
      'Do they open their eyes spontaneously and look at you?',
      'If not: call their name or speak loudly. Do they respond?',
      'If still no response: apply a sternal rub or nail-bed pressure.',
    ],
    lookFor: 'Are they awake and tracking you? Do they need stimulation to respond? Or are they unresponsive?',
    svg: `<svg viewBox="0 0 320 140" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- Score 0: Open eyes -->
  <g transform="translate(0,0)">
    <circle cx="53" cy="55" r="28" fill="#1a2e44" stroke="#4fc3f7" stroke-width="2"/>
    <ellipse cx="53" cy="55" rx="16" ry="10" fill="#4fc3f7" opacity="0.3"/>
    <circle cx="53" cy="55" r="7" fill="#1a2e44"/>
    <circle cx="53" cy="55" r="3" fill="#4fc3f7"/>
    <path d="M25,55 Q53,25 81,55 Q53,85 25,55" fill="none" stroke="#4fc3f7" stroke-width="2"/>
    <text x="53" y="105" text-anchor="middle" fill="#4fc3f7" font-size="12" font-weight="bold">Score 0</text>
    <text x="53" y="120" text-anchor="middle" fill="#aaa" font-size="10">Eyes open, alert</text>
  </g>
  <!-- Score 1: Half closed, voice stimulus -->
  <g transform="translate(110,0)">
    <circle cx="53" cy="55" r="28" fill="#1a2e44" stroke="#ffd54f" stroke-width="2"/>
    <path d="M25,55 Q53,42 81,55" fill="none" stroke="#ffd54f" stroke-width="2"/>
    <path d="M25,55 Q53,68 81,55" fill="none" stroke="#ffd54f" stroke-width="2"/>
    <text x="53" y="40" fill="#ffd54f" font-size="18" text-anchor="middle">🔊</text>
    <text x="53" y="105" text-anchor="middle" fill="#ffd54f" font-size="12" font-weight="bold">Score 1</text>
    <text x="53" y="120" text-anchor="middle" fill="#aaa" font-size="10">Arousable by voice</text>
  </g>
  <!-- Score 2-3: Sternal rub -->
  <g transform="translate(220,0)">
    <circle cx="53" cy="55" r="28" fill="#1a2e44" stroke="#ef5350" stroke-width="2"/>
    <line x1="40" y1="55" x2="66" y2="55" stroke="#ef5350" stroke-width="3"/>
    <line x1="53" y1="42" x2="53" y2="68" stroke="#ef5350" stroke-width="3"/>
    <text x="53" y="105" text-anchor="middle" fill="#ef5350" font-size="12" font-weight="bold">Score 2-3</text>
    <text x="53" y="120" text-anchor="middle" fill="#aaa" font-size="10">Pain only / none</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'Alert', description: 'Alert, keenly responsive. Eyes open spontaneously. Follows you with gaze. Answers questions normally.' },
      { value: 1, label: 'Drowsy', description: 'Not alert but arousable by minor stimulation (voice, light touch) to obey, answer, or respond. ⚠️ If they become drowsier during the assessment and need repeated stimulation — upgrade to score 2.' },
      { value: 2, label: 'Obtunded', description: 'Requires repeated, strong, or painful stimulation (sternal rub) to respond. Or so obtunded they need stimulation to make non-stereotyped movements.' },
      { value: 3, label: 'Unresponsive', description: 'Responds only with reflex motor/autonomic effects, or completely unresponsive, flaccid, with no responses.' },
    ],
    note: 'This is the ONLY item you can go back and change after completing it — if the patient deteriorates.',
    caveats: [
      'If patient deteriorates during the exam and needs more stimulation — go back and UPGRADE.',
      'Score 3 (flaccid, no response) is specifically for complete unresponsiveness — reflex-only motor counts here.',
      'Intubation or language barrier alone does NOT determine 1a — use stimulation threshold.',
    ],
    rubric: [
      { score: 0, criteria: 'Alert, keenly responsive.' },
      { score: 1, criteria: 'Not alert, but arousable by minor stimulation to obey, answer, or respond.' },
      { score: 2, criteria: 'Not alert; requires repeated stimulation to attend, or is obtunded and requires strong or painful stimulation.' },
      { score: 3, criteria: 'Responds only with reflex motor or autonomic effects, or totally unresponsive, flaccid, areflexic.' },
    ],
  },
  {
    id: '1b',
    name: 'LOC Questions',
    shortName: '1b — Month & Age',
    examInstructions: [
      'Ask: "What month is it right now?"',
      'Ask: "How old are you?"',
      'Verbal answer only — no partial credit for being close.',
      'Do NOT accept non-verbal or written answers (except for aphasic patients — see note).',
    ],
    lookFor: 'This tests ORIENTATION, not aphasia. A patient who cannot speak due to aphasia but can write or gesture the correct answer still scores 2 (unable to respond in any modality = 2).',
    svg: `<svg viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <rect x="10" y="10" width="140" height="110" rx="12" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
  <text x="80" y="38" text-anchor="middle" fill="#4fc3f7" font-size="13" font-weight="bold">Ask aloud:</text>
  <text x="80" y="60" text-anchor="middle" fill="#fff" font-size="11">"What month is it?"</text>
  <text x="80" y="82" text-anchor="middle" fill="#fff" font-size="11">"How old are you?"</text>
  <text x="80" y="108" text-anchor="middle" fill="#aaa" font-size="10">Verbal only · No partial credit</text>
  <rect x="170" y="10" width="140" height="110" rx="12" fill="#0d1f2d" stroke="#ffd54f" stroke-width="1.5"/>
  <text x="240" y="35" text-anchor="middle" fill="#ffd54f" font-size="12" font-weight="bold">Aphasic patient:</text>
  <text x="240" y="55" text-anchor="middle" fill="#aaa" font-size="10">Cannot say, write,</text>
  <text x="240" y="70" text-anchor="middle" fill="#aaa" font-size="10">or demonstrate?</text>
  <text x="240" y="92" text-anchor="middle" fill="#ef5350" font-size="24" font-weight="bold">→ Score 2</text>
  <text x="240" y="112" text-anchor="middle" fill="#aaa" font-size="10">(All modalities failed)</text>
</svg>`,
    scores: [
      { value: 0, label: 'Both correct', description: 'Answers BOTH month and age correctly.' },
      { value: 1, label: 'One correct', description: 'Answers one correctly. Also score 1 if patient is intubated or has severe dysarthria preventing speech.' },
      { value: 2, label: 'Neither correct', description: 'Neither answer correct — OR — patient is aphasic and cannot communicate either answer by any means (speech, writing, gesture).' },
    ],
    caveats: [
      'Only the INITIAL answer counts — no credit for self-correction.',
      'Do not coach or rephrase. Ask once, score what you get.',
      'Score 1 for intubation, severe dysarthria, or non-aphasic language barrier.',
      'Score 2 only if patient cannot communicate in ANY modality (speech, writing, gesture).',
    ],
    rubric: [
      { score: 0, criteria: 'Answers both questions correctly.' },
      { score: 1, criteria: 'Answers one question correctly.' },
      { score: 2, criteria: 'Answers neither question correctly.' },
    ],
  },
  {
    id: '1c',
    name: 'LOC Commands',
    shortName: '1c — Open/Close Eyes + Fist',
    examInstructions: [
      'Command 1: "Close your eyes… now open them."',
      'Command 2: "Make a fist with your [non-paretic] hand… now open it."',
      'If no response: demonstrate the task once (pantomime).',
      'Test the NON-paretic hand for the fist command if possible.',
      'If one-step commands needed (too confused for 2-step): substitute "Stick out your tongue" or "Blink your eyes."',
    ],
    lookFor: 'Did they perform each task? Partial credit if they clearly attempt but cannot complete due to weakness.',
    svg: `<svg viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- Eye command -->
  <g transform="translate(10,10)">
    <rect width="140" height="110" rx="12" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
    <text x="70" y="30" text-anchor="middle" fill="#4fc3f7" font-size="12" font-weight="bold">Command 1</text>
    <ellipse cx="45" cy="65" rx="20" ry="12" fill="none" stroke="#4fc3f7" stroke-width="2"/>
    <circle cx="45" cy="65" r="5" fill="#4fc3f7"/>
    <ellipse cx="95" cy="65" rx="20" ry="12" fill="none" stroke="#4fc3f7" stroke-width="2"/>
    <circle cx="95" cy="65" r="5" fill="#4fc3f7"/>
    <text x="70" y="100" text-anchor="middle" fill="#aaa" font-size="10">"Close eyes / Open eyes"</text>
  </g>
  <!-- Fist command -->
  <g transform="translate(170,10)">
    <rect width="140" height="110" rx="12" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
    <text x="70" y="30" text-anchor="middle" fill="#4fc3f7" font-size="12" font-weight="bold">Command 2</text>
    <text x="70" y="70" text-anchor="middle" font-size="38">✊</text>
    <text x="70" y="100" text-anchor="middle" fill="#aaa" font-size="10">"Fist / Open hand"</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'Both correct', description: 'Performs both commands correctly.' },
      { value: 1, label: 'One correct', description: 'Performs only one correctly. Also score 1 if there is an unequivocal attempt but cannot complete due to weakness.' },
      { value: 2, label: 'Neither correct', description: 'Performs neither task.' },
    ],
    caveats: [
      'One unequivocal attempt at a task that cannot be completed due to weakness still scores 1.',
      'If the patient does not respond to verbal command, demonstrate (pantomime) ONCE — then score.',
      'If patient is unresponsive (1a = 3) and cannot attempt, score 2 here.',
    ],
    rubric: [
      { score: 0, criteria: 'Performs both tasks correctly.' },
      { score: 1, criteria: 'Performs one task correctly.' },
      { score: 2, criteria: 'Performs neither task correctly.' },
    ],
  },
  {
    id: '2',
    name: 'Best Gaze',
    shortName: '2 — Horizontal Eye Movements',
    examInstructions: [
      'Lightly hold patient\'s chin still to prevent head turning.',
      'Hold your index finger at arm\'s length in front of their face.',
      'Ask: "Follow my finger with your eyes."',
      'Move your finger slowly to the FAR LEFT — does the left iris reach the medial canthus (inner corner)?',
      'Then move slowly to the FAR RIGHT — does the right iris reach the medial canthus?',
      'For APHASIC patients: Use your face. Establish eye contact, then walk slowly around the bed — do they track you?',
    ],
    lookFor: 'Full gaze = iris touches the inner corner of the eye in both directions. Partial gaze palsy = movement incomplete but no forced deviation. Full palsy = eyes stuck to one side.',
    svg: `<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- Normal gaze left -->
  <g transform="translate(5,10)">
    <text x="50" y="20" text-anchor="middle" fill="#4fc3f7" font-size="11" font-weight="bold">Normal — Left</text>
    <rect x="5" y="30" width="90" height="40" rx="8" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
    <ellipse cx="35" cy="50" rx="14" ry="9" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <circle cx="23" cy="50" r="6" fill="#4fc3f7"/>
    <ellipse cx="65" cy="50" rx="14" ry="9" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <circle cx="57" cy="50" r="6" fill="#4fc3f7"/>
    <text x="50" y="88" text-anchor="middle" fill="#4fc3f7" font-size="10">Iris touches canthus</text>
    <text x="50" y="100" text-anchor="middle" fill="#4fc3f7" font-size="10">→ Score 0</text>
  </g>
  <!-- Partial palsy -->
  <g transform="translate(110,10)">
    <text x="50" y="20" text-anchor="middle" fill="#ffd54f" font-size="11" font-weight="bold">Partial Palsy</text>
    <rect x="5" y="30" width="90" height="40" rx="8" fill="#0d1f2d" stroke="#ffd54f" stroke-width="1.5"/>
    <ellipse cx="35" cy="50" rx="14" ry="9" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <circle cx="28" cy="50" r="6" fill="#ffd54f"/>
    <ellipse cx="65" cy="50" rx="14" ry="9" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <circle cx="60" cy="50" r="6" fill="#ffd54f"/>
    <text x="50" y="88" text-anchor="middle" fill="#ffd54f" font-size="10">Incomplete, no</text>
    <text x="50" y="100" text-anchor="middle" fill="#ffd54f" font-size="10">forced deviation → 1</text>
  </g>
  <!-- Forced deviation -->
  <g transform="translate(215,10)">
    <text x="50" y="20" text-anchor="middle" fill="#ef5350" font-size="11" font-weight="bold">Forced Deviation</text>
    <rect x="5" y="30" width="90" height="40" rx="8" fill="#0d1f2d" stroke="#ef5350" stroke-width="1.5"/>
    <ellipse cx="35" cy="50" rx="14" ry="9" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <circle cx="47" cy="50" r="6" fill="#ef5350"/>
    <ellipse cx="65" cy="50" rx="14" ry="9" fill="none" stroke="#aaa" stroke-width="1.5"/>
    <circle cx="77" cy="50" r="6" fill="#ef5350"/>
    <text x="50" y="88" text-anchor="middle" fill="#ef5350" font-size="10">Stuck right, cannot</text>
    <text x="50" y="100" text-anchor="middle" fill="#ef5350" font-size="10">overcome → Score 2</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'Normal', description: 'Eyes move fully and equally in both directions. Iris reaches the medial canthus (inner corner of eye) on each side.' },
      { value: 1, label: 'Partial gaze palsy', description: 'Horizontal movement is incomplete in one or both eyes — but there is NO forced deviation to one side that the patient cannot overcome.' },
      { value: 2, label: 'Forced deviation', description: 'Eyes are deviated to one side and CANNOT be overcome by voluntary tracking or oculocephalic (doll\'s eyes) reflex.' },
    ],
    caveats: [
      'Only horizontal gaze is scored. Vertical gaze palsy and nystagmus are NOT captured by NIHSS.',
      'In aphasic patients, establish eye contact and move around the bed to test tracking.',
      'Pre-existing eye movement disorder (e.g. external ophthalmoplegia) → score based on non-affected eye if possible.',
    ],
    rubric: [
      { score: 0, criteria: 'Normal.' },
      { score: 1, criteria: 'Partial gaze palsy — gaze abnormal in one or both eyes, but no forced deviation or total gaze paresis.' },
      { score: 2, criteria: 'Forced deviation or total gaze paresis not overcome by oculocephalic manoeuvre.' },
    ],
    localizationPearl: 'Right-way eyes vs wrong-way eyes: MCA lesion → eyes look TOWARD the lesion (AWAY from the hemiparesis — the "right way"). Thalamic/pontine hemorrhage or seizure → eyes look AWAY from the lesion (toward the hemiparesis — the "wrong way").',
  },
  {
    id: '3',
    name: 'Visual Fields',
    shortName: '3 — Visual Fields',
    examInstructions: [
      'Cover ONE eye at a time with your hand.',
      'Hold your face directly in front of the patient and ask them to look at your nose.',
      'Test UPPER-outer quadrant: wiggle fingers in upper-left or upper-right — "Which side? Right, left, or both?"',
      'Test LOWER-outer quadrant: same in lower fields.',
      'Test BOTH eyes.',
      'If patient doesn\'t understand: do "blink to threat" — bring your hand quickly toward each quadrant. Do they blink?',
      'If pre-existing blindness in one eye: only score the remaining eye.',
    ],
    lookFor: 'Can they detect movement in all four quadrants of both eyes? Is one half of their visual field completely absent (hemianopia)?',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- Left eye field -->
  <g transform="translate(10,10)">
    <text x="70" y="18" text-anchor="middle" fill="#aaa" font-size="11">LEFT EYE view</text>
    <circle cx="70" cy="90" r="65" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
    <line x1="70" y1="25" x2="70" y2="155" stroke="#4fc3f7" stroke-width="1" stroke-dasharray="4,4"/>
    <line x1="5" y1="90" x2="135" y2="90" stroke="#4fc3f7" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="38" y="65" fill="#4fc3f7" font-size="10">UL</text>
    <text x="90" y="65" fill="#4fc3f7" font-size="10">UR</text>
    <text x="38" y="120" fill="#4fc3f7" font-size="10">LL</text>
    <text x="90" y="120" fill="#4fc3f7" font-size="10">LR</text>
    <!-- Hemianopia example — right half shaded -->
    <path d="M70,25 A65,65 0 0,1 70,155 Z" fill="#ef5350" opacity="0.3"/>
    <text x="95" y="95" fill="#ef5350" font-size="9" font-weight="bold">LOSS</text>
  </g>
  <!-- Score guide -->
  <g transform="translate(155,20)">
    <rect x="0" y="0" width="155" height="130" rx="10" fill="#0d1f2d" stroke="#333" stroke-width="1"/>
    <text x="78" y="20" text-anchor="middle" fill="#aaa" font-size="11" font-weight="bold">Scoring</text>
    <circle cx="15" cy="40" r="6" fill="#4fc3f7"/>
    <text x="28" y="45" fill="#4fc3f7" font-size="11">0 — No loss</text>
    <circle cx="15" cy="65" r="6" fill="#ffd54f"/>
    <text x="28" y="70" fill="#ffd54f" font-size="11">1 — Partial</text>
    <text x="28" y="82" fill="#aaa" font-size="9">(one quadrant)</text>
    <circle cx="15" cy="100" r="6" fill="#ef5350"/>
    <text x="28" y="105" fill="#ef5350" font-size="11">2 — Complete</text>
    <text x="28" y="117" fill="#aaa" font-size="9">(full half field)</text>
    <text x="78" y="132" text-anchor="middle" fill="#e040fb" font-size="10">3 — Both eyes blind</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'No loss', description: 'Normal visual fields. Patient detects movement/fingers in all four quadrants of both eyes.' },
      { value: 1, label: 'Partial hemianopia', description: 'Loss of one quadrant. Patient misses some but not all of one side (e.g. upper-right only). Also: patient looks appropriately toward the side of the moving fingers = score 0.' },
      { value: 2, label: 'Complete hemianopia', description: 'Full half of the visual field is absent in one or both eyes on the same side.' },
      { value: 3, label: 'Bilateral hemianopia', description: 'Cortical blindness — both eyes have lost vision from any cause. Patient may be unaware.' },
    ],
    note: 'If pre-existing unilateral blindness: score only the remaining eye.',
    caveats: [
      'Use blink-to-threat if patient cannot cooperate (e.g. aphasic, obtunded).',
      'If patient has pre-existing blindness in one eye, score only the seeing eye.',
      'Score 1 for partial hemianopia (quadrantanopia).',
      'Score 3 requires bilateral visual loss from any cortical cause.',
    ],
    rubric: [
      { score: 0, criteria: 'No visual loss.' },
      { score: 1, criteria: 'Partial hemianopia (including quadrantanopia) or extinction to double simultaneous stimulation.' },
      { score: 2, criteria: 'Complete hemianopia.' },
      { score: 3, criteria: 'Bilateral hemianopia (blind including cortical blindness).' },
    ],
  },
  {
    id: '4',
    name: 'Facial Palsy',
    shortName: '4 — Facial Palsy',
    examInstructions: [
      'Ask patient to: (1) "Show me your teeth," (2) "Raise your eyebrows," (3) "Close your eyes tightly."',
      'Demonstrate each command yourself — patients often respond better to imitation.',
      'Look at nasolabial folds (the crease from nose to corner of mouth) — are they symmetric?',
      'Compare smile symmetry: does one corner of the mouth move less?',
      'For APHASIC patients: Tickle nares (nostrils) with a tissue. Score based on the grimace response.',
    ],
    lookFor: 'Is the lower face (smile, nasolabial fold) symmetric? Is the upper face (eyebrows, eye closure) also involved? Remember: central (cortical) strokes cause lower face weakness. Peripheral (Bell\'s palsy) causes BOTH upper and lower face weakness.',
    svg: `<svg viewBox="0 0 320 145" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- Score 0 Normal -->
  <g transform="translate(5,5)">
    <circle cx="35" cy="45" r="30" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
    <ellipse cx="24" cy="36" rx="6" ry="4" fill="#4fc3f7" opacity="0.7"/>
    <ellipse cx="46" cy="36" rx="6" ry="4" fill="#4fc3f7" opacity="0.7"/>
    <path d="M24,55 Q35,66 46,55" fill="none" stroke="#4fc3f7" stroke-width="2.5"/>
    <line x1="22" y1="50" x2="22" y2="56" stroke="#4fc3f7" stroke-width="1.5"/>
    <line x1="48" y1="50" x2="48" y2="56" stroke="#4fc3f7" stroke-width="1.5"/>
    <text x="35" y="92" text-anchor="middle" fill="#4fc3f7" font-size="11" font-weight="bold">Score 0</text>
    <text x="35" y="106" text-anchor="middle" fill="#aaa" font-size="9">Symmetric</text>
  </g>
  <!-- Score 1 Minor lower -->
  <g transform="translate(82,5)">
    <circle cx="35" cy="45" r="30" fill="#1a2e44" stroke="#ffd54f" stroke-width="1.5"/>
    <ellipse cx="24" cy="36" rx="6" ry="4" fill="#4fc3f7" opacity="0.7"/>
    <ellipse cx="46" cy="36" rx="6" ry="4" fill="#4fc3f7" opacity="0.7"/>
    <path d="M24,55 Q32,63 40,55" fill="none" stroke="#4fc3f7" stroke-width="2.5"/>
    <line x1="22" y1="50" x2="22" y2="58" stroke="#4fc3f7" stroke-width="1.5"/>
    <line x1="48" y1="50" x2="48" y2="52" stroke="#ffd54f" stroke-width="1.5"/>
    <text x="35" y="92" text-anchor="middle" fill="#ffd54f" font-size="11" font-weight="bold">Score 1</text>
    <text x="35" y="105" text-anchor="middle" fill="#aaa" font-size="9">Minor — lower</text>
    <text x="35" y="117" text-anchor="middle" fill="#aaa" font-size="9">face asymmetry</text>
  </g>
  <!-- Score 2 Partial -->
  <g transform="translate(159,5)">
    <circle cx="35" cy="45" r="30" fill="#1a2e44" stroke="#ef5350" stroke-width="1.5"/>
    <ellipse cx="24" cy="36" rx="6" ry="4" fill="#4fc3f7" opacity="0.7"/>
    <ellipse cx="46" cy="36" rx="6" ry="4" fill="#4fc3f7" opacity="0.7"/>
    <path d="M24,55 Q28,58 33,55" fill="none" stroke="#4fc3f7" stroke-width="2.5"/>
    <line x1="22" y1="50" x2="22" y2="58" stroke="#4fc3f7" stroke-width="1.5"/>
    <line x1="48" y1="50" x2="48" y2="51" stroke="#ef5350" stroke-width="1.5"/>
    <text x="35" y="92" text-anchor="middle" fill="#ef5350" font-size="11" font-weight="bold">Score 2</text>
    <text x="35" y="105" text-anchor="middle" fill="#aaa" font-size="9">Complete lower</text>
    <text x="35" y="117" text-anchor="middle" fill="#aaa" font-size="9">face paresis</text>
  </g>
  <!-- Score 3 Complete -->
  <g transform="translate(236,5)">
    <circle cx="35" cy="45" r="30" fill="#1a2e44" stroke="#b71c1c" stroke-width="2"/>
    <line x1="24" y1="33" x2="24" y2="39" stroke="#aaa" stroke-width="1.5"/>
    <line x1="46" y1="33" x2="46" y2="39" stroke="#aaa" stroke-width="1.5"/>
    <line x1="35" y1="55" x2="35" y2="61" stroke="#b71c1c" stroke-width="2.5"/>
    <text x="35" y="92" text-anchor="middle" fill="#b71c1c" font-size="11" font-weight="bold">Score 3</text>
    <text x="35" y="105" text-anchor="middle" fill="#aaa" font-size="9">Complete — upper</text>
    <text x="35" y="117" text-anchor="middle" fill="#aaa" font-size="9">+ lower face</text>
  </g>
  <text x="160" y="138" text-anchor="middle" fill="#aaa" font-size="9">Check: nasolabial fold · smile · eyebrow raise · eye closure</text>
</svg>`,
    scores: [
      { value: 0, label: 'Normal', description: 'Normal symmetric facial movements. Eyebrows raise symmetrically, smile symmetric, nasolabial folds equal.' },
      { value: 1, label: 'Minor paralysis', description: 'Flattened nasolabial fold on one side. Asymmetric smile — more teeth visible on one side. UPPER face (forehead, eye closure) normal.' },
      { value: 2, label: 'Partial paralysis', description: 'Complete paralysis of LOWER face on one side — when asked to smile, one side doesn\'t move at all. Upper face still moves.' },
      { value: 3, label: 'Complete paralysis', description: 'Both upper and lower face affected. Cannot close eye on weak side. No wrinkling of forehead. Found in peripheral (Bell\'s palsy pattern) or very severe stroke.' },
    ],
    note: 'Central stroke = lower face weakness only (upper face spared). Peripheral lesion = BOTH upper and lower face.',
    caveats: [
      'Test upper and lower face separately. Look at forehead wrinkles AND smile.',
      'In aphasic or unresponsive patients, use tissue in nares or painful stimulus to assess grimace.',
      'Score 3 (complete palsy, upper + lower) suggests Bell\'s palsy (LMN) or severe peripheral lesion — NOT a typical stroke pattern.',
    ],
    rubric: [
      { score: 0, criteria: 'Normal symmetrical movement.' },
      { score: 1, criteria: 'Minor paralysis (flattened nasolabial fold, asymmetry on smiling).' },
      { score: 2, criteria: 'Partial paralysis (total or near-total paralysis of lower face).' },
      { score: 3, criteria: 'Complete paralysis of one or both sides (absence of facial movement in upper and lower face).' },
    ],
    localizationPearl: 'UMN (central/stroke) lesions spare the forehead because bilateral cortical innervation protects the upper face. LMN (Bell\'s palsy, CN VII nucleus) lesions involve the forehead. If the forehead is weak AND limbs are normal → Bell\'s palsy, NOT stroke.',
  },
  {
    id: '5a',
    name: 'Motor Arm — Right',
    shortName: '5a — Right Arm Motor',
    examInstructions: [
      'If SITTING: Extend right arm out, palm down, at 90°. Count aloud 1… 2… 3… up to 10 seconds.',
      'If LYING (supine/semi-Fowler): Hold arm at 45°, palm down. Count aloud for 10 seconds.',
      'Tell the patient: "Hold your arm up. Don\'t let it drop."',
      'Watch carefully — does it drift? Does it touch the bed?',
    ],
    lookFor: 'Holds for 10s = 0. Drifts but doesn\'t touch = 1. Drifts to bed with anti-gravity effort = 2. Falls immediately with movement = 3. No movement = 4.',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- 90 degrees seated -->
  <g transform="translate(10,10)">
    <text x="70" y="15" text-anchor="middle" fill="#aaa" font-size="11" font-weight="bold">Seated: 90°</text>
    <line x1="70" y1="30" x2="70" y2="120" stroke="#4fc3f7" stroke-width="3" stroke-linecap="round"/>
    <line x1="70" y1="75" x2="135" y2="75" stroke="#4fc3f7" stroke-width="3" stroke-linecap="round"/>
    <text x="100" y="60" fill="#aaa" font-size="10">palm</text>
    <text x="100" y="72" fill="#aaa" font-size="10">down</text>
    <path d="M70,75 A20,20 0 0,1 90,55" fill="none" stroke="#ffd54f" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="88" y="50" fill="#ffd54f" font-size="12" font-weight="bold">90°</text>
    <text x="70" y="145" text-anchor="middle" fill="#aaa" font-size="10">Count 10 sec</text>
  </g>
  <!-- 45 degrees supine -->
  <g transform="translate(165,10)">
    <text x="70" y="15" text-anchor="middle" fill="#aaa" font-size="11" font-weight="bold">Supine: 45°</text>
    <rect x="20" y="100" width="100" height="12" rx="4" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
    <line x1="70" y1="100" x2="70" y2="60" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
    <line x1="70" y1="100" x2="125" y2="57" stroke="#4fc3f7" stroke-width="3" stroke-linecap="round"/>
    <path d="M70,100 A30,30 0 0,1 97,74" fill="none" stroke="#ffd54f" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="88" y="72" fill="#ffd54f" font-size="12" font-weight="bold">45°</text>
    <text x="70" y="145" text-anchor="middle" fill="#aaa" font-size="10">Count 10 sec</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'No drift', description: 'Holds arm at full 90° (or 45°) for the full 10 seconds without drifting.' },
      { value: 1, label: 'Drift', description: 'Arm drifts down BEFORE 10 seconds but does NOT touch the bed or support surface.' },
      { value: 2, label: 'Effort against gravity', description: 'Some anti-gravity movement present but arm DOES touch the bed within 10 seconds.' },
      { value: 3, label: 'No anti-gravity', description: 'Arm falls immediately when placed. If the limb MOVES on the surface after falling → score 3. (No movement at all → score 4).' },
      { value: 4, label: 'No movement', description: 'No movement whatsoever.' },
      { value: 'UN', label: 'Untestable', description: 'Amputation, joint fusion, or other physical reason the test cannot be done. Document the reason.' },
    ],
    note: 'Test right arm here. Left arm is item 5b.',
    caveats: [
      'UN is reserved for shoulder amputation or joint fusion ONLY. Do not use UN for weakness or non-cooperation.',
      'Pronator drift still scores 1 — even if arm does not touch bed.',
      'Score 4 requires no flicker of movement.',
    ],
    rubric: [
      { score: 0, criteria: 'No drift — holds 10 s at 90° (seated) or 45° (supine).' },
      { score: 1, criteria: 'Drift — limb drifts before 10 s but does not hit bed or support.' },
      { score: 2, criteria: 'Some effort against gravity — limb drifts to bed within 10 s.' },
      { score: 3, criteria: 'No effort against gravity — limb falls; still some movement.' },
      { score: 4, criteria: 'No movement.' },
      { score: 'UN', criteria: 'Amputation or joint fusion (explain).' },
    ],
    functionalClues: [
      'Give-way weakness: resistance suddenly collapses.',
      'Co-contraction: antagonists firing simultaneously.',
      'Variable weakness across the exam.',
      'Weakness pattern does not match a vascular territory.',
    ],
  },
  {
    id: '5b',
    name: 'Motor Arm — Left',
    shortName: '5b — Left Arm Motor',
    examInstructions: [
      'If SITTING: Extend left arm out, palm down, at 90°. Count aloud 1… 2… 3… up to 10 seconds.',
      'If LYING (supine/semi-Fowler): Hold arm at 45°, palm down. Count aloud for 10 seconds.',
      'Same procedure as right arm.',
    ],
    lookFor: 'Same as right arm — hold for 10s, drift without touching, drift to bed, falls with movement, no movement.',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <g transform="translate(10,10)">
    <text x="70" y="15" text-anchor="middle" fill="#aaa" font-size="11" font-weight="bold">Seated: 90°</text>
    <line x1="70" y1="30" x2="70" y2="120" stroke="#4fc3f7" stroke-width="3" stroke-linecap="round"/>
    <line x1="5" y1="75" x2="70" y2="75" stroke="#4fc3f7" stroke-width="3" stroke-linecap="round"/>
    <text x="30" y="60" fill="#aaa" font-size="10">palm down</text>
    <path d="M70,75 A20,20 0 0,0 50,55" fill="none" stroke="#ffd54f" stroke-width="1.5" stroke-dasharray="3,3"/>
    <text x="22" y="50" fill="#ffd54f" font-size="12" font-weight="bold">90°</text>
    <text x="70" y="145" text-anchor="middle" fill="#aaa" font-size="10">Count 10 sec</text>
  </g>
  <g transform="translate(165,60)">
    <text x="70" y="0" text-anchor="middle" fill="#4fc3f7" font-size="20">←</text>
    <text x="70" y="22" text-anchor="middle" fill="#aaa" font-size="12" font-weight="bold">LEFT arm</text>
    <text x="70" y="42" text-anchor="middle" fill="#aaa" font-size="10">Same procedure</text>
    <text x="70" y="56" text-anchor="middle" fill="#aaa" font-size="10">as right arm</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'No drift', description: 'Holds arm at full 90° (or 45°) for the full 10 seconds without drifting.' },
      { value: 1, label: 'Drift', description: 'Arm drifts down BEFORE 10 seconds but does NOT touch the bed or support surface.' },
      { value: 2, label: 'Effort against gravity', description: 'Some anti-gravity movement present but arm DOES touch the bed within 10 seconds.' },
      { value: 3, label: 'No anti-gravity', description: 'Arm falls immediately. Movement present on surface = 3. No movement at all = 4.' },
      { value: 4, label: 'No movement', description: 'No movement whatsoever.' },
      { value: 'UN', label: 'Untestable', description: 'Amputation, joint fusion, or other physical reason. Document the reason.' },
    ],
    note: 'Test left arm here.',
    caveats: [
      'Same caveats as 5a. UN = shoulder amputation or fused joint only.',
      'Pronator drift scores 1.',
    ],
    rubric: [
      { score: 0, criteria: 'No drift — holds 10 s.' },
      { score: 1, criteria: 'Drift — before 10 s, does not hit bed.' },
      { score: 2, criteria: 'Some effort against gravity — limb drifts to bed.' },
      { score: 3, criteria: 'No effort against gravity.' },
      { score: 4, criteria: 'No movement.' },
      { score: 'UN', criteria: 'Amputation or joint fusion.' },
    ],
    functionalClues: [
      'Give-way weakness, co-contraction, variable strength.',
      'Consider Hoover\'s sign when testing opposite leg in item 6.',
    ],
  },
  {
    id: '6a',
    name: 'Motor Leg — Right',
    shortName: '6a — Right Leg Motor',
    examInstructions: [
      'Patient must be SUPINE (lying flat on back).',
      'Raise the right leg to 30°.',
      'Tell patient: "Hold your leg up. Don\'t let it drop."',
      'Count aloud 1… 2… 3… up to 5 seconds.',
      'Watch carefully — does it drift? Touch the bed?',
    ],
    lookFor: 'Holds 5s = 0. Drifts before 5s but no bed contact = 1. Touches bed within 5s with effort = 2. Falls immediately = 3. No movement = 4.',
    svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" class="nihss-svg" style="max-height:170px">
  <text x="160" y="18" text-anchor="middle" fill="#aaa" font-size="12" font-weight="bold">Right Leg at 30° — Patient Supine</text>
  <!-- Bed -->
  <rect x="15" y="130" width="290" height="12" rx="5" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Pillow -->
  <rect x="20" y="118" width="50" height="14" rx="7" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1"/>
  <!-- Body on bed - torso -->
  <ellipse cx="65" cy="115" rx="35" ry="16" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Head -->
  <circle cx="40" cy="110" r="14" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Right leg RAISED at 30 degrees -->
  <line x1="100" y1="118" x2="230" y2="72" stroke="#4fc3f7" stroke-width="6" stroke-linecap="round"/>
  <!-- Foot -->
  <rect x="226" y="63" width="18" height="12" rx="4" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Left leg flat on bed -->
  <line x1="100" y1="125" x2="230" y2="125" stroke="#aaa" stroke-width="4" stroke-linecap="round" stroke-dasharray="2,0" opacity="0.4"/>
  <!-- 30 degree angle arc -->
  <path d="M130,118 A35,35 0 0,1 155,100" fill="none" stroke="#ffd54f" stroke-width="2" stroke-dasharray="4,3"/>
  <text x="162" y="98" fill="#ffd54f" font-size="14" font-weight="bold">30°</text>
  <!-- Timer -->
  <rect x="230" y="100" width="75" height="28" rx="8" fill="#0d1f2d" stroke="#ffd54f" stroke-width="1.5"/>
  <text x="267" y="119" text-anchor="middle" fill="#ffd54f" font-size="12" font-weight="bold">5 sec</text>
  <text x="160" y="158" text-anchor="middle" fill="#aaa" font-size="10">Count aloud: "1... 2... 3... 4... 5"</text>
</svg>`,
    scores: [
      { value: 0, label: 'No drift', description: 'Holds leg at 30° for the full 5 seconds without drifting.' },
      { value: 1, label: 'Drift', description: 'Leg drifts down BEFORE 5 seconds but does NOT touch the bed.' },
      { value: 2, label: 'Effort against gravity', description: 'Some movement against gravity but leg DOES touch the bed within 5 seconds.' },
      { value: 3, label: 'No anti-gravity', description: 'Falls immediately when placed. Movement present on surface = 3. No movement at all = 4.' },
      { value: 4, label: 'No movement', description: 'No movement whatsoever.' },
      { value: 'UN', label: 'Untestable', description: 'Amputation, joint fusion, other. Document reason.' },
    ],
    caveats: [
      'Leg is tested at 30° for 5 seconds (not 90°/10s like arm).',
      'UN = amputation or joint fusion only.',
    ],
    rubric: [
      { score: 0, criteria: 'No drift — holds 30° for 5 s.' },
      { score: 1, criteria: 'Drift — before 5 s, does not hit bed.' },
      { score: 2, criteria: 'Some effort against gravity — touches bed within 5 s.' },
      { score: 3, criteria: 'No effort against gravity.' },
      { score: 4, criteria: 'No movement.' },
      { score: 'UN', criteria: 'Amputation or joint fusion.' },
    ],
    functionalClues: [
      'Hoover\'s sign: downward pressure under the paretic heel when opposite leg flexes against resistance = genuine weakness; absent = functional.',
      'Give-way weakness.',
    ],
  },
  {
    id: '6b',
    name: 'Motor Leg — Left',
    shortName: '6b — Left Leg Motor',
    examInstructions: [
      'Patient SUPINE.',
      'Raise the left leg to 30°.',
      'Count aloud for 5 seconds.',
      'Same procedure as right leg.',
    ],
    lookFor: 'Same as right leg.',
    svg: `<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" class="nihss-svg" style="max-height:170px">
  <text x="160" y="18" text-anchor="middle" fill="#aaa" font-size="12" font-weight="bold">Left Leg at 30° — Patient Supine</text>
  <!-- Bed -->
  <rect x="15" y="130" width="290" height="12" rx="5" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Pillow -->
  <rect x="245" y="118" width="50" height="14" rx="7" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1"/>
  <!-- Body on bed - torso -->
  <ellipse cx="255" cy="115" rx="35" ry="16" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Head -->
  <circle cx="280" cy="110" r="14" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Left leg RAISED at 30 degrees -->
  <line x1="220" y1="118" x2="90" y2="72" stroke="#4fc3f7" stroke-width="6" stroke-linecap="round"/>
  <!-- Foot -->
  <rect x="76" y="63" width="18" height="12" rx="4" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
  <!-- Right leg flat on bed -->
  <line x1="220" y1="125" x2="90" y2="125" stroke="#aaa" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
  <!-- 30 degree angle arc -->
  <path d="M190,118 A35,35 0 0,0 165,100" fill="none" stroke="#ffd54f" stroke-width="2" stroke-dasharray="4,3"/>
  <text x="145" y="98" fill="#ffd54f" font-size="14" font-weight="bold">30°</text>
  <!-- Timer -->
  <rect x="15" y="100" width="75" height="28" rx="8" fill="#0d1f2d" stroke="#ffd54f" stroke-width="1.5"/>
  <text x="52" y="119" text-anchor="middle" fill="#ffd54f" font-size="12" font-weight="bold">5 sec</text>
  <text x="160" y="158" text-anchor="middle" fill="#aaa" font-size="10">Same procedure as right leg</text>
</svg>`,
    scores: [
      { value: 0, label: 'No drift', description: 'Holds leg at 30° for the full 5 seconds without drifting.' },
      { value: 1, label: 'Drift', description: 'Leg drifts down BEFORE 5 seconds but does NOT touch the bed.' },
      { value: 2, label: 'Effort against gravity', description: 'Some movement against gravity but leg DOES touch the bed within 5 seconds.' },
      { value: 3, label: 'No anti-gravity', description: 'Falls immediately. Movement on surface = 3. No movement at all = 4.' },
      { value: 4, label: 'No movement', description: 'No movement whatsoever.' },
      { value: 'UN', label: 'Untestable', description: 'Amputation, joint fusion, other. Document reason.' },
    ],
    caveats: [
      '30°/5 s, UN only for amputation or fused joint.',
      'Hoover\'s sign is the best quick functional-weakness clue in leg.',
    ],
    rubric: [
      { score: 0, criteria: 'No drift — holds 30° for 5 s.' },
      { score: 1, criteria: 'Drift — before 5 s, no bed contact.' },
      { score: 2, criteria: 'Some effort against gravity — touches bed.' },
      { score: 3, criteria: 'No effort against gravity.' },
      { score: 4, criteria: 'No movement.' },
      { score: 'UN', criteria: 'Amputation or joint fusion.' },
    ],
    functionalClues: [
      'Hoover\'s sign: a key test — see 6a.',
      'Give-way weakness.',
    ],
  },
  {
    id: '7',
    name: 'Limb Ataxia',
    shortName: '7 — Limb Ataxia',
    examInstructions: [
      'FINGER-TO-NOSE: Hold your index finger at arm\'s length in the patient\'s intact visual field.',
      'Ask: "Touch your nose, then touch my finger, back and forth." Repeat 3–4 times each arm.',
      'Keep your finger still (or move it slightly to vary the target).',
      'HEEL-TO-SHIN: Ask patient to: "Put your heel on your knee, then slide it down your shin to your ankle." Repeat both legs.',
      'For APHASIC patients: Passively move the limb to show what is expected, then let them try.',
    ],
    lookFor: 'Ataxia = movement is tremulous, dysmetric (over/undershoots), or uncoordinated — out of proportion to any weakness present. If weakness alone stops them from doing the test → score 0 (not ataxia).',
    svg: `<svg viewBox="0 0 320 155" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <!-- Finger to nose -->
  <g transform="translate(10,10)">
    <rect x="0" y="0" width="145" height="140" rx="10" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
    <text x="72" y="20" text-anchor="middle" fill="#4fc3f7" font-size="11" font-weight="bold">Finger to Nose</text>
    <circle cx="115" cy="70" r="8" fill="#4fc3f7" opacity="0.8"/>
    <text x="115" y="74" text-anchor="middle" fill="#0d1f2d" font-size="10" font-weight="bold">F</text>
    <circle cx="30" cy="70" r="8" fill="#ffd54f" opacity="0.8"/>
    <text x="30" y="74" text-anchor="middle" fill="#0d1f2d" font-size="10" font-weight="bold">N</text>
    <path d="M38,70 L107,70" stroke="#aaa" stroke-width="2" stroke-dasharray="5,5"/>
    <path d="M60,70 Q72,50 85,70 Q97,90 110,70" fill="none" stroke="#ef5350" stroke-width="1.5"/>
    <text x="72" y="105" text-anchor="middle" fill="#aaa" font-size="10">N=Nose, F=Finger</text>
    <text x="72" y="120" text-anchor="middle" fill="#ef5350" font-size="9">Red = dysmetric path</text>
    <text x="72" y="132" text-anchor="middle" fill="#aaa" font-size="9">Examiner's finger = arm's length</text>
  </g>
  <!-- Heel to shin -->
  <g transform="translate(165,10)">
    <rect x="0" y="0" width="145" height="140" rx="10" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
    <text x="72" y="20" text-anchor="middle" fill="#4fc3f7" font-size="11" font-weight="bold">Heel to Shin</text>
    <path d="M40,45 Q72,60 105,45" fill="none" stroke="#aaa" stroke-width="2"/>
    <line x1="72" y1="55" x2="72" y2="120" stroke="#4fc3f7" stroke-width="3" stroke-linecap="round"/>
    <circle cx="72" cy="50" r="8" fill="#ffd54f" opacity="0.8"/>
    <text x="72" y="54" text-anchor="middle" fill="#0d1f2d" font-size="8" font-weight="bold">heel</text>
    <circle cx="72" cy="120" r="6" fill="#4fc3f7" opacity="0.5"/>
    <text x="72" y="124" text-anchor="middle" fill="#0d1f2d" font-size="8">ankle</text>
    <text x="72" y="138" text-anchor="middle" fill="#aaa" font-size="9">Slide heel down shin</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'No ataxia', description: 'No ataxia present — OR — limb weakness makes the test impossible to perform (score 0 when weakness prevents testing). OR patient doesn\'t understand despite demonstration.' },
      { value: 1, label: 'Ataxia in one limb', description: 'Ataxia present in ONE limb (arm OR leg). Movement is tremulous, overshoots/undershoots the target, or slides off the shin.' },
      { value: 2, label: 'Ataxia in two limbs', description: 'Ataxia present in TWO or more limbs.' },
    ],
    note: 'Key distinction: If weakness alone limits the test → score 0. Only score ataxia if coordination problem exceeds what weakness would explain.',
    caveats: [
      'Ataxia is only scored if OUT OF PROPORTION to weakness.',
      'If weakness is severe (4/4) and prevents the task → score 0, not 2.',
      'This is a NIHSS blind spot for cerebellar strokes — truncal ataxia and gait ataxia are NOT captured. Always test tandem gait if safe.',
      'Ataxia here refers to limb ataxia only (finger-to-nose, heel-to-shin).',
    ],
    rubric: [
      { score: 0, criteria: 'Absent — or weakness prevents test.' },
      { score: 1, criteria: 'Present in one limb.' },
      { score: 2, criteria: 'Present in two or more limbs.' },
    ],
    localizationPearl: 'Ipsilateral limb ataxia = cerebellar hemisphere or cerebellar connections (inferior cerebellar peduncle). Truncal or gait ataxia = midline/vermis lesion — NIHSS will miss this.',
  },
  {
    id: '8',
    name: 'Sensory',
    shortName: '8 — Sensory',
    examInstructions: [
      'Use a broken tongue depressor (sharp point) or a safety pin.',
      'Test: face, upper arm, lower arm, thigh, lower leg — on BOTH sides.',
      'Ask: "Can you feel this? Is it sharp? Is it the SAME on both sides, or different?"',
      'Apply equal light pressure on each side.',
      'For patients who cannot communicate: watch for grimace or withdrawal from sharp touch.',
      'DO NOT test hands or feet (to avoid confounding by peripheral neuropathy).',
    ],
    lookFor: 'Only score sensory loss if clearly demonstrated. If in doubt → score 0. Only score loss attributable to the stroke, not pre-existing neuropathy.',
    svg: `<svg viewBox="0 0 320 155" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <g transform="translate(10,10)">
    <text x="150" y="18" text-anchor="middle" fill="#4fc3f7" font-size="13" font-weight="bold">Test areas (NOT hands/feet)</text>
    <!-- Simple body outline -->
    <ellipse cx="100" cy="50" rx="20" ry="22" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
    <rect x="75" y="72" width="50" height="55" rx="8" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1.5"/>
    <rect x="48" y="75" width="22" height="45" rx="6" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1"/>
    <rect x="130" y="75" width="22" height="45" rx="6" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1"/>
    <rect x="75" y="127" width="20" height="40" rx="6" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1"/>
    <rect x="105" y="127" width="20" height="40" rx="6" fill="#1a2e44" stroke="#4fc3f7" stroke-width="1"/>
    <!-- Test dots -->
    <circle cx="60" cy="90" r="5" fill="#ffd54f"/>
    <circle cx="140" cy="90" r="5" fill="#4fc3f7"/>
    <circle cx="80" cy="135" r="5" fill="#ffd54f"/>
    <circle cx="120" cy="135" r="5" fill="#4fc3f7"/>
    <circle cx="88" cy="45" r="5" fill="#ffd54f"/>
    <circle cx="112" cy="45" r="5" fill="#4fc3f7"/>
    <text x="55" y="88" fill="#ffd54f" font-size="8" text-anchor="middle">L</text>
    <text x="145" y="88" fill="#4fc3f7" font-size="8" text-anchor="middle">R</text>
    <text x="200" y="60" fill="#aaa" font-size="10">Compare</text>
    <text x="200" y="74" fill="#aaa" font-size="10">left vs right:</text>
    <text x="200" y="95" fill="#aaa" font-size="10">• Face</text>
    <text x="200" y="110" fill="#aaa" font-size="10">• Upper arm</text>
    <text x="200" y="125" fill="#aaa" font-size="10">• Lower arm</text>
    <text x="200" y="140" fill="#aaa" font-size="10">• Thigh/leg</text>
  </g>
</svg>`,
    scores: [
      { value: 0, label: 'Normal', description: 'No sensory loss. Feels sharp touch equally on both sides.' },
      { value: 1, label: 'Mild-moderate loss', description: 'Patient feels less sharp on the affected side — they are AWARE of being touched, but it feels different/duller. Or: loss only in one extremity.' },
      { value: 2, label: 'Severe loss', description: 'Patient does NOT feel touch on the affected side at all. Or: bilateral sensory loss.' },
    ],
    note: 'Do NOT test hands/feet. If uncertain, score 0. Only score loss clearly attributable to stroke, not pre-existing neuropathy.',
    caveats: [
      'Only score sensory loss attributable to the stroke — not pre-existing peripheral neuropathy, diabetes, prior injury.',
      'If the patient is obtunded/aphasic: grimace or withdrawal to noxious stimuli counts as detection.',
      'Isolated sensory level without cranial nerve deficits localizes to the SPINAL CORD, not stroke — broaden your differential.',
      'Score 2 only for severe / total loss — patient is UNAWARE of being touched.',
    ],
    rubric: [
      { score: 0, criteria: 'Normal — no sensory loss.' },
      { score: 1, criteria: 'Mild-to-moderate loss — patient feels pinprick less sharp or dull, but is aware of being touched; or loss in one extremity only.' },
      { score: 2, criteria: 'Severe-to-total loss — patient unaware of being touched on the affected side; stuporous/aphasic with bilateral loss; quadriplegic.' },
    ],
    localizationPearl: 'Hemisensory loss + contralateral motor/cortical signs → cortex/subcortex. Pure hemisensory loss (thalamic lacune) → VPL thalamus. Crossed sensory loss (ipsilateral face + contralateral body) → lateral medulla (Wallenberg). A sensory LEVEL on the trunk points to spinal cord, not stroke.',
    functionalClues: [
      'Splitting of the midline — sensory loss that stops precisely at the midline of the trunk/face (true hemisensory loss stops 1–2 cm short of midline due to overlapping innervation).',
      'Loss of vibration at the sternum on one side but not the other (vibration crosses bone — anatomically impossible).',
      'Inconsistent sensory boundaries that change with re-testing.',
    ],
  },
  {
    id: '9',
    name: 'Best Language',
    shortName: '9 — Language / Aphasia',
    examInstructions: [
      '1. FLUENCY — Show the cookie jar picture. "Tell me everything you see happening in this picture."',
      '2. NAMING — Show common objects (pen, watch, glasses, key). "What is this called?"',
      '3. READING — Show printed sentences: "The sky is blue." "He lived nearby." Ask to read aloud.',
      'If visually impaired: (1) assess fluency in conversation, (2) place objects in hand for naming, (3) ask to write a sentence.',
      'Observations from earlier NIHSS items (alertness, commands) also count toward this score.',
    ],
    lookFor: 'Is speech fluent or halting? Can they name objects? Can they understand your commands? Can they read? Compare output to comprehension.',
    svg: `<div style="text-align:center">
  <div class="show-picture-link" id="open-cookie-picture" style="margin-bottom:12px; display:inline-flex">
    🖼️ Tap to Show Picture to Patient
  </div>
</div>
<div style="background:#0d1f2d; border-radius:10px; border:1px solid #333; padding:14px 12px; margin-top:8px;">
  <div style="text-align:center; color:#aaa; font-size:12px; font-weight:bold; margin-bottom:10px;">Aphasia Scoring Guide</div>
  <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;">
    <span style="min-width:18px; height:18px; border-radius:50%; background:#4fc3f7; display:inline-block; margin-top:2px;"></span>
    <span style="color:#4fc3f7; font-size:13px; line-height:1.3;"><b>0</b> — Normal speech, naming, reading</span>
  </div>
  <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;">
    <span style="min-width:18px; height:18px; border-radius:50%; background:#ffd54f; display:inline-block; margin-top:2px;"></span>
    <div>
      <span style="color:#ffd54f; font-size:13px; line-height:1.3;"><b>1</b> — Mild/Mod: word-finding pauses, gets ideas across</span>
      <div style="color:#aaa; font-size:11px; margin-top:2px;">Examiner can identify picture from patient's description</div>
    </div>
  </div>
  <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:8px;">
    <span style="min-width:18px; height:18px; border-radius:50%; background:#ef5350; display:inline-block; margin-top:2px;"></span>
    <span style="color:#ef5350; font-size:13px; line-height:1.3;"><b>2</b> — Severe: fragmented, examiner must guess meaning</span>
  </div>
  <div style="display:flex; align-items:flex-start; gap:8px;">
    <span style="min-width:18px; height:18px; border-radius:50%; background:#b71c1c; display:inline-block; margin-top:2px;"></span>
    <span style="color:#b71c1c; font-size:13px; line-height:1.3;"><b>3</b> — Mute / Global: no usable speech + no comprehension</span>
  </div>
</div>`,
    scores: [
      { value: 0, label: 'No aphasia', description: 'Normal. Fluent speech, correct naming, reads and understands normally.' },
      { value: 1, label: 'Mild-moderate aphasia', description: 'Some obvious loss of fluency OR comprehension — word-finding pauses, some paraphasias — but patient can get ideas across. Examiner can identify the picture or sentences from the response.' },
      { value: 2, label: 'Severe aphasia', description: 'Very fragmented communication. Examiner must guess what the patient is trying to say. Or patient is mute with severe expressive aphasia.' },
      { value: 3, label: 'Mute / global aphasia', description: 'Reserved for patient with NO usable speech AND unable to follow any one-step command. Global aphasia.' },
    ],
    caveats: [
      'This tests LANGUAGE, not speech clarity. Slurred-but-correct words = dysarthria (item 10), not aphasia.',
      'Information from items 1b, 1c, and commands (item 2/3) also counts — you have already been assessing language.',
      'Score 3 is reserved for NO usable speech AND no comprehension (global aphasia). If the patient can follow any command, they are not a 3.',
      'Mutism alone does not equal score 3 — a patient may be mute from severe dysarthria/anarthria (score on item 10) while language is intact.',
      'If intubated or visually impaired: use writing, hand-placed objects, and conversational assessment — do not default to UN.',
    ],
    rubric: [
      { score: 0, criteria: 'No aphasia — normal fluency, comprehension, naming, and reading.' },
      { score: 1, criteria: 'Mild-to-moderate aphasia — some loss of fluency or comprehension; word-finding pauses, paraphasias; examiner can still identify the picture or objects from patient response.' },
      { score: 2, criteria: 'Severe aphasia — fragmented expression; examiner must carry conversation and guess meaning; limited information exchange.' },
      { score: 3, criteria: 'Mute, global aphasia — no usable speech AND no auditory/reading comprehension.' },
    ],
    localizationPearl: 'Aphasia almost always localizes to the DOMINANT (usually left) hemisphere. Broca\'s (expressive) aphasia = non-fluent, good comprehension, frustrated — inferior frontal gyrus (MCA superior division). Wernicke\'s (receptive) aphasia = fluent but empty/jargon, poor comprehension, unaware — superior temporal gyrus (MCA inferior division). Global aphasia = both → large dominant MCA (M1) territory. Assess 6 domains: fluency, comprehension, repetition, naming, reading, writing.',
    functionalClues: [
      'Functional "aphasia" is rare — if present, speech is usually whispered, childlike, or inconsistent (vs stereotyped paraphasias of true aphasia).',
      'Patient understands complex questions but "cannot" produce any output (language comprehension and production usually degrade together).',
    ],
  },
  {
    id: '10',
    name: 'Dysarthria',
    shortName: '10 — Dysarthria',
    examInstructions: [
      'Ask patient to repeat these words after you:',
      '"Mama" — "Tip-top" — "Fifty-fifty" — "Huckleberry" — "Baseball player"',
      'Listen for slurring, distortion, or loss of intelligibility.',
      'This tests MOTOR speech — NOT word finding (that is aphasia, item 9).',
      'If patient is intubated → mark as UN (untestable).',
    ],
    lookFor: 'Is speech slurred but still understandable? Or completely unintelligible? Dysarthria = slurred motor output. Aphasia = wrong words or no words.',
    svg: `<svg viewBox="0 0 320 130" xmlns="http://www.w3.org/2000/svg" class="nihss-svg">
  <rect x="10" y="10" width="300" height="110" rx="12" fill="#0d1f2d" stroke="#4fc3f7" stroke-width="1.5"/>
  <text x="160" y="35" text-anchor="middle" fill="#4fc3f7" font-size="13" font-weight="bold">Words to repeat:</text>
  <text x="160" y="58" text-anchor="middle" fill="#fff" font-size="12">"Mama" · "Tip-top" · "Fifty-fifty"</text>
  <text x="160" y="78" text-anchor="middle" fill="#fff" font-size="12">"Huckleberry" · "Baseball player"</text>
  <text x="80" y="105" text-anchor="middle" fill="#ffd54f" font-size="10">Score 1: "tipsh, topf"</text>
  <text x="240" y="105" text-anchor="middle" fill="#ef5350" font-size="10">Score 2: Unintelligible</text>
</svg>`,
    scores: [
      { value: 0, label: 'Normal', description: 'Normal articulation. Words are clearly formed.' },
      { value: 1, label: 'Mild-moderate', description: 'Slurred speech — some distortion (e.g. "tipsh, topf") — but still intelligible. Listener can identify the words.' },
      { value: 2, label: 'Severe / unintelligible', description: 'So severely slurred as to be unintelligible — or patient is mute/anarthric. Includes severe expressive aphasia causing mutism (score 2 for either).' },
      { value: 'UN', label: 'Untestable', description: 'Patient is intubated. Document reason.' },
    ],
    caveats: [
      'Dysarthria = MOTOR speech (slurred). Aphasia = LANGUAGE (wrong words). If the word is correct but slurred → dysarthria. If the word is wrong/missing → aphasia.',
      'UN is reserved for patients who physically cannot be assessed (intubated, severe facial trauma). Do not use UN for aphasia — score 2 if mute from anarthria.',
      'Test with the standardized word list — not conversational speech. Novel words (huckleberry, baseball player) stress articulation.',
      'Dysarthria alone does not exclude stroke but is non-localizing — it can occur with lesions anywhere along the motor speech pathway (cortex, internal capsule, brainstem, cerebellum).',
    ],
    rubric: [
      { score: 0, criteria: 'Normal articulation.' },
      { score: 1, criteria: 'Mild-to-moderate — slurs at least some words; at worst, can be understood with some difficulty.' },
      { score: 2, criteria: 'Severe — speech so slurred as to be unintelligible (in the absence of or out of proportion to any aphasia); or patient is mute/anarthric.' },
      { score: 'UN', criteria: 'Intubated or other physical barrier to producing speech. Document reason.' },
    ],
    localizationPearl: 'Isolated dysarthria is a classic STROKE CHAMELEON — easily dismissed. Pure dysarthria can come from small lacunes in the internal capsule (dysarthria-clumsy-hand syndrome), basis pontis, or corona radiata. Dysarthria + ipsilateral ataxia → ataxic hemiparesis (pons/internal capsule). Bulbar dysarthria + dysphagia + tongue deviation → medullary lesion. Cerebellar dysarthria is scanning / explosive.',
  },
  {
    id: '11',
    name: 'Extinction and Inattention',
    shortName: '11 — Neglect / Inattention',
    examInstructions: [
      'VISUAL: With patient looking at your nose, wiggle fingers in two quadrants simultaneously.',
      '"Which side am I wiggling — right, left, or BOTH?" Test upper and lower fields.',
      'SENSORY: Eyes closed. Simultaneously touch patient on right and left (face, arms, legs).',
      '"Am I touching you on the right, left, or BOTH?"',
      'If aphasia: observe which side the patient attends to and responds to.',
    ],
    lookFor: 'Does the patient consistently miss one side when both sides are stimulated simultaneously? They may detect each side normally when tested alone — extinction = only missing when presented together.',
    svg: `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" class="nihss-svg" style="max-height:200px">
  <text x="160" y="18" text-anchor="middle" fill="#4fc3f7" font-size="13" font-weight="bold">Stroke Side → Contralateral Deficits</text>
  <!-- Left brain -->
  <rect x="10" y="30" width="130" height="80" rx="12" fill="#1a2e44" stroke="#4fc3f7" stroke-width="2"/>
  <text x="75" y="52" text-anchor="middle" fill="#4fc3f7" font-size="12" font-weight="bold">LEFT BRAIN</text>
  <text x="75" y="68" text-anchor="middle" fill="#4fc3f7" font-size="10">Language centre</text>
  <text x="75" y="82" text-anchor="middle" fill="#4fc3f7" font-size="10">Aphasia dominant</text>
  <text x="75" y="98" text-anchor="middle" fill="#aaa" font-size="9">Damage here causes:</text>
  <!-- Arrow right: line + triangle arrowhead -->
  <line x1="145" y1="70" x2="172" y2="70" stroke="#ef5350" stroke-width="2.5"/>
  <polygon points="172,64 182,70 172,76" fill="#ef5350"/>
  <!-- Right side deficits -->
  <rect x="180" y="30" width="130" height="80" rx="12" fill="#0d1f2d" stroke="#ef5350" stroke-width="1.5"/>
  <text x="245" y="50" text-anchor="middle" fill="#ef5350" font-size="11" font-weight="bold">RIGHT SIDE</text>
  <text x="245" y="64" text-anchor="middle" fill="#ef5350" font-size="10">Weakness</text>
  <text x="245" y="78" text-anchor="middle" fill="#ef5350" font-size="10">Sensory loss</text>
  <text x="245" y="92" text-anchor="middle" fill="#ef5350" font-size="10">Visual field loss</text>
  <text x="245" y="104" text-anchor="middle" fill="#aaa" font-size="9">+ Aphasia</text>
  <!-- Right brain -->
  <rect x="180" y="120" width="130" height="80" rx="12" fill="#1a2e44" stroke="#ffd54f" stroke-width="2"/>
  <text x="245" y="142" text-anchor="middle" fill="#ffd54f" font-size="12" font-weight="bold">RIGHT BRAIN</text>
  <text x="245" y="158" text-anchor="middle" fill="#ffd54f" font-size="10">Spatial awareness</text>
  <text x="245" y="172" text-anchor="middle" fill="#ffd54f" font-size="10">Neglect dominant</text>
  <text x="245" y="188" text-anchor="middle" fill="#aaa" font-size="9">Damage here causes:</text>
  <!-- Arrow left: line + triangle arrowhead pointing left -->
  <line x1="175" y1="160" x2="148" y2="160" stroke="#ef5350" stroke-width="2.5"/>
  <polygon points="148,154 138,160 148,166" fill="#ef5350"/>
  <!-- Left side deficits -->
  <rect x="10" y="120" width="130" height="80" rx="12" fill="#0d1f2d" stroke="#ef5350" stroke-width="1.5"/>
  <text x="75" y="140" text-anchor="middle" fill="#ef5350" font-size="11" font-weight="bold">LEFT SIDE</text>
  <text x="75" y="154" text-anchor="middle" fill="#ef5350" font-size="10">Weakness</text>
  <text x="75" y="168" text-anchor="middle" fill="#ef5350" font-size="10">Sensory loss</text>
  <text x="75" y="182" text-anchor="middle" fill="#ef5350" font-size="10">LEFT NEGLECT</text>
  <text x="75" y="196" text-anchor="middle" fill="#aaa" font-size="9">May not recognise own hand</text>
</svg>`,
    scores: [
      { value: 0, label: 'No inattention', description: 'No abnormality. Also score 0 if: severe visual loss but normal cutaneous response attending to both sides; OR aphasia but appears to attend to both sides.' },
      { value: 1, label: 'Inattention (1 modality)', description: 'Inattention or extinction to one modality only (visual OR sensory). Misses one side when both are stimulated together, but detects each alone.' },
      { value: 2, label: 'Profound neglect', description: 'Profound hemi-inattention or extinction in more than one modality. Patient does not recognize their own left hand when brought into the right visual field.' },
    ],
    note: 'Score 0 for aphasia if patient appears to attend to both sides. Inattention is scored only when clearly present.',
    caveats: [
      'Extinction = misses one side only when BOTH are stimulated simultaneously; detects each side normally when tested alone. Do not confuse with hemianopia (item 3) or hemisensory loss (item 8).',
      'Score 0 if there is severe visual loss that prevents double-simultaneous testing but cutaneous sensation is normal to bilateral simultaneous touch.',
      'Score 0 for aphasia if the patient appears to attend to both sides during the rest of the exam.',
      'Neglect is scored only when clearly present — do not over-interpret a single missed stimulus as neglect.',
      'A patient who fails to recognize their own limb (asomatognosia) or denies the deficit (anosognosia) has profound (score 2) neglect.',
    ],
    rubric: [
      { score: 0, criteria: 'No abnormality. Detects bilateral simultaneous stimulation in both modalities.' },
      { score: 1, criteria: 'Visual, tactile, auditory, spatial, or personal inattention OR extinction to bilateral simultaneous stimulation in ONE sensory modality.' },
      { score: 2, criteria: 'Profound hemi-inattention or extinction to MORE THAN ONE modality. Does not recognize own hand or orients to only one side of space.' },
    ],
    localizationPearl: 'Neglect is almost always a RIGHT hemisphere (non-dominant) sign. The right parietal lobe dominates spatial attention to both sides; the left parietal only attends right — so right-sided lesions cause profound left neglect, while left-sided lesions are compensated. Classic localizations: right INFERIOR PARIETAL LOBULE (hemispatial neglect), right FRONTAL (motor neglect, gaze preference), RIGHT THALAMUS (motor/sensory neglect). A right MCA stroke with NIHSS underscored for weakness but obvious inattention is often more disabling than its number suggests.',
    functionalClues: [
      'True extinction is robust on retesting; inconsistent extinction that disappears when the patient is distracted suggests a non-organic process.',
      'Patients with true neglect are typically UNAWARE of the deficit (anosognosia); functional patients usually complain of the symptom.',
    ],
  },
];

// ── ABSOLUTE CONTRAINDICATIONS ───────────────────────────────
// Per Australian/Canadian guidelines: only active bleeding and ICH on imaging
window.ABS_CONTRA = [
  {
    id: 'hemorrhage',
    label: 'Active internal bleeding',
    detail: 'Active major internal bleeding (not including menses). Excludes minor superficial bleeding. If in doubt, weigh risk vs. potential benefit.',
  },
  {
    id: 'ich_on_ct',
    label: 'Intracranial hemorrhage on imaging',
    detail: 'Any hemorrhage on CT or MRI is an absolute contraindication to TNK.',
  },
];

// ── RELATIVE CONTRAINDICATIONS ───────────────────────────────
window.REL_CONTRA = [
  // ── Lab / medication concerns ──
  {
    id: 'bp_refractory',
    label: 'BP cannot be controlled below 185/110',
    detail: 'Try labetalol 10mg IV, hydralazine 10mg IV, or nicardipine 5mg/h. If BP cannot be maintained <185/110 despite treatment, TNK is not safe to give.',
  },
  {
    id: 'glucose_low',
    label: 'Blood glucose <2.7 mmol/L',
    detail: 'Hypoglycaemia can mimic stroke — treat first and reassess. If stroke is confirmed after correction, may proceed.',
  },
  {
    id: 'glucose_high',
    label: 'Blood glucose >22.2 mmol/L',
    detail: 'Severe hyperglycaemia increases hemorrhagic risk. Weigh risk vs. benefit; discuss with OTN.',
  },
  {
    id: 'platelets',
    label: 'Platelet count <100,000/mm³',
    detail: 'Thrombocytopenia increases bleeding risk. Discuss with OTN.',
  },
  {
    id: 'inr',
    label: 'INR >1.7',
    detail: 'Coagulopathy from warfarin or other cause. If INR is unknown, may still consider if clinical picture warrants — discuss with OTN.',
  },
  {
    id: 'aptt',
    label: 'aPTT elevated (above normal)',
    detail: 'Suggests active anticoagulation or coagulopathy. Discuss with OTN.',
  },
  {
    id: 'doac',
    label: 'DOAC taken within 48 hours',
    detail: 'Dabigatran, rivaroxaban, apixaban, edoxaban taken in last 48h. Prophylaxis-dose LMWH does NOT apply. Reversal agents may be an option — discuss with OTN.',
  },
  {
    id: 'lmwh',
    label: 'Therapeutic LMWH in past 24 hours',
    detail: 'Treatment-dose LMWH (e.g. enoxaparin 1mg/kg BD). Prophylaxis dose (e.g. enoxaparin 40mg daily) is acceptable.',
  },
  // ── Clinical history ──
  {
    id: 'hist_ich',
    label: 'History of intracranial hemorrhage',
    detail: 'Prior ICH significantly increases re-bleeding risk. Discuss risk:benefit with OTN.',
  },
  {
    id: 'stroke_trauma_3mo',
    label: 'Stroke or serious head/spinal trauma — past 3 months',
    detail: 'Risk varies with severity. Discuss with OTN.',
  },
  {
    id: 'mi_3mo',
    label: 'MI or pericarditis — past 3 months',
    detail: 'Recent STEMI increases cardiac rupture/pericardial haemorrhage risk. Discuss with cardiology if time allows.',
  },
  {
    id: 'surgery_14d',
    label: 'Major surgery — past 14 days',
    detail: 'Cardiac, thoracic, abdominal, orthopaedic surgery most relevant. Discuss risk:benefit.',
  },
  {
    id: 'arterial_7d',
    label: 'Arterial puncture at non-compressible site — past 7 days',
    detail: 'E.g. subclavian or femoral arterial line — haematoma risk.',
  },
  {
    id: 'gi_gu_21d',
    label: 'GI or GU bleed — past 21 days',
    detail: 'Recent GI/GU bleeding increases re-bleeding risk.',
  },
  {
    id: 'seizure',
    label: 'Seizure at stroke onset',
    detail: 'Consider Todd\'s paralysis. If strong clinical evidence of ischaemic stroke, TNK can still be considered.',
  },
  {
    id: 'pregnant',
    label: 'Pregnant',
    detail: 'Limited data. Case-by-case. Consult OB and OTN. Not absolutely contraindicated.',
  },
  {
    id: 'warfarin',
    label: 'On warfarin (even if INR <1.7)',
    detail: 'INR must be <1.7 to proceed. Warfarin therapy itself is a relative CI even within range.',
  },
  {
    id: 'disability',
    label: 'Severe pre-existing disability',
    detail: 'Consider whether benefit outweighs risk given baseline functional status.',
  },
  {
    id: 'age80_dm_stroke',
    label: 'Age >80 + prior stroke + diabetes (3–4.5h window)',
    detail: 'Combined risk factors in the 3–4.5h window — benefit less clear. Recommend OTN Telestroke.',
  },
  {
    id: 'window_3to4_5',
    label: 'Onset 3–4.5 hours ago',
    detail: 'TNK approved in this window; sICH risk slightly higher than 0–3h. Generally recommended when benefits outweigh risks.',
  },
];

// ── STROKE SYNDROME RULES ────────────────────────────────────
// Simplified to 6 clinically actionable territories.
// Confidence: 3 = high, 2 = moderate, 1 = possible.
// Only syndromes scoring ≥2 are shown.
window.STROKE_SYNDROMES = [
  {
    id: 'left_mca',
    name: 'Left MCA',
    subtitle: 'Dominant hemisphere',
    territory: 'Left M1/M2 or ICA-T',
    lvoRisk: true,
    features: ['Right face/arm/leg weakness', 'Aphasia', 'Right gaze preference', 'Right visual field cut'],
    ctaExpect: 'Left M1 or ICA-T occlusion. Score ASPECTS on left hemisphere.',
    match: (s) => {
      const rightMotor = (s['5a'] || 0) > 0 || (s['6a'] || 0) > 0;
      const aphasia = (s['9'] || 0) >= 1;
      const gazeRight = (s['2'] || 0) >= 1;
      if (rightMotor && aphasia) return 3;
      if (rightMotor && gazeRight) return 2;
      if (aphasia && !((s['5b'] || 0) > 0 || (s['6b'] || 0) > 0)) return 2;
      return 0;
    },
  },
  {
    id: 'right_mca',
    name: 'Right MCA',
    subtitle: 'Non-dominant hemisphere',
    territory: 'Right M1/M2 or ICA-T',
    lvoRisk: true,
    features: ['Left face/arm/leg weakness', 'Left neglect / inattention', 'Left gaze preference', 'Left visual field cut'],
    ctaExpect: 'Right M1 or ICA-T occlusion. Score ASPECTS on right hemisphere.',
    match: (s) => {
      const leftMotor = (s['5b'] || 0) > 0 || (s['6b'] || 0) > 0;
      const neglect = (s['11'] || 0) >= 1;
      const gazeLeft = (s['2'] || 0) >= 1;
      if (leftMotor && neglect) return 3;
      if (leftMotor && gazeLeft) return 2;
      if (neglect && !((s['5a'] || 0) > 0 || (s['6a'] || 0) > 0)) return 2;
      return 0;
    },
  },
  {
    id: 'posterior',
    name: 'Posterior Circulation',
    subtitle: 'Basilar / brainstem / cerebellum / PCA',
    territory: 'Basilar artery, PICA, AICA, SCA, PCA',
    lvoRisk: true,
    features: ['Gaze palsy or nystagmus', 'Ataxia (limb or gait)', 'Diplopia or vertigo', 'Crossed deficits (ipsi face + contra body)', 'Dysarthria or dysphagia', 'Visual field loss without motor deficit'],
    ctaExpect: '⚠️ Check basilar artery — URGENT if suspected BAO. CT often normal early; MRI DWI most sensitive. EVT eligible in posterior circulation.',
    match: (s) => {
      const gazeAbn = (s['2'] || 0) >= 1;
      const ataxia = (s['7'] || 0) >= 1;
      const dysarthria = (s['10'] || 0) >= 1;
      const visualOnly = (s['3'] || 0) >= 1 &&
        (s['5a'] || 0) === 0 && (s['5b'] || 0) === 0 &&
        (s['6a'] || 0) === 0 && (s['6b'] || 0) === 0 &&
        (s['9'] || 0) === 0 && (s['11'] || 0) === 0;
      const bothSidesMotor = ((s['5a'] || 0) > 0) && ((s['5b'] || 0) > 0);
      if (gazeAbn && ataxia) return 3;
      if (gazeAbn && dysarthria) return 3;
      if (ataxia && bothSidesMotor) return 3;
      if (ataxia && dysarthria) return 2;
      if (ataxia && !((s['5a'] || 0) > 0 || (s['5b'] || 0) > 0)) return 2;
      if (visualOnly) return 2;
      return 0;
    },
  },
  {
    id: 'lacunar_motor',
    name: 'Lacunar — Pure Motor',
    subtitle: 'Internal capsule or pons',
    territory: 'Lenticulostriate or pontine perforators',
    lvoRisk: false,
    features: ['Hemiparesis: face + arm + leg same side', 'No aphasia, neglect, or visual field cut', 'Often gradual/stuttering onset'],
    ctaExpect: 'CTA likely normal. MRI DWI most sensitive.',
    match: (s) => {
      const rightMotor = (s['5a'] || 0) > 0 || (s['6a'] || 0) > 0;
      const leftMotor = (s['5b'] || 0) > 0 || (s['6b'] || 0) > 0;
      const noAphasia = (s['9'] || 0) === 0;
      const noNeglect = (s['11'] || 0) === 0;
      const noVisual = (s['3'] || 0) === 0;
      const noSensory = (s['8'] || 0) === 0;
      const noGaze = (s['2'] || 0) === 0;
      const oneSide = (rightMotor && !leftMotor) || (leftMotor && !rightMotor);
      if (oneSide && noAphasia && noNeglect && noVisual && noSensory && noGaze) return 2;
      return 0;
    },
  },
  {
    id: 'lacunar_sensory',
    name: 'Lacunar — Pure Sensory',
    subtitle: 'Thalamus (VPL nucleus)',
    territory: 'Thalamic perforators (PCA branch)',
    lvoRisk: false,
    features: ['Hemisensory loss: face + arm + leg same side', 'No motor weakness, no aphasia, no visual field cut'],
    ctaExpect: 'CTA likely normal. MRI DWI needed.',
    match: (s) => {
      const sensory = (s['8'] || 0) >= 1;
      const noMotor = (s['5a'] || 0) === 0 && (s['5b'] || 0) === 0 &&
                      (s['6a'] || 0) === 0 && (s['6b'] || 0) === 0;
      const noAphasia = (s['9'] || 0) === 0;
      const noVisual = (s['3'] || 0) === 0;
      const noNeglect = (s['11'] || 0) === 0;
      if (sensory && noMotor && noAphasia && noVisual && noNeglect) return 2;
      return 0;
    },
  },
  {
    id: 'lacunar_mixed',
    name: 'Lacunar — Sensorimotor / Ataxic',
    subtitle: 'Thalamocapsular or deep perforators',
    territory: 'Internal capsule / corona radiata',
    lvoRisk: false,
    features: ['Motor + sensory loss same side', 'OR unilateral weakness + ataxia out of proportion', 'No aphasia, neglect, or visual field cut'],
    ctaExpect: 'Small vessel disease. CTA often normal. MRI DWI most sensitive.',
    match: (s) => {
      const motor = (s['5a'] || 0) > 0 || (s['5b'] || 0) > 0 || (s['6a'] || 0) > 0 || (s['6b'] || 0) > 0;
      const sensory = (s['8'] || 0) >= 1;
      const ataxia = (s['7'] || 0) >= 1;
      const noAphasia = (s['9'] || 0) === 0;
      const noVisual = (s['3'] || 0) === 0;
      const noNeglect = (s['11'] || 0) === 0;
      const noGaze = (s['2'] || 0) === 0;
      if (motor && sensory && noAphasia && noVisual && noNeglect) return 2;
      if (motor && ataxia && noAphasia && noVisual && noNeglect && noGaze) return 2;
      return 0;
    },
  },
];

// ── TNK DOSING ───────────────────────────────────────────────
window.TNK_DOSE_MG_PER_KG = 0.25;
window.TNK_MAX_DOSE_MG = 25;

// ── BP MEDICATIONS ───────────────────────────────────────────
window.BP_MEDS = [
  { drug: 'Labetalol', dose: '10 mg IV bolus over 1–2 min', notes: 'May repeat once. Max 20 mg total pre-TNK.' },
  { drug: 'Hydralazine', dose: '10 mg IV', notes: 'Slower onset (5–15 min).' },
  { drug: 'Nicardipine', dose: '5 mg/h IV infusion', notes: 'Titrate up. Max 15 mg/h. Good for precise control.' },
];

// ── NIHSS SEVERITY LABELS ────────────────────────────────────
// Textbook bands (Code Stroke Handbook 2020): 0–5 Mild / 6–10 Moderate / 11–20 Severe / >20 Very severe
window.NIHSS_SEVERITY = [
  { min: 0, max: 5, label: 'Mild', color: '#4fc3f7' },
  { min: 6, max: 10, label: 'Moderate', color: '#ffd54f' },
  { min: 11, max: 20, label: 'Severe', color: '#ff8c00' },
  { min: 21, max: 42, label: 'Very severe', color: '#ef5350' },
];

window.getNIHSSSeverity = function(total) {
  for (const s of window.NIHSS_SEVERITY) {
    if (total >= s.min && total <= s.max) return s;
  }
  return { label: 'Unknown', color: '#aaa' };
};

window.getTNKDose = function(weightKg) {
  if (!weightKg || weightKg <= 0) return null;
  const dose = Math.min(weightKg * window.TNK_DOSE_MG_PER_KG, window.TNK_MAX_DOSE_MG);
  return Math.round(dose * 10) / 10;
};

// ── STROKE SYNDROME MATCHER ──────────────────────────────────
window.getSyndromeSuggestions = function(nihssScores) {
  const results = [];
  for (const syn of window.STROKE_SYNDROMES) {
    const score = syn.match(nihssScores);
    if (score > 0) {
      results.push({ ...syn, confidence: score });
    }
  }
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
};

// ============================================================
// REFERENCE DATA — MIMICS, CHAMELEONS, RED FLAGS
// ============================================================

window.STROKE_MIMICS = [
  { id: 'hypoglycemia', name: 'Hypoglycemia', keyFeatures: ['Focal deficit mimicking stroke (hemiparesis, aphasia)', 'Diaphoresis, tremor, tachycardia', 'Altered LOC'], clues: ['Known DM on insulin or sulfonylurea', 'Missed meal', 'Rapid complete resolution with glucose'], ruleOutTest: 'Fingerstick glucose — MUST be done before NIHSS. Target 3.5–22.2 mmol/L.' },
  { id: 'hyperglycemia', name: 'Hyperglycemia (HHS/DKA)', keyFeatures: ['Focal deficit, seizures, altered LOC', 'Dehydration, polyuria', 'Osmolar stupor'], clues: ['Glucose >22.2 mmol/L', 'No stroke risk factors', 'Gradual onset'], ruleOutTest: 'Fingerstick glucose; serum osmolality; ketones.' },
  { id: 'todds_paralysis', name: "Todd's Paralysis", keyFeatures: ['Focal weakness AFTER a seizure', 'May last minutes to 48h', 'Resolves gradually'], clues: ['Witnessed seizure or tongue bite', 'Post-ictal confusion', 'History of epilepsy', 'Weakness in territory of seizure focus'] },
  { id: 'migraine_aura', name: 'Migraine with Aura (incl. hemiplegic)', keyFeatures: ['Positive symptoms (tingling, zigzag lights) spreading over minutes', 'Headache often follows', 'Young patient, prior episodes'], clues: ['Marching onset over 20–30 min (not sudden)', 'Photo/phonophobia', 'Previous identical episodes'] },
  { id: 'functional_fnd', name: 'Functional Neurologic Disorder', keyFeatures: ['Non-anatomic deficits', 'Give-way weakness, Hoover sign', 'Splitting midline sensory loss', 'Variable exam'], clues: ['Positive Hoover sign', 'Co-contraction', 'Deficits change with distraction', 'No cranial nerve involvement', 'Young, female predominance'] },
  { id: 'cns_mass', name: 'CNS Mass Lesion (tumour, abscess)', keyFeatures: ['Progressive focal deficit over days–weeks', 'Headache, vomiting, papilledema', 'Seizures'], clues: ['Gradual onset (not sudden)', 'Known malignancy', 'Fever (abscess)'], ruleOutTest: 'NCCT with contrast or MRI.' },
  { id: 'peripheral_nerve', name: 'Peripheral Nerve / Radiculopathy', keyFeatures: ['Limb weakness in peripheral nerve distribution', 'Dermatomal sensory loss', 'Reflexes absent'], clues: ['Saturday night palsy, tight cast', 'Disc herniation history', 'No facial involvement'] },
  { id: 'bells_palsy', name: "Bell's Palsy (LMN facial palsy)", keyFeatures: ['Involves FOREHEAD (cannot raise eyebrow)', 'Unilateral facial weakness', 'Preserved limb function', 'Possible ear pain, hyperacusis'], clues: ['Forehead involvement = LMN pattern = NOT stroke', 'Isolated facial weakness without limb or language signs'] },
  { id: 'sepsis_toxic_metabolic', name: 'Sepsis / Toxic–Metabolic Encephalopathy', keyFeatures: ['Global altered LOC, confusion', 'Often "unmasks" old deficits (recrudescence)', 'No sharply focal signs'], clues: ['Fever, hypotension, infection source', 'Electrolyte or renal derangement', 'Symptoms resolve with treating underlying cause'] },
  { id: 'hemiplegic_migraine', name: 'Hemiplegic Migraine', keyFeatures: ['Hemiparesis + headache', 'Family history', 'Marching aura preceding weakness'], clues: ['Young patient', 'Prior identical episodes', 'Full resolution', 'CACNA1A/ATP1A2 family history'] },
];

window.STROKE_CHAMELEONS = [
  { id: 'isolated_vertigo_central_hints', presentation: 'Isolated vertigo with central HINTS', territory: 'Cerebellum / Vestibular nuclei (PICA/AICA)', whyMissed: 'Assumed to be peripheral vertigo / BPPV. HINTS exam with any one central finding reclassifies as posterior stroke.' },
  { id: 'confusion_agitation', presentation: 'Acute confusion or agitation without lateralising signs', territory: 'Right MCA, thalamus, or bilateral frontal', whyMissed: 'Labelled as delirium or psychiatric. Look for neglect, aphasia, subtle gaze preference.' },
  { id: 'monocular_blindness', presentation: 'Sudden monocular vision loss', territory: 'Ophthalmic artery / central retinal artery (ICA branch)', whyMissed: 'Sent to ophthalmology. CRAO is a stroke equivalent — activate code stroke.' },
  { id: 'limb_shaking_tia', presentation: 'Limb-shaking spells (jerky rhythmic movements)', territory: 'Critical ICA stenosis with hemodynamic TIA', whyMissed: 'Misdiagnosed as focal seizure. Often positional; carotid imaging is diagnostic.' },
  { id: 'isolated_dysarthria', presentation: 'Isolated dysarthria', territory: 'Small lacunar infarcts (internal capsule, pons, corona radiata)', whyMissed: 'Attributed to fatigue, intoxication, dentures. Examine for facial asymmetry, subtle weakness.' },
  { id: 'decreased_loc_no_focal', presentation: 'Decreased LOC without focal signs', territory: 'Top-of-basilar, bilateral thalami, bilateral ACA', whyMissed: 'Presumed toxic–metabolic. Check for vertical gaze palsy, pupillary abnormalities; CTA of posterior circulation.' },
  { id: 'psychiatric_elderly', presentation: '"Psychiatric" presentation in an elderly patient', territory: 'Right MCA (neglect, anosognosia), non-dominant frontal', whyMissed: 'Emotional lability, denial of deficits read as psychiatric. Neglect is often occult.' },
  { id: 'transient_amnesia', presentation: 'Transient amnesia / confusion only', territory: 'Bilateral hippocampi (PCA branches) or thalamus', whyMissed: 'Diagnosed as transient global amnesia. DWI may reveal bilateral medial temporal infarcts.' },
];

window.MIMIC_RED_FLAGS = [
  'Bilateral simultaneous deficits (unusual for single-territory stroke)',
  'Gradual or "marching" onset over minutes–hours',
  'Isolated loss of consciousness without focal signs',
  'LMN facial weakness pattern (forehead involved) — think Bell\'s palsy',
  'Recurrent identical stereotyped episodes',
  'Psychiatric history + non-anatomic distribution',
  'Positive symptoms (tingling, jerking, scintillations) spreading',
  'Give-way or collapsing weakness on exam',
  'Splitting midline on sensory testing (anatomically impossible)',
  'Deficit changes with distraction or encouragement',
];

window.BRAINSTEM_RULE_OF_4 = {
  summary: 'Rule of 4: 4 CN above pons, 4 in pons, 4 in medulla. 4 Medial (Midline) structures and 4 Side (Lateral) structures in each region.',
  fourAbove: ['CN I — Olfactory', 'CN II — Optic', 'CN III — Oculomotor (midbrain)', 'CN IV — Trochlear (midbrain)'],
  fourPons: ['CN V — Trigeminal', 'CN VI — Abducens', 'CN VII — Facial', 'CN VIII — Vestibulocochlear'],
  fourMedulla: ['CN IX — Glossopharyngeal', 'CN X — Vagus', 'CN XI — Accessory', 'CN XII — Hypoglossal'],
  fourMs: [
    'Motor pathway (corticospinal tract) — contralateral hemiparesis',
    'Medial lemniscus — contralateral vibration/proprioception loss',
    'MLF — ipsilateral INO (internuclear ophthalmoplegia)',
    'Motor nuclei of CN III, IV, VI, XII (the midline CN) — ipsilateral LMN palsy',
  ],
  fourSs: [
    'Spinothalamic tract — contralateral pain/temperature loss',
    'Sensory nucleus of CN V (spinal tract) — ipsilateral facial pain/temp loss',
    'Sympathetic pathway — ipsilateral Horner\'s syndrome',
    'Spinocerebellar tract — ipsilateral limb ataxia',
  ],
};

window.BP_TARGETS = [
  { scenario: 'TNK candidate / TNK given', target: '<185/110 before; <180/105 for 24h after', notes: 'Use labetalol, hydralazine, or nicardipine. Do NOT give TNK if BP uncontrolled.' },
  { scenario: 'Ischemic stroke, no thrombolysis planned', target: 'Permissive ≤220/120', notes: 'Avoid aggressive lowering unless end-organ damage (aortic dissection, ACS, HF, eclampsia).' },
  { scenario: 'Post-EVT, successful recanalization', target: '<180/105 routine; consider <140/90 if complete recanalization (TICI 2b/3)', notes: 'Individualize based on collaterals, infarct size, reperfusion quality.' },
  { scenario: 'Intracerebral hemorrhage (ICH)', target: 'SBP 140–160 (INTERACT2 / ATACH-2)', notes: 'Avoid SBP <130. Titrate smoothly; avoid labile pressures.' },
];

window.DOAC_REVERSAL = [
  { drug: 'Warfarin (INR >1.7)', reversal: '4F-PCC + Vitamin K', dose: '4F-PCC 25–50 units/kg IV + Vitamin K 10 mg IV', notes: 'Check INR before and 15 min after PCC. Goal INR <1.4.' },
  { drug: 'Dabigatran (<48h last dose)', reversal: 'Idarucizumab', dose: '5 g IV (two 2.5 g vials, sequential)', notes: 'Enables thrombolysis after reversal. Confirm with OTN.' },
  { drug: 'Apixaban / Rivaroxaban / Edoxaban', reversal: 'Andexanet alfa (preferred) OR 4F-PCC', dose: 'Andexanet per product; 4F-PCC 50 units/kg', notes: 'TNK generally not recommended after Xa-inhibitor reversal — confirm with stroke neurology.' },
  { drug: 'Therapeutic heparin', reversal: 'Protamine sulfate', dose: '1 mg per 100 units heparin (max 50 mg)', notes: 'Based on last 2–3 h of heparin dose.' },
  { drug: 'LMWH (enoxaparin <8h)', reversal: 'Protamine (partial)', dose: '1 mg per 1 mg enoxaparin', notes: 'Only ~60% reversal; >8h use 0.5 mg/mg.' },
];

window.DOAC_REVERSAL_FOOTER = 'Confirm with OTN Telestroke before reversing anticoagulation to enable TNK.';

window.HINTS_EXAM = [
  { component: 'Head Impulse Test', peripheral: 'Abnormal (catch-up saccade present) = peripheral', central: 'Normal (no catch-up saccade) = central — counterintuitive!' },
  { component: 'Nystagmus', peripheral: 'Unidirectional, horizontal, fatigable', central: 'Direction-changing, vertical, or pure torsional' },
  { component: 'Test of Skew (alternate cover)', peripheral: 'No vertical correction', central: 'Vertical refixation (skew deviation)' },
];

window.HINTS_RULE = 'INFARCT mnemonic: Impulse Normal, Fast-phase Alternating, Refixation on Cover Test = any ONE central finding = posterior circulation stroke until MRI proves otherwise.';

window.POSTERIOR_RED_FLAGS = [
  'Bilateral simultaneous sensorimotor symptoms',
  'Vertigo + any focal neurological sign',
  'Vertical gaze palsy',
  'Skew deviation (vertical eye misalignment)',
  'Direction-changing nystagmus',
  '5 Ds: Dysphagia, Dysarthria, Diplopia, Dysmetria, Decreased LOC',
  'Crossed signs (ipsilateral face + contralateral body)',
  'Locked-in syndrome with deceptively low NIHSS',
];

window.CORTICAL_LVO_SCREEN = [
  { id: 'gaze', label: 'Gaze deviation', description: 'Forced gaze preference (NIHSS Item 2 = 2)' },
  { id: 'aphasia', label: 'Aphasia', description: 'Language deficit — dominant MCA (Item 9 ≥ 1)' },
  { id: 'neglect', label: 'Neglect', description: 'Hemi-inattention or extinction — non-dominant MCA (Item 11 ≥ 1)' },
  { id: 'hemiparesis', label: 'Dense hemiparesis', description: 'Dense arm or leg weakness (Item 5 or 6 = 3–4)' },
];

window.CORTICAL_LVO_RULE = 'Any one cortical sign + NIHSS ≥ 6 → presume LVO. Activate EVT pathway NOW — do not wait for CTA.';

// Active-workflow history items: ONLY questions not already captured in
// timing (onset/wake-up) or Rel-CI (DOAC/warfarin/LMWH/ICH/stroke-trauma-3mo/
// surgery-14d/seizure/pregnant/disability/age80+DM+stroke).
window.RELEVANT_HISTORY_ITEMS = [
  {
    id: 'anticoag_detail',
    ask: 'Anticoagulant agent + last dose time?',
    why: 'Only shown if any anticoag flag was YES in Rel-CI. Captures agent name and timing — drives reversal decision.',
    type: 'text',
    placeholder: 'e.g. apixaban 5mg, last dose 06:00 today',
    showIf: (s) => ['doac','lmwh','warfarin','inr','aptt'].some(id => s.relContra[id] === 'yes'),
  },
  {
    id: 'bp_meds',
    ask: 'Usual BP medications + any missed doses?',
    why: 'Explains high presenting BP; guides acute lowering plan.',
    type: 'text',
    placeholder: 'e.g. amlodipine 5mg daily — missed this AM',
  },
  {
    id: 'dm_meds',
    ask: 'On insulin or sulfonylurea?',
    why: 'Hypoglycemia is the #1 mimic — confirms need to recheck fingerstick.',
    type: 'yesno',
    detail: 'Agent + last dose',
  },
  {
    id: 'baseline_mrs',
    ask: 'Baseline function / pre-stroke mRS?',
    why: 'EVT requires pre-stroke mRS ≤ 2. Shapes goals-of-care discussion.',
    type: 'mrs',
  },
  {
    id: 'malignancy',
    ask: 'Known malignancy (especially intracranial / CNS)?',
    why: 'Changes risk/benefit. CNS neoplasm = bleeding risk.',
    type: 'yesno',
    detail: 'Type / site',
  },
  {
    id: 'postpartum',
    ask: 'Postpartum (within 30 days)?',
    why: 'Relative TNK risk. Case-by-case with OB + neurology.',
    type: 'yesno',
  },
];

window.PARALLEL_HISTORY_QUESTIONS = [
  { ask: 'When was the patient last seen normal?', why: 'Anchors TNK (4.5h) and EVT (24h) windows. Wake-up strokes go by imaging mismatch.' },
  { ask: 'Wake-up onset? When did they go to bed?', why: 'If found <4.5h of wake time, treat as known onset. Else imaging-guided.' },
  { ask: 'Any anticoagulants? Which, when was last dose?', why: 'DOAC <48h → reversal needed. Warfarin INR >1.7 → reversal or contraindication.' },
  { ask: 'Recent surgery, trauma, or procedure (<3 months)?', why: 'Relative contraindication to TNK depending on site and bleeding risk.' },
  { ask: 'Prior stroke or ICH?', why: 'Recent stroke/TIA may affect TNK; prior ICH is absolute in legacy criteria, relative in CSBPR.' },
  { ask: 'Seizure at stroke onset?', why: 'Raises concern for Todd\'s paralysis mimic. Does not absolutely exclude TNK.' },
  { ask: 'Currently pregnant or postpartum?', why: 'Pregnancy is relative; case-by-case with OB and neurology.' },
  { ask: 'Known malignancy, especially intracranial?', why: 'Changes risk/benefit. CNS neoplasm = bleeding risk.' },
  { ask: 'Usual BP medications? Any missed doses?', why: 'Explains high presenting BP; guides acute lowering plan.' },
  { ask: 'Diabetes meds (insulin, sulfonylureas)?', why: 'Hypoglycemia is the #1 mimic — always fingerstick.' },
  { ask: 'Baseline function / mRS?', why: 'EVT requires pre-stroke mRS ≤ 2. Shapes goals-of-care discussion.' },
];

// ============================================================
// SYNDROME DETAILS — expanded reference by id
// ============================================================

window.SYNDROME_DETAILS = {
  // ─── Anterior circulation ───
  lmca_upper: { anatomy: 'Left MCA superior division (frontal operculum, precentral, postcentral)', vascularSupply: 'Left MCA (M2 superior division)', featuresTable: [
    { finding: 'Right face + arm > leg weakness', side: 'Contralateral' },
    { finding: 'Broca\'s (expressive) aphasia', side: 'Contralateral' },
    { finding: 'Right hemisensory loss', side: 'Contralateral' },
    { finding: 'Gaze preference toward lesion', side: 'Ipsilateral' },
  ], mimicsToConsider: ['Todd\'s paralysis', 'Functional disorder'], sourceNote: 'High-yield LVO pattern.' },
  rmca_upper: { anatomy: 'Right MCA superior division', vascularSupply: 'Right MCA (M2 superior division)', featuresTable: [
    { finding: 'Left face + arm > leg weakness', side: 'Contralateral' },
    { finding: 'Left hemi-neglect', side: 'Contralateral' },
    { finding: 'Anosognosia (denial of deficits)', side: 'N/A' },
    { finding: 'Gaze preference toward lesion', side: 'Ipsilateral' },
  ], mimicsToConsider: ['Delirium', 'Psychiatric presentation'] },
  lmca_lower: { anatomy: 'Left MCA inferior division (temporal)', vascularSupply: 'Left MCA (M2 inferior division)', featuresTable: [
    { finding: 'Wernicke\'s (receptive) aphasia', side: 'N/A' },
    { finding: 'Fluent but nonsensical speech', side: 'N/A' },
    { finding: 'Right superior quadrantanopia', side: 'Contralateral' },
    { finding: 'Often no motor deficit', side: 'N/A' },
  ], mimicsToConsider: ['Delirium', 'Psychosis'], sourceNote: 'Easily missed if motor exam relied upon alone.' },
  rmca_lower: { anatomy: 'Right MCA inferior division', vascularSupply: 'Right MCA (M2 inferior division)', featuresTable: [
    { finding: 'Left homonymous quadrantanopia', side: 'Contralateral' },
    { finding: 'Left hemi-neglect', side: 'Contralateral' },
    { finding: 'Prosopagnosia (face recognition deficit)', side: 'N/A' },
  ], mimicsToConsider: ['Delirium'] },
  mca_m1: { anatomy: 'Complete MCA territory (M1 occlusion)', vascularSupply: 'MCA M1 segment', featuresTable: [
    { finding: 'Dense contralateral face + arm + leg weakness', side: 'Contralateral' },
    { finding: 'Hemisensory loss', side: 'Contralateral' },
    { finding: 'Homonymous hemianopia', side: 'Contralateral' },
    { finding: 'Aphasia (dominant) OR neglect (non-dominant)', side: 'N/A' },
    { finding: 'Forced gaze deviation toward lesion', side: 'Ipsilateral' },
  ], mimicsToConsider: ['None — classic LVO'], sourceNote: '🚨 High-priority EVT candidate.' },
  aca: { anatomy: 'Anterior cerebral artery territory (medial frontal, parasagittal)', vascularSupply: 'ACA (A2 segment)', featuresTable: [
    { finding: 'Leg > arm weakness (leg dominant)', side: 'Contralateral' },
    { finding: 'Cortical sensory loss (leg)', side: 'Contralateral' },
    { finding: 'Abulia, apathy, akinetic mutism (bilateral)', side: 'N/A' },
    { finding: 'Urinary incontinence', side: 'N/A' },
    { finding: 'Grasp reflex, gegenhalten', side: 'Contralateral' },
  ], mimicsToConsider: ['Depression', 'Hydrocephalus (NPH triad)'], sourceNote: 'Rare; recurrent artery of Heubner causes face/arm weakness variant.' },
  ant_choroidal: { anatomy: 'Posterior limb internal capsule, optic tract, medial temporal', vascularSupply: 'Anterior choroidal artery (ICA branch)', featuresTable: [
    { finding: 'Contralateral hemiparesis (capsular)', side: 'Contralateral' },
    { finding: 'Contralateral hemisensory loss', side: 'Contralateral' },
    { finding: 'Contralateral homonymous hemianopia', side: 'Contralateral' },
  ], mimicsToConsider: ['Lacunar syndrome'], sourceNote: 'Classic triad = "three-H\'s" (hemiparesis, hemisensory, hemianopia) without cortical signs.' },
  gerstmann: { anatomy: 'Dominant (usually left) angular gyrus (inferior parietal)', vascularSupply: 'Dominant MCA angular branch', featuresTable: [
    { finding: 'Finger agnosia', side: 'N/A' },
    { finding: 'Left–right disorientation', side: 'N/A' },
    { finding: 'Acalculia', side: 'N/A' },
    { finding: 'Agraphia', side: 'N/A' },
  ], mimicsToConsider: ['Dementia', 'Delirium'], sourceNote: 'Pure Gerstmann is rare; usually part of larger MCA stroke.' },
  // ─── Posterior circulation ───
  pca: { anatomy: 'Occipital cortex ± medial temporal', vascularSupply: 'PCA (P2 or distal)', featuresTable: [
    { finding: 'Contralateral homonymous hemianopia (macular sparing)', side: 'Contralateral' },
    { finding: 'Alexia without agraphia (dominant)', side: 'N/A' },
    { finding: 'Memory deficit (medial temporal)', side: 'N/A' },
  ], mimicsToConsider: ['Migraine aura', 'Occipital seizure'] },
  top_basilar: { anatomy: 'Rostral brainstem, bilateral thalami, occipital + medial temporal lobes', vascularSupply: 'Distal basilar / P1 bilateral', featuresTable: [
    { finding: 'Decreased LOC, somnolence', side: 'N/A' },
    { finding: 'Vertical gaze palsy, pupillary abnormalities', side: 'N/A' },
    { finding: 'Bilateral visual loss (cortical blindness)', side: 'Bilateral' },
    { finding: 'Amnesia, confabulation', side: 'N/A' },
    { finding: 'Limited motor findings despite severe presentation', side: 'N/A' },
  ], mimicsToConsider: ['Toxic–metabolic encephalopathy', 'Seizure'], sourceNote: '🚨 Easily missed chameleon. Low NIHSS despite critical occlusion.' },
  bao: { anatomy: 'Pons, midbrain, cerebellum (entire posterior circulation)', vascularSupply: 'Basilar artery (proximal or mid)', featuresTable: [
    { finding: 'Quadriparesis, locked-in syndrome', side: 'Bilateral' },
    { finding: 'Coma or reduced LOC', side: 'N/A' },
    { finding: 'Bulbar dysfunction (dysphagia, dysarthria)', side: 'N/A' },
    { finding: 'Cranial nerve palsies (III–VIII)', side: 'N/A' },
  ], mimicsToConsider: ['Seizure', 'Toxic–metabolic'], sourceNote: '🚨 Mortality >80% without recanalization.' },
  anton: { anatomy: 'Bilateral occipital cortex', vascularSupply: 'Bilateral PCA (top-of-basilar)', featuresTable: [
    { finding: 'Cortical blindness', side: 'Bilateral' },
    { finding: 'Denial of blindness (anosognosia)', side: 'N/A' },
    { finding: 'Confabulation of visual content', side: 'N/A' },
  ], mimicsToConsider: ['Psychiatric', 'Delirium'] },
  balint: { anatomy: 'Bilateral parieto-occipital junction', vascularSupply: 'Bilateral PCA watershed', featuresTable: [
    { finding: 'Simultanagnosia (inability to perceive multiple objects)', side: 'N/A' },
    { finding: 'Optic ataxia (impaired visually guided reaching)', side: 'N/A' },
    { finding: 'Ocular apraxia (impaired voluntary gaze shift)', side: 'N/A' },
  ], mimicsToConsider: ['Dementia', 'Delirium'] },
  // ─── Lacunar ───
  lacunar_pure_motor: { anatomy: 'Posterior limb internal capsule or pons', vascularSupply: 'Lenticulostriates or pontine perforators', featuresTable: [
    { finding: 'Pure motor hemiparesis (face, arm, leg equally)', side: 'Contralateral' },
    { finding: 'No sensory, visual, cortical deficits', side: 'N/A' },
  ], mimicsToConsider: ['Todd\'s paralysis', 'Functional'] },
  lacunar_pure_sensory: { anatomy: 'Ventroposterolateral thalamus', vascularSupply: 'Thalamogeniculate artery', featuresTable: [
    { finding: 'Pure hemisensory loss (face, arm, leg)', side: 'Contralateral' },
    { finding: 'No motor or cortical deficits', side: 'N/A' },
  ], mimicsToConsider: ['Migraine aura', 'Functional'] },
  lacunar_sensorimotor: { anatomy: 'Internal capsule + thalamus', vascularSupply: 'Lenticulostriate + thalamoperforator', featuresTable: [
    { finding: 'Hemiparesis + hemisensory loss', side: 'Contralateral' },
    { finding: 'No cortical signs', side: 'N/A' },
  ], mimicsToConsider: ['Partial MCA stroke'] },
  dysarthria_clumsy_hand: { anatomy: 'Genu internal capsule or basis pontis', vascularSupply: 'Small perforator', featuresTable: [
    { finding: 'Dysarthria', side: 'N/A' },
    { finding: 'Clumsy hand (mild weakness, fine-motor)', side: 'Contralateral' },
    { finding: 'Facial weakness', side: 'Contralateral' },
  ], mimicsToConsider: ['Intoxication'] },
  ataxic_hemiparesis: { anatomy: 'Posterior limb internal capsule or pons', vascularSupply: 'Lenticulostriate or pontine perforator', featuresTable: [
    { finding: 'Weakness + ipsilateral ataxia (out of proportion to weakness)', side: 'Contralateral' },
    { finding: 'Leg > arm typically', side: 'Contralateral' },
  ], mimicsToConsider: ['Cerebellar stroke'] },
  // ─── Brainstem ───
  wallenberg: { anatomy: 'Lateral medulla', vascularSupply: 'PICA or vertebral artery', featuresTable: [
    { finding: 'Ipsilateral facial pain/temp loss (CN V spinal tract)', side: 'Ipsilateral' },
    { finding: 'Contralateral body pain/temp loss (spinothalamic)', side: 'Contralateral' },
    { finding: 'Ipsilateral Horner\'s (sympathetic)', side: 'Ipsilateral' },
    { finding: 'Vertigo, nystagmus (vestibular nuclei)', side: 'N/A' },
    { finding: 'Dysphagia, hoarseness (nucleus ambiguus)', side: 'Ipsilateral' },
    { finding: 'Ipsilateral limb ataxia (inferior cerebellar peduncle)', side: 'Ipsilateral' },
  ], mimicsToConsider: ['Peripheral vertigo — differentiate with HINTS'], sourceNote: 'Classic crossed-sensory loss.' },
  medial_medullary: { anatomy: 'Medial medulla', vascularSupply: 'Anterior spinal artery (vertebral branch)', featuresTable: [
    { finding: 'Contralateral arm + leg weakness (corticospinal)', side: 'Contralateral' },
    { finding: 'Contralateral vibration/proprioception loss (medial lemniscus)', side: 'Contralateral' },
    { finding: 'Ipsilateral tongue weakness (CN XII)', side: 'Ipsilateral' },
  ], mimicsToConsider: ['Capsular lacune'] },
  foville: { anatomy: 'Lower/caudal pons (medial)', vascularSupply: 'Paramedian basilar perforators', featuresTable: [
    { finding: 'Ipsilateral facial weakness (LMN CN VII)', side: 'Ipsilateral' },
    { finding: 'Ipsilateral lateral gaze palsy (CN VI or PPRF)', side: 'Ipsilateral' },
    { finding: 'Contralateral hemiparesis', side: 'Contralateral' },
  ], mimicsToConsider: ['Bell\'s palsy (but Foville adds gaze palsy + hemiparesis)'] },
  marie_foix: { anatomy: 'Lateral pons', vascularSupply: 'Long circumferential branches of basilar / AICA', featuresTable: [
    { finding: 'Ipsilateral cerebellar ataxia', side: 'Ipsilateral' },
    { finding: 'Contralateral hemiparesis', side: 'Contralateral' },
    { finding: 'Contralateral spinothalamic loss', side: 'Contralateral' },
  ], mimicsToConsider: ['Cerebellar stroke'] },
  weber: { anatomy: 'Medial midbrain (cerebral peduncle + CN III fascicle)', vascularSupply: 'PCA perforators', featuresTable: [
    { finding: 'Ipsilateral CN III palsy (ptosis, "down-and-out" eye, blown pupil)', side: 'Ipsilateral' },
    { finding: 'Contralateral hemiparesis', side: 'Contralateral' },
  ], mimicsToConsider: ['Posterior communicating artery aneurysm'] },
  claude: { anatomy: 'Medial midbrain (red nucleus + CN III)', vascularSupply: 'PCA perforators', featuresTable: [
    { finding: 'Ipsilateral CN III palsy', side: 'Ipsilateral' },
    { finding: 'Contralateral ataxia / tremor (red nucleus)', side: 'Contralateral' },
  ], mimicsToConsider: ['Weber syndrome'] },
  benedikt: { anatomy: 'Midbrain tegmentum (red nucleus + CN III + corticospinal + medial lemniscus)', vascularSupply: 'PCA perforators', featuresTable: [
    { finding: 'Ipsilateral CN III palsy', side: 'Ipsilateral' },
    { finding: 'Contralateral hemiparesis', side: 'Contralateral' },
    { finding: 'Contralateral ataxia / tremor', side: 'Contralateral' },
    { finding: 'Contralateral sensory loss', side: 'Contralateral' },
  ], mimicsToConsider: ['Weber + Claude combined'] },
  ant_spinal: { anatomy: 'Anterior 2/3 spinal cord', vascularSupply: 'Anterior spinal artery', featuresTable: [
    { finding: 'Bilateral motor paralysis below lesion', side: 'Bilateral' },
    { finding: 'Bilateral pain/temp loss below lesion', side: 'Bilateral' },
    { finding: 'Preserved vibration/proprioception (dorsal columns spared)', side: 'N/A' },
    { finding: 'Bowel/bladder dysfunction', side: 'N/A' },
  ], mimicsToConsider: ['Transverse myelitis', 'Compressive myelopathy'], sourceNote: 'Rare; check aortic pathology / post-surgical.' },
};

// Aliases so matcher ids (left_mca, right_mca, posterior, lacunar_*) can link into details
window.SYNDROME_DETAILS.left_mca = window.SYNDROME_DETAILS.mca_m1;
window.SYNDROME_DETAILS.right_mca = window.SYNDROME_DETAILS.mca_m1;
window.SYNDROME_DETAILS.posterior = window.SYNDROME_DETAILS.bao;
window.SYNDROME_DETAILS.lacunar_motor = window.SYNDROME_DETAILS.lacunar_pure_motor;
window.SYNDROME_DETAILS.lacunar_sensory = window.SYNDROME_DETAILS.lacunar_pure_sensory;
window.SYNDROME_DETAILS.lacunar_mixed = window.SYNDROME_DETAILS.lacunar_sensorimotor;

// ============================================================
// BEDSIDE ALGORITHM — time-anchored cognitive aid
// ============================================================

window.BEDSIDE_ALGORITHM = {
  '0-2': [
    { text: 'Airway, breathing, circulation; continuous telemetry' },
    { text: 'Fingerstick glucose', detail: 'Hypoglycemia is the #1 mimic. Target 3.5–22.2 mmol/L.' },
    { text: 'Establish Last Seen Normal (LSN)', link: 'step-timing' },
    { text: 'Weight (actual or estimate) for TNK dosing', link: 'step-decision' },
    { text: 'Two large-bore IVs; bloodwork incl. coags, CBC, lytes, trop, ßhCG' },
    { text: 'Activate Code Stroke — page OTN Telestroke if remote' },
  ],
  '2-5': [
    { text: 'Parallel history (11-question table below)', detail: 'Run history and exam simultaneously.' },
    { text: 'Meds review: anticoagulants, insulin/sulfonylureas, antihypertensives' },
    { text: 'Confirm CT/CTA order; call CT to prioritise' },
    { text: 'Pre-exam vitals; initial BP — do NOT lower aggressively yet' },
    { text: 'Rule out mimics — glucose done?', link: 'step-mimics' },
  ],
  '5-10': [
    { text: '30-second cortical/LVO screen (gaze, aphasia, neglect, dense hemiparesis)', detail: 'Any one + NIHSS ≥6 → presume LVO, activate EVT.', link: 'step-quick-screen' },
    { text: 'Full NIHSS', link: 'step-nihss' },
    { text: 'Blind-spot supplement: tandem gait, vertical gaze, pupils, HINTS if vertigo', link: 'step-nihss-ref' },
    { text: 'Pre-commit checklist: Is deficit disabling? Is it consistent with a territory?' },
    { text: 'Chameleons: if story sudden focal but exam odd — do not dismiss', link: 'step-mimics' },
  ],
  '10-25': [
    { text: 'NCCT head — rule out ICH, assess early ischemic changes (ASPECTS)', link: 'step-ct' },
    { text: 'CTA neck + head — identify LVO; arch for access', link: 'step-ct' },
    { text: 'CT Perfusion if extended window (6–24h) or diagnostic uncertainty' },
    { text: 'MRI DWI if diagnostic uncertainty (chameleon / posterior circulation)' },
    { text: 'Consider reversal if DOAC <48h or warfarin INR >1.7', link: 'step-rel-contra' },
  ],
  '25-60': [
    { text: 'Q1: Is this a TNK candidate? (LKN <4.5h, disabling deficit, no ABS CI)', link: 'step-decision' },
    { text: 'TNK 0.25 mg/kg IV bolus (max 25 mg) — Lakeridge protocol', detail: 'Legacy: tPA 0.9 mg/kg (max 90 mg) — not used here.' },
    { text: 'Q2: Is this an EVT candidate? (LVO, NIHSS ≥6, ASPECTS ≥6, mRS ≤2, ≤24h per DAWN/DEFUSE-3)', link: 'step-decision' },
    { text: 'BP management: <185/110 pre-TNK; <180/105 for 24h post', link: 'step-decision' },
    { text: 'Disposition: ICU post-TNK; transfer to EVT centre if indicated' },
    { text: 'Document, copy EMR note, debrief team', link: 'step-note' },
  ],
};

// ============================================================
// NIHSS REFERENCE ARRAYS
// ============================================================

window.NIHSS_GENERAL_RULES = [
  'Score what you SEE, not what you think the patient can do.',
  'Do NOT coach — no rephrasing on items 1b, 1c, 9. Give the instruction once.',
  'Always pick a score — no "unable to test" except items 5/6 UN (amputation/fused joint only).',
  'You can ONLY go back and re-score Item 1a (if the patient deteriorates). All others: score once.',
  'Under time pressure, highest-yield items: weakness (5/6), language (9), gaze (2).',
  'Right-way eyes vs wrong-way eyes (Item 2): MCA lesion → eyes look TOWARD the lesion (right way). Thalamic hemorrhage or pontine → eyes look AWAY from the lesion (wrong way).',
];

window.NIHSS_NOT_ASSESSED = [
  'Cognition beyond month/age orientation',
  'Visual acuity',
  'Pupils (size, reactivity, anisocoria)',
  'Vertical gaze and nystagmus',
  'Cranial nerves VIII, IX, X, XI, XII',
  'Muscle tone and MRC grading',
  'Distal weakness (grip strength, foot dorsiflexion)',
  'Deep tendon reflexes, Babinski',
  'Vibration and proprioception',
  'Cortical sensation (graphesthesia, stereognosis)',
  'Romberg, truncal ataxia',
  'Gait and tandem gait',
  'A normal NIHSS does NOT exclude stroke — especially posterior circulation.',
];

window.NIHSS_FUNCTIONAL_CLUES = [
  'Hoover\'s sign: Place hand under the "paretic" heel while asking patient to lift opposite leg — feel downward pressure of paretic heel (genuine weakness: no pressure).',
  'Give-way / collapsing weakness: resistance suddenly drops during exam.',
  'Co-contraction: agonist and antagonist firing simultaneously.',
  'Variable weakness: strength changes across the exam with distraction.',
  'Splitting the midline: strict midline sensory loss is anatomically impossible.',
  'Non-anatomic distribution: entire limb or hemibody spared of face; or weakness without tone change.',
  'Exam findings change with suggestion, encouragement, or distraction.',
];

window.NIHSS_EXAM_PEARLS = [
  'Delirium vs aphasia: aphasic patient CAN follow simple commands by mimicking; delirious patient cannot sustain attention. Both can be receptively impaired.',
  'Cerebellar stroke requires tandem gait — NIHSS will not catch it. Always test when safe.',
  'BP is usually elevated in acute stroke (>60% patients). Do not aggressively lower unless TNK planned or end-organ damage.',
  'Pupils: sympathomimetic (cocaine, meth) → dilated and reactive; opioid → pinpoint and reactive; pontine hemorrhage → pinpoint and non-reactive; Wallenberg → ipsilateral Horner\'s (miotic, ptosis, anhidrosis).',
  'Pronator drift catches subtle UMN weakness that passes full-strength testing.',
  'Anisocoria: isolated finding is NOT a stroke — think CN III palsy, Horner\'s, pharmacologic. Only a stroke feature if accompanied by other brainstem signs (e.g. Wallenberg).',
];

window.NIHSS_CLINICAL_USE = [
  'TNK requires a measurable and disabling deficit. No strict NIHSS floor — clinical judgment. Usually ≥4, but lower if deficit is disabling (hand weakness, aphasia, hemianopia).',
  'EVT eligibility: NIHSS ≥6 with LVO on CTA + ASPECTS ≥6. Window ≤6h standard; 6–24h per DAWN/DEFUSE-3 with imaging mismatch.',
  'DAPT (CHANCE/POINT): minor non-disabling stroke NIHSS ≤3 or high-risk TIA — ASA + clopidogrel for 21 days then ASA alone.',
  'Baseline NIHSS is the single strongest predictor of 3-month functional outcome.',
  '≥4-point increase on serial NIHSS = significant deterioration. Urgent re-imaging indicated.',
];

window.NIHSS_LIMITATIONS = [
  'Under-scores posterior circulation strokes (brainstem, cerebellum).',
  'Dominant-hemisphere weighted — left MCA strokes score higher than right.',
  'Does not capture cognition, fatigue, mood, gait, or truncal balance.',
  'Moderate inter-rater variability even among trained examiners.',
  'NIHSS = 0 does NOT exclude TIA or a missed posterior stroke.',
  'Fluctuating deficits (e.g. TIA-like, BAO) may score low at assessment but represent critical occlusion.',
];


