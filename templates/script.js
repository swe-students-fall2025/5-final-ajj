/* ======================
   API + PAGE HELPERS
   ====================== */

const API_BASE = '/api';

/**
 * Generic JSON fetch helper.
 */
async function apiRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const opts = {
        method: options.method || 'GET',
        credentials: 'include', // send session cookie
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
        // no JSON body, ignore
    }

    return { res, data };
}

/**
 * Figure out which page we’re on based on pathname.
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

    // allow CSS transition to kick in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 250);
    }, timeout);
}

/* ======================
   MODAL FUNCTIONS (Add Item)
   ====================== */

function showAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) modal.style.display = 'block';
}

function closeAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) modal.style.display = 'none';
}

// Close modal with Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('addItemModal');
        if (modal && modal.style.display === 'block') {
            closeAddItemModal();
        }
    }
});

/* ======================
   JOIN / LEAVE GROUP (BACKEND)
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
            alert(data && data.error ? data.error : 'Unable to join group');
            return;
        }

        const btn = document.getElementById(`btn-${groupId}`);
        if (btn) {
            btn.textContent = 'Leave';
            btn.className = 'btn btn-secondary btn-sm';
            btn.onclick = () => leaveGroup(groupId);
        }
    } catch (error) {
        console.error('Join group request failed:', error);
        alert('Unable to join group. Please try again.');
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
            alert(data && data.error ? data.error : 'Unable to leave group');
            return;
        }

        const btn = document.getElementById(`btn-${groupId}`);
        if (btn) {
            btn.textContent = 'Join';
            btn.className = 'btn btn-primary btn-sm';
            btn.onclick = () => joinGroup(groupId);
        }
    } catch (error) {
        console.error('Leave group request failed:', error);
        alert('Unable to leave group. Please try again.');
    }
}

/* ======================
   STAR RATING SYSTEM (BACKEND)
   ====================== */

function initStarRatings(root = document) {
    const starRatings = root.querySelectorAll('.star-rating');

    starRatings.forEach(rating => {
        const stars = rating.querySelectorAll('.star');
        const itemId = rating.dataset.itemId;
        if (!itemId) return;

        // Click → send rating to API
        stars.forEach(star => {
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
                        alert(data && data.error ? data.error : 'Unable to submit rating');
                        return;
                    }

                    // Highlight selected stars
                    stars.forEach(s => {
                        const sScore = parseInt(s.dataset.score, 10);
                        s.classList.toggle('active', sScore <= score);
                    });

                    // Reload to refresh averages / leaderboard
                    setTimeout(() => window.location.reload(), 400);
                } catch (error) {
                    console.error('Rating request failed:', error);
                    alert('Unable to submit rating. Please try again.');
                }
            });

            // Hover effect (visual only)
            star.addEventListener('mouseenter', () => {
                const hoverScore = parseInt(star.dataset.score, 10);
                stars.forEach((s, idx) => {
                    s.style.color = idx < hoverScore ? 'var(--accent)' : '';
                });
            });
        });

        // Reset hover effect when mouse leaves
        rating.addEventListener('mouseleave', () => {
            stars.forEach(s => {
                s.style.color = '';
            });
        });
    });
}

/* ======================
   AUTH PAGES (LOGIN / REGISTER) 
   ====================== */

function initLoginPage() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = form.querySelector('input[name="email"]')?.value.trim();
        const password = form.querySelector('input[name="password"]')?.value.trim();

        if (!email || !password) {
            alert('Please enter your email and password.');
            return;
        }

        try {
            const { res, data } = await apiRequest('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            if (!res.ok) {
                console.error('Login failed:', data && data.error);
                alert(data && data.error ? data.error : 'Login failed');
                return;
            }

            window.location.href = 'home.html';
        } catch (err) {
            console.error('Login request failed:', err);
            alert('Unable to login. Please try again.');
        }
    });
}

function initRegisterPage() {
    const form = document.querySelector('form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = form.querySelector('input[name="username"]')?.value.trim();
        const email = form.querySelector('input[name="email"]')?.value.trim();
        const password = form.querySelector('input[name="password"]')?.value.trim();

        if (!username || !email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const { res, data } = await apiRequest('/auth/register', {
                method: 'POST',
                body: { username, email, password }
            });

            if (!res.ok) {
                console.error('Registration failed:', data && data.error);
                alert(data && data.error ? data.error : 'Registration failed');
                return;
            }

            window.location.href = 'home.html';
        } catch (err) {
            console.error('Register request failed:', err);
            alert('Unable to register. Please try again.');
        }
    });
}

/* ======================
   GLOBAL NAV (LOGOUT)
   ====================== */

function initGlobalNav() {
    const logoutLink = document.querySelector('.btn-logout');
    if (!logoutLink) return;

    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await apiRequest('/auth/logout', { method: 'POST' });
        } catch (_) {
            // ignore errors, just send back to login
        }
        window.location.href = 'login.html';
    });
}

