/****************************************************
 * RankIt – Fully Upgraded Script.js
 * Includes:
 *  - Search
 *  - Filters
 *  - Sort modes
 *  - Pagination
 *  - Personal stats panel
 *  - Edit + Delete item
 *  - Improved star UI
 ****************************************************/

console.log("Enhanced script.js loaded");

/* -----------------------------------------------
   GLOBAL STATE
------------------------------------------------ */
let allGroupItems = [];      // full dataset from backend
let filteredItems = [];      // after search/filter
let sortedItems = [];        // after sorting
let paginatedItems = [];     // visible slice
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

let isGroupOwner = false;    // set per-group based on backend data


/* -----------------------------------------------
   AUTH HELPERS
------------------------------------------------ */
async function getCurrentUser() {
    try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 200) return await res.json();
        return null;
    } catch (err) {
        console.error("Error checking current user:", err);
        return null;
    }
}

async function logoutUser() {
    await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
    });
    window.location.href = "login.html";
}

function renderSkeletonCards(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const div = document.createElement("div");
        div.className = "skeleton-card";
        div.innerHTML = `
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line short"></div>
        `;
        container.appendChild(div);
    }
}

// ------------------------------------------------------
//  THEME TOGGLING (LIGHT / DARK)
// ------------------------------------------------------

function applyTheme(theme) {
    // store theme on body dataset + class for CSS overrides
    document.body.dataset.theme = theme;
    if (theme === "light") {
        document.body.classList.add("theme-light");
    } else {
        document.body.classList.remove("theme-light");
    }
}

function initThemeToggle() {
    const navRight = document.querySelector(".top-nav .nav-right");
    if (!navRight) return;

    // Create button if not present
    let btn = document.getElementById("theme-toggle");
    if (!btn) {
        btn = document.createElement("button");
        btn.id = "theme-toggle";
        btn.type = "button";
        btn.className = "nav-link theme-toggle-btn";
        btn.title = "Toggle light/dark mode";
        btn.textContent = "☾"; // will update based on current theme
        // Put it near the left side of nav-right
        navRight.insertBefore(btn, navRight.firstChild);
    }

    // Load saved theme or default to dark
    const saved = localStorage.getItem("theme") || "dark";
    applyTheme(saved);
    btn.textContent = saved === "light" ? "☼" : "☾";

    btn.addEventListener("click", () => {
        const current = document.body.dataset.theme || "dark";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem("theme", next);
        btn.textContent = next === "light" ? "☼" : "☾";
    });
}

/* -----------------------------------------------
   ROUTER
------------------------------------------------ */
document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
    console.log("Init page running…");

    const user = await getCurrentUser();
    const path = window.location.pathname;

    // Normalize path (Flask static_url_path='' makes paths like '/home.html')
    const p = path.replace(/^\//, "");

    const isIndex    = p === "" || p === "index.html";
    const isLogin    = p === "login.html";
    const isRegister = p === "register.html";
    const isHome     = p === "home.html";
    const isDiscover = p === "discover.html";
    const isGroup    = p === "group.html";
    const isCreate   = p === "create-group.html";

    // 1️⃣ Not logged in → block protected pages
    if (!user && (isHome || isDiscover || isGroup || isCreate)) {
        console.log("Redirecting to login (not authenticated)");
        window.location.href = "login.html";
        return;
    }

    // 2️⃣ Logged in → redirect away from public pages
    if (user && (isIndex || isLogin || isRegister)) {
        console.log("Redirecting to home (already logged in)");
        window.location.href = "home.html";
        return;
    }

    // 3️⃣ Page initialization
    if (isLogin)    initLoginPage();
    if (isRegister) initRegisterPage();
    if (isHome)     initHomePage();
    if (isDiscover) initDiscoverPage();
    if (isGroup)    initGroupPage();
    if (isCreate)   initCreateGroupPage();

    initThemeToggle();
    // 4️⃣ Logout listener
    const logoutBtn = document.querySelector(".btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
}



/****************************************************
 * LOGIN / REGISTER
 ****************************************************/
async function initLoginPage() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = form.email.value.trim();
        const password = form.password.value.trim();

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        if (res.ok) window.location.href = "home.html";
        else alert("Invalid login.");
    });
}

async function initRegisterPage() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = form.username.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value.trim();

        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (res.ok) window.location.href = "login.html";
        else alert(data.error || "Registration failed.");
    });
}
/****************************************************
 * CREATE GROUP PAGE
 ****************************************************/
