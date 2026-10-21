---
title: FilmMetrics Privacy Policy
---

# FilmMetrics Privacy Policy

_Last updated: 2026-10-21_

FilmMetrics is a Chrome extension that helps independent filmmakers understand how
audiences respond to their films and trailers on YouTube and Google Drive. This
policy explains what data the extension collects, why, and how it's handled.

## What we collect

While you watch a video on **youtube.com** or **drive.google.com** with the
extension active, FilmMetrics records:

- **Passive viewing behavior**: play, pause, seek/rewind, playback speed changes,
  volume changes, fullscreen toggles, and completion percentage — all tied to a
  timestamp in the video.
- **Feedback you choose to give**: emoji reactions and optional text comments,
  each tied to the moment in the video you gave them.
- **Optional end-of-film questionnaire responses**, if you choose to fill one out.
- **The page title and URL** of the video being watched.
- **A random, anonymous identifier** generated once per browser install (not tied
  to your name, email, Google account, or any other identity), used only to count
  distinct viewers separately from viewing sessions.

We do **not** collect your name, email address, IP address, precise location,
browsing history outside of youtube.com/drive.google.com, or any page content
beyond the video's title and URL.

## How data is stored and used

- Everything is written to your device's local browser storage first
  (`chrome.storage.local`). This works entirely offline.
- When you click "Upload Session" (or it syncs automatically in the background),
  this same data is sent to our backend (hosted on Supabase/PostgreSQL) over an
  encrypted connection, where it's aggregated into analytics for the filmmaker
  who owns that video.
- The filmmaker's dashboard shows only aggregated statistics (completion rates,
  drop-off points, reaction counts, etc.) and the individual comments/feedback
  you submitted — never your identity.

## AI-generated insights

A filmmaker viewing their dashboard can optionally request an AI-generated
summary of audience response. If they do, a compact, de-identified statistical
summary (counts, percentages, timestamps, and your feedback text) — never your
device identifier, IP address, or any other identifying information — is sent to
Groq (a third-party AI provider) to generate that summary. This only happens
when a filmmaker explicitly requests it for their own video.

## Third parties

- **Supabase** hosts our database and backend functions. They process data on
  our behalf and do not use it for their own purposes.
- **Groq** processes aggregated, de-identified analytics only when a filmmaker
  requests AI insights, solely to generate that summary.
- We do not sell, rent, or share your data with any other third party, and we
  do not use it for advertising.

## Your choices

- The extension works fully offline; nothing is sent anywhere unless/until a
  sync happens.
- You can clear all locally-stored viewing data and feedback at any time from
  the extension's feedback panel ("Clear Feedback" / "Clear Local Data").
- Clearing local data does not delete data already synced to our backend. To
  request deletion of previously-synced data, contact us (below).

## Children's privacy

FilmMetrics is not directed at children under 13 and does not knowingly collect
data from them.

## Changes to this policy

If this policy changes, we'll update the date above and, for material changes,
note it here.

## Contact

Questions about this policy or your data: **filmmatrix10@gmail.com**
