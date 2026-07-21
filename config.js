window.PU_PLANNER_CONFIG = Object.freeze({
  APP_NAME: "Panpacific University Content Planner",
  VERSION: "2.0.2",

  // Safe browser credentials from Supabase Project Settings → API.
  // Never place a service_role key here.
  SUPABASE_URL: "https://drjciukumjodmkdexwfh.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_zPfxe2KhRT0MokFk-SOZ3w_XdZcojQH",

  // Replace with the final GitHub Pages or custom-domain URL.
  SITE_URL: window.location.origin + window.location.pathname,

  TIME_ZONE: "Asia/Manila",
  DEFAULT_VIEW: "weekly",
  AUTO_REFRESH_MS: 60000,

  // Zero-login shared workspace. The frontend silently creates an anonymous
  // Supabase session so staff can open the URL and use the planner immediately.
  ZERO_LOGIN_SHARED_ACCESS: true,

  TIME_SLOTS: {
    poster: ["09:00", "12:00", "15:00", "17:00"],
    video: ["10:30", "13:30", "16:30", "19:00"]
  },

  CATEGORIES: ["OSC Post", "Requests", "Holidays"],
  PLATFORMS: ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube", "Multiple", "General"],

  CHANGELOG: [
    {
      version: "2.0.2",
      date: "2026-07-21",
      changes: [
        "Added Shift + Drag card duplication in Month, Week, and Day views, plus a mobile-friendly Duplicate button.",
        "Added a blue copy-target indicator while duplicating a card.",
        "Prepared and validated the current Google Sheets migration for 146 existing planner records.",
        "Added one-click SQL and cleaned CSV migration files with duplicate-review reporting."
      ]
    },
    {
      version: "2.0.1",
      date: "2026-07-20",
      changes: [
        "Removed visible account registration and sign-in from the internal planner.",
        "Added automatic anonymous Supabase sessions for zero-login shared access.",
        "Kept Realtime synchronization so every open browser receives updates immediately.",
        "Marked the site as internal and excluded it from search indexing."
      ]
    },
    {
      version: "2.0.0",
      date: "2026-07-20",
      changes: [
        "Migrated the planner frontend from Google Apps Script requests to Supabase-ready data access.",
        "Added account authentication, workspace roles, publication channels, and database-level security support.",
        "Added a detailed Daily view alongside Month and Week views.",
        "Added Realtime synchronization with timed and focus-based refresh fallbacks.",
        "Added search, channel, status, and category filters.",
        "Added the Created workflow status, richer post details, captions, notes, and platform labels.",
        "Added drag-and-drop rescheduling in Month, Week, and Day views.",
        "Retained fixed publication slots, Hide Week controls, quick status updates, floating utilities, and responsive layouts."
      ]
    },
    {
      version: "1.2.0",
      date: "2026-07-17",
      changes: [
        "Added fixed posting slots for poster/photo and video/short-form content.",
        "Added monthly and weekly views with weekly drag-and-drop scheduling.",
        "Added slot occupancy indicators and persistent view preference."
      ]
    }
  ]
});
