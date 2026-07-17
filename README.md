# Panpacific University Content Planner

Version 1.2.0

A lightweight content scheduling planner built with HTML, CSS, JavaScript, Google Sheets, and Google Apps Script.

## Main Features

- Monthly and weekly calendar views
- Weekly drag-and-drop scheduling
- Fixed publication slots:
  - Posters / Photos: 9:00 AM, 12:00 PM, 3:00 PM, 5:00 PM
  - Videos / Short-form: 10:30 AM, 1:30 PM, 4:30 PM, 7:00 PM
- Content-type icons and visually separated slot groups
- Automatic sorting by posting time
- Quick status cycle: Idea → Scheduled → Posted → Idea
- Manual Hide Week / Show Week in monthly view
- Floating refresh, changelog, and live Manila date/time
- Duplicate-save protection
- Persistent monthly/weekly view preference
- Responsive layout and light Inter typography

## Files

- `index.html`
- `style.css`
- `script.js`
- `config.js`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `apps-script/Code.gs`

## Google Sheet Structure

Use a sheet named `Posts` with these exact headers:

`ID | Date | Time | Title | Category | Status | CreatedAt | UpdatedAt`

No new column is required for content type. The app identifies the type based on the selected posting slot.

## Setup

1. Back up the existing Google Sheet.
2. Upload the frontend files to the GitHub repository.
3. In `config.js`, retain or paste the deployed Apps Script `/exec` URL.
4. Replace Apps Script with `apps-script/Code.gs` only when upgrading from a version older than 1.1.0.
5. Deploy a new Apps Script Web App version if `Code.gs` was changed.
6. Hard refresh the GitHub Pages website.

## Drag and Drop

Open Weekly view, then drag a card to any date/time cell. The app saves the new date and time automatically. If the save fails, the card returns to its previous slot.

## Existing Data

Existing values are preserved. Older entries using a non-standard time remain visible in Monthly view, but editing them will require selecting one of the approved slots.
