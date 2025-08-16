import { APP } from './config.js';
import { fbReady, createMatch, findMatchByCode, joinMatch, subscribeMatch, hostAction, submitAnswer, endMatch } from './rt.js';

// DOM references
const el = (s) => document.querySelector(s);
const hostPin   = el('#hostPin');
const matchCode = el('#matchCode');
const categoryLive = el('#categoryLive');
const setLive  = el('#setLive');
const countLive= el('#countLive');
const timePerQ = el('#timePerQ');
const btnCreate= el('#btnCreateMatch');
const btnOpenQ = el('#btnOpenQ');
const btnCloseQ= el('#btnCloseQ');
const btnNextQ = el('#btnNextQ');
const btnEnd   = el('#btnEnd');
const playerCount = el('#playerCount');
const qIdxEl   = el('#qIdx');
const liveInfo = el('#liveInfo');
const lbLive   = el('#lbLive');

// Build category → sets map
const categoryMap = {};
APP.CATEGORIES.forEach(cat => categoryMap[cat] = []);
APP.QUESTION_SETS.forEach(set => {
  if (categoryMap[set.category]) categoryMap[set.category].push(set);
});

// Populate categories and sets on init
APP.CATEGORIES.forEach(cat => {
  const opt = document.createElement('option');
  opt.value = cat;
  opt.textContent = cat;
  categoryLive.appendChild(opt);
});
function populateSets() {
  const cat = categoryLive.value;
  setLive.innerHTML = '';
  (categoryMap[cat] || []).forEach(set => {
    const o = document.createElement('option');
    o.value = set.id;
    o.textContent = set.title;
    setLive.appendChild(o);
  });
}
categoryLive.addEventListener('change', populateSets);
populateSets();

let match = { id: null, data: null };

btnCreate.addEventListener('click', async () => {
  if (!fbReady()) {
    alert('Firebase is disabled.  Enable it in config.js to run live matches.');
    return;
  }
  const code = (matchCode.value || 'SCRANTON').toUpperCase();
  const pin  = (hostPin.value || '000000').trim();
  const set  = APP.QUESTION_SETS.find(s => s.id === setLive.value);
  const all  = await (await fetch(set.path)).json();
  let qs = all.questions.slice();
  if (APP.DEFAULTS.SHUFFLE_Q) shuffle(qs);
  const count = Math.max(5, Math.min(50, parseInt(countLive.value || '10', 10)));
  qs = qs.slice(0, count).map(q => {
    const map = q.answers.map((a, i) => ({ a, i }));
    shuffle(map);
    const correctIdx = map.findIndex(x => x.i === q.correctIndex);
    return {
      id: q.id,
      prompt: q.prompt,
      answers: map.map(x => x.a),
      correctIndex: correctIdx,
      timeLimitSec: q.timeLimitSec || parseInt(timePerQ.value || '25', 10)
    };
  });
  const config = {
    base: APP.DEFAULTS.BASE_CORRECT,
    speedMax: APP.DEFAULTS.SPEED_MAX,
    first: APP.DEFAULTS.FIRST_CORRECT
  };
  const id = await createMatch({ code, hostPin: pin, config, questions: qs });
  subscribe(id);
  toggleHostButtons(true);
});

async function subscribe(id) {
  const unsub = subscribeMatch(id, (m) => {
    match = m;
    const d = m.data;
    playerCount.textContent = Object.keys(d.players || {}).length;
    qIdxEl.textContent = d.qIndex;
    renderLiveBoard(d);
    liveInfo.textContent = `State: ${d.state}`;
    btnOpenQ.disabled  = !(d.state === 'lobby' || d.state === 'closed');
    btnCloseQ.disabled = !(d.state === 'open');
    btnNextQ.disabled  = !(d.state === 'closed' && d.qIndex < d.questions.length - 1);
    btnEnd.disabled    = d.state === 'ended';
  });
  match.unsub = unsub;
}

btnOpenQ.addEventListener('click', async () => {
  await hostAction(match.id, hostPin.value.trim(), {
    state: 'open',
    qIndex: match.data.qIndex + 1,
    firstCorrect: null,
    questionStartAt: new Date().toISOString()
  });
});
btnCloseQ.addEventListener('click', async () => {
  const d = match.data;
  const answers = (d.answers && d.answers[d.qIndex]) || {};
  const updates = {};
  Object.entries(d.players || {}).forEach(([pid, p]) => {
    const a = answers[pid];
    const correct = a?.correct === true;
    const ms = a?.ms ?? 999999;
    const maxMs = 5000;
    const ratio = Math.max(0, Math.min(1, (maxMs - Math.min(ms, maxMs)) / maxMs));
    const speed = correct ? Math.round(d.config.speedMax * ratio) : 0;
    const base  = correct ? d.config.base : 0;
    const inc   = base + speed + ((d.firstCorrect && d.firstCorrect.playerId === pid) ? d.config.first : 0);
    updates[`players.${pid}.score`] = (p.score || 0) + inc;
  });
  await hostAction(match.id, hostPin.value.trim(), { state: 'closed', ...updates });
});
btnNextQ.addEventListener('click', async () => {
  await hostAction(match.id, hostPin.value.trim(), { firstCorrect: null });
});
btnEnd.addEventListener('click', async () => {
  await endMatch(match.id);
});

function renderLiveBoard(d) {
  const arr = Object.entries(d.players || {}).map(([id, p]) => ({ id, ...p }));
  arr.sort((a, b) => b.score - a.score);
  lbLive.innerHTML = '<ol>' + arr.map(p => `<li>${escapeHtml(p.name)} — <b>${p.score}</b>${p.firsts ? ` • ${p.firsts}⭐` : ''}</li>`).join('') + '</ol>';
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function toggleHostButtons(on) {
  [btnOpenQ, btnCloseQ, btnNextQ, btnEnd].forEach(b => b.disabled = !on);
}
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Player join from index page: attach event to join button if present
const joinBtn = document.getElementById('btnJoinLive');
if (joinBtn) {
  joinBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('nameLive').value || 'Player').trim().slice(0, 20);
    const code = (document.getElementById('codeLive').value || '').toUpperCase();
    if (!fbReady()) {
      alert('Firebase is disabled.  Enable it in config.js to join live matches.');
      return;
    }
    const found = await findMatchByCode(code);
    if (!found) {
      alert('No match with that code.');
      return;
    }
    const playerId = localStorage.getItem('sts_player_id') || `p_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem('sts_player_id', playerId);
    await joinMatch(found.id, playerId, name);
    window.open(`player.html?mid=${found.id}&pid=${playerId}`, '_blank');
  });
}