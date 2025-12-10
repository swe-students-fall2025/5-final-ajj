console.log("script.js loaded");

// 🟢 NEW GLOBAL: Stores the full, unfiltered list of items fetched from the server
let allGroupItems = []; 


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
//  PAGE INITIALIZATION ROUTER
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
    const user = await getCurrentUser();
    const path = window.location.pathname || "";

    // exact matches so "create-group.html" doesn't count as a group page
    const isIndex    = path === "/" || path.endsWith("/index.html");
    const isLogin    = path.endsWith("/login.html") || path === "/login.html";
    const isRegister = path.endsWith("/register.html") || path.endsWith("/register.html");
    const isHome     = path.endsWith("/home.html") || path === "/home.html";
    const isDiscover = path.endsWith("/discover.html") || path === "/discover.html";
    const isGroup    = path.endsWith("/group.html") || path === "/group.html";
    const isCreate   = path.endsWith("/create-group.html") || path === "/create-group.html";


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
//  LOGIN PAGE
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
//  REGISTER PAGE
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

    // Backend may return either an array or { groups: [...] }
    const data = await res.json();
    const groups = Array.isArray(data) ? data : (data.groups || []);

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
                onclick="window.location.href='group.html?id=${g.id}'">
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

    if (!res.ok) {
        grid.innerHTML = "<p>Failed to load groups.</p>";
        return;
    }

    // Normalize array vs { groups: [...] }
    const data = await res.json();
    const groups = Array.isArray(data) ? data : (data.groups || []);

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
            <p class="group-description">${g.description || ""}</p>
            <div class="group-footer">
                <span class="member-count">${g.member_count || 0} members</span>
                <button class="btn btn-secondary" onclick="joinGroup('${g.id}')">
                    Join Group
                </button>
            </div>
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
//  RATING HELPERS
// ------------------------------------------------------

// Helper function to highlight stars on hover/initial load
function highlightStars(container, score) {
    const stars = container.querySelectorAll('.star');
    stars.forEach(star => {
        const starScore = parseInt(star.dataset.score);
        // Using ★ and ☆ is a common technique for simple star ratings
        star.textContent = (starScore <= score) ? '★' : '☆'; 
    });
}

// Helper function to create the star elements
function renderRatingStars(itemId, currentScore = 0) {
    const starContainer = document.createElement("div");
    starContainer.className = "rating-stars";
    starContainer.dataset.itemId = itemId;

    for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.classList.add("star");
        star.dataset.score = i;

        // Attach the click handler to submit the rating
        star.addEventListener('click', () => submitRating(itemId, i));
        
        // Add hover effects for better UX
        star.addEventListener('mouseover', () => highlightStars(starContainer, i));
        // On mouseout, revert to the current score display
        star.addEventListener('mouseout', () => highlightStars(starContainer, currentScore));

        starContainer.appendChild(star);
    }
    
    // Initial display based on the current score
    highlightStars(starContainer, currentScore);
    
    return starContainer;
}

// ------------------------------------------------------
//  RATING SUBMISSION
// ------------------------------------------------------

async function submitRating(itemId, score) {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("id");

    try {
        const res = await fetch(`/api/items/${itemId}/rate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ score })
        });

        if (res.ok) {
            // Rating submitted successfully - no alert needed, as the list will refresh
            
            // Re-load the leaderboard to show updated average and your new rating
            if (groupId) {
                // Fetch new data and re-apply filters (which handles the display)
                loadLeaderboard(groupId); 
            }
        } else {
            const data = await res.json();
            alert(`Failed to submit rating: ${data.error || res.statusText}`);
        }
    } catch (error) {
        console.error("Error submitting rating:", error);
        alert("An unknown network error occurred while submitting rating.");
    }
}


// ------------------------------------------------------
//  GROUP PAGE (LEADERBOARD/FILTERING LOGIC)
// ------------------------------------------------------

async function initGroupPage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        console.warn("Group page opened without id; redirecting to home.");
        window.location.href = "home.html";
        return;
    }

    loadGroupInfo(id);
    
    // 🟢 NEW: Attach listeners for filters and search
    document.getElementById("item-search")?.addEventListener('input', applyFiltersAndSearch);
    document.getElementById("my-rated-filter")?.addEventListener('change', applyFiltersAndSearch);

    loadLeaderboard(id); // Initial load of items

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
                await loadLeaderboard(id); // Refresh the list
                // Clear the form inputs after successful submission
                form.querySelector("#item-name").value = "";
                form.querySelector("#item-description").value = "";
            } else {
                const data = await res.json();
                alert(data.error || "Failed to add item.");
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
    if (!list) return; 
    
    list.innerHTML = "<p>Loading leaderboard...</p>";

    const res = await fetch(`/api/groups/${id}/leaderboard`, {
        credentials: "include"
    });
    
    if (!res.ok) {
        list.innerHTML = "<p>Failed to load items.</p>";
        return;
    }

    const data = await res.json();
    
    // 🟢 CRITICAL: Store the full list globally for filtering
    allGroupItems = data.leaderboard || []; 
    
    // Pass the items to the function that filters and renders them
    applyFiltersAndSearch(); 
}


function applyFiltersAndSearch() {
    const searchInput = document.getElementById("item-search");
    const filterInput = document.getElementById("my-rated-filter");
    
    // Default to empty string if element not found
    const query = searchInput?.value.toLowerCase() || ''; 
    const showRated = filterInput?.checked || false;
    
    let filteredItems = allGroupItems;

    // 1. Apply Search Filter
    if (query) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.description.toLowerCase().includes(query)
        );
    }

    // 2. Apply Rated Filter
    if (showRated) {
        // user_rating is null (or 0) if not rated. In Python it's null/None.
        // We look for any non-null (i.e., non-zero) rating
        filteredItems = filteredItems.filter(item => item.user_rating && item.user_rating > 0);
    }
    
    // 3. Render the final list
    renderItemList(filteredItems);
}


function renderItemList(items) {
    const list = document.querySelector(".items-list"); 
    list.innerHTML = ""; // Clear existing list

    if (items.length === 0) {
        list.innerHTML = "<p>No items match your criteria.</p>";
        return;
    }
    
    for (const item of items) {
        const div = document.createElement("div");
        div.className = "item-card";
        
        // 🟢 NEW: Enhanced Item Card HTML structure
        div.innerHTML = `
            <div class="item-rank-score">
                <span class="rank-number">#${item.rank}</span>
                <span class="item-name-text">${item.name}</span>
            </div>
            <p class="item-description">${item.description || "No description provided"}</p>
            <div class="item-stats">
                <span class="avg-score">Avg Score: 
                    <strong>${item.avg_rating?.toFixed(2) || "N/A"}</strong>
                </span>
                <span class="rating-count">(${item.rating_count} ratings)</span>
                </div>
        `;
        
        // Render the stars and append the container
        // item.user_rating will be null or the score (1-5)
        const userRating = item.user_rating || 0; 
        const starContainer = renderRatingStars(item.id, userRating);
        div.querySelector('.item-stats').appendChild(starContainer);
        
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