/* ======================
   SIMPLE FORM VALIDATION
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
                    input.style.borderColor = 'var(--error)';
                } else {
                    input.style.borderColor = '';
                }
            });

            if (!isValid) {
                e.preventDefault();
                console.log('Form validation failed - please fill in all required fields');
            }
        });
    });
}

/* ======================
   GROUP CARD HELPERS
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

    btn.id = `btn-${groupId}`;  // <<-- stable group button ID
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

    // Star rating UI for this item
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
            grid.innerHTML = '<p class="error">Unable to load your groups.</p>';
            console.error('Get my groups error:', data && data.error);
            return;
        }

        const groups = data.groups || [];
        if (!groups.length) {
            grid.innerHTML = '<p class="empty-state">You haven’t joined any groups yet. Go to <a href="discover.html">Discover</a> to find some!</p>';
            return;
        }

        grid.innerHTML = '';
        groups.forEach(group => {
            grid.appendChild(createMyGroupCard(group));
        });
    } catch (err) {
        console.error('initHomePage error:', err);
        grid.innerHTML = '<p class="error">Error loading your groups.</p>';
    }
}

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
                grid.innerHTML = '<p class="error">Unable to load groups.</p>';
                console.error('Get groups error:', data && data.error);
                return;
            }

            const groups = data.groups || [];
            if (!groups.length) {
                grid.innerHTML = '<p class="empty-state">No groups found. Try a different search.</p>';
                return;
            }

            grid.innerHTML = '';
            groups.forEach(group => {
                grid.appendChild(createDiscoverGroupCard(group));
            });
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

    // Initial load (no search filter)
    loadGroups('');
}

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

        // default: public
        let is_public = true;
        if (visibilityInput) {
            if (visibilityInput.tagName === 'SELECT') {
                // value 'private' or 'public'
                is_public = visibilityInput.value !== 'private';
            } else if (visibilityInput.type === 'checkbox') {
                // checked = public (or private, depending on your UI)
                is_public = visibilityInput.checked;
            } else {
                // plain input with 'public' / 'private'
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
                body: {
                    name,
                    description,
                    is_public
                }
            });

            if (res.status === 401) {
                // not logged in
                window.location.href = 'login.html';
                return;
            }

            if (!res.ok) {
                console.error('Create group failed:', data && data.error);
                showToast(data && data.error ? data.error : 'Unable to create group.', 'error');
                return;
            }

            showToast('Group created!', 'success');

            // backend might return {id: ..., ...} or {group: {id: ...}}
            const newGroupId =
                data?.id ||
                data?.group?.id ||
                data?.group?._id ||
                data?._id;

            // a tiny delay so the user sees the toast
            setTimeout(() => {
                if (newGroupId) {
                    window.location.href = `group.html?id=${newGroupId}`;
                } else {
                    window.location.href = 'home.html';
                }
            }, 800);
        } catch (err) {
            console.error('Create group request failed:', err);
            showToast('Network error creating group. Please try again.', 'error');
        }
    });
}

async function initGroupPage() {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('id') || params.get('groupId');

    if (!groupId) {
        console.warn('No group id in URL for group.html');
        return;
    }

    const headerTitle = document.querySelector('.page-header h1');
    const headerSubtitle = document.querySelector('.page-header p');
    const itemsList = document.querySelector('.items-list');

    if (itemsList) {
        itemsList.innerHTML = '<p class="loading">Loading leaderboard...</p>';
    }

    try {
        // Load group details + leaderboard in parallel
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
            itemsList.innerHTML = '<p class="error">Unable to load leaderboard.</p>';
            console.error('Leaderboard error:', lbData && lbData.error);
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
            initStarRatings(itemsList); // attach click handlers
        }

        // Hook up Add Item form
        const addItemForm = document.querySelector('#addItemModal form');
        if (addItemForm) {
            addItemForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const nameInput = addItemForm.querySelector('input[name="name"]');
                const descInput = addItemForm.querySelector('textarea[name="description"]');

                const name = nameInput ? nameInput.value.trim() : '';
                const description = descInput ? descInput.value.trim() : '';

                if (!name) {
                    alert('Item name is required.');
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
                        alert(data && data.error ? data.error : 'Unable to add item');
                        return;
                    }

                    // Clear fields, close modal, and reload leaderboard
                    if (nameInput) nameInput.value = '';
                    if (descInput) descInput.value = '';
                    closeAddItemModal();
                    window.location.reload();
                } catch (err) {
                    console.error('Add item request failed:', err);
                    alert('Unable to add item. Please try again.');
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

/* ======================
   DOMContentLoaded ROUTER
   ====================== */

document.addEventListener('DOMContentLoaded', () => {
    const page = getPageName();

    initFormValidation();
    initGlobalNav();
    initStarRatings(document);

    if (page === 'login') {
        initLoginPage();
    } else if (page === 'register') {
        initRegisterPage();
    } else if (page === 'home') {
        initHomePage();
    } else if (page === 'discover') {
        initDiscoverPage();
    } else if (page === 'group') {
        initGroupPage();
    } else if (page === 'create-group') {
        initCreateGroupPage();
    }
});

