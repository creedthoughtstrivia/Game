// Global configuration for Scranton Trivia Showdown
// Edit this file to change categories, question sets, defaults and Firebase settings.

export const APP = {
  // Change this to your own secret before deploying
  OWNER_PASSCODE: 'change-me-123456',
  // Category list used to populate the category selectors.  Each category
  // should have a unique string identifier.  These values are referenced
  // by the question sets below.
  CATEGORIES: ['Creed', 'General', 'Quotes'],
  // Default settings applied to new matches and solo games.  These can
  // be overridden via the admin panel and persist in localStorage.
  DEFAULTS: {
    BASE_CORRECT: 100,
    SPEED_MAX: 50,
    FIRST_CORRECT: 100,
    TIME_PER_Q: 25,
    SHUFFLE_Q: true,
    SHUFFLE_A: true,
    DAILY_SEED: false,
    SOLO_RETENTION_DAYS: 7
  },
  // List of available question sets.  Each set must include:
  // id        – unique identifier used in URLs and storage
  // title     – human‑readable name displayed in the UI
  // category  – one of the values from CATEGORIES
  // path      – relative path to the JSON file in the questions/ folder
  QUESTION_SETS: [
    { id: 'creed-basics-001', title: 'Creed Basics Vol. 1', category: 'Creed', path: 'questions/creed-basics-001.json' },
    { id: 'office-general-001', title: 'Office General Vol. 1', category: 'General', path: 'questions/office-general-001.json' },
    { id: 'quotes-001', title: 'Quotes & Lines', category: 'Quotes', path: 'questions/quotes-001.json' }
  ]
};

// Firebase integration.  When enabled is true and valid credentials are
// provided, the app will use Firestore/Realtime Database for live
// tournaments and persistent leaderboards.  When disabled, the app runs
// entirely locally and all Firebase calls are skipped.
export const FB = {
  enabled: false,
  config: {
    apiKey: 'PASTE_HERE',
    authDomain: 'PASTE_HERE.firebaseapp.com',
    projectId: 'PASTE_HERE',
    storageBucket: 'PASTE_HERE.appspot.com',
    messagingSenderId: 'PASTE_HERE',
    appId: 'PASTE_HERE',
    databaseURL: ''
  },
  paths: {
    soloScores: 'soloScores',
    matches: 'matches'
  }
};