async function initCreateGroupPage() {
    const form = document.querySelector(".form-card");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const description = form.description.value.trim();

        if (!name) {
            alert("Please enter a group name.");
            return;
        }

        const payload = { name, description };

        const res = await fetch("/api/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
        });

        let data = null;
        try {
            data = await res.json();
        } catch (_) {
            // ignore JSON error if backend returns 204
        }

        if (!res.ok) {
            alert((data && data.error) || "Failed to create group.");
            return;
        }

        // Try to pull the new group id from common field names
        const groupId =
            (data && (data.id || data._id || data.group_id || (data.group && data.group.id))) ||
            null;

        // Optionally ensure creator is joined as a member
        if (groupId) {
            try {
                await fetch(`/api/groups/${groupId}/join`, {
                    method: "POST",
                    credentials: "include"
                });
            } catch (_) {
                // if it fails, we still continue
            }
        }

        if (groupId) {
            window.location.href = `group.html?id=${groupId}`;
        } else {
            window.location.href = "home.html";
        }
    });
}


function renderRecentActivitySection(groups) {
    // We’ll try to infer "recency" from joined_at or created_at if present
    const container = document.getElementById("recent-activity");
    if (!container) return;

    if (!groups.length) {
        container.innerHTML = ""; // nothing if no groups
        return;
    }

    // Copy and sort by recency if timestamps exist
    const sortable = [...groups];
    if (sortable[0].joined_at) {
        sortable.sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at));
    } else if (sortable[0].created_at) {
        sortable.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const recent = sortable.slice(0, 5);

    container.innerHTML = `
        <div class="card recent-activity-card">
            <h3>Recent activity</h3>
            <p class="group-description">
                Your latest groups (most recent first).
            </p>
            <ul class="recent-activity-list">
                ${recent
                    .map(g => {
                        const date =
                            g.joined_at || g.created_at
                                ? new Date(g.joined_at || g.created_at).toLocaleDateString()
                                : "";
                        return `<li><span class="name">${g.name}</span>${date ? ` — joined ${date}` : ""}</li>`;
                    })
                    .join("")}
            </ul>
        </div>
    `;
}

/****************************************************
 * HOME PAGE
 ****************************************************/
async function initHomePage() {
    const grid = document.getElementById("my-groups-grid");
    if (!grid) return;
    renderSkeletonCards("my-groups-grid", 3);

    const res = await fetch("/api/me/groups", { credentials: "include" });
    if (!res.ok) {
        grid.innerHTML = "<p>No groups found.</p>";
        return;
    }

    const data = await res.json();
    const groups = Array.isArray(data) ? data : data.groups || [];

    grid.innerHTML = "";

    // Render recent activity section (we’ll attach it above the grid)
    let recentContainer = document.getElementById("recent-activity");
    if (!recentContainer) {
        recentContainer = document.createElement("div");
        recentContainer.id = "recent-activity";
        recentContainer.className = "recent-activity";
        // Insert recent activity before the grid
        grid.parentNode.insertBefore(recentContainer, grid);
    }
    renderRecentActivitySection(groups);

    if (!groups.length) {
        grid.innerHTML = `
            <div class="card">
                <h3>No groups yet</h3>
                <p class="group-description">
                    You haven't joined or created any groups. Start by creating your first one!
                </p>
                <button class="btn btn-primary" onclick="window.location.href='create-group.html'">
                    + Create a Group
                </button>
            </div>
        `;
        return;
    }

    for (const g of groups) {
        const card = document.createElement("div");
        card.className = "card group-card";

        const canDelete = !!(g.is_owner || g.isOwner || g.role === "owner");

        card.innerHTML = `
            <h3>${g.name}</h3>
            <p class="group-description">${g.description || "No description"}</p>
            <div class="group-card-footer">
                <span class="member-badge">👥 ${g.member_count || 0} members</span>
                <div class="group-card-buttons">
                    <button class="btn btn-primary" onclick="window.location.href='group.html?id=${g.id}'">
                        View Group →
                    </button>
                    ${canDelete ? `<button class="btn btn-error btn-sm" onclick="deleteGroup('${g.id}')">Delete</button>` : ""}
                </div>
            </div>
        `;
        grid.appendChild(card);
    }

}

/****************************************************
 * DISCOVER PAGE
 ****************************************************/
