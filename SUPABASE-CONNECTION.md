# Supabase connection

This build is already configured with the browser-safe credentials for:

- Project URL: `https://drjciukumjodmkdexwfh.supabase.co`
- Authentication mode: anonymous / zero-login shared access

Only the Supabase publishable key is included. No service-role or secret key is stored in this package.

## Next steps

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Enable Anonymous Sign-Ins in Authentication → Sign In / Providers.
3. Run `migration/import_current_posts.sql`.
4. Confirm the import count is 146.
5. Upload the web files to the hosting location and test Month, Week, and Day views.
