import { FB } from './config.js';

// Firebase helper.  Initializes Firebase only if enabled and catches
// initialization errors.  This ensures the rest of the application
// continues to run even if Firebase configuration is missing or invalid.
let fb = { app: null, db: null, rtdb: null, firestore: null, now: null };

export function fbReady() {
  return FB.enabled && fb.db;
}

export async function fbInit() {
  if (!FB.enabled) return;
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const fsMod  = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const rtdbMod= await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const appInst = appMod.initializeApp(FB.config);
    const db = fsMod.getFirestore(appInst);
    const realtime = rtdbMod.getDatabase(appInst);
    fb = {
      app: appInst,
      db,
      rtdb: realtime,
      firestore: fsMod,
      now: fsMod.serverTimestamp
    };
  } catch (err) {
    console.error('Firebase initialization failed:', err);
  }
}

// Immediately attempt to initialize Firebase.  Errors are logged but
// swallowed so the rest of the modules can load.
await fbInit();

// Solo leaderboard functions
export async function addSoloScore(doc) {
  if (!fbReady()) return;
  const { firestore } = fb;
  await firestore.addDoc(firestore.collection(fb.db, FB.paths.soloScores), {
    ...doc,
    createdAt: firestore.serverTimestamp()
  });
}

export async function getSoloTop(limitN = 20) {
  if (!fbReady()) return [];
  const { firestore } = fb;
  const q = firestore.query(
    firestore.collection(fb.db, FB.paths.soloScores),
    firestore.orderBy('score', 'desc'),
    firestore.orderBy('durationMs', 'asc'),
    firestore.limit(limitN)
  );
  const snap = await firestore.getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function clearSoloScores() {
  if (!fbReady()) return;
  const { firestore } = fb;
  const col = firestore.collection(fb.db, FB.paths.soloScores);
  const snap = await firestore.getDocs(col);
  const batch = firestore.writeBatch(fb.db);
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

// Live match functions
export async function createMatch({ code, hostPin, config, questions }) {
  const { firestore } = fb;
  const ref = firestore.doc(firestore.collection(fb.db, FB.paths.matches));
  await firestore.setDoc(ref, {
    code,
    hostPin,
    state: 'lobby',
    qIndex: -1,
    config,
    createdAt: firestore.serverTimestamp(),
    players: {},
    firstCorrect: null,
    questionStartAt: null,
    questions
  });
  return ref.id;
}

export async function findMatchByCode(code) {
  const { firestore } = fb;
  const q = firestore.query(
    firestore.collection(fb.db, FB.paths.matches),
    firestore.where('code', '==', code),
    firestore.limit(1)
  );
  const snap = await firestore.getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, data: snap.docs[0].data() };
}

export async function joinMatch(matchId, playerId, name) {
  const { firestore } = fb;
  const ref = firestore.doc(fb.db, `${FB.paths.matches}/${matchId}`);
  await firestore.updateDoc(ref, {
    [`players.${playerId}`]: { name, score: 0, answered: false, avgMs: 0, firsts: 0 }
  });
}

export function subscribeMatch(matchId, handler) {
  const { firestore } = fb;
  const ref = firestore.doc(fb.db, `${FB.paths.matches}/${matchId}`);
  return firestore.onSnapshot(ref, snap => handler({ id: snap.id, data: snap.data() }));
}

export async function hostAction(matchId, hostPin, patch) {
  const { firestore } = fb;
  const ref = firestore.doc(fb.db, `${FB.paths.matches}/${matchId}`);
  const snap = await firestore.getDoc(ref);
  if (!snap.exists()) throw new Error('Match not found');
  if (snap.data().hostPin !== hostPin) throw new Error('Invalid Host PIN');
  await firestore.updateDoc(ref, patch);
}

export async function submitAnswer({ matchId, playerId, idx, correct, ms }) {
  const { firestore } = fb;
  const ref = firestore.doc(fb.db, `${FB.paths.matches}/${matchId}`);
  await firestore.runTransaction(fb.db, async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists()) throw new Error('Match missing');
    const d = doc.data();
    const qIdx = d.qIndex;
    const key = `answers.${qIdx}.${playerId}`;
    const updates = {};
    updates[key] = { idx, correct, ms, at: fb.now() };
    if (correct && (!d.firstCorrect || d.firstCorrect.qIdx !== qIdx)) {
      updates['firstCorrect'] = { qIdx, playerId };
      const p = d.players[playerId] || { name: '?', score: 0, answered: false, avgMs: 0, firsts: 0 };
      updates[`players.${playerId}.firsts`] = (p.firsts || 0) + 1;
    }
    updates[`players.${playerId}.answered`] = true;
    tx.update(ref, updates);
  });
}

export async function endMatch(matchId) {
  const { firestore } = fb;
  const ref = firestore.doc(fb.db, `${FB.paths.matches}/${matchId}`);
  await firestore.updateDoc(ref, { state: 'ended' });
}