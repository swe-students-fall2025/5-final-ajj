/* ======================
   CORE API HELPERS
   ====================== */

const API_BASE = '/api';

/**
 * Generic JSON fetch helper.
 */
async function apiRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
        method: options.method || 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };

    if (options.body) {
        opts.body = typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body);
    }

    const res = await fetch(url, opts);
    let data = null;
    try {
        data = await res.json();
    } catch (_) {
        // ignore non-JSON
    }
    return { res, data };
}

/**
 * Page name detector based on pathname.
 */
function getPageName() {
    const path = window.location.pathname;
    if (path.endsWith('login.html')) return 'login';
    if (path.endsWith('register.html')) return 'register';
    if (path.endsWith('home.html')) return 'home';
    if (path.endsWith('discover.html')) return 'discover';
    if (path.endsWith('group.html')) return 'group';
    if (path.endsWith('create-group.html')) return 'create-group';
    if (path === '/' || path.endsWith('index.html')) return 'index';
    return 'unknown';
}

/* ======================
   TOAST NOTIFICATIONS
   ====================== */

function getToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'info', timeout = 4000) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, timeout);
}

/* ======================
   AUTH HELPERS
   ====================== */

/** Check if user is logged in; returns true/false. */
async function isAuthenticated() {
    try {
        const { res } = await apiRequest('/auth/check');
        return res.ok;
    } catch (_) {
        return false;
    }
}

/** For pages that require auth: redirect to login if not logged in. */
async function ensureAuthenticated() {
    const authed = await isAuthenticated();
    if (!authed) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/** For login/register: redirect to home if the user is already logged in. */
async function redirectIfAuthenticated() {
    const authed = await isAuthenticated();
    if (authed) {
        window.location.href = 'home.html';
        return true;
    }
    return false;
}

/* ======================
   GLOBAL NAV (Logout + username)
   ====================== */

async function initGlobalNav() {
    const logoutLink = document.querySelector('.btn-logout');
    const usernameSpan = document.querySelector('.nav-username');

    // Logout handler
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await apiRequest('/auth/logout', { method: 'POST' });
            } catch (_) {
                // ignore; still redirect
            }
            window.location.href = 'login.html';
        });
    }

    // Show current user in nav if possible
    if (usernameSpan) {
        try {
            const { res, data } = await apiRequest('/auth/me');
            if (res.ok && data && data.user) {
                usernameSpan.textContent = data.user.username || data.user.email || 'Me';
            } else {
                usernameSpan.textContent = '';
            }
        } catch (_) {
            usernameSpan.textContent = '';
        }
    }
}

/* ======================
   FORM VALIDATION
   ====================== */

function initFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const requiredInputs = form.querySelectorAll('[required]');
            let isValid = true;

            requiredInputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = 'var(--error, #ef4444)';
                } else {
                    input.style.borderColor = '';
                }
            });

            if (!isValid) {
                e.preventDefault();
                showToast('Please fill in all required fields.', 'error');
            }
        });
    });
}

/* ======================
   STAR RATING SYSTEM
   ====================== */

function initStarRatings(root = document) {
    const starRatings = root.querySelectorAll('.star-rating');

    starRatings.forEach(rating => {
        const stars = rating.querySelectorAll('.star');
        const itemId = rating.dataset.itemId;
        if (!itemId) return;

        stars.forEach(star => {
            // Click → submit rating
            star.addEventListener('click', async () => {
                const score = parseInt(star.dataset.score, 10);
                if (!score) return;

                try {
                    const { res, data } = await apiRequest(`/items/${itemId}/rate`, {
                        method: 'POST',
                        body: { score }
                    });

                    if (res.status === 401) {
                        window.location.href = 'login.html';
                        return;
                    }

                    if (!res.ok) {
                        console.error('Rating error:', data && data.error);
                        showToast(data && data.error ? data.error : 'Unable to submit rating.', 'error');
                        return;
                    }

                    stars.forEach(s => {
                        const sScore = parseInt(s.dataset.score, 10);
                        s.classList.toggle('active', sScore <= score);
                    });

                    showToast('Rating saved!', 'success');
                    setTimeout(() => window.location.reload(), 400);
                } catch (err) {
                    console.error('Rating request failed:', err);
                    showToast('Network error while rating. Try again.', 'error');
                }
            });

            // Hover visuals
            star.addEventListener('mouseenter', () => {
                const hoverScore = parseInt(star.dataset.score, 10);
                stars.forEach((s, idx) => {
                    s.style.color = idx < hoverScore ? 'var(--accent, #f59e0b)' : '';
                });
            });
        });

        // Reset hover color
        rating.addEventListener('mouseleave', () => {
            stars.forEach(s => {
                s.style.color = '';
            });
        });
    });
}

