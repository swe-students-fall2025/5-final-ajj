console.log("script.js loaded");


// ------------------------------------------------------
//  AUTH HELPERS
// ------------------------------------------------------

async function getCurrentUser() {
    try {
        const res = await fetch("/api/auth/me", {
            credentials: "include"
        });
        if (res.status === 200) {
            return await res.json();
        }
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


// ------------------------------------------------------
//  PAGE INITIALIZATION ROUTER — FIXED (NO LOOPING)
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
    const user = await getCurrentUser();
    const path = window.location.pathname;

    const isIndex    = path.endsWith("index.html") || path === "/";
    const isLogin    = path.endsWith("login.html");
    const isRegister = path.endsWith("register.html");
    const isHome     = path.endsWith("home.html");
    const isDiscover = path.endsWith("discover.html");
    const isGroup    = path.endsWith("group.html");
    const isCreate   = path.endsWith("create-group.html");

    // If NOT logged in → block protected pages
    if (!user && (isHome || isDiscover || isGroup || isCreate)) {
        window.location.href = "login.html";
        return;
    }

    // If logged in → redirect away from login/register/index
    if (user && (isLogin || isRegister || isIndex)) {
        window.location.href = "home.html";
        return;
    }

    // Initialize page-specific logic
    if (isIndex)    initIndexPage();
    if (isLogin)    initLoginPage();
    if (isRegister) initRegisterPage();
    if (isHome)     initHomePage();
    if (isDiscover) initDiscoverPage();
    if (isGroup)    initGroupPage();
    if (isCreate)   initCreateGroupPage();

    // Attach logout button action if present
    const logoutBtn = document.querySelector(".btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);
}



// ------------------------------------------------------
//  INDEX PAGE
// ------------------------------------------------------
async function initIndexPage() {
    // Nothing needed — router handles redirects
}



// ------------------------------------------------------
//  LOGIN PAGE — FIXED JSON BODY
// ------------------------------------------------------

async function initLoginPage() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = form.querySelector("input[name='email']").value.trim();
        const password = form.querySelector("input[name='password']").value.trim();

        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            window.location.href = "home.html";
        } else {
            const data = await res.json();
            alert(data.error || "Invalid email or password.");
        }
    });
}



// ------------------------------------------------------
//  REGISTER PAGE — FIXED JSON BODY
// ------------------------------------------------------

async function initRegisterPage() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = form.querySelector("input[name='username']").value.trim();
        const email    = form.querySelector("input[name='email']").value.trim();
        const password = form.querySelector("input[name='password']").value.trim();

        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Registration failed.");
            return;
        }

        // Success → go to login
        window.location.href = "login.html";
    });
}



// ------------------------------------------------------
//  HOME PAGE
// ------------------------------------------------------

async function initHomePage() {
    const grid = document.getElementById("my-groups-grid");
    if (!grid) return;

    grid.innerHTML = "<p>Loading your groups...</p>";

    const res = await fetch("/api/me/groups", {
        credentials: "include"
    });

    if (!res.ok) {
        grid.innerHTML = "<p>You are not in any groups yet.</p>";
        return;
    }

    const groups = await res.json();
    grid.innerHTML = "";

    if (!groups.length) {
        grid.innerHTML = "<p>You have not joined any groups yet.</p>";
        return;
    }

    for (const g of groups) {
        const card = document.createElement("div");
        card.className = "group-card";
        card.innerHTML = `
            <h3>${g.name}</h3>
            <p>${g.description || ""}</p>
            <button class="btn btn-primary"
                onclick="window.location.href='group.html?id=${g._id}'">
                Open Group
            </button>
        `;
        grid.appendChild(card);
    }
}



// ------------------------------------------------------
//  DISCOVER PAGE
// ------------------------------------------------------

async function initDiscoverPage() {
    const grid = document.getElementById("discover-groups-grid");
    if (!grid) return;

    const form = document.querySelector(".search-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const q = form.querySelector("input[name='q']").value.trim();
            loadDiscover(q);
        });
    }

    loadDiscover("");
}

async function loadDiscover(q) {
    const grid = document.getElementById("discover-groups-grid");
    grid.innerHTML = "<p>Searching...</p>";

    const res = await fetch(`/api/groups?q=${encodeURIComponent(q)}`, {
        credentials: "include"
    });

    const groups = await res.json();
    grid.innerHTML = "";

    if (!groups.length) {
        grid.innerHTML = "<p>No groups found.</p>";
        return;
    }

    for (const g of groups) {
        const card = document.createElement("div");
        card.className = "group-card";

        card.innerHTML = `
            <h3>${g.name}</h3>
            <p>${g.description || ""}</p>
            <button class="btn btn-secondary" onclick="joinGroup('${g._id}')">
                Join Group
            </button>
        `;
        grid.appendChild(card);
    }
}

async function joinGroup(groupId) {
    const res = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        credentials: "include"
    });

    if (res.ok) {
        alert("Joined successfully!");
        window.location.href = "home.html";
    } else {
        alert("Failed to join group.");
    }
}



// ------------------------------------------------------
//  GROUP PAGE
// ------------------------------------------------------

async function initGroupPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        alert("Group ID missing.");
        return;
    }

    loadGroupInfo(id);
    loadLeaderboard(id);

    const leaveBtn = document.getElementById("leave-group-btn");
    if (leaveBtn) {
        leaveBtn.addEventListener("click", () => leaveGroup(id));
    }

    const form = document.querySelector("#addItemModal form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = form.querySelector("#item-name").value.trim();
            const description = form.querySelector("#item-description").value.trim();

            const res = await fetch(`/api/groups/${id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ name, description })
            });

            if (res.ok) {
                closeAddItemModal();
                loadLeaderboard(id);
            } else {
                alert("Failed to add item.");
            }
        });
    }
}

async function loadGroupInfo(id) {
    const res = await fetch(`/api/groups/${id}`, {
        credentials: "include"
    });

    const data = await res.json();

    const header = document.querySelector(".page-header h1");
    const desc   = document.querySelector(".page-header p");

    if (header) header.textContent = data.name;
    if (desc)   desc.textContent   = data.description || "";
}

async function loadLeaderboard(id) {
    const list = document.querySelector(".items-list");
    list.innerHTML = "<p>Loading leaderboard...</p>";

    const res = await fetch(`/api/groups/${id}/leaderboard`, {
        credentials: "include"
    });

    const items = await res.json();
    list.innerHTML = "";

    for (const item of items) {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <h4>${item.name}</h4>
            <p>Score: ${item.avg_rating?.toFixed(2) || "N/A"}</p>
        `;
        list.appendChild(div);
    }
}

async function leaveGroup(id) {
    const res = await fetch(`/api/groups/${id}/leave`, {
        method: "POST",
        credentials: "include"
    });

    if (res.ok) {
        window.location.href = "home.html";
    } else {
        alert("Unable to leave group.");
    }
}



// ------------------------------------------------------
//  MODAL HELPERS
// ------------------------------------------------------

function openAddItemModal() {
    document.getElementById("addItemModal").style.display = "flex";
}

function closeAddItemModal() {
    document.getElementById("addItemModal").style.display = "none";
}



// ------------------------------------------------------
//  CREATE GROUP PAGE
// ------------------------------------------------------

async function initCreateGroupPage() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = form.querySelector("input[name='name']").value.trim();
        const description = form.querySelector("textarea[name='description']").value.trim();

        const res = await fetch("/api/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, description })
        });

        if (res.ok) {
            window.location.href = "home.html";
        } else {
            alert("Failed to create group.");
        }
    });
}


