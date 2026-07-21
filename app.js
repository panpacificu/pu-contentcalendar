(() => {
  "use strict";

  const supabase = window.puSupabase;
  const CONFIG = window.PU_PLANNER_CONFIG || {};
  const STATUS_ORDER = ["idea", "created", "scheduled", "posted"];
  const STATUS_LABELS = { idea: "Idea", created: "Created", scheduled: "Scheduled", posted: "Posted" };
  const SLOT_GROUPS = CONFIG.TIME_SLOTS || {
    poster: ["09:00", "12:00", "15:00", "17:00"],
    video: ["10:30", "13:30", "16:30", "19:00"]
  };
  const ALL_SLOTS = [...new Set([...(SLOT_GROUPS.poster || []), ...(SLOT_GROUPS.video || [])])].sort();
  const STORAGE_KEYS = {
    view: "pu-planner-view-v2",
    channel: "pu-planner-channel-v2",
    hiddenWeeks: "pu-planner-hidden-weeks-v2"
  };

  const state = {
    session: null,
    user: null,
    profile: null,
    workspace: null,
    role: "viewer",
    channels: [],
    posts: [],
    activeChannelId: "all",
    currentDate: new Date(),
    viewMode: localStorage.getItem(STORAGE_KEYS.view) || CONFIG.DEFAULT_VIEW || "weekly",
    search: "",
    statusFilter: "all",
    categoryFilter: "all",
    loading: false,
    saving: false,
    started: false,
    draggedPostId: null,
    dragCopyMode: false,
    realtimeChannels: [],
    realtimeTimer: null,
    autoRefreshTimer: null,
    clockTimer: null,
    toastTimer: null,
    lastSuccessfulLoad: 0,
    reloadRequested: false
  };

  const $ = id => document.getElementById(id);
  const els = {
    appScreen: $("appScreen"),
    monthlyViewButton: $("monthlyViewButton"),
    weeklyViewButton: $("weeklyViewButton"),
    dailyViewButton: $("dailyViewButton"),
    accountButton: $("accountButton"),
    accountAvatar: $("accountAvatar"),
    accountName: $("accountName"),
    accountRole: $("accountRole"),
    viewEyebrow: $("viewEyebrow"),
    periodTitle: $("periodTitle"),
    activeChannelLabel: $("activeChannelLabel"),
    previousPeriodButton: $("previousPeriodButton"),
    todayButton: $("todayButton"),
    nextPeriodButton: $("nextPeriodButton"),
    plannerSearch: $("plannerSearch"),
    channelFilter: $("channelFilter"),
    statusFilter: $("statusFilter"),
    categoryFilter: $("categoryFilter"),
    manageChannelsButton: $("manageChannelsButton"),
    newPostButton: $("newPostButton"),
    emptyNewPostButton: $("emptyNewPostButton"),
    ideaCount: $("ideaCount"),
    createdCount: $("createdCount"),
    scheduledCount: $("scheduledCount"),
    postedCount: $("postedCount"),
    posterSlotChips: $("posterSlotChips"),
    videoSlotChips: $("videoSlotChips"),
    monthlyPanel: $("monthlyPanel"),
    weeklyPanel: $("weeklyPanel"),
    dailyPanel: $("dailyPanel"),
    monthlyGrid: $("monthlyGrid"),
    weeklyGrid: $("weeklyGrid"),
    dailyHeader: $("dailyHeader"),
    dailyGrid: $("dailyGrid"),
    plannerEmpty: $("plannerEmpty"),
    floatingTime: $("floatingTime"),
    floatingDate: $("floatingDate"),
    changelogButton: $("changelogButton"),
    refreshButton: $("refreshButton"),
    syncStatus: $("syncStatus"),
    toast: $("toast"),

    postModal: $("postModal"),
    closePostModal: $("closePostModal"),
    cancelPostButton: $("cancelPostButton"),
    postForm: $("postForm"),
    postModalTitle: $("postModalTitle"),
    postModalDateLabel: $("postModalDateLabel"),
    postId: $("postId"),
    postTitle: $("postTitle"),
    postChannel: $("postChannel"),
    postPlatform: $("postPlatform"),
    postContentType: $("postContentType"),
    postTime: $("postTime"),
    postDate: $("postDate"),
    postStatus: $("postStatus"),
    postCategory: $("postCategory"),
    postCaption: $("postCaption"),
    postNotes: $("postNotes"),
    deletePostButton: $("deletePostButton"),
    duplicatePostButton: $("duplicatePostButton"),
    savePostButton: $("savePostButton"),

    channelsModal: $("channelsModal"),
    closeChannelsModal: $("closeChannelsModal"),
    channelManagerList: $("channelManagerList"),
    channelForm: $("channelForm"),
    channelId: $("channelId"),
    channelName: $("channelName"),
    channelPlatform: $("channelPlatform"),
    channelColor: $("channelColor"),
    channelFormLabel: $("channelFormLabel"),
    channelFormTitle: $("channelFormTitle"),
    archiveChannelButton: $("archiveChannelButton"),
    resetChannelButton: $("resetChannelButton"),
    saveChannelButton: $("saveChannelButton"),

    accountModal: $("accountModal"),
    closeAccountModal: $("closeAccountModal"),
    profileForm: $("profileForm"),
    profileAvatar: $("profileAvatar"),
    profileEmail: $("profileEmail"),
    profileRole: $("profileRole"),
    profileName: $("profileName"),
    profileWorkspaceName: $("profileWorkspaceName"),
    viewerNotice: $("viewerNotice"),
    signOutButton: $("signOutButton"),
    saveProfileButton: $("saveProfileButton"),

    changelogModal: $("changelogModal"),
    closeChangelogModal: $("closeChangelogModal"),
    changelogContent: $("changelogContent")
  };

  let controlsReady = false;

  function setupControls() {
    if (controlsReady) return;
    controlsReady = true;

    els.monthlyViewButton.addEventListener("click", () => setViewMode("monthly"));
    els.weeklyViewButton.addEventListener("click", () => setViewMode("weekly"));
    els.dailyViewButton.addEventListener("click", () => setViewMode("daily"));
    els.previousPeriodButton.addEventListener("click", () => movePeriod(-1));
    els.nextPeriodButton.addEventListener("click", () => movePeriod(1));
    els.todayButton.addEventListener("click", () => {
      state.currentDate = new Date();
      loadPosts({ silent: true });
    });

    els.plannerSearch.addEventListener("input", event => {
      state.search = event.target.value.trim().toLowerCase();
      renderPlanner();
    });
    els.channelFilter.addEventListener("change", event => {
      state.activeChannelId = event.target.value;
      if (state.workspace) localStorage.setItem(`${STORAGE_KEYS.channel}:${state.workspace.id}`, state.activeChannelId);
      renderPlanner();
      updateActiveChannelLabel();
    });
    els.statusFilter.addEventListener("change", event => {
      state.statusFilter = event.target.value;
      renderPlanner();
    });
    els.categoryFilter.addEventListener("change", event => {
      state.categoryFilter = event.target.value;
      renderPlanner();
    });

    els.manageChannelsButton.addEventListener("click", openChannelsModal);
    els.newPostButton.addEventListener("click", () => openPostModal(dateToISO(state.currentDate)));
    els.emptyNewPostButton.addEventListener("click", () => openPostModal(dateToISO(state.currentDate)));
    els.accountButton.addEventListener("click", openAccountModal);
    els.refreshButton.addEventListener("click", () => refreshAll({ announce: true }));
    els.changelogButton.addEventListener("click", () => openModal(els.changelogModal));
    els.closeChangelogModal.addEventListener("click", () => closeModal(els.changelogModal));

    els.closePostModal.addEventListener("click", () => closeModal(els.postModal));
    els.cancelPostButton.addEventListener("click", () => closeModal(els.postModal));
    els.postForm.addEventListener("submit", savePost);
    els.deletePostButton.addEventListener("click", deletePost);
    els.duplicatePostButton.addEventListener("click", prepareDuplicateFromModal);
    els.postContentType.addEventListener("change", () => populateTimeOptions(els.postContentType.value));
    els.postChannel.addEventListener("change", () => {
      if (els.postId.value) return;
      const channel = state.channels.find(item => item.id === els.postChannel.value);
      if (channel?.platform) els.postPlatform.value = channel.platform;
    });

    els.closeChannelsModal.addEventListener("click", () => closeModal(els.channelsModal));
    els.channelForm.addEventListener("submit", saveChannel);
    els.archiveChannelButton.addEventListener("click", archiveChannel);
    els.resetChannelButton.addEventListener("click", resetChannelForm);

    els.closeAccountModal.addEventListener("click", () => closeModal(els.accountModal));
    els.profileForm.addEventListener("submit", saveProfile);
    els.signOutButton.addEventListener("click", () => window.PUAuth?.signOut());

    [els.postModal, els.channelsModal, els.accountModal, els.changelogModal].forEach(modal => {
      modal.addEventListener("click", event => {
        if (event.target === modal && !state.saving) closeModal(modal);
      });
    });

    document.addEventListener("keydown", handleKeyboardShortcuts);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  async function start(session) {
    if (!session?.user || !supabase) return;
    setupControls();
    if (state.started && state.user?.id === session.user.id) return;

    await stop({ preserveScreen: true });
    state.session = session;
    state.user = session.user;
    state.started = true;
    els.appScreen.classList.remove("hidden");
    updateVersionLabels();
    renderSlotGuide();
    renderChangelog();
    startClock();

    try {
      setSyncStatus("Loading workspace…");
      await loadAccountContext();
      await loadPosts({ silent: true });
      subscribeToRealtime();
      startAutoRefresh();
      setSyncStatus("Synced just now");
    } catch (error) {
      console.error("Planner startup failed:", error);
      showToast(readableError(error), "error");
      setSyncStatus("Sync needs attention");
    }
  }

  async function stop({ preserveScreen = false } = {}) {
    clearInterval(state.autoRefreshTimer);
    clearInterval(state.clockTimer);
    clearTimeout(state.realtimeTimer);
    state.autoRefreshTimer = null;
    state.clockTimer = null;
    state.realtimeTimer = null;

    if (supabase) {
      for (const channel of state.realtimeChannels) {
        try { await supabase.removeChannel(channel); } catch (error) { console.warn(error); }
      }
    }

    state.realtimeChannels = [];
    state.started = false;
    state.session = null;
    state.user = null;
    state.profile = null;
    state.workspace = null;
    state.channels = [];
    state.posts = [];
    state.activeChannelId = "all";
    if (!preserveScreen) els.appScreen.classList.add("hidden");
  }

  async function loadAccountContext() {
    const userId = state.user.id;

    let profileResult = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, is_active, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (profileResult.error) throw profileResult.error;

    if (!profileResult.data) {
      await wait(500);
      profileResult = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_active, created_at, updated_at")
        .eq("id", userId)
        .single();
      if (profileResult.error) throw profileResult.error;
    }
    if (profileResult.data?.is_active === false) throw new Error("This planner account has been deactivated.");
    state.profile = profileResult.data;

    const membershipResult = await supabase
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membershipResult.error) throw membershipResult.error;
    if (!membershipResult.data) throw new Error("No Panpacific University planner workspace was assigned to this account.");

    state.role = membershipResult.data.role || "viewer";
    const workspaceResult = await supabase
      .from("workspaces")
      .select("id, name, slug, created_at, updated_at")
      .eq("id", membershipResult.data.workspace_id)
      .single();
    if (workspaceResult.error) throw workspaceResult.error;
    state.workspace = workspaceResult.data;

    await loadChannels();
    restoreActiveChannel();
    renderIdentity();
    renderChannelControls();
    applyRoleAccess();
  }

  async function loadChannels() {
    const result = await supabase
      .from("channels")
      .select("id, workspace_id, name, platform, color, is_archived, created_at, updated_at")
      .eq("workspace_id", state.workspace.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    state.channels = result.data || [];
  }

  function restoreActiveChannel() {
    const saved = localStorage.getItem(`${STORAGE_KEYS.channel}:${state.workspace.id}`) || "all";
    state.activeChannelId = saved === "all" || state.channels.some(channel => channel.id === saved) ? saved : "all";
  }

  function renderIdentity() {
    const name = state.profile?.full_name || state.user?.user_metadata?.full_name || state.user?.email?.split("@")[0] || "Planner User";
    const email = state.user?.email || "";
    const role = capitalize(state.role);
    const initial = name.trim().charAt(0).toUpperCase() || "U";

    els.accountAvatar.textContent = initial;
    els.accountName.textContent = name;
    els.accountRole.textContent = role;
    els.profileAvatar.textContent = initial;
    els.profileEmail.textContent = email;
    els.profileRole.textContent = `${role} access`;
    els.profileName.value = name;
    els.profileWorkspaceName.value = state.workspace?.name || "Panpacific University";
    els.viewerNotice.classList.toggle("hidden", state.role !== "viewer");
    els.profileWorkspaceName.disabled = !isAdmin();
  }

  function applyRoleAccess() {
    const editable = canEdit();
    els.newPostButton.classList.toggle("hidden", !editable);
    els.emptyNewPostButton.classList.toggle("hidden", !editable);
    els.manageChannelsButton.classList.toggle("hidden", !editable);
  }

  function renderChannelControls() {
    const filterFragment = document.createDocumentFragment();
    const allOption = new Option("All channels", "all");
    filterFragment.appendChild(allOption);
    state.channels.forEach(channel => filterFragment.appendChild(new Option(`${channel.name} · ${channel.platform || "General"}`, channel.id)));
    els.channelFilter.replaceChildren(filterFragment);
    els.channelFilter.value = state.activeChannelId;

    const postFragment = document.createDocumentFragment();
    state.channels.forEach(channel => postFragment.appendChild(new Option(`${channel.name} · ${channel.platform || "General"}`, channel.id)));
    els.postChannel.replaceChildren(postFragment);
    updateActiveChannelLabel();
    renderChannelManagerList();
  }

  function updateActiveChannelLabel() {
    if (state.activeChannelId === "all") {
      els.activeChannelLabel.textContent = `All publication channels · ${state.channels.length} active`;
      return;
    }
    const channel = state.channels.find(item => item.id === state.activeChannelId);
    els.activeChannelLabel.textContent = channel ? `${channel.name} · ${channel.platform || "General"}` : "All publication channels";
  }

  async function loadPosts({ silent = false } = {}) {
    if (!state.workspace) return;
    if (state.loading) {
      state.reloadRequested = true;
      return;
    }
    state.loading = true;
    document.body.classList.add("is-loading");
    els.refreshButton.classList.add("spinning");
    if (!silent) setSyncStatus("Refreshing…");

    const { start, end } = getVisibleDateRange();
    try {
      const result = await supabase
        .from("posts")
        .select("id, workspace_id, channel_id, created_by, updated_by, legacy_id, title, content_type, post_date, post_time, category, status, platform, caption, notes, request_token, created_at, updated_at")
        .eq("workspace_id", state.workspace.id)
        .gte("post_date", dateToISO(start))
        .lte("post_date", dateToISO(end))
        .order("post_date", { ascending: true })
        .order("post_time", { ascending: true, nullsFirst: false });
      if (result.error) throw result.error;
      state.posts = result.data || [];
      state.lastSuccessfulLoad = Date.now();
      renderPlanner();
      setSyncStatus(`Synced ${formatTimeOnly(new Date())}`);
    } catch (error) {
      setSyncStatus("Sync failed");
      if (!silent) showToast(readableError(error), "error");
      throw error;
    } finally {
      state.loading = false;
      document.body.classList.remove("is-loading");
      els.refreshButton.classList.remove("spinning");
      if (state.reloadRequested) {
        state.reloadRequested = false;
        window.setTimeout(() => loadPosts({ silent: true }), 0);
      }
    }
  }

  async function refreshAll({ announce = false } = {}) {
    if (state.loading || state.saving || isEditing()) return;
    try {
      await loadChannels();
      if (state.activeChannelId !== "all" && !state.channels.some(channel => channel.id === state.activeChannelId)) {
        state.activeChannelId = "all";
      }
      renderChannelControls();
      await loadPosts({ silent: !announce });
      if (announce) showToast("Planner refreshed.", "success");
    } catch (error) {
      console.error(error);
    }
  }

  function getVisibleDateRange() {
    if (state.viewMode === "daily") {
      const date = startOfDay(state.currentDate);
      return { start: date, end: date };
    }
    if (state.viewMode === "weekly") {
      const start = startOfWeek(state.currentDate);
      return { start, end: addDays(start, 6) };
    }
    const first = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
    const start = startOfWeek(first);
    return { start, end: addDays(start, 41) };
  }

  function setViewMode(mode) {
    if (!["monthly", "weekly", "daily"].includes(mode) || state.viewMode === mode) return;
    state.viewMode = mode;
    localStorage.setItem(STORAGE_KEYS.view, mode);
    loadPosts({ silent: true });
  }

  function movePeriod(direction) {
    const date = new Date(state.currentDate);
    if (state.viewMode === "monthly") date.setMonth(date.getMonth() + direction, 1);
    else if (state.viewMode === "weekly") date.setDate(date.getDate() + direction * 7);
    else date.setDate(date.getDate() + direction);
    state.currentDate = date;
    loadPosts({ silent: true });
  }

  function renderPlanner() {
    if (!state.workspace) return;
    updateViewButtons();
    updateHeading();
    updateStats();

    els.monthlyPanel.classList.toggle("hidden", state.viewMode !== "monthly");
    els.weeklyPanel.classList.toggle("hidden", state.viewMode !== "weekly");
    els.dailyPanel.classList.toggle("hidden", state.viewMode !== "daily");

    if (state.viewMode === "monthly") renderMonthlyView();
    else if (state.viewMode === "weekly") renderWeeklyView();
    else renderDailyView();
  }

  function updateViewButtons() {
    els.monthlyViewButton.classList.toggle("is-active", state.viewMode === "monthly");
    els.weeklyViewButton.classList.toggle("is-active", state.viewMode === "weekly");
    els.dailyViewButton.classList.toggle("is-active", state.viewMode === "daily");
  }

  function updateHeading() {
    if (state.viewMode === "monthly") {
      els.viewEyebrow.textContent = "Monthly Calendar";
      els.periodTitle.textContent = state.currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else if (state.viewMode === "weekly") {
      const start = startOfWeek(state.currentDate);
      els.viewEyebrow.textContent = "Weekly Calendar";
      els.periodTitle.textContent = formatWeekRange(start, addDays(start, 6));
    } else {
      els.viewEyebrow.textContent = "Daily Calendar";
      els.periodTitle.textContent = state.currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
  }

  function getFilteredPosts({ includeStatusAndSearch = true } = {}) {
    return state.posts.filter(post => {
      if (state.activeChannelId !== "all" && post.channel_id !== state.activeChannelId) return false;
      if (state.categoryFilter !== "all" && post.category !== state.categoryFilter) return false;
      if (!includeStatusAndSearch) return true;
      if (state.statusFilter !== "all" && post.status !== state.statusFilter) return false;
      if (state.search) {
        const haystack = [post.title, post.caption, post.notes, post.platform, post.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(state.search)) return false;
      }
      return true;
    });
  }

  function updateStats() {
    const scoped = getFilteredPosts({ includeStatusAndSearch: false });
    els.ideaCount.textContent = scoped.filter(post => post.status === "idea").length;
    els.createdCount.textContent = scoped.filter(post => post.status === "created").length;
    els.scheduledCount.textContent = scoped.filter(post => post.status === "scheduled").length;
    els.postedCount.textContent = scoped.filter(post => post.status === "posted").length;
  }

  function renderMonthlyView() {
    const visible = getFilteredPosts();
    const grouped = groupPostsByDate(visible);
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = startOfWeek(first);
    const hiddenWeeks = getHiddenWeeks(year, month);
    const fragment = document.createDocumentFragment();

    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
      const wrapper = document.createElement("section");
      wrapper.className = `calendar-week${hiddenWeeks.has(weekIndex) ? " collapsed" : ""}`;
      const grid = document.createElement("div");
      grid.className = "calendar-week-grid";
      const weekDates = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = addDays(gridStart, weekIndex * 7 + dayIndex);
        weekDates.push(date);
        grid.appendChild(createMonthDayCell(date, grouped.get(dateToISO(date)) || [], month));
      }

      const hideButton = document.createElement("button");
      hideButton.type = "button";
      hideButton.className = "week-hide-button";
      hideButton.textContent = "Hide week";
      hideButton.addEventListener("click", event => {
        event.stopPropagation();
        setWeekHidden(year, month, weekIndex, true);
        renderMonthlyView();
      });

      const collapsedBar = document.createElement("div");
      collapsedBar.className = "collapsed-week-bar";
      const label = document.createElement("span");
      label.textContent = formatWeekRange(weekDates[0], weekDates[6]);
      const showButton = document.createElement("button");
      showButton.type = "button";
      showButton.className = "show-week-button";
      showButton.textContent = "Show week";
      showButton.addEventListener("click", () => {
        setWeekHidden(year, month, weekIndex, false);
        renderMonthlyView();
      });
      collapsedBar.append(label, showButton);
      wrapper.append(grid, hideButton, collapsedBar);
      fragment.appendChild(wrapper);
    }

    els.monthlyGrid.replaceChildren(fragment);
    toggleEmptyState(visible.length === 0);
  }

  function createMonthDayCell(date, dayPosts, activeMonth) {
    const dateString = dateToISO(date);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (date.getMonth() !== activeMonth) cell.classList.add("muted");
    if (isSameDate(date, new Date())) cell.classList.add("today");

    const head = document.createElement("div");
    head.className = "day-head";
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(date.getDate());
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "day-add";
    addButton.textContent = "+ Add";
    addButton.classList.toggle("hidden", !canEdit());
    addButton.addEventListener("click", event => {
      event.stopPropagation();
      openPostModal(dateString);
    });
    head.append(number, addButton);

    const list = document.createElement("div");
    list.className = "post-list";
    dayPosts.sort(comparePostsByTime).forEach(post => list.appendChild(createPostCard(post)));
    cell.append(head, list);
    if (canEdit()) cell.addEventListener("dblclick", () => openPostModal(dateString));
    enableDropTarget(cell, dateString, null);
    return cell;
  }

  function renderWeeklyView() {
    const visible = getFilteredPosts();
    const start = startOfWeek(state.currentDate);
    const slots = getVisibleSlots(visible);
    const fragment = document.createDocumentFragment();

    const corner = document.createElement("div");
    corner.className = "weekly-corner";
    corner.innerHTML = "<strong>Publication slots</strong><small>Manila time</small>";
    fragment.appendChild(corner);

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = addDays(start, dayIndex);
      const head = document.createElement("div");
      head.className = `weekly-day-head${isSameDate(date, new Date()) ? " is-today" : ""}`;
      head.innerHTML = `<span>${date.toLocaleDateString("en-US", { weekday: "short" })}</span><strong>${date.getDate()}</strong><small>${date.toLocaleDateString("en-US", { month: "short" })}</small>`;
      fragment.appendChild(head);
    }

    slots.forEach(time => {
      const type = getSlotType(time, visible);
      const label = document.createElement("div");
      label.className = "weekly-slot-label";
      label.innerHTML = `<span class="type-icon ${type === "video" ? "video-icon" : "poster-icon"}">${type === "video" ? "▶" : "▧"}</span><div><strong>${formatDisplayTime(time)}</strong><small>${type === "video" ? "Video / Short-form" : "Poster / Photo"}</small></div>`;
      fragment.appendChild(label);

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = addDays(start, dayIndex);
        const dateString = dateToISO(date);
        const cellPosts = visible.filter(post => post.post_date === dateString && normalizeTime(post.post_time) === time);
        const cell = document.createElement("div");
        cell.className = `weekly-slot-cell ${type}`;
        const list = document.createElement("div");
        list.className = "post-list";
        cellPosts.sort(comparePostsByTime).forEach(post => list.appendChild(createPostCard(post)));
        cell.appendChild(list);
        if (cellPosts.length) {
          const count = document.createElement("span");
          count.className = "occupancy-badge";
          count.textContent = `${cellPosts.length} item${cellPosts.length === 1 ? "" : "s"}`;
          cell.appendChild(count);
        }
        if (canEdit()) cell.addEventListener("click", event => {
          if (event.target === cell || event.target === list) openPostModal(dateString, null, time, type);
        });
        enableDropTarget(cell, dateString, time);
        fragment.appendChild(cell);
      }
    });

    els.weeklyGrid.replaceChildren(fragment);
    toggleEmptyState(visible.length === 0);
  }

  function renderDailyView() {
    const dateString = dateToISO(state.currentDate);
    const visible = getFilteredPosts().filter(post => post.post_date === dateString);
    const slots = getVisibleSlots(visible);
    const counts = {
      poster: visible.filter(post => post.content_type === "poster").length,
      video: visible.filter(post => post.content_type === "video").length
    };

    els.dailyHeader.innerHTML = `
      <div class="daily-header-day">
        <span>${state.currentDate.toLocaleDateString("en-US", { weekday: "long" })}</span>
        <strong>${state.currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</strong>
        <small>${state.currentDate.getFullYear()} · ${visible.length} planned item${visible.length === 1 ? "" : "s"}</small>
      </div>
      <div class="daily-summary"><span>▧ ${counts.poster} poster/photo</span><span>▶ ${counts.video} video/short-form</span></div>`;

    const fragment = document.createDocumentFragment();
    slots.forEach(time => {
      const type = getSlotType(time, visible);
      const row = document.createElement("section");
      row.className = "daily-slot-row";
      const label = document.createElement("div");
      label.className = "daily-slot-label";
      label.innerHTML = `<span class="type-icon ${type === "video" ? "video-icon" : "poster-icon"}">${type === "video" ? "▶" : "▧"}</span><div><strong>${formatDisplayTime(time)}</strong><small>${type === "video" ? "Video / Short-form" : "Poster / Photo"}</small></div>`;

      const content = document.createElement("div");
      content.className = `daily-slot-content ${type}`;
      const slotPosts = visible.filter(post => normalizeTime(post.post_time) === time).sort(comparePostsByTime);
      if (slotPosts.length) slotPosts.forEach(post => content.appendChild(createPostCard(post)));
      else {
        const empty = document.createElement("div");
        empty.className = "daily-slot-empty";
        empty.textContent = canEdit() ? "Click to add content to this slot" : "No content in this slot";
        content.appendChild(empty);
      }
      if (canEdit()) content.addEventListener("click", event => {
        if (!event.target.closest(".post-card")) openPostModal(dateString, null, time, type);
      });
      enableDropTarget(content, dateString, time);
      row.append(label, content);
      fragment.appendChild(row);
    });

    els.dailyGrid.replaceChildren(fragment);
    toggleEmptyState(visible.length === 0);
  }

  function createPostCard(post) {
    const channel = state.channels.find(item => item.id === post.channel_id);
    const card = document.createElement("article");
    card.className = `post-card ${categoryClass(post.category)}${canEdit() ? "" : " viewer-card"}`;
    card.dataset.postId = post.id;
    card.style.setProperty("--channel-color", sanitizeColor(channel?.color));
    card.draggable = canEdit();

    const top = document.createElement("div");
    top.className = "post-card-top";
    const type = post.content_type === "video" ? "video" : "poster";
    const mark = document.createElement("span");
    mark.className = "content-type-mark";
    mark.textContent = type === "video" ? "▶" : "▧";
    const time = document.createElement("span");
    time.className = "post-time";
    time.textContent = formatDisplayTime(post.post_time);
    const platform = document.createElement("span");
    platform.className = "platform-chip";
    platform.textContent = post.platform || channel?.platform || "General";
    top.append(mark, time, platform);

    const title = document.createElement("h4");
    title.textContent = post.title || "Untitled post";

    const bottom = document.createElement("div");
    bottom.className = "post-card-bottom";
    const status = document.createElement("span");
    status.className = `status-pill ${post.status}`;
    status.textContent = STATUS_LABELS[post.status] || capitalize(post.status);
    const category = document.createElement("span");
    category.className = "category-label";
    category.textContent = `${post.category || "OSC Post"}${channel ? ` · ${channel.name}` : ""}`;
    bottom.append(status, category);
    card.append(top, title, bottom);

    if (canEdit()) {
      const quick = document.createElement("button");
      quick.type = "button";
      quick.className = "quick-status";
      const next = nextStatus(post.status);
      quick.textContent = statusIcon(post.status);
      quick.title = `Move to ${STATUS_LABELS[next]}`;
      quick.setAttribute("aria-label", quick.title);
      quick.addEventListener("click", async event => {
        event.stopPropagation();
        await quickUpdateStatus(post, quick);
      });
      card.appendChild(quick);
    }

    card.addEventListener("click", event => {
      event.stopPropagation();
      openPostModal(post.post_date, post);
    });

    if (canEdit()) {
      card.addEventListener("dragstart", event => {
        state.draggedPostId = post.id;
        state.dragCopyMode = Boolean(event.shiftKey);
        card.classList.add("dragging");
        card.classList.toggle("copying", state.dragCopyMode);
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.setData("text/plain", post.id);
        event.dataTransfer.setData("application/x-pu-planner-action", state.dragCopyMode ? "copy" : "move");
      });
      card.addEventListener("dragend", () => {
        state.draggedPostId = null;
        state.dragCopyMode = false;
        card.classList.remove("dragging", "copying");
        document.querySelectorAll(".drag-over, .copy-over").forEach(element => {
          element.classList.remove("drag-over", "copy-over");
        });
      });
    }
    return card;
  }

  function enableDropTarget(element, dateString, time) {
    if (!canEdit()) return;
    element.addEventListener("dragover", event => {
      if (!state.draggedPostId) return;
      event.preventDefault();
      state.dragCopyMode = Boolean(event.shiftKey);
      event.dataTransfer.dropEffect = state.dragCopyMode ? "copy" : "move";
      element.classList.toggle("copy-over", state.dragCopyMode);
      element.classList.toggle("drag-over", !state.dragCopyMode);
    });
    element.addEventListener("dragleave", event => {
      if (!element.contains(event.relatedTarget)) {
        element.classList.remove("drag-over", "copy-over");
      }
    });
    element.addEventListener("drop", async event => {
      event.preventDefault();
      event.stopPropagation();
      const shouldCopy = Boolean(event.shiftKey || state.dragCopyMode);
      element.classList.remove("drag-over", "copy-over");
      const id = event.dataTransfer.getData("text/plain") || state.draggedPostId;
      if (!id) return;
      if (shouldCopy) await duplicatePost(id, dateString, time);
      else await movePost(id, dateString, time);
    });
  }

  async function duplicatePost(postId, newDate, newTime = null) {
    const source = state.posts.find(item => item.id === postId);
    if (!source || state.saving || !canEdit()) return;

    const normalizedTime = newTime ? normalizeTime(newTime) : normalizeTime(source.post_time);
    const copiedType = newTime
      ? (getContentTypeFromTime(normalizedTime) || source.content_type)
      : source.content_type;

    const payload = {
      workspace_id: state.workspace.id,
      channel_id: source.channel_id,
      created_by: state.user.id,
      updated_by: state.user.id,
      title: source.title,
      content_type: copiedType,
      post_date: newDate,
      post_time: normalizedTime,
      category: source.category,
      status: source.status,
      platform: source.platform,
      caption: source.caption,
      notes: source.notes,
      request_token: crypto.randomUUID ? crypto.randomUUID() : fallbackUUID()
    };

    state.saving = true;
    try {
      const result = await supabase
        .from("posts")
        .insert(payload)
        .select("id")
        .single();
      if (result.error) throw result.error;
      await loadPosts({ silent: true });
      showToast(`Post copied to ${formatLongDate(newDate)} at ${formatDisplayTime(normalizedTime)}.`, "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      state.saving = false;
      state.dragCopyMode = false;
    }
  }

  async function movePost(postId, newDate, newTime = null) {
    const post = state.posts.find(item => item.id === postId);
    if (!post || state.saving) return;
    const normalizedTime = newTime ? normalizeTime(newTime) : normalizeTime(post.post_time);
    if (post.post_date === newDate && normalizeTime(post.post_time) === normalizedTime) return;

    const snapshot = { post_date: post.post_date, post_time: post.post_time, content_type: post.content_type };
    post.post_date = newDate;
    if (newTime) {
      post.post_time = normalizedTime;
      post.content_type = getContentTypeFromTime(normalizedTime) || post.content_type;
    }
    renderPlanner();

    try {
      const payload = {
        post_date: post.post_date,
        post_time: normalizeTime(post.post_time),
        content_type: post.content_type,
        updated_by: state.user.id
      };
      const result = await supabase.from("posts").update(payload).eq("id", post.id).eq("workspace_id", state.workspace.id).select("id").single();
      if (result.error) throw result.error;
      showToast("Post rescheduled.", "success");
    } catch (error) {
      Object.assign(post, snapshot);
      renderPlanner();
      showToast(readableError(error), "error");
    }
  }

  async function quickUpdateStatus(post, button) {
    if (state.saving || !canEdit()) return;
    const previous = post.status;
    const next = nextStatus(previous);
    post.status = next;
    button.disabled = true;
    renderPlanner();
    try {
      const result = await supabase.from("posts").update({ status: next, updated_by: state.user.id }).eq("id", post.id).eq("workspace_id", state.workspace.id).select("id").single();
      if (result.error) throw result.error;
      showToast(`Status updated to ${STATUS_LABELS[next]}.`, "success");
    } catch (error) {
      post.status = previous;
      renderPlanner();
      showToast(readableError(error), "error");
    } finally {
      button.disabled = false;
    }
  }

  function openPostModal(dateString, post = null, presetTime = "", presetType = "") {
    if (!post && !canEdit()) return;
    if (!state.channels.length) {
      showToast("Create a publication channel before adding content.", "error");
      if (canEdit()) openChannelsModal();
      return;
    }

    const editing = Boolean(post);
    const contentType = post?.content_type || presetType || getContentTypeFromTime(presetTime) || "poster";
    const selectedTime = normalizeTime(post?.post_time || presetTime || SLOT_GROUPS[contentType]?.[0] || "09:00");
    els.postForm.reset();
    els.postId.value = post?.id || "";
    els.postTitle.value = post?.title || "";
    els.postChannel.value = post?.channel_id || (state.activeChannelId !== "all" ? state.activeChannelId : state.channels[0].id);
    els.postPlatform.value = post?.platform || state.channels.find(channel => channel.id === els.postChannel.value)?.platform || "Facebook";
    els.postContentType.value = contentType;
    populateTimeOptions(contentType, selectedTime);
    els.postDate.value = post?.post_date || dateString || dateToISO(state.currentDate);
    els.postStatus.value = post?.status || "idea";
    els.postCategory.value = post?.category || "OSC Post";
    els.postCaption.value = post?.caption || "";
    els.postNotes.value = post?.notes || "";
    els.postModalTitle.textContent = editing ? "Edit post" : "Create post";
    els.savePostButton.textContent = "Save post";
    els.postModalDateLabel.textContent = formatLongDate(els.postDate.value);
    els.deletePostButton.classList.toggle("hidden", !editing || !canEdit());
    els.duplicatePostButton.classList.toggle("hidden", !editing || !canEdit());
    els.savePostButton.classList.toggle("hidden", !canEdit());
    els.cancelPostButton.textContent = canEdit() ? "Cancel" : "Close";

    [...els.postForm.elements].forEach(control => {
      if (control === els.cancelPostButton || control === els.closePostModal) return;
      if (control === els.deletePostButton || control === els.duplicatePostButton || control === els.savePostButton) return;
      control.disabled = !canEdit();
    });
    openModal(els.postModal);
    requestAnimationFrame(() => els.postTitle.focus());
  }

  function prepareDuplicateFromModal() {
    if (!els.postId.value || state.saving || !canEdit()) return;
    els.postId.value = "";
    els.postModalTitle.textContent = "Duplicate post";
    els.deletePostButton.classList.add("hidden");
    els.duplicatePostButton.classList.add("hidden");
    els.savePostButton.textContent = "Create copy";
    showToast("Choose the new date or time, then save the copy.", "success");
    requestAnimationFrame(() => els.postDate.focus());
  }

  function populateTimeOptions(type, selected = "") {
    const options = [...(SLOT_GROUPS[type] || [])];
    const normalized = normalizeTime(selected);
    if (normalized && !options.includes(normalized)) options.push(normalized);
    options.sort();
    els.postTime.replaceChildren(...options.map(time => new Option(`${formatDisplayTime(time)}${ALL_SLOTS.includes(time) ? "" : " · Legacy/custom"}`, time)));
    els.postTime.value = normalized || options[0] || "";
  }

  async function savePost(event) {
    event.preventDefault();
    if (state.saving || !canEdit()) return;
    const title = els.postTitle.value.trim();
    if (!title) return;

    const id = els.postId.value;
    const payload = {
      workspace_id: state.workspace.id,
      channel_id: els.postChannel.value,
      title,
      content_type: els.postContentType.value,
      post_date: els.postDate.value,
      post_time: normalizeTime(els.postTime.value),
      category: els.postCategory.value,
      status: els.postStatus.value,
      platform: els.postPlatform.value,
      caption: els.postCaption.value.trim() || null,
      notes: els.postNotes.value.trim() || null,
      updated_by: state.user.id
    };

    state.saving = true;
    setButtonBusy(els.savePostButton, true, id ? "Updating…" : "Saving…");
    try {
      let result;
      if (id) {
        result = await supabase.from("posts").update(payload).eq("id", id).eq("workspace_id", state.workspace.id).select("id").single();
      } else {
        result = await supabase.from("posts").insert({
          ...payload,
          created_by: state.user.id,
          request_token: crypto.randomUUID ? crypto.randomUUID() : fallbackUUID()
        }).select("id").single();
      }
      if (result.error) throw result.error;
      closeModal(els.postModal);
      await loadPosts({ silent: true });
      showToast(id ? "Post updated." : "Post added.", "success");
    } catch (error) {
      if (error?.code === "23505") {
        closeModal(els.postModal);
        await loadPosts({ silent: true });
        showToast("Duplicate save prevented. The planner was refreshed.", "success");
      } else {
        showToast(readableError(error), "error");
      }
    } finally {
      state.saving = false;
      setButtonBusy(els.savePostButton, false, "Save post");
    }
  }

  async function deletePost() {
    const id = els.postId.value;
    if (!id || state.saving || !canEdit() || !confirm("Delete this content item?")) return;
    state.saving = true;
    els.deletePostButton.disabled = true;
    try {
      const result = await supabase.from("posts").delete().eq("id", id).eq("workspace_id", state.workspace.id);
      if (result.error) throw result.error;
      closeModal(els.postModal);
      await loadPosts({ silent: true });
      showToast("Post deleted.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      state.saving = false;
      els.deletePostButton.disabled = false;
    }
  }

  function openChannelsModal() {
    if (!canEdit()) return;
    resetChannelForm();
    renderChannelManagerList();
    openModal(els.channelsModal);
  }

  function renderChannelManagerList() {
    const fragment = document.createDocumentFragment();
    state.channels.forEach(channel => {
      const item = document.createElement("div");
      item.className = "channel-manager-item";
      item.style.setProperty("--channel-color", sanitizeColor(channel.color));
      item.innerHTML = `<span class="channel-dot"></span><div><strong>${escapeHtml(channel.name)}</strong><small>${escapeHtml(channel.platform || "General")}</small></div>`;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "channel-edit-btn";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editChannel(channel));
      item.appendChild(edit);
      fragment.appendChild(item);
    });
    if (!state.channels.length) {
      const empty = document.createElement("p");
      empty.className = "field-hint";
      empty.textContent = "No active publication channels.";
      fragment.appendChild(empty);
    }
    els.channelManagerList.replaceChildren(fragment);
  }

  function editChannel(channel) {
    els.channelId.value = channel.id;
    els.channelName.value = channel.name;
    els.channelPlatform.value = channel.platform || "General";
    els.channelColor.value = sanitizeColor(channel.color);
    els.channelFormLabel.textContent = "Edit channel";
    els.channelFormTitle.textContent = channel.name;
    els.archiveChannelButton.classList.remove("hidden");
  }

  function resetChannelForm() {
    els.channelForm.reset();
    els.channelId.value = "";
    els.channelColor.value = "#0057b8";
    els.channelFormLabel.textContent = "Add channel";
    els.channelFormTitle.textContent = "New publication channel";
    els.archiveChannelButton.classList.add("hidden");
  }

  async function saveChannel(event) {
    event.preventDefault();
    if (state.saving || !canEdit()) return;
    const id = els.channelId.value;
    const payload = {
      workspace_id: state.workspace.id,
      name: els.channelName.value.trim(),
      platform: els.channelPlatform.value,
      color: sanitizeColor(els.channelColor.value)
    };
    if (!payload.name) return;

    state.saving = true;
    setButtonBusy(els.saveChannelButton, true, "Saving…");
    try {
      const result = id
        ? await supabase.from("channels").update(payload).eq("id", id).eq("workspace_id", state.workspace.id).select("id").single()
        : await supabase.from("channels").insert(payload).select("id").single();
      if (result.error) throw result.error;
      await loadChannels();
      renderChannelControls();
      resetChannelForm();
      showToast(id ? "Channel updated." : "Channel added.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      state.saving = false;
      setButtonBusy(els.saveChannelButton, false, "Save channel");
    }
  }

  async function archiveChannel() {
    const id = els.channelId.value;
    if (!id || !canEdit() || state.channels.length <= 1) {
      showToast("Keep at least one active publication channel.", "error");
      return;
    }
    if (!confirm("Archive this publication channel?")) return;
    state.saving = true;
    try {
      const countResult = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", state.workspace.id)
        .eq("channel_id", id);
      if (countResult.error) throw countResult.error;
      if ((countResult.count || 0) > 0) {
        throw new Error("Move this channel's existing posts to another channel before archiving it.");
      }
      const result = await supabase.from("channels").update({ is_archived: true }).eq("id", id).eq("workspace_id", state.workspace.id);
      if (result.error) throw result.error;
      await loadChannels();
      if (!state.channels.some(channel => channel.id === state.activeChannelId)) state.activeChannelId = "all";
      renderChannelControls();
      resetChannelForm();
      await loadPosts({ silent: true });
      showToast("Channel archived.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      state.saving = false;
    }
  }

  function openAccountModal() {
    renderIdentity();
    openModal(els.accountModal);
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (state.saving) return;
    state.saving = true;
    setButtonBusy(els.saveProfileButton, true, "Saving…");
    try {
      const profileResult = await supabase.from("profiles").update({ full_name: els.profileName.value.trim() }).eq("id", state.user.id).select("id, full_name, avatar_url, is_active, created_at, updated_at").single();
      if (profileResult.error) throw profileResult.error;
      state.profile = profileResult.data;

      if (isAdmin()) {
        const workspaceName = els.profileWorkspaceName.value.trim();
        if (workspaceName && workspaceName !== state.workspace.name) {
          const workspaceResult = await supabase.from("workspaces").update({ name: workspaceName }).eq("id", state.workspace.id).select("id, name, slug, created_at, updated_at").single();
          if (workspaceResult.error) throw workspaceResult.error;
          state.workspace = workspaceResult.data;
        }
      }
      renderIdentity();
      closeModal(els.accountModal);
      showToast("Account settings saved.", "success");
    } catch (error) {
      showToast(readableError(error), "error");
    } finally {
      state.saving = false;
      setButtonBusy(els.saveProfileButton, false, "Save changes");
    }
  }

  function subscribeToRealtime() {
    if (!supabase || !state.workspace) return;
    const workspaceId = state.workspace.id;
    const channel = supabase
      .channel(`pu-planner-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `workspace_id=eq.${workspaceId}` }, scheduleRealtimeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `workspace_id=eq.${workspaceId}` }, scheduleRealtimeRefresh)
      .subscribe(status => {
        if (status === "SUBSCRIBED") setSyncStatus("Realtime connected");
        if (["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) setSyncStatus("Realtime fallback active");
      });
    state.realtimeChannels.push(channel);
  }

  function scheduleRealtimeRefresh() {
    clearTimeout(state.realtimeTimer);
    state.realtimeTimer = setTimeout(() => {
      if (!state.saving && !isEditing()) refreshAll({ announce: false });
    }, 300);
  }

  function startAutoRefresh() {
    clearInterval(state.autoRefreshTimer);
    const interval = Math.max(Number(CONFIG.AUTO_REFRESH_MS) || 60000, 15000);
    state.autoRefreshTimer = setInterval(() => {
      if (!document.hidden && !state.saving && !isEditing()) refreshAll({ announce: false });
    }, interval);
  }

  function handleWindowFocus() {
    if (state.started && Date.now() - state.lastSuccessfulLoad > 30000 && !isEditing()) refreshAll({ announce: false });
  }

  function handleVisibilityChange() {
    if (!document.hidden) handleWindowFocus();
  }

  function startClock() {
    clearInterval(state.clockTimer);
    updateClock();
    state.clockTimer = setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    const timeZone = CONFIG.TIME_ZONE || "Asia/Manila";
    els.floatingTime.textContent = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
    els.floatingDate.textContent = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(now);
  }

  function renderSlotGuide() {
    els.posterSlotChips.replaceChildren(...(SLOT_GROUPS.poster || []).map(createSlotChip));
    els.videoSlotChips.replaceChildren(...(SLOT_GROUPS.video || []).map(createSlotChip));
  }

  function createSlotChip(time) {
    const span = document.createElement("span");
    span.textContent = formatDisplayTime(time);
    return span;
  }

  function renderChangelog() {
    const fragment = document.createDocumentFragment();
    (CONFIG.CHANGELOG || []).forEach(item => {
      const section = document.createElement("section");
      section.className = "changelog-version";
      section.innerHTML = `<h4>Version ${escapeHtml(item.version)}</h4><time>${escapeHtml(item.date)}</time>`;
      const list = document.createElement("ul");
      (item.changes || []).forEach(change => {
        const li = document.createElement("li");
        li.textContent = change;
        list.appendChild(li);
      });
      section.appendChild(list);
      fragment.appendChild(section);
    });
    els.changelogContent.replaceChildren(fragment);
  }

  function handleKeyboardShortcuts(event) {
    if (event.key === "Escape") {
      [els.postModal, els.channelsModal, els.accountModal, els.changelogModal].forEach(closeModal);
      return;
    }
    const tag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
    const key = event.key.toLowerCase();
    if (key === "n" && canEdit()) openPostModal(dateToISO(state.currentDate));
    else if (key === "r") refreshAll({ announce: true });
    else if (key === "m") setViewMode("monthly");
    else if (key === "w") setViewMode("weekly");
    else if (key === "d") setViewMode("daily");
    else if (event.key === "/") {
      event.preventDefault();
      els.plannerSearch.focus();
    }
  }

  function toggleEmptyState(isEmpty) {
    els.plannerEmpty.classList.toggle("hidden", !isEmpty);
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal || state.saving) return;
    modal.classList.add("hidden");
    if (![els.postModal, els.channelsModal, els.accountModal, els.changelogModal].some(item => !item.classList.contains("hidden"))) {
      document.body.style.overflow = "";
    }
  }

  function isEditing() {
    return [els.postModal, els.channelsModal, els.accountModal].some(modal => !modal.classList.contains("hidden"));
  }

  function setSyncStatus(text) {
    els.syncStatus.textContent = text;
  }

  function showToast(message, type = "info") {
    clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.className = `toast ${type === "error" ? "error" : type === "success" ? "success" : ""}`;
    state.toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 3000);
  }

  function setButtonBusy(button, busy, text) {
    button.disabled = busy;
    button.textContent = text;
  }

  function updateVersionLabels() {
    document.querySelectorAll("[data-app-version]").forEach(element => { element.textContent = CONFIG.VERSION || "2.0.1"; });
  }

  function canEdit() {
    return ["admin", "editor"].includes(state.role);
  }

  function isAdmin() {
    return state.role === "admin";
  }

  function getVisibleSlots(list) {
    const custom = list.map(post => normalizeTime(post.post_time)).filter(time => time && !ALL_SLOTS.includes(time));
    return [...new Set([...ALL_SLOTS, ...custom])].sort();
  }

  function getSlotType(time, list = []) {
    const standard = getContentTypeFromTime(time);
    if (standard) return standard;
    const matching = list.find(post => normalizeTime(post.post_time) === time);
    return matching?.content_type === "video" ? "video" : "poster";
  }

  function getContentTypeFromTime(time) {
    const normalized = normalizeTime(time);
    if ((SLOT_GROUPS.video || []).includes(normalized)) return "video";
    if ((SLOT_GROUPS.poster || []).includes(normalized)) return "poster";
    return "";
  }

  function groupPostsByDate(list) {
    const map = new Map();
    list.forEach(post => {
      if (!map.has(post.post_date)) map.set(post.post_date, []);
      map.get(post.post_date).push(post);
    });
    return map;
  }

  function comparePostsByTime(a, b) {
    return (normalizeTime(a.post_time) || "23:59").localeCompare(normalizeTime(b.post_time) || "23:59");
  }

  function nextStatus(status) {
    const index = STATUS_ORDER.indexOf(status);
    return STATUS_ORDER[(index + 1 + STATUS_ORDER.length) % STATUS_ORDER.length];
  }

  function statusIcon(status) {
    if (status === "idea") return "→";
    if (status === "created") return "◆";
    if (status === "scheduled") return "✓";
    return "↺";
  }

  function categoryClass(category) {
    const value = String(category || "OSC Post").toLowerCase();
    if (value === "requests") return "category-request";
    if (value === "holidays") return "category-holiday";
    return "category-osc";
  }

  function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function startOfWeek(date) {
    const result = startOfDay(date);
    result.setDate(result.getDate() - result.getDay());
    return result;
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function dateToISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function normalizeTime(value) {
    if (!value) return "";
    const text = String(value).trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
    return text.slice(0, 5);
  }

  function formatDisplayTime(value) {
    const time = normalizeTime(value);
    if (!time) return "No time";
    const [hourText, minute] = time.split(":");
    let hour = Number(hourText);
    if (Number.isNaN(hour)) return time;
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${period}`;
  }

  function formatTimeOnly(date) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function formatLongDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function formatWeekRange(start, end) {
    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameMonth && sameYear) return `${start.toLocaleString("en-US", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    if (sameYear) return `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()} – ${end.toLocaleString("en-US", { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function getHiddenWeeks(year, month) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.hiddenWeeks) || "{}");
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      return new Set((data[key] || []).map(Number));
    } catch {
      return new Set();
    }
  }

  function setWeekHidden(year, month, index, hidden) {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.hiddenWeeks) || "{}");
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const values = new Set((data[key] || []).map(Number));
      if (hidden) values.add(index); else values.delete(index);
      data[key] = [...values].sort((a, b) => a - b);
      localStorage.setItem(STORAGE_KEYS.hiddenWeeks, JSON.stringify(data));
    } catch {}
  }

  function sanitizeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#0057b8";
  }

  function capitalize(value) {
    const text = String(value || "");
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function readableError(error) {
    const message = String(error?.message || error || "Something went wrong.");
    if (message.toLowerCase().includes("row-level security")) return "Your account does not have permission to perform this action.";
    if (message.toLowerCase().includes("jwt")) return "Your session expired. Sign in again.";
    if (message.toLowerCase().includes("network")) return "Network connection failed. Check your internet and try again.";
    return message;
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
  }

  function fallbackUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
      const random = Math.random() * 16 | 0;
      const value = character === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  window.PUPlanner = Object.freeze({ start, stop, showToast });
})();
