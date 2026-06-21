# Panpacific University Content Planner

Version 1.1.1

A lightweight monthly content calendar for Panpacific University, built with HTML, CSS, JavaScript, Google Sheets, and Google Apps Script.

## Features

- Floating live Philippine date and time reference

- Monthly calendar view
- Time-based automatic sorting
- Categories: OSC Post, Requests, Holidays
- Statuses: Idea, Scheduled, Posted
- Quick status update icon on every card
- Floating refresh button
- Floating changelog button
- Duplicate-save protection
- Google Sheets database
- Google Apps Script backend
- GitHub Pages hosting
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
