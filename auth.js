(() => {
  "use strict";

  const supabase = window.puSupabase;
  const CONFIG = window.PU_PLANNER_CONFIG || {};
  const app = window.PUPlanner;
  const $ = id => document.getElementById(id);

  const els = {
    bootScreen: $("bootScreen"),
    authScreen: $("authScreen"),
    appScreen: $("appScreen"),
    setupNotice: $("setupNotice")
  };

  let starting = false;

  document.addEventListener("DOMContentLoaded", initializeSharedAccess);

  async function initializeSharedAccess() {
    updateVersionLabels();

    if (!supabase) {
      showSetupError(window.PU_SETUP_ERROR || "Supabase configuration is incomplete.");
      return;
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED"].includes(event) && session) {
        window.setTimeout(() => openPlanner(session), 0);
      }

      // Anonymous sessions cannot be recovered after an explicit sign-out.
      // Recreate a silent session so the shared planner stays zero-login.
      if (event === "SIGNED_OUT") {
        window.setTimeout(() => ensureAnonymousSession(), 0);
      }
    });

    try {
      await ensureAnonymousSession();
    } catch (error) {
      console.error("Shared planner startup failed:", error);
      showSetupError(readableError(error));
    }
  }

  async function ensureAnonymousSession() {
    if (starting) return;
    starting = true;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (sessionData.session) {
        await openPlanner(sessionData.session);
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            full_name: "PU Planner Staff",
            access_source: "zero_login_shared_workspace"
          }
        }
      });

      if (error) throw error;
      if (!data.session) throw new Error("Supabase did not return an anonymous session.");
      await openPlanner(data.session);
    } finally {
      starting = false;
    }
  }

  async function openPlanner(session) {
    if (!session?.user) return;
    els.authScreen?.classList.add("hidden");
    els.appScreen?.classList.remove("hidden");
    els.bootScreen?.classList.add("hidden");
    await app.start(session);
  }

  function showSetupError(message) {
    els.appScreen?.classList.add("hidden");
    els.authScreen?.classList.remove("hidden");
    if (els.setupNotice) {
      els.setupNotice.classList.remove("hidden");
      const paragraph = els.setupNotice.querySelector("p");
      if (paragraph) paragraph.textContent = message;
    }
    els.bootScreen?.classList.add("hidden");
  }

  function updateVersionLabels() {
    document.querySelectorAll("[data-app-version]").forEach(element => {
      element.textContent = CONFIG.VERSION || "2.0.1";
    });
  }

  function readableError(error) {
    const message = String(error?.message || error || "Unable to connect to the shared planner.");
    if (message.toLowerCase().includes("anonymous sign-ins are disabled")) {
      return "Anonymous Sign-Ins are disabled. Enable them in Supabase Authentication settings.";
    }
    if (message.toLowerCase().includes("rate limit")) {
      return "Supabase temporarily limited new anonymous sessions. Try again shortly.";
    }
    return message;
  }

  // Kept for compatibility with the existing app module. There is no visible
  // sign-out action in the zero-login shared edition.
  window.PUAuth = Object.freeze({
    signOut: async () => {
      await supabase.auth.signOut();
    }
  });
})();
