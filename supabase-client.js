(() => {
  "use strict";

  const config = window.PU_PLANNER_CONFIG || {};
  const looksConfigured = value => value && !String(value).includes("PASTE_YOUR_");

  if (!window.supabase?.createClient) {
    window.PU_SETUP_ERROR = "The Supabase browser library did not load.";
    window.puSupabase = null;
    return;
  }

  if (!looksConfigured(config.SUPABASE_URL) || !looksConfigured(config.SUPABASE_PUBLISHABLE_KEY)) {
    window.PU_SETUP_ERROR = "Add the Supabase project URL and publishable key in config.js.";
    window.puSupabase = null;
    return;
  }

  window.puSupabase = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
})();
