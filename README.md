# Panpacific University Content Planner v2.0.2

## Zero-login shared Supabase edition

This edition is designed to behave like the previous internal Apps Script planner:

- No visible registration or login
- Anyone who opens the internal URL enters the shared planner automatically
- Every open browser receives database updates through Supabase Realtime
- Month, week, and day views
- Drag-and-drop rescheduling
- Poster/photo and video time slots
- Search, filters, workflow statuses, captions, notes, channel management, refresh fallback, and changelog

## Setup

1. Create a separate Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. Open **Authentication** settings and enable **Anonymous Sign-Ins**.
4. Copy the Supabase Project URL and publishable key into `config.js`.
5. Upload the project files to GitHub Pages.
6. Export the current Google Sheet as CSV and use `tools/convert_google_sheet_csv.py` if historical data must be imported.

No email provider, confirmation message, password reset, Google OAuth, or staff-account setup is required.

## How zero-login access works

The page silently calls `supabase.auth.signInAnonymously()` the first time it is opened in a browser. Supabase stores that session locally and the database trigger adds it to the shared PU workspace as an Editor. The visitor never sees an account screen.

## Important access note

GitHub Pages is publicly reachable. “Internal” in this build means **link-based shared access**, not a private university network. Anyone who obtains the URL can open and edit the planner. Keep the URL limited to authorized staff and do not store confidential or regulated information in it.

For stricter access later, add a university login, VPN/reverse proxy, or a server-side shared access gate.

## Current Google Sheets migration

The `migration/` folder contains the cleaned and validated 146-row migration from the uploaded PU Posts CSV.

Run:

1. `supabase/schema.sql`
2. `migration/import_current_posts.sql`

The import is repeat-safe because it upserts by `legacy_id`.

## Shift + Drag copy

- Drag a card normally to move it.
- Hold **Shift** while dragging and drop it on another date or time slot to create a copy.
- Month view keeps the original posting time.
- Week and Day views adopt the destination time slot.
