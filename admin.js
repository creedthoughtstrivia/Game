import { APP } from './config.js';
import { fbReady, clearSoloScores } from './rt.js';

const el = (s) => document.querySelector(s);
const gate    = el('#gate');
const settings= el('#settings');
const content = el('#content');
const tools   = el('#tools');

const inputs = {
  base: el('#sBase'),
  speed: el('#sSpeedMax'),
  first: el('#sFirst'),
  time: el('#sTime'),
  shufQ: el('#sShufQ'),
  shufA: el('#sShufA'),
  seed: el('#sSeed'),
  ret: el('#sRet')
};

document.getElementById('btnOwnerLogin').addEventListener('click', () => {
  const pass = (document.getElementById('ownerPass').value || '').trim();
  if (pass && pass === APP.OWNER_PASSCODE) {
    gate.classList.add('hidden');
    settings.classList.remove('hidden');
    content.classList.remove('hidden');
    tools.classList.remove('hidden');
    loadSettings();
    loadSetsList();
  } else {
    alert('Invalid passcode');
  }
});

function loadSettings() {
  const cur = JSON.parse(localStorage.getItem('sts_settings') || '{}');
  const merged = { ...APP.DEFAULTS, ...cur };
  inputs.base.value  = merged.BASE_CORRECT;
  inputs.speed.value = merged.SPEED_MAX;
  inputs.first.value = merged.FIRST_CORRECT;
  inputs.time.value  = merged.TIME_PER_Q;
  inputs.shufQ.checked = merged.SHUFFLE_Q;
  inputs.shufA.checked = merged.SHUFFLE_A;
  inputs.seed.checked  = merged.DAILY_SEED;
  inputs.ret.value   = merged.SOLO_RETENTION_DAYS;
}

document.getElementById('btnSaveSettings').addEventListener('click', () => {
  const next = {
    BASE_CORRECT: parseInt(inputs.base.value, 10),
    SPEED_MAX: parseInt(inputs.speed.value, 10),
    FIRST_CORRECT: parseInt(inputs.first.value, 10),
    TIME_PER_Q: parseInt(inputs.time.value, 10),
    SHUFFLE_Q: !!inputs.shufQ.checked,
    SHUFFLE_A: !!inputs.shufA.checked,
    DAILY_SEED: !!inputs.seed.checked,
    SOLO_RETENTION_DAYS: parseInt(inputs.ret.value, 10)
  };
  localStorage.setItem('sts_settings', JSON.stringify(next));
  alert('Saved.  Refresh the game pages to apply.');
});

document.getElementById('btnRotateOwnerHint').addEventListener('click', () => {
  alert('To rotate your owner passcode, edit APP.OWNER_PASSCODE in config.js and redeploy.');
});

document.getElementById('btnClearSolo').addEventListener('click', async () => {
  if (!fbReady()) {
    alert('Enable Firebase in config.js to clear the solo leaderboard.');
    return;
  }
  if (confirm('Clear all solo scores?')) {
    await clearSoloScores();
    alert('Solo scores cleared.');
  }
});

// Upload question set via file picker
document.getElementById('btnUploadSet').addEventListener('click', async () => {
  const f = document.getElementById('fileJson').files[0];
  if (!f) return alert('Choose a .json file');
  const text = await f.text();
  try {
    const js = JSON.parse(text);
    if (!js.questions || !Array.isArray(js.questions)) throw new Error('Invalid schema');
    // Store in localStorage for preview purposes.  Real usage requires
    // committing to the repository and updating config.js.
    const key = `sts_set_${js.meta?.setId || f.name}`;
    localStorage.setItem(key, text);
    alert('Set loaded into localStorage.  For production, upload to /questions and update config.js.');
    loadSetsList();
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
});

function loadSetsList() {
  const list = document.getElementById('setsList');
  list.innerHTML = '';
  APP.QUESTION_SETS.forEach(s => {
    const div = document.createElement('div');
    div.innerHTML = `<b>${s.id}</b> — ${s.title} — <em>${s.category}</em> — <code>${s.path}</code>`;
    list.appendChild(div);
  });
}