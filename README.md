# Panpacific University Content Planner

Version 1.1.2

A lightweight monthly content calendar for Panpacific University, built with HTML, CSS, JavaScript, Google Sheets, and Google Apps Script.

## Features

- Monthly calendar view
- Time-based automatic sorting
- Categories: OSC Post, Requests, Holidays
- Statuses: Idea, Scheduled, Posted
- Quick status update icon on every card
- Floating refresh button
- Floating changelog button
- Floating current date and time reference card
- Duplicate-save protection
- Google Sheets database
- Google Apps Script backend
- GitHub Pages hosting
- Manual Hide Week / Show Week controls
- Hidden-week preferences remembered per month
- Responsive interface
- Inter typography with lighter weights

## Files

- `index.html`
- `style.css`
- `script.js`
- `config.js`
- `CHANGELOG.md`
- `LICENSE`
- `apps-script/Code.gs`

## Google Sheet Structure

Use a sheet named `Posts` with these headers in Row 1:

`ID | Date | Time | Title | Category | Status | CreatedAt | UpdatedAt`

Existing rows are preserved as long as you do not delete or overwrite the sheet.

## Setup

1. Open `config.js`.
2. Replace the placeholder API URL with your deployed Apps Script `/exec` URL.
3. In Google Sheets, open Extensions → Apps Script.
4. Replace the existing Apps Script code with `apps-script/Code.gs`.
5. Save and deploy a new Web App version.
6. Use:
   - Execute as: Me
   - Who has access: Anyone
7. Upload the frontend files to the GitHub repository.
8. Enable GitHub Pages from the `main` branch and `/root` folder.

## Important Before Updating

Create a backup copy of the Google Sheet before changing Apps Script or headers. This update does not delete existing values by itself.

## Quick Status Button

The small icon on each calendar card cycles statuses in this order:

`Idea → Scheduled → Posted → Idea`

## Duplicate Save Protection

The Save button disables immediately after being clicked. The backend also uses request tokens, locking, and temporary caching to ignore accidental duplicate submissions.

## Hide or Show a Week

Use the small **Hide Week** button on any calendar row to collapse only that week. A compact bar showing the date range remains visible; select **Show Week** to restore it. This display preference is stored in the browser and does not change or delete any Google Sheet entries.


## Live Date and Time

A floating date/time card stays fixed at the lower-left for quick scheduling reference. It uses the configured `Asia/Manila` time zone and updates every second.
