const CONFIG = window.APP_CONFIG || {};
const API_URL = CONFIG.API_URL || "";
const SLOT_GROUPS = CONFIG.TIME_SLOTS || {
  poster: ["09:00", "12:00", "15:00", "17:00"],
  video: ["10:30", "13:30", "16:30", "19:00"]
};
const ALL_SLOTS = [...SLOT_GROUPS.poster, ...SLOT_GROUPS.video].sort();
const HIDDEN_WEEKS_STORAGE_KEY = "pu-content-planner-hidden-weeks";
const VIEW_STORAGE_KEY = "pu-content-planner-view";

let currentDate = new Date();
let currentView = localStorage.getItem(VIEW_STORAGE_KEY) || CONFIG.DEFAULT_VIEW || "weekly";
let posts = [];
let isLoading = false;
let isSaving = false;
let toastTimer = null;

const $ = id => document.getElementById(id);
const refs = {};
window.addEventListener("DOMContentLoaded", init);

async function init() {
  ["calendarGrid","weeklyGrid","periodTitle","viewEyebrow","ideaCount","scheduledCount","postedCount","totalCount","postModal","postForm","closeModal","deletePost","savePostButton","postId","postDate","postTitle","postContentType","postTime","postCategory","postStatus","modalDateLabel","refreshButton","changelogButton","changelogModal","closeChangelog","changelogContent","toast","versionText","lastRefreshText","monthlyPanel","weeklyPanel","monthlyViewBtn","weeklyViewBtn","floatingTime","floatingDate","posterSlotChips","videoSlotChips"].forEach(id => refs[id] = $(id));
  refs.versionText.textContent = `Version ${CONFIG.VERSION || "1.2.0"}`;
  setupControls();
  renderSlotGuide();
  renderChangelog();
  applyView(false);
  startFloatingDateTime();
  await loadPosts();
}

function setupControls() {
  $("prevPeriod").addEventListener("click", () => changePeriod(-1));
  $("nextPeriod").addEventListener("click", () => changePeriod(1));
  $("todayBtn").addEventListener("click", () => { currentDate = new Date(); loadPosts(); });
  refs.monthlyViewBtn.addEventListener("click", () => setView("monthly"));
  refs.weeklyViewBtn.addEventListener("click", () => setView("weekly"));
  refs.closeModal.addEventListener("click", closePostModal);
  refs.postModal.addEventListener("click", event => { if (event.target === refs.postModal) closePostModal(); });
  refs.postForm.addEventListener("submit", savePost);
  refs.deletePost.addEventListener("click", deletePost);
  refs.postContentType.addEventListener("change", () => populateTimeOptions(refs.postContentType.value));
  refs.refreshButton.addEventListener("click", () => loadPosts(true));
  refs.changelogButton.addEventListener("click", () => refs.changelogModal.classList.remove("hidden"));
  refs.closeChangelog.addEventListener("click", () => refs.changelogModal.classList.add("hidden"));
  refs.changelogModal.addEventListener("click", event => { if (event.target === refs.changelogModal) refs.changelogModal.classList.add("hidden"); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") { closePostModal(); refs.changelogModal.classList.add("hidden"); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r") { event.preventDefault(); loadPosts(true); }
  });
}

function setView(view) {
  currentView = view;
  localStorage.setItem(VIEW_STORAGE_KEY, view);
  applyView(true);
}

function applyView(shouldRender = true) {
  const weekly = currentView === "weekly";
  refs.weeklyPanel.classList.toggle("hidden", !weekly);
  refs.monthlyPanel.classList.toggle("hidden", weekly);
  refs.weeklyViewBtn.classList.toggle("is-active", weekly);
  refs.monthlyViewBtn.classList.toggle("is-active", !weekly);
  refs.viewEyebrow.textContent = weekly ? "Weekly Schedule" : "Monthly Calendar";
  if (shouldRender) renderCurrentView();
}

function changePeriod(offset) {
  if (currentView === "weekly") currentDate.setDate(currentDate.getDate() + offset * 7);
  else currentDate.setMonth(currentDate.getMonth() + offset);
  loadPosts();
}

function getQueryRange() {
  if (currentView === "monthly") return { year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 };
  const start = startOfWeek(currentDate);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return { year: 0, month: 0, start: formatDate(start), end: formatDate(end) };
}