/* ======================
   MODAL HELPERS (Add Item)
   ====================== */

function showAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) modal.style.display = 'block';
}

function closeAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) modal.style.display = 'none';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('addItemModal');
        if (modal && modal.style.display === 'block') {
            closeAddItemModal();
        }
    }
});

/* ======================
   JOIN / LEAVE GROUP
   ====================== */

async function joinGroup(groupId) {
    if (!groupId) return;

    try {
        const { res, data } = await apiRequest(`/groups/${groupId}/join`, {
            method: 'POST'
        });

        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) {
            console.error('Join group error:', data && data.error);
            showToast(data && data.error ? data.error : 'Unable to join group.', 'error');
            return;
        }

        const btn = document.getElementById(`btn-${groupId}`);
        if (btn) {
            btn.textContent = 'Leave';
            btn.className = 'btn btn-secondary btn-sm';
            btn.onclick = () => leaveGroup(groupId);
        }

        showToast('Joined group!', 'success');
    } catch (error) {
        console.error('Join group request failed:', error);
        showToast('Network error joining group.', 'error');
    }
}

async function leaveGroup(groupId) {
    if (!groupId) return;

    try {
        const { res, data } = await apiRequest(`/groups/${groupId}/leave`, {
            method: 'POST'
        });

        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) {
            console.error('Leave group error:', data && data.error);
            showToast(data && data.error ? data.error : 'Unable to leave group.', 'error');
            return;
        }

        const btn = document.getElementById(`btn-${groupId}`);
        if (btn) {
            btn.textContent = 'Join';
            btn.className = 'btn btn-primary btn-sm';
            btn.onclick = () => joinGroup(groupId);
        }

        showToast('Left group.', 'info');
    } catch (error) {
        console.error('Leave group request failed:', error);
        showToast('Network error leaving group.', 'error');
    }
}

/* ======================
   GROUP CARD BUILDERS
   ====================== */

function createMyGroupCard(group) {
    const card = document.createElement('a');
    card.className = 'group-card';
    card.href = `group.html?id=${group.id}`;

    const h3 = document.createElement('h3');
    h3.textContent = group.name;

    const p = document.createElement('p');
    p.className = 'group-description';
    p.textContent = group.description || '';

    const meta = document.createElement('div');
    meta.className = 'group-meta';

    const memberCount = document.createElement('span');
    memberCount.className = 'member-count';
    const count = group.member_count || 0;
    memberCount.textContent = count === 1 ? '1 member' : `${count} members`;

    meta.appendChild(memberCount);

    card.appendChild(h3);
    card.appendChild(p);
    card.appendChild(meta);

    return card;
}

function createDiscoverGroupCard(group) {
    const card = document.createElement('div');
    card.className = 'group-card';

    const link = document.createElement('a');
    link.href = `group.html?id=${group.id}`;

    const h3 = document.createElement('h3');
    h3.textContent = group.name;

    const p = document.createElement('p');
    p.className = 'group-description';
    p.textContent = group.description || '';

    link.appendChild(h3);
    link.appendChild(p);

    const footer = document.createElement('div');
    footer.className = 'group-footer';

    const memberCount = document.createElement('span');
    memberCount.className = 'member-count';
    const count = group.member_count || 0;
    memberCount.textContent = count === 1 ? '1 member' : `${count} members`;

    footer.appendChild(memberCount);

    const btn = document.createElement('button');
    const groupId = group.id;
    const isMember = !!group.is_member;

    btn.id = `btn-${groupId}`;
    btn.className = isMember ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
    btn.textContent = isMember ? 'Leave' : 'Join';
    btn.addEventListener('click', () => {
        if (isMember) {
            leaveGroup(groupId);
        } else {
            joinGroup(groupId);
        }
    });

    footer.appendChild(btn);

    card.appendChild(link);
    card.appendChild(footer);

    return card;
}

function createLeaderboardItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';

    const rankDiv = document.createElement('div');
    rankDiv.className = 'item-rank';
    rankDiv.textContent = item.rank != null ? item.rank : '';
    card.appendChild(rankDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';

    const h3 = document.createElement('h3');
    h3.textContent = item.name;

    const descP = document.createElement('p');
    descP.className = 'item-description';
    descP.textContent = item.description || '';

    const statsDiv = document.createElement('div');
    statsDiv.className = 'item-stats';

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'score';
    const avg = item.avg_rating || 0;
    scoreSpan.textContent = `⭐ ${avg.toFixed(1)}`;

    const votesSpan = document.createElement('span');
    votesSpan.className = 'votes';
    const count = item.rating_count || 0;
    votesSpan.textContent = count === 1 ? '1 vote' : `${count} votes`;

    statsDiv.appendChild(scoreSpan);
    statsDiv.appendChild(votesSpan);

    contentDiv.appendChild(h3);
    contentDiv.appendChild(descP);
    contentDiv.appendChild(statsDiv);

    card.appendChild(contentDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';

    const ratingDiv = document.createElement('div');
    ratingDiv.className = 'star-rating';
    ratingDiv.dataset.itemId = item.id;

    const currentRating = item.user_rating || Math.round(avg);
    for (let s = 1; s <= 5; s++) {
        const starSpan = document.createElement('span');
        starSpan.className = 'star';
        starSpan.dataset.score = String(s);
        starSpan.textContent = '★';
        if (currentRating && s <= currentRating) {
            starSpan.classList.add('active');
        }
        ratingDiv.appendChild(starSpan);
    }

    actionsDiv.appendChild(ratingDiv);

    const userRatingText = document.createElement('span');
    userRatingText.className = 'user-rating';
    if (item.user_rating) {
        userRatingText.textContent = `Your rating: ${item.user_rating}`;
    } else {
        userRatingText.textContent = "You haven't rated this yet";
    }
    actionsDiv.appendChild(userRatingText);

    card.appendChild(actionsDiv);

    return card;
}

/* ======================
   PAGE INIT FUNCTIONS
   ====================== */

// INDEX PAGE (simple redirect based on auth)
async function initIndexPage() {
    const authed = await isAuthenticated();
    if (authed) {
        window.location.href = 'home.html';
    } else {
        // stay on index; it just shows preview links
    }
}

// LOGIN
function initLoginPage() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input[name="email"]')?.value.trim();
        const password = form.querySelector('input[name="password"]')?.value.trim();

        if (!email || !password) {
            showToast('Please enter your email and password.', 'error');
            return;
        }

        try {
            const { res, data } = await apiRequest('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            if (!res.ok) {
                console.error('Login failed:', data && data.error);
                showToast(data && data.error ? data.error : 'Login failed.', 'error');
                return;
            }

            showToast('Welcome back!', 'success');
            setTimeout(() => window.location.href = 'home.html', 600);
        } catch (err) {
            console.error('Login request failed:', err);
            showToast('Network error logging in.', 'error');
        }
    });
}

// REGISTER
function initRegisterPage() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.querySelector('input[name="username"]')?.value.trim();
        const email = form.querySelector('input[name="email"]')?.value.trim();
        const password = form.querySelector('input[name="password"]')?.value.trim();

        if (!username || !email || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        try {
            const { res, data } = await apiRequest('/auth/register', {
                method: 'POST',
                body: { username, email, password }
            });

            if (!res.ok) {
                console.error('Registration failed:', data && data.error);
                showToast(data && data.error ? data.error : 'Registration failed.', 'error');
                return;
            }

            showToast('Account created! Logging you in...', 'success');
            setTimeout(() => window.location.href = 'home.html', 800);
        } catch (err) {
            console.error('Register request failed:', err);
            showToast('Network error registering.', 'error');
        }
    });
}

