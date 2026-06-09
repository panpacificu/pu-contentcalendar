const API_URL = "https://script.google.com/macros/s/AKfycbyO-DiFHcopazE0icyj3ETSscI8bA84E-ybMRDqmKbMy0wJjkBavzh3ZyljRSF-XSJ3/exec";

let currentDate = new Date();
let posts = [];

const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");

const ideaCount = document.getElementById("ideaCount");
const scheduledCount = document.getElementById("scheduledCount");
const postedCount = document.getElementById("postedCount");
const totalCount = document.getElementById("totalCount");

const modal = document.getElementById("postModal");
const postForm = document.getElementById("postForm");
const closeModal = document.getElementById("closeModal");
const deletePostBtn = document.getElementById("deletePost");

const postIdInput = document.getElementById("postId");
const postDateInput = document.getElementById("postDate");
const postTitleInput = document.getElementById("postTitle");
const postTimeInput = document.getElementById("postTime");
const postCategoryInput = document.getElementById("postCategory");
const postStatusInput = document.getElementById("postStatus");
const modalDateLabel = document.getElementById("modalDateLabel");

document.addEventListener("DOMContentLoaded", async () => {
  setupControls();
  await loadPosts();
});

function setupControls() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    loadPosts();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    loadPosts();
  });

  document.getElementById("todayBtn").addEventListener("click", () => {
    currentDate = new Date();
    loadPosts();
  });

  closeModal.addEventListener("click", closePostModal);

  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closePostModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closePostModal();
    }
  });

  postForm.addEventListener("submit", savePost);
  deletePostBtn.addEventListener("click", deletePost);
}

function jsonp(params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "jsonpCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    params.callback = callbackName;

    const query = new URLSearchParams(params).toString();
    const script = document.createElement("script");

    window[callbackName] = data => {
      resolve(data);
      document.body.removeChild(script);
      delete window[callbackName];
    };

    script.onerror = () => {
      reject(new Error("API request failed."));
      document.body.removeChild(script);
      delete window[callbackName];
    };

    script.src = `${API_URL}?${query}`;
    document.body.appendChild(script);
  });
}

async function loadPosts() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  monthTitle.textContent = currentDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  try {
    const response = await jsonp({
      action: "getPosts",
      year,
      month
    });

    if (!response.success) {
      alert(response.message || "Could not load posts.");
      return;
    }

    posts = response.posts || [];
    renderCalendar();

  } catch (error) {
    console.error(error);
    alert("Could not load posts. Please check your Apps Script URL.");
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = "";

  updateStats(posts);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();

  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  const totalCells = 42;

  for (let i = 0; i < totalCells; i++) {
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

    if (isMuted) {
      cell.classList.add("muted");
    }

    if (dateString === formatDate(new Date())) {
      cell.classList.add("today");
    }

    cell.innerHTML = `
      <div class="day-number">${dayNumber}</div>
      <div class="post-list"></div>
      <div class="add-hint">+ Add</div>
    `;

    const postList = cell.querySelector(".post-list");

    const dayPosts = posts
      .filter(post => normalizeDate(post.Date) === dateString)
      .sort((a, b) => {
        const timeA = normalizeTime(a.Time) || "23:59";
        const timeB = normalizeTime(b.Time) || "23:59";
        return timeA.localeCompare(timeB);
      });

    dayPosts.forEach(post => {
      const card = document.createElement("div");

      const categoryClass = getCategoryClass(post.Category);
      const statusClass = getStatusClass(post.Status);

      card.className = `post-card ${categoryClass}`;

      card.innerHTML = `
        <div class="post-time">${formatDisplayTime(post.Time)}</div>
        <h4>${escapeHtml(post.Title || "Untitled Post")}</h4>
        <span class="status-pill ${statusClass}">${escapeHtml(post.Status || "Idea")}</span>
      `;

      card.addEventListener("click", event => {
        event.stopPropagation();
        openPostModal(dateString, post);
      });

      postList.appendChild(card);
    });

    cell.addEventListener("click", () => {
      openPostModal(dateString);
    });

    calendarGrid.appendChild(cell);
  }
}

function updateStats(list) {
  const ideaPosts = list.filter(post => getStatusClass(post.Status) === "idea");
  const scheduledPosts = list.filter(post => getStatusClass(post.Status) === "scheduled");
  const postedPosts = list.filter(post => getStatusClass(post.Status) === "posted");

  ideaCount.textContent = ideaPosts.length;
  scheduledCount.textContent = scheduledPosts.length;
  postedCount.textContent = postedPosts.length;
  totalCount.textContent = list.length;
}

function openPostModal(dateString, post = null) {
  modal.classList.remove("hidden");

  modalDateLabel.textContent = new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

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

  setTimeout(() => {
    postTitleInput.focus();
  }, 100);
}

function closePostModal() {
  modal.classList.add("hidden");
}

async function savePost(event) {
  event.preventDefault();

  const title = postTitleInput.value.trim();

  if (!title) {
    alert("Please enter a post title.");
    return;
  }

  const payload = {
    action: postIdInput.value ? "updatePost" : "addPost",
    id: postIdInput.value,
    date: postDateInput.value,
    time: postTimeInput.value,
    title: title,
    category: postCategoryInput.value,
    status: postStatusInput.value
  };

  try {
    const response = await jsonp(payload);

    if (!response.success) {
      alert(response.message || "Something went wrong.");
      return;
    }

    closePostModal();
    await loadPosts();

  } catch (error) {
    console.error(error);
    alert("Could not save card.");
  }
}

async function deletePost() {
  const id = postIdInput.value;

  if (!id) return;

  const confirmed = confirm("Delete this calendar card?");
  if (!confirmed) return;

  try {
    const response = await jsonp({
      action: "deletePost",
      id
    });

    if (!response.success) {
      alert(response.message || "Could not delete card.");
      return;
    }

    closePostModal();
    await loadPosts();

  } catch (error) {
    console.error(error);
    alert("Could not delete card.");
  }
}

function getCategoryClass(category) {
  const cleanCategory = String(category || "OSC Post").trim().toLowerCase();

  if (cleanCategory === "requests") {
    return "category-request";
  }

  if (cleanCategory === "holidays") {
    return "category-holiday";
  }

  return "category-osc";
}

function getStatusClass(status) {
  const cleanStatus = String(status || "Idea").trim().toLowerCase();

  if (cleanStatus === "scheduled") {
    return "scheduled";
  }

  if (cleanStatus === "posted") {
    return "posted";
  }

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

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);

  if (isNaN(date.getTime())) {
    return text;
  }

  return formatDate(date);
}

function normalizeTime(value) {
  if (!value) return "";

  const text = String(value).trim();

  // Already in 24-hour HH:mm format
  if (/^\d{2}:\d{2}$/.test(text)) {
    return text;
  }

  // Single digit hour format like 9:00
  if (/^\d{1}:\d{2}$/.test(text)) {
    return `0${text}`;
  }

  // Google Sheets can return time as an ISO date:
  // Example: 1899-12-30T09:00:00.000Z
  if (text.includes("T")) {
    const date = new Date(text);

    if (!isNaN(date.getTime())) {
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    }
  }

  // Fallback for parseable time text
  const date = new Date(`1970-01-01T${text}`);

  if (!isNaN(date.getTime())) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  return text;
}

function formatDisplayTime(value) {
  const time = normalizeTime(value);

  if (!time) {
    return "No time";
  }

  const [hourString, minute] = time.split(":");
  let hour = Number(hourString);

  if (Number.isNaN(hour)) {
    return time;
  }

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${period}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