async function initDiscoverPage() {
    const form = document.querySelector(".search-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            loadDiscover(form.q.value.trim());
        });
    }
    loadDiscover("");
}

async function loadDiscover(q) {
    const grid = document.getElementById("discover-groups-grid");
    if (!grid) return;

    // reset any empty-state layout and show skeletons
    grid.classList.remove("empty-state");
    renderSkeletonCards("discover-groups-grid", 3);

    const res = await fetch(`/api/groups?q=${encodeURIComponent(q)}`, {
        credentials: "include"
    });

    if (!res.ok) {
        grid.classList.remove("empty-state");
        grid.innerHTML = "<p>Error loading groups</p>";
        return;
    }

    const data = await res.json();
    const groups = Array.isArray(data) ? data : data.groups || [];

    if (!groups.length) {
        // pretty empty-state card
        grid.classList.add("empty-state");
        grid.innerHTML = `
            <div class="card empty-state-card">
                <h3>No groups found</h3>
                <p class="group-description">
                    Try a different search term, or clear the search box to see all groups.
                </p>
            </div>
        `;
        return;
    }

    grid.classList.remove("empty-state");
    grid.innerHTML = "";

    for (const g of groups) {
        const card = document.createElement("div");
        card.className = "card group-card";

        card.innerHTML = `
            <h3>${g.name}</h3>
            <p>${g.description || "No description"}</p>
            <div class="group-card-footer">
                <span class="member-badge">👥 ${g.member_count || 0} members</span>
                <button class="btn btn-secondary" onclick="joinGroup('${g.id}')">
                    Join Group
                </button>
            </div>
        `;

        // ⬇️ this line was missing before, which is why groups didn’t display
        grid.appendChild(card);
    }
}

/****************************************************
 * JOIN GROUP
 ****************************************************/
async function joinGroup(groupId) {
    const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
        alert("Joined group!");
        window.location.href = `group.html?id=${groupId}`;
        return;
    }

    let error = "Failed to join group.";
    try {
        const data = await res.json();
        if (data?.error) error = data.error;
    } catch {}

    alert(error);
}



/****************************************************
 * STAR RATING RENDERING
 ****************************************************/
function highlightStars(container, score) {
    container.querySelectorAll(".star").forEach(star => {
        const val = Number(star.dataset.score);
        star.textContent = val <= score ? "★" : "☆";
    });
}

function renderRatingStars(itemId, currentScore = 0) {
    const wrap = document.createElement("div");
    wrap.className = "rating-stars";
    wrap.dataset.itemId = itemId;

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.className = "star";
        star.dataset.score = i;

        star.addEventListener("mouseover", () => highlightStars(wrap, i));
        star.addEventListener("mouseout", () => highlightStars(wrap, currentScore));
        star.addEventListener("click", () => submitRating(itemId, i));

        wrap.appendChild(star);
    }

    highlightStars(wrap, currentScore);
    return wrap;
}

/****************************************************
 * SUBMIT RATING
 ****************************************************/
