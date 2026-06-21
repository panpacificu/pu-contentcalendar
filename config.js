window.APP_CONFIG = Object.freeze({
  APP_NAME: "Panpacific University Content Planner",
  VERSION: "1.1.2",
  API_URL: "https://script.google.com/macros/s/AKfycbyO-DiFHcopazE0icyj3ETSscI8bA84E-ybMRDqmKbMy0wJjkBavzh3ZyljRSF-XSJ3/exec",
  TIME_ZONE: "Asia/Manila",
  CHANGELOG: [
    {
      version: "1.1.2",
      date: "2026-06-21",
      changes: [
        "Restored the floating current date and time reference card at the lower-left.",
        "Combined the live Manila date/time display with the manual Hide Week and Show Week calendar controls."
      ]
    },
    {
      version: "1.1.1",
      date: "2026-06-21",
      changes: [
        "Added manual Hide Week and Show Week controls for each calendar row.",
        "Hidden weeks are remembered per month in the browser.",
        "Collapsing a week does not delete or modify any calendar entries."
      ]
    },
    {
      version: "1.1.0",
      date: "2026-06-21",
      changes: [
        "Improved loading and calendar rendering performance.",
        "Added floating refresh and changelog buttons.",
        "Added quick status controls on calendar cards.",
        "Prevented accidental duplicate saves.",
        "Refined Inter typography for a lighter interface.",
        "Added versioning, README, changelog, and config files."
      ]
    },
    {
      version: "1.0.0",
      date: "2026-06-21",
      changes: [
        "Initial Panpacific University content calendar release.",
        "Added monthly calendar, categories, statuses, time sorting, and Google Sheets integration."
      ]
    }
  ]
});
