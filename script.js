const CONFIG = window.APP_CONFIG || {};
const API_URL = CONFIG.API_URL || "";

let currentDate = new Date();
let posts = [];
let isLoading = false;
let isSaving = false;
let toastTimer = null;

const $ = id => document.getElementById(id);
const calendarGrid = $("calendarGrid");
const monthTitle = $("monthTitle");
const ideaCount = $("ideaCount");
const scheduledCount = $("scheduledCount");
const postedCount = $("postedCount");
const totalCount = $("totalCount");
const modal = $("postModal");
const postForm = $("postForm");
const closeModal = $("closeModal");
const deletePostBtn = $("deletePost");
const savePostButton = $("savePostButton");
const postIdInput = $("postId");
const postDateInput = $("postDate");
const postTitleInput = $("postTitle");
const postTimeInput = $("postTime");
const postCategoryInput = $("postCategory");
const postStatusInput = $("postStatus");
const modalDateLabel = $("modalDateLabel");
const refreshButton = $("refreshButton");
const changelogButton = $("changelogButton");
const changelogModal = $("changelogModal");
const closeChangelog = $("closeChangelog");
const changelogContent = $("changelogContent");
const toast = $("toast");
const versionText = $("versionText");
const lastRefreshText = $("lastRefreshText");

window.addEventListener("DOMContentLoaded", init);

async function init() {
  versionText.textContent = `Version ${CONFIG.VERSION || "1.1.0"}`;
  setupControls();
  renderChangelog();
  await loadPosts();
}

function setupControls() {
  $("prevMonth").addEventListener("click", () => changeMonth(-1));
  $("nextMonth").addEventListener("click", () => changeMonth(1));
  $("todayBtn").addEventListener("click", () => {
    currentDate = new Date();
    loadPosts();
  });

  closeModal.addEventListener("click", closePostModal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closePostModal();
  });
  postForm.addEventListener("submit", savePost);
  deletePostBtn.addEventListener("click", deletePost);

  refreshButton.addEventListener("click", () => loadPosts(true));
  changelogButton.addEventListener("click", () => changelogModal.classList.remove("hidden"));
  closeChangelog.addEventListener("click", () => changelogModal.classList.add("hidden"));
  changelogModal.addEventListener("click", event => {
    if (event.target === changelogModal) changelogModal.classList.add("hidden");
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closePostModal();
      changelogModal.classList.add("hidden");
    }
  });
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  loadPosts();
}