// HOME (My Groups)
async function initHomePage() {
    const grid = document.getElementById('my-groups-grid') || document.querySelector('.groups-grid');
    if (!grid) return;

    grid.innerHTML = '<p class="loading">Loading your groups...</p>';

    try {
        const { res, data } = await apiRequest('/me/groups');
        if (res.status === 401) {
            window.location.href = 'login.html';
            return;
        }

        if (!res.ok) {
            console.error('Get my groups error:', data && data.error);
            grid.innerHTML = '<p class="error">Unable to load your groups.</p>';
            return;
        }

        const groups = data.groups || [];
        if (!groups.length) {
            grid.innerHTML = '<p class="empty-state">You haven’t joined any groups yet. Go to <a href="discover.html">Discover</a> to find some!</p>';
            return;
        }

        grid.innerHTML = '';
        groups.forEach(g => grid.appendChild(createMyGroupCard(g)));
    } catch (err) {
        console.error('initHomePage error:', err);
        grid.innerHTML = '<p class="error">Error loading your groups.</p>';
    }
}

// DISCOVER
function initDiscoverPage() {
    const grid = document.getElementById('discover-groups-grid') || document.querySelector('.groups-grid');
    const form = document.querySelector('.search-form');
    const input = form ? form.querySelector('input[name="q"]') : null;
    if (!grid) return;

    async function loadGroups(query = '') {
        grid.innerHTML = '<p class="loading">Loading groups...</p>';
        const qs = query ? `?q=${encodeURIComponent(query)}` : '';

        try {
            const { res, data } = await apiRequest(`/groups${qs}`);
            if (!res.ok) {
                console.error('Get groups error:', data && data.error);
                grid.innerHTML = '<p class="error">Unable to load groups.</p>';
                return;
            }

            const groups = data.groups || [];
            if (!groups.length) {
                grid.innerHTML = '<p class="empty-state">No groups found. Try a different search.</p>';
                return;
            }

            grid.innerHTML = '';
            groups.forEach(g => grid.appendChild(createDiscoverGroupCard(g)));
        } catch (err) {
            console.error('initDiscoverPage error:', err);
            grid.innerHTML = '<p class="error">Error loading groups.</p>';
        }
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const q = input ? input.value.trim() : '';
            loadGroups(q);
        });
    }

    loadGroups('');
}

// GROUP PAGE
async function initGroupPage() {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('id') || params.get('groupId');
    if (!groupId) return;

    const headerTitle = document.querySelector('.page-header h1');
    const headerSubtitle = document.querySelector('.page-header p');
    const itemsList = document.querySelector('.items-list');

    if (itemsList) {
        itemsList.innerHTML = '<p class="loading">Loading leaderboard...</p>';
    }

    try {
        const [groupResObj, lbResObj] = await Promise.all([
            apiRequest(`/groups/${groupId}`),
            apiRequest(`/groups/${groupId}/leaderboard`)
        ]);

        const { res: groupRes, data: groupData } = groupResObj;
        const { res: lbRes, data: lbData } = lbResObj;

        if (groupRes.ok && groupData && groupData.group) {
            const group = groupData.group;
            if (headerTitle) headerTitle.textContent = group.name;
            if (headerSubtitle) headerSubtitle.textContent = group.description;
        }

        if (!itemsList) return;

        if (!lbRes.ok) {
            console.error('Leaderboard error:', lbData && lbData.error);
            itemsList.innerHTML = '<p class="error">Unable to load leaderboard.</p>';
            return;
        }

        const leaderboard = lbData.leaderboard || [];
        if (!leaderboard.length) {
            itemsList.innerHTML = '<p class="empty-state">No items have been ranked yet. Be the first to add one!</p>';
        } else {
            itemsList.innerHTML = '';
            leaderboard.forEach(item => {
                itemsList.appendChild(createLeaderboardItemCard(item));
            });
            initStarRatings(itemsList);
        }

        // Add item form in modal
        const addItemForm = document.querySelector('#addItemModal form');
        if (addItemForm) {
            addItemForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = addItemForm.querySelector('input[name="name"]');
                const descInput = addItemForm.querySelector('textarea[name="description"]');
                const name = nameInput ? nameInput.value.trim() : '';
                const description = descInput ? descInput.value.trim() : '';

                if (!name) {
                    showToast('Item name is required.', 'error');
                    if (nameInput) nameInput.focus();
                    return;
                }

                try {
                    const { res, data } = await apiRequest(`/groups/${groupId}/items`, {
                        method: 'POST',
                        body: { name, description }
                    });

                    if (res.status === 401) {
                        window.location.href = 'login.html';
                        return;
                    }

                    if (!res.ok) {
                        console.error('Add item error:', data && data.error);
                        showToast(data && data.error ? data.error : 'Unable to add item.', 'error');
                        return;
                    }

                    showToast('Item added!', 'success');
                    if (nameInput) nameInput.value = '';
                    if (descInput) descInput.value = '';
                    closeAddItemModal();
                    setTimeout(() => window.location.reload(), 600);
                } catch (err) {
                    console.error('Add item request failed:', err);
                    showToast('Network error adding item.', 'error');
                }
            });
        }
    } catch (err) {
        console.error('initGroupPage error:', err);
        if (itemsList) {
            itemsList.innerHTML = '<p class="error">Error loading group.</p>';
        }
    }
}

