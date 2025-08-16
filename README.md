# Scranton Trivia Showdown

This repository contains a complete, self‑contained trivia game inspired by
*The Office*.  It is designed to run entirely in a static hosting
environment (such as GitHub Pages) and does not require a backend.  An
optional Firebase integration is provided for real‑time tournaments and
leaderboards, but it is disabled by default so the game works out of the box
without any configuration.

## Features

* **Solo Mode** – Players can pick a category and a question set and play at
  their own pace.  Scores are calculated using correct answers, a speed
  bonus and a configurable per‑question timer.
* **Live Tournaments** – Hosts can create a live match, share a join code
  and run questions in real time.  The system tracks first‑correct
  answers and awards bonus points accordingly.
* **Admin Controls** – An owner passcode unlocks an admin panel where
  scoring parameters, timers, shuffling and other global settings can be
  tweaked without editing the source.  The admin can also upload new
  question sets and clear the solo leaderboard.
* **Categories and Sets** – The game supports any number of categories and
  question sets.  Each set is associated with a category via the
  configuration, and the UI filters sets by the selected category.  This
  prevents the common mistake of creating question packs that aren’t
  selectable because no category was assigned.
* **Plug‑and‑Play Deployment** – Simply upload the contents of this
  directory to a GitHub repository and enable GitHub Pages.  No build
  process is required.  To enable Firebase features, flip the `enabled`
  flag in `config.js` and paste in your Firebase web credentials.

## Getting Started

1. **Upload the files** – Place all files from `premium-office-trivia/`
   into the root of your GitHub repository.
2. **Configure** – Open `config.js` and change `OWNER_PASSCODE` to a secret
   passcode you will use to unlock the admin panel.  If you intend to use
   Firebase for leaderboards and live matches, set `FB.enabled` to `true`
   and paste your Firebase configuration into the `config` object.
3. **Deploy** – On GitHub, navigate to **Settings → Pages**, select the
   branch and root folder to deploy and save.  Within a few minutes your
   site will be live.
4. **Play** – Visit your GitHub Pages URL.  Pick a category, select a set
   and enjoy.  Use the Admin page to adjust settings and import new
   question packs.

## Adding Question Packs

Question packs live in the `questions/` directory and follow a simple
schema: a top‑level `meta` object, a `settings` object and a `questions`
array.  You can create new packs by copying one of the existing files
(`creed-basics-001.json`, `office-general-001.json`, `quotes-001.json`) and
editing the contents.  For large imports, use the CSV → JSON converter
located at `tools/csv-import.html`.

To make a pack selectable in the UI, add an entry to the `QUESTION_SETS`
array in `config.js` with an `id`, human‑readable `title`, the
`category` it belongs to and the relative `path` to the JSON file.  The
category must match one of the values in the `CATEGORIES` array.
