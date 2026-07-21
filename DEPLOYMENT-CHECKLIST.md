# Deployment checklist

- [ ] Create a dedicated Supabase project.
- [ ] Run `supabase/schema.sql` in SQL Editor.
- [ ] Enable Authentication → Anonymous Sign-Ins.
- [ ] Paste the Project URL and publishable key into `config.js`.
- [ ] Do not place a secret/service-role key in the frontend.
- [ ] Import historical CSV data if needed.
- [ ] Deploy to GitHub Pages.
- [ ] Open the site in two different browsers and confirm both enter automatically.
- [ ] Create or edit a post in browser A and confirm browser B refreshes through Realtime.
- [ ] Test Month, Week, and Day views on desktop and mobile.
- [ ] Keep the URL limited to authorized PU staff.