// CREATE GROUP PAGE
async function initCreateGroupPage() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = form.querySelector('input[name="name"], input[name="group_name"]');
        const descInput = form.querySelector('textarea[name="description"], textarea[name="group_description"]');
        const visibilityInput = form.querySelector('select[name="visibility"], select[name="is_public"], input[name="is_public"], input[name="visibility"]');

        const name = nameInput ? nameInput.value.trim() : '';
        const description = descInput ? descInput.value.trim() : '';
        let is_public = true;

        if (visibilityInput) {
            if (visibilityInput.tagName === 'SELECT') {
                is_public = visibilityInput.value !== 'private';
            } else if (visibilityInput.type === 'checkbox') {
                is_public = visibilityInput.checked;
            } else {
                is_public = visibilityInput.value !== 'private';
            }
        }

        if (!name) {
            showToast('Please enter a group name.', 'error');
            if (nameInput) nameInput.focus();
            return;
        }

        try {
            const { res, data } = await apiRequest('/groups', {
                method: 'POST',
                body: { name, description, is_public }
            });

            if (res.status === 401) {
                window.location.href = 'login.html';
                return;
            }

            if (!res.ok) {
                console.error('Create group failed:', data && data.error);
                showToast(data && data.error ? data.error : 'Unable to create group.', 'error');
                return;
            }

            showToast('Group created!', 'success');

            const newGroupId =
                data?.group?.id ||
                data?.group?._id ||
                data?.id ||
                data?._id;

            setTimeout(() => {
                if (newGroupId) {
                    window.location.href = `group.html?id=${newGroupId}`;
                } else {
                    window.location.href = 'home.html';
                }
            }, 800);
        } catch (err) {
            console.error('Create group request failed:', err);
            showToast('Network error creating group.', 'error');
        }
    });
}

/* ======================
   DOMContentLoaded ROUTER
   ====================== */

document.addEventListener('DOMContentLoaded', () => {
    (async () => {
        const page = getPageName();

        initFormValidation();
        await initGlobalNav(); // uses /api/auth/me if available
        initStarRatings(document);

        // auth-based routing
        if (page === 'login' || page === 'register') {
            const redirected = await redirectIfAuthenticated();
            if (redirected) return;
        } else if (['home', 'discover', 'group', 'create-group'].includes(page)) {
            const ok = await ensureAuthenticated();
            if (!ok) return;
        }

        // page-specific init
        if (page === 'index') {
            await initIndexPage();
        } else if (page === 'login') {
            initLoginPage();
        } else if (page === 'register') {
            initRegisterPage();
        } else if (page === 'home') {
            await initHomePage();
        } else if (page === 'discover') {
            initDiscoverPage();
        } else if (page === 'group') {
            await initGroupPage();
        } else if (page === 'create-group') {
            await initCreateGroupPage();
        }
    })();
});
