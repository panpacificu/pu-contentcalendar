window.APP_CONFIG = Object.freeze({
  APP_NAME: "Panpacific University Content Planner",
  VERSION: "1.2.0",
  API_URL: "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
  TIME_ZONE: "Asia/Manila",
  DEFAULT_VIEW: "weekly",
  TIME_SLOTS: {
    poster: ["09:00", "12:00", "15:00", "17:00"],
    video: ["10:30", "13:30", "16:30", "19:00"]
  },
  CHANGELOG: [
    {
      version: "1.2.0",
      date: "2026-07-17",
      changes: [
        "Added dedicated posting slots for posters/photos and videos/short-form content.",
        "Added weekly and monthly view switching.",
        "Added drag-and-drop scheduling in weekly view.",
        "Added content-type icons, slot occupancy indicators, and persistent view preference.",
        "Retained Hide Week / Show Week controls, quick status updates, duplicate-save protection, floating date/time, refresh, and changelog tools."
      ]
    },
    {
      version: "1.1.2",
      date: "2026-06-21",
      changes: [
        "Combined the floating Manila date/time card with manual Hide Week and Show Week controls."
      ]
    },
    {
      version: "1.1.0",
      date: "2026-06-21",
      changes: [
        "Added quick status controls, duplicate-save protection, floating tools, versioning, and lighter Inter typography."
      ]
    }
  ]
});