async function submitRating(itemId, score) {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("id");

    const res = await fetch(`/api/items/${itemId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ score })
    });

    if (res.ok) loadLeaderboard(groupId);
    else alert("Rating failed.");
}

/****************************************************
 * GROUP PAGE INIT
 ****************************************************/
async function initGroupPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return (window.location.href = "home.html");

    await loadGroupInfo(id);
    await loadLeaderboard(id);

    // Attach listeners
    document.getElementById("item-search").addEventListener("input", refreshAll);
    document.getElementById("my-rated-filter").addEventListener("change", refreshAll);
    document.getElementById("sort-mode").addEventListener("change", refreshAll);

    document.getElementById("prev-page").addEventListener("click", () => changePage(-1));
    document.getElementById("next-page").addEventListener("click", () => changePage(1));

    // Add-item form
    const addForm = document.getElementById("add-item-form");
    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await addItem(id);
    });

    // Edit-item form
    const editForm = document.getElementById("edit-item-form");
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveEditedItem(id);
    });

    // Leave group
    const leaveBtn = document.getElementById("leave-group-btn");
    leaveBtn.addEventListener("click", () => leaveGroup(id));
}

/****************************************************
 * LOAD GROUP INFO
 ****************************************************/
async function loadGroupInfo(id) {
    const res = await fetch(`/api/groups/${id}`, {
        credentials: "include"
    });

    const data = await res.json();

    document.getElementById("group-title").textContent = data.name;
    document.getElementById("group-description").textContent =
        data.description || "";

    // Decide if current user is the group owner
    // Adjust these fields to match your actual API shape
    isGroupOwner = !!(data.is_owner || data.isOwner || data.role === "owner");

    const leaveBtn = document.getElementById("leave-group-btn");
    if (leaveBtn) leaveBtn.style.display = "inline-block";

    const deleteBtn = document.getElementById("delete-group-btn");
    if (deleteBtn) {
        if (isGroupOwner) {
            deleteBtn.style.display = "inline-block";
            deleteBtn.onclick = () => deleteGroup(id);
        } else {
            deleteBtn.style.display = "none";
        }
    }
}


/****************************************************
 * LOAD LEADERBOARD
 ****************************************************/
async function loadLeaderboard(id) {
    const list = document.querySelector(".items-list");
    list.innerHTML = "Loading...";

    const res = await fetch(`/api/groups/${id}/leaderboard`, {
        credentials: "include"
    });

    if (!res.ok) {
        list.innerHTML = "Failed to load";
        return;
    }

    const data = await res.json();
    allGroupItems = data.leaderboard || [];

    refreshAll();
}

/****************************************************
 * GLOBAL REFRESH PIPELINE
 * STEP 1: filter
 * STEP 2: sort
 * STEP 3: paginate
 * STEP 4: render list + stats
 ****************************************************/
function refreshAll() {
    applyFilters();
    applySorting();
    applyPagination();
    renderItemList();
    renderUserStats();
}

/****************************************************
 * FILTERING
 ****************************************************/
function applyFilters() {
    const q = document.getElementById("item-search").value.toLowerCase();
    const onlyMine = document.getElementById("my-rated-filter").checked;

    filteredItems = allGroupItems.filter(item => {
        const matches = item.name.toLowerCase().includes(q) ||
            (item.description || "").toLowerCase().includes(q);

        if (!onlyMine) return matches;

        return matches && item.user_rating != null;
    });
}

/****************************************************
 * SORTING
 ****************************************************/
function applySorting() {
    const mode = document.getElementById("sort-mode").value;

    sortedItems = [...filteredItems];

    if (mode === "avg") {
        sortedItems.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    } else if (mode === "your") {
        sortedItems.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
    } else if (mode === "alpha") {
        sortedItems.sort((a, b) => a.name.localeCompare(b.name));
    } else if (mode === "most") {
        sortedItems.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    } else if (mode === "new") {
        sortedItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
        // Default: backend rank order
        sortedItems.sort((a, b) => a.rank - b.rank);
    }
}

/****************************************************
 * PAGINATION
 ****************************************************/
function applyPagination() {
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / ITEMS_PER_PAGE));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    paginatedItems = sortedItems.slice(start, start + ITEMS_PER_PAGE);

    document.getElementById("page-info").textContent =
        `Page ${currentPage} / ${totalPages}`;
}

function changePage(delta) {
    currentPage += delta;
    refreshAll();
}

/****************************************************
 * RENDER ITEMS
 ****************************************************/
function renderItemList() {
    const list = document.querySelector(".items-list");
    list.innerHTML = "";

    if (!paginatedItems.length) {
        list.innerHTML = "<p>No items found.</p>";
        return;
    }

    for (const item of paginatedItems) {
        const card = document.createElement("div");
        card.className = "item-card";

        const deleteButtonHtml = isGroupOwner
            ? `<button class="btn btn-error btn-sm" onclick="deleteItem('${item.id}')">Delete</button>`
            : "";

        card.innerHTML = `
            <div class="item-header">
                <div class="item-rank-label">${formatRankLabel(item.rank)}</div>
                <div class="item-title">${item.name}</div>
            </div>

            <p class="item-description">${item.description || ""}</p>

            <div class="item-meta">
                <span class="meta-block"><strong>Avg:</strong> ${item.avg_rating?.toFixed(2) || "N/A"}</span>
                <span class="meta-block"><strong>Votes:</strong> ${item.rating_count}</span>
            </div>

            <div class="rating-row"></div>

            <div class="item-actions">
                <button class="btn btn-secondary btn-sm"
                    onclick="openEditItemModal('${item.id}', '${escapeQuotes(item.name)}', '${escapeQuotes(item.description || "")}')">
                    Edit
                </button>
                ${deleteButtonHtml}
            </div>
        `;

        const ratingRow = card.querySelector(".rating-row");
        const stars = renderRatingStars(item.id, item.user_rating || 0);
        ratingRow.appendChild(stars);

        list.appendChild(card);
    }
}


function formatRankLabel(rank) {
    if (rank === 1) return "🥇 #1";
    if (rank === 2) return "🥈 #2";
    if (rank === 3) return "🥉 #3";
    return `#${rank}`;
}

function escapeQuotes(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, "\\'");
}