function jsonp(params = {}) {
  return new Promise((resolve, reject) => {
    if (!API_URL || API_URL.includes("PASTE_YOUR")) {
      reject(new Error("Apps Script URL is not configured in config.js."));
      return;
    }

    const callbackName = `jsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      script.remove();
      delete window[callbackName];
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out."));
    }, 15000);

    window[callbackName] = data => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("API request failed."));
    };

    const query = new URLSearchParams({ ...params, callback: callbackName, _: Date.now() }).toString();
    script.src = `${API_URL}?${query}`;
    document.head.appendChild(script);
  });
}

async function loadPosts(showMessage = false) {
  if (isLoading) return;
  isLoading = true;
  refreshButton.classList.add("spinning");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  monthTitle.textContent = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  try {
    const response = await jsonp({ action: "getPosts", year, month });
    if (!response.success) throw new Error(response.message || "Could not load posts.");
    posts = response.posts || [];
    renderCalendar();
    lastRefreshText.textContent = `Updated ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    if (showMessage) showToast("Planner refreshed.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not load posts.", true);
  } finally {
    isLoading = false;
    refreshButton.classList.remove("spinning");
  }
}

function renderCalendar() {
  updateStats(posts);
  const fragment = document.createDocumentFragment();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  const postsByDate = groupPostsByDate(posts);

  for (let i = 0; i < 42; i++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    let dayNumber;
    let cellDate;
    let isMuted = false;

    if (i < startDay) {
      dayNumber = prevLastDate - startDay + i + 1;
      cellDate = new Date(year, month - 1, dayNumber);
      isMuted = true;
    } else if (i >= startDay + lastDate) {
      dayNumber = i - (startDay + lastDate) + 1;
      cellDate = new Date(year, month + 1, dayNumber);
      isMuted = true;
    } else {
      dayNumber = i - startDay + 1;
      cellDate = new Date(year, month, dayNumber);
    }

    const dateString = formatDate(cellDate);
    if (isMuted) cell.classList.add("muted");
    if (dateString === formatDate(new Date())) cell.classList.add("today");

    const dayNumberEl = document.createElement("div");
    dayNumberEl.className = "day-number";
    dayNumberEl.textContent = dayNumber;

    const postList = document.createElement("div");
    postList.className = "post-list";
    const dayPosts = (postsByDate.get(dateString) || []).sort(comparePostsByTime);
    dayPosts.forEach(post => postList.appendChild(createPostCard(post, dateString)));

    const addHint = document.createElement("div");
    addHint.className = "add-hint";
    addHint.textContent = "+ Add";

    cell.append(dayNumberEl, postList, addHint);
    cell.addEventListener("click", () => openPostModal(dateString));
    fragment.appendChild(cell);
  }

  calendarGrid.replaceChildren(fragment);
}

function createPostCard(post, dateString) {
  const card = document.createElement("div");
  card.className = `post-card ${getCategoryClass(post.Category)}`;

  const timeEl = document.createElement("div");
  timeEl.className = "post-time";
  timeEl.textContent = formatDisplayTime(post.Time);

  const titleEl = document.createElement("h4");
  titleEl.textContent = post.Title || "Untitled Post";

  const statusEl = document.createElement("span");
  const statusClass = getStatusClass(post.Status);
  statusEl.className = `status-pill ${statusClass}`;
  statusEl.textContent = post.Status || "Idea";

  const quickStatus = document.createElement("button");
  quickStatus.type = "button";
  quickStatus.className = "quick-status";
  quickStatus.title = `Move to ${getNextStatus(post.Status)}`;
  quickStatus.setAttribute("aria-label", quickStatus.title);
  quickStatus.textContent = getStatusIcon(post.Status);
  quickStatus.addEventListener("click", async event => {
    event.stopPropagation();
    await quickUpdateStatus(post, quickStatus);
  });

  card.append(timeEl, titleEl, statusEl, quickStatus);
  card.addEventListener("click", event => {
    event.stopPropagation();
    openPostModal(dateString, post);
  });
  return card;
}

async function quickUpdateStatus(post, button) {
  if (button.disabled) return;
  button.disabled = true;
  const nextStatus = getNextStatus(post.Status);

  try {
    const response = await jsonp({
      action: "updatePost",
      id: post.ID,
      date: normalizeDate(post.Date),
      time: normalizeTime(post.Time),
      title: post.Title || "",
      category: post.Category || "OSC Post",
      status: nextStatus
    });
    if (!response.success) throw new Error(response.message || "Could not update status.");
    post.Status = nextStatus;
    renderCalendar();
    showToast(`Status updated to ${nextStatus}.`);
  } catch (error) {
    showToast(error.message || "Could not update status.", true);
  } finally {
    button.disabled = false;
  }
}

function updateStats(list) {
  ideaCount.textContent = list.filter(post => getStatusClass(post.Status) === "idea").length;
  scheduledCount.textContent = list.filter(post => getStatusClass(post.Status) === "scheduled").length;
  postedCount.textContent = list.filter(post => getStatusClass(post.Status) === "posted").length;
  totalCount.textContent = list.length;
}

function openPostModal(dateString, post = null) {
  modal.classList.remove("hidden");
  modalDateLabel.textContent = new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  postDateInput.value = dateString;

  if (post) {
    postIdInput.value = post.ID || "";
    postTitleInput.value = post.Title || "";
    postTimeInput.value = normalizeTime(post.Time) || "";
    postCategoryInput.value = post.Category || "OSC Post";
    postStatusInput.value = post.Status || "Idea";
    deletePostBtn.classList.remove("hidden");
  } else {
    postIdInput.value = "";
    postTitleInput.value = "";
    postTimeInput.value = "";
    postCategoryInput.value = "OSC Post";
    postStatusInput.value = "Idea";
    deletePostBtn.classList.add("hidden");
  }

  requestAnimationFrame(() => postTitleInput.focus());
}

function closePostModal() {
  if (!isSaving) modal.classList.add("hidden");
}

async function savePost(event) {
  event.preventDefault();
  if (isSaving) return;

  const title = postTitleInput.value.trim();
  if (!title) {
    showToast("Please enter a post title.", true);
    return;
  }

  isSaving = true;
  savePostButton.disabled = true;
  savePostButton.textContent = "Saving...";
  const requestToken = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

  try {
    const response = await jsonp({
      action: postIdInput.value ? "updatePost" : "addPost",
      id: postIdInput.value,
      date: postDateInput.value,
      time: postTimeInput.value,
      title,
      category: postCategoryInput.value,
      status: postStatusInput.value,
      requestToken
    });

    if (!response.success) throw new Error(response.message || "Could not save card.");
    modal.classList.add("hidden");
    await loadPosts();
    showToast(postIdInput.value ? "Card updated." : "Card added.");
  } catch (error) {
    showToast(error.message || "Could not save card.", true);
  } finally {
    isSaving = false;
    savePostButton.disabled = false;
    savePostButton.textContent = "Save Card";
  }
}

async function deletePost() {
  const id = postIdInput.value;
  if (!id || isSaving || !confirm("Delete this calendar card?")) return;

  isSaving = true;
  deletePostBtn.disabled = true;
  try {
    const response = await jsonp({ action: "deletePost", id });
    if (!response.success) throw new Error(response.message || "Could not delete card.");
    modal.classList.add("hidden");
    await loadPosts();
    showToast("Card deleted.");
  } catch (error) {
    showToast(error.message || "Could not delete card.", true);
  } finally {
    isSaving = false;
    deletePostBtn.disabled = false;
  }
}

function renderChangelog() {
  const fragment = document.createDocumentFragment();
  (CONFIG.CHANGELOG || []).forEach(item => {
    const section = document.createElement("section");
    section.className = "changelog-version";
    const title = document.createElement("h4");
    title.textContent = `Version ${item.version}`;
    const time = document.createElement("time");
    time.textContent = item.date;
    const list = document.createElement("ul");
    item.changes.forEach(change => {
      const li = document.createElement("li");
      li.textContent = change;
      list.appendChild(li);
    });
    section.append(title, time, list);
    fragment.appendChild(section);
  });
  changelogContent.replaceChildren(fragment);
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.style.background = isError ? "#b42318" : "#10213f";
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function groupPostsByDate(list) {
  const map = new Map();
  list.forEach(post => {
    const date = normalizeDate(post.Date);
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(post);
  });
  return map;
}

function comparePostsByTime(a, b) {
  return (normalizeTime(a.Time) || "23:59").localeCompare(normalizeTime(b.Time) || "23:59");
}

function getNextStatus(status) {
  const clean = String(status || "Idea").toLowerCase();
  if (clean === "idea") return "Scheduled";
  if (clean === "scheduled") return "Posted";
  return "Idea";
}

function getStatusIcon(status) {
  const clean = String(status || "Idea").toLowerCase();
  if (clean === "scheduled") return "✓";
  if (clean === "posted") return "↺";
  return "→";
}

function getCategoryClass(category) {
  const clean = String(category || "OSC Post").trim().toLowerCase();
  if (clean === "requests") return "category-request";
  if (clean === "holidays") return "category-holiday";
  return "category-osc";
}

function getStatusClass(status) {
  const clean = String(status || "Idea").trim().toLowerCase();
  if (clean === "scheduled") return "scheduled";
  if (clean === "posted") return "posted";
  return "idea";
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : formatDate(date);
}

function normalizeTime(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{1}:\d{2}$/.test(text)) return `0${text}`;

  if (text.includes("T")) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
    }
  }

  const date = new Date(`1970-01-01T${text}`);
  return Number.isNaN(date.getTime()) ? text : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