function jsonp(params = {}) {
  return new Promise((resolve, reject) => {
    if (!API_URL || API_URL.includes("PASTE_YOUR")) return reject(new Error("Apps Script URL is not configured in config.js."));
    const callbackName = `jsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const cleanup = () => { script.remove(); delete window[callbackName]; };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Request timed out.")); }, 15000);
    window[callbackName] = data => { clearTimeout(timeout); cleanup(); resolve(data); };
    script.onerror = () => { clearTimeout(timeout); cleanup(); reject(new Error("API request failed.")); };
    script.src = `${API_URL}?${new URLSearchParams({ ...params, callback: callbackName, _: Date.now() })}`;
    document.head.appendChild(script);
  });
}

async function loadPosts(showMessage = false) {
  if (isLoading) return;
  isLoading = true;
  refs.refreshButton.classList.add("spinning");
  document.body.classList.add("is-loading");
  const range = getQueryRange();
  updatePeriodTitle();
  try {
    const response = await jsonp({ action: "getPosts", ...range });
    if (!response.success) throw new Error(response.message || "Could not load posts.");
    posts = response.posts || [];
    renderCurrentView();
    refs.lastRefreshText.textContent = `Updated ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    if (showMessage) showToast("Planner refreshed.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not load posts.", true);
  } finally {
    isLoading = false;
    refs.refreshButton.classList.remove("spinning");
    document.body.classList.remove("is-loading");
  }
}

function updatePeriodTitle() {
  if (currentView === "monthly") {
    refs.periodTitle.textContent = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  } else {
    const start = startOfWeek(currentDate), end = new Date(start); end.setDate(end.getDate() + 6);
    refs.periodTitle.textContent = formatWeekRange(start, end);
  }
}

function renderCurrentView() {
  updatePeriodTitle();
  updateStats(posts);
  if (currentView === "weekly") renderWeekly(); else renderMonthly();
}

function renderSlotGuide() {
  refs.posterSlotChips.replaceChildren(...SLOT_GROUPS.poster.map(time => createSlotChip(time)));
  refs.videoSlotChips.replaceChildren(...SLOT_GROUPS.video.map(time => createSlotChip(time)));
}
function createSlotChip(time) { const span=document.createElement("span"); span.textContent=formatDisplayTime(time); return span; }

function renderMonthly() {
  const fragment = document.createDocumentFragment();
  const year = currentDate.getFullYear(), month = currentDate.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  const postsByDate = groupPostsByDate(posts);
  const hiddenWeeks = getHiddenWeeks(year, month);

  for (let weekIndex=0; weekIndex<6; weekIndex++) {
    const wrapper=document.createElement("section"); wrapper.className="calendar-week";
    const grid=document.createElement("div"); grid.className="calendar-week-grid";
    const weekDates=[];
    for (let dayOffset=0; dayOffset<7; dayOffset++) {
      const i=weekIndex*7+dayOffset;
      let dayNumber, cellDate, muted=false;
      if (i<startDay) { dayNumber=prevLastDate-startDay+i+1; cellDate=new Date(year,month-1,dayNumber); muted=true; }
      else if (i>=startDay+lastDate) { dayNumber=i-(startDay+lastDate)+1; cellDate=new Date(year,month+1,dayNumber); muted=true; }
      else { dayNumber=i-startDay+1; cellDate=new Date(year,month,dayNumber); }
      weekDates.push(cellDate);
      const dateString=formatDate(cellDate);
      const cell=document.createElement("div"); cell.className="day-cell";
      if (muted) cell.classList.add("muted");
      if (dateString===formatDate(new Date())) cell.classList.add("today");
      const number=document.createElement("div"); number.className="day-number"; number.textContent=dayNumber;
      const list=document.createElement("div"); list.className="post-list";
      (postsByDate.get(dateString)||[]).sort(comparePostsByTime).forEach(post=>list.appendChild(createPostCard(post,dateString,true)));
      const add=document.createElement("div"); add.className="add-hint"; add.textContent="+ Add";
      cell.append(number,list,add); cell.addEventListener("click",()=>openPostModal(dateString)); grid.appendChild(cell);
    }
    const rangeLabel=formatWeekRange(weekDates[0],weekDates[6]);
    const hide=createButton("Hide Week","week-toggle week-hide-button",()=>{setWeekHidden(year,month,weekIndex,true);renderMonthly();});
    const collapsed=document.createElement("div"); collapsed.className="collapsed-week-bar";
    const label=document.createElement("span"); label.textContent=rangeLabel;
    const show=createButton("Show Week","week-toggle",()=>{setWeekHidden(year,month,weekIndex,false);renderMonthly();});
    collapsed.append(label,show); wrapper.append(grid,hide,collapsed);
    if (hiddenWeeks.has(weekIndex)) wrapper.classList.add("is-collapsed");
    fragment.appendChild(wrapper);
  }
  refs.calendarGrid.replaceChildren(fragment);
}

function renderWeekly() {
  const start=startOfWeek(currentDate);
  const dates=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
  const map=groupPostsByDate(posts);
  const fragment=document.createDocumentFragment();
  const corner=document.createElement("div"); corner.className="weekly-corner"; corner.innerHTML="<strong>Time Slot</strong><small>Drag cards to reschedule</small>"; fragment.appendChild(corner);
  dates.forEach(date=>{
    const head=document.createElement("div"); head.className="weekly-day-head";
    if (formatDate(date)===formatDate(new Date())) head.classList.add("is-today");
    head.innerHTML=`<span>${date.toLocaleDateString("en-US",{weekday:"short"})}</span><strong>${date.getDate()}</strong><small>${date.toLocaleDateString("en-US",{month:"short"})}</small>`;
    fragment.appendChild(head);
  });

  ALL_SLOTS.forEach(time=>{
    const type=getContentTypeFromTime(time);
    const label=document.createElement("div"); label.className=`weekly-slot-label ${type}`;
    label.innerHTML=`<span class="type-icon ${type}-icon">${type==="poster"?"▧":"▶"}</span><div><strong>${formatDisplayTime(time)}</strong><small>${type==="poster"?"Poster / Photo":"Video / Short-form"}</small></div>`;
    fragment.appendChild(label);
    dates.forEach(date=>{
      const dateString=formatDate(date);
      const cell=document.createElement("div"); cell.className=`weekly-slot-cell ${type}`; cell.dataset.date=dateString; cell.dataset.time=time;
      cell.addEventListener("dragover",e=>{e.preventDefault();cell.classList.add("drag-over");});
      cell.addEventListener("dragleave",()=>cell.classList.remove("drag-over"));
      cell.addEventListener("drop",e=>handleDrop(e,cell));
      cell.addEventListener("click",()=>openPostModal(dateString,null,time,type));
      const slotPosts=(map.get(dateString)||[]).filter(post=>normalizeTime(post.Time)===time);
      slotPosts.forEach(post=>cell.appendChild(createPostCard(post,dateString,false)));
      if (slotPosts.length>1) { const badge=document.createElement("span"); badge.className="occupancy-badge"; badge.textContent=`${slotPosts.length} posts`; cell.appendChild(badge); }
      fragment.appendChild(cell);
    });
  });
  refs.weeklyGrid.replaceChildren(fragment);
}

function createPostCard(post,dateString,compact=false) {
  const card=document.createElement("article"); card.className=`post-card ${getCategoryClass(post.Category)} ${compact?"compact-card":""}`;
  card.draggable=true; card.dataset.postId=post.ID;
  card.addEventListener("dragstart",event=>{event.dataTransfer.setData("text/plain",post.ID);event.dataTransfer.effectAllowed="move";card.classList.add("is-dragging");});
  card.addEventListener("dragend",()=>card.classList.remove("is-dragging"));
  const type=getContentTypeFromTime(post.Time);
  const meta=document.createElement("div"); meta.className="post-meta";
  meta.innerHTML=`<span class="content-type-mark">${type==="poster"?"▧":"▶"}</span><span class="post-time">${formatDisplayTime(post.Time)}</span>`;
  const title=document.createElement("h4"); title.textContent=post.Title||"Untitled Post";
  const status=document.createElement("span"); status.className=`status-pill ${getStatusClass(post.Status)}`; status.textContent=post.Status||"Idea";
  const quick=createButton(getStatusIcon(post.Status),"quick-status",async()=>quickUpdateStatus(post,quick));
  quick.title=`Move to ${getNextStatus(post.Status)}`;
  card.append(meta,title,status,quick);
  card.addEventListener("click",event=>{event.stopPropagation();openPostModal(dateString,post);});
  return card;
}

async function handleDrop(event,cell) {
  event.preventDefault(); cell.classList.remove("drag-over");
  const id=event.dataTransfer.getData("text/plain");
  const post=posts.find(item=>String(item.ID)===String(id));
  if (!post) return;
  const oldDate=normalizeDate(post.Date), oldTime=normalizeTime(post.Time);
  const newDate=cell.dataset.date, newTime=cell.dataset.time;
  if (oldDate===newDate && oldTime===newTime) return;
  post.Date=newDate; post.Time=newTime; renderWeekly();
  showToast(`Moving to ${formatDisplayTime(newTime)}…`);
  try {
    const response=await jsonp({action:"updatePost",id:post.ID,date:newDate,time:newTime,title:post.Title||"",category:post.Category||"OSC Post",status:post.Status||"Idea"});
    if (!response.success) throw new Error(response.message||"Could not move post.");
    showToast(`Moved to ${new Date(`${newDate}T00:00:00`).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}, ${formatDisplayTime(newTime)}.`);
  } catch(error) {
    post.Date=oldDate; post.Time=oldTime; renderWeekly(); showToast(error.message||"Could not move post.",true);
  }
}

async function quickUpdateStatus(post,button) {
  if (button.disabled) return; button.disabled=true;
  const next=getNextStatus(post.Status), old=post.Status; post.Status=next; renderCurrentView();
  try {
    const response=await jsonp({action:"updatePost",id:post.ID,date:normalizeDate(post.Date),time:normalizeTime(post.Time),title:post.Title||"",category:post.Category||"OSC Post",status:next});
    if (!response.success) throw new Error(response.message||"Could not update status."); showToast(`Status updated to ${next}.`);
  } catch(error) { post.Status=old; renderCurrentView(); showToast(error.message||"Could not update status.",true); }
}

function openPostModal(dateString,post=null,presetTime="",presetType="") {
  refs.postModal.classList.remove("hidden");
  refs.modalDateLabel.textContent=new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  refs.postDate.value=dateString;
  if (post) {
    const type=getContentTypeFromTime(post.Time);
    refs.postId.value=post.ID||""; refs.postTitle.value=post.Title||""; refs.postContentType.value=type; populateTimeOptions(type,normalizeTime(post.Time));
    refs.postCategory.value=post.Category||"OSC Post"; refs.postStatus.value=post.Status||"Idea"; refs.deletePost.classList.remove("hidden");
  } else {
    const type=presetType||"poster";
    refs.postId.value=""; refs.postTitle.value=""; refs.postContentType.value=type; populateTimeOptions(type,presetTime||SLOT_GROUPS[type][0]);
    refs.postCategory.value="OSC Post"; refs.postStatus.value="Idea"; refs.deletePost.classList.add("hidden");
  }
  requestAnimationFrame(()=>refs.postTitle.focus());
}
function populateTimeOptions(type,selected="") {
  refs.postTime.replaceChildren(...SLOT_GROUPS[type].map(time=>{const option=document.createElement("option");option.value=time;option.textContent=formatDisplayTime(time);option.selected=time===selected;return option;}));
}
function closePostModal(){if(!isSaving)refs.postModal.classList.add("hidden");}

async function savePost(event) {
  event.preventDefault(); if(isSaving)return;
  const title=refs.postTitle.value.trim(); if(!title)return showToast("Please enter a post title.",true);
  isSaving=true; refs.savePostButton.disabled=true; refs.savePostButton.textContent="Saving…";
  const isEdit=Boolean(refs.postId.value); const requestToken=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;
  try {
    const response=await jsonp({action:isEdit?"updatePost":"addPost",id:refs.postId.value,date:refs.postDate.value,time:refs.postTime.value,title,category:refs.postCategory.value,status:refs.postStatus.value,requestToken});
    if(!response.success)throw new Error(response.message||"Could not save card."); refs.postModal.classList.add("hidden"); await loadPosts(); showToast(isEdit?"Card updated.":"Card added.");
  } catch(error){showToast(error.message||"Could not save card.",true);} finally {isSaving=false;refs.savePostButton.disabled=false;refs.savePostButton.textContent="Save Card";}
}
async function deletePost(){const id=refs.postId.value;if(!id||isSaving||!confirm("Delete this calendar card?"))return;isSaving=true;refs.deletePost.disabled=true;try{const response=await jsonp({action:"deletePost",id});if(!response.success)throw new Error(response.message||"Could not delete card.");refs.postModal.classList.add("hidden");await loadPosts();showToast("Card deleted.");}catch(error){showToast(error.message||"Could not delete card.",true);}finally{isSaving=false;refs.deletePost.disabled=false;}}

function renderChangelog(){const frag=document.createDocumentFragment();(CONFIG.CHANGELOG||[]).forEach(item=>{const section=document.createElement("section");section.className="changelog-version";section.innerHTML=`<h4>Version ${escapeHtml(item.version)}</h4><time>${escapeHtml(item.date)}</time>`;const ul=document.createElement("ul");item.changes.forEach(change=>{const li=document.createElement("li");li.textContent=change;ul.appendChild(li);});section.appendChild(ul);frag.appendChild(section);});refs.changelogContent.replaceChildren(frag);}
function startFloatingDateTime(){updateFloatingDateTime();setInterval(updateFloatingDateTime,1000);}
function updateFloatingDateTime(){const now=new Date(),tz=CONFIG.TIME_ZONE||"Asia/Manila";refs.floatingTime.textContent=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).format(now);refs.floatingDate.textContent=new Intl.DateTimeFormat("en-US",{timeZone:tz,weekday:"short",month:"short",day:"numeric",year:"numeric"}).format(now);}
function updateStats(list){refs.ideaCount.textContent=list.filter(p=>getStatusClass(p.Status)==="idea").length;refs.scheduledCount.textContent=list.filter(p=>getStatusClass(p.Status)==="scheduled").length;refs.postedCount.textContent=list.filter(p=>getStatusClass(p.Status)==="posted").length;refs.totalCount.textContent=list.length;}
function showToast(message,isError=false){clearTimeout(toastTimer);refs.toast.textContent=message;refs.toast.style.background=isError?"#b42318":"#10213f";refs.toast.classList.remove("hidden");toastTimer=setTimeout(()=>refs.toast.classList.add("hidden"),2600);}
function createButton(text,className,handler){const button=document.createElement("button");button.type="button";button.className=className;button.textContent=text;button.addEventListener("click",event=>{event.stopPropagation();handler(event);});return button;}
function groupPostsByDate(list){const map=new Map();list.forEach(post=>{const date=normalizeDate(post.Date);if(!map.has(date))map.set(date,[]);map.get(date).push(post);});return map;}
function comparePostsByTime(a,b){return(normalizeTime(a.Time)||"23:59").localeCompare(normalizeTime(b.Time)||"23:59");}
function getContentTypeFromTime(time){return SLOT_GROUPS.video.includes(normalizeTime(time))?"video":"poster";}
function getNextStatus(status){const s=String(status||"Idea").toLowerCase();if(s==="idea")return"Scheduled";if(s==="scheduled")return"Posted";return"Idea";}
function getStatusIcon(status){const s=String(status||"Idea").toLowerCase();if(s==="scheduled")return"✓";if(s==="posted")return"↺";return"→";}
function getCategoryClass(category){const c=String(category||"OSC Post").trim().toLowerCase();if(c==="requests")return"category-request";if(c==="holidays")return"category-holiday";return"category-osc";}
function getStatusClass(status){const s=String(status||"Idea").trim().toLowerCase();if(s==="scheduled")return"scheduled";if(s==="posted")return"posted";return"idea";}
function startOfWeek(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-d.getDay());return d;}
function formatDate(date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function normalizeDate(value){if(!value)return"";const text=String(value).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;const d=new Date(text);return Number.isNaN(d.getTime())?text:formatDate(d);}
function normalizeTime(value){if(!value)return"";const text=String(value).trim();if(/^\d{2}:\d{2}$/.test(text))return text;if(/^\d{1}:\d{2}$/.test(text))return`0${text}`;if(text.includes("T")){const d=new Date(text);if(!Number.isNaN(d.getTime()))return`${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;}const d=new Date(`1970-01-01T${text}`);return Number.isNaN(d.getTime())?text:`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
function formatDisplayTime(value){const time=normalizeTime(value);if(!time)return"No time";const[h,m]=time.split(":");let hour=Number(h);if(Number.isNaN(hour))return time;const period=hour>=12?"PM":"AM";hour=hour%12||12;return`${hour}:${m} ${period}`;}
function formatWeekRange(start,end){const sameMonth=start.getMonth()===end.getMonth(),sameYear=start.getFullYear()===end.getFullYear();if(sameMonth&&sameYear)return`${start.toLocaleString("en-US",{month:"short"})} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;if(sameYear)return`${start.toLocaleString("en-US",{month:"short"})} ${start.getDate()} – ${end.toLocaleString("en-US",{month:"short"})} ${end.getDate()}, ${end.getFullYear()}`;return`${start.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} – ${end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;}
function getHiddenWeeks(year,month){try{const stored=JSON.parse(localStorage.getItem(HIDDEN_WEEKS_STORAGE_KEY)||"{}");const key=`${year}-${String(month+1).padStart(2,"0")}`;return new Set((stored[key]||[]).map(Number));}catch{return new Set();}}
function setWeekHidden(year,month,index,hidden){try{const stored=JSON.parse(localStorage.getItem(HIDDEN_WEEKS_STORAGE_KEY)||"{}");const key=`${year}-${String(month+1).padStart(2,"0")}`;const values=new Set((stored[key]||[]).map(Number));hidden?values.add(index):values.delete(index);stored[key]=[...values].sort((a,b)=>a-b);localStorage.setItem(HIDDEN_WEEKS_STORAGE_KEY,JSON.stringify(stored));}catch{}}
function escapeHtml(text){return String(text).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));}