/****************************************************
 * PERSONAL STATS PANEL
 ****************************************************/
function renderUserStats() {
    const panel = document.getElementById("user-stats");
    if (!panel) return;

    const rated = allGroupItems.filter(i => i.user_rating != null);

    if (!rated.length) {
        panel.innerHTML = "<p>You haven't rated anything yet.</p>";
        return;
    }

    const avg = (
        rated.reduce((sum, x) => sum + x.user_rating, 0) / rated.length
    ).toFixed(2);

    const top5 = [...rated].sort((a, b) => b.user_rating - a.user_rating).slice(0, 5);
    const bottom5 = [...rated].sort((a, b) => a.user_rating - b.user_rating).slice(0, 5);

    panel.innerHTML = `
        <p><strong>Your Avg Rating:</strong> ${avg}</p>
        <p><strong>Items Rated:</strong> ${rated.length}</p>

        <h4>Top 5</h4>
        <ul>${top5.map(i => `<li>${i.name} (${i.user_rating})</li>`).join("")}</ul>

        <h4>Bottom 5</h4>
        <ul>${bottom5.map(i => `<li>${i.name} (${i.user_rating})</li>`).join("")}</ul>
    `;
}

/****************************************************
 * ADD ITEM
 ****************************************************/
async function addItem(groupId) {
    const name = document.getElementById("item-name").value.trim();
    const description = document.getElementById("item-description").value.trim();

    const res = await fetch(`/api/groups/${groupId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description })
    });

    if (!res.ok) return alert("Failed to add item.");

    closeAddItemModal();
    loadLeaderboard(groupId);

    document.getElementById("item-name").value = "";
    document.getElementById("item-description").value = "";
}

/****************************************************
 * EDIT ITEM
 ****************************************************/
function openEditItemModal(id, name, description) {
    document.getElementById("edit-item-id").value = id;
    document.getElementById("edit-item-name").value = name;
    document.getElementById("edit-item-description").value = description;
    document.getElementById("editItemModal").style.display = "flex";
}

function closeEditItemModal() {
    document.getElementById("editItemModal").style.display = "none";
}

async function saveEditedItem(groupId) {
    const id = document.getElementById("edit-item-id").value;
    const name = document.getElementById("edit-item-name").value.trim();
    const description = document.getElementById("edit-item-description").value.trim();

    const res = await fetch(`/api/groups/${groupId}/items/${id}`, {
        method: "PUT",

        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, description })
    });

    if (!res.ok) return alert("Error saving item.");

    closeEditItemModal();
    loadLeaderboard(groupId);
}

/****************************************************
 * DELETE ITEM
 ****************************************************/
async function deleteItem(id) {
    if (!confirm("Delete this item?")) return;

    const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
        credentials: "include"
    });

    if (!res.ok) return alert("Failed to delete.");

    const params = new URLSearchParams(window.location.search);
    loadLeaderboard(params.get("id"));
}

async function deleteGroup(groupId) {
    if (!confirm("Delete this entire group and all its items? This cannot be undone.")) return;

    const res = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        credentials: "include"
    });

    if (!res.ok) {
        let msg = "Failed to delete group.";
        try {
            const data = await res.json();
            if (data?.error) msg = data.error;
        } catch (_) {}
        alert(msg);
        return;
    }

    alert("Group deleted.");
    window.location.href = "home.html";
}


/****************************************************
 * LEAVE GROUP
 ****************************************************/
async function leaveGroup(id) {
    const res = await fetch(`/api/groups/${id}/leave`, {
        method: "POST",
        credentials: "include"
    });

    if (res.ok) window.location.href = "home.html";
    else alert("Unable to leave group.");
}

/****************************************************
 * MODALS
 ****************************************************/
function openAddItemModal() {
    document.getElementById("addItemModal").style.display = "flex";
}
function closeAddItemModal() {
    document.getElementById("addItemModal").style.display = "none";
}
