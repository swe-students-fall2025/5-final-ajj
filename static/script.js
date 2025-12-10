/* ======================
   STAR RATING SYSTEM
   ====================== */

// Initialize star rating functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    const starRatings = document.querySelectorAll('.star-rating');
    
    starRatings.forEach(rating => {
        const stars = rating.querySelectorAll('.star');
        const itemId = rating.dataset.itemId;
        
        stars.forEach((star, index) => {
            // Click handler - submit rating
            star.addEventListener('click', async () => {
                const score = parseInt(star.dataset.score);
                
                try {
                    /* 
                        BACKEND TODO:
                        - Endpoint: POST /item/<item_id>/rank
                        - Accept JSON body: {score: 1-5}
                        - Return JSON: {success: true} or {error: "message"}
                        
                        For now, this will fail gracefully in preview mode
                    */
                    const response = await fetch(`/item/${itemId}/rank`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ score })
                    });
                    
                    if (response.ok) {
                        // Update star display
                        stars.forEach((s, i) => {
                            if (i < score) {
                                s.classList.add('active');
                            } else {
                                s.classList.remove('active');
                            }
                        });
                        
                        // Reload page to show updated ranking
                        setTimeout(() => {
                            location.reload();
                        }, 500);
                    } else {
                        console.log('Backend not connected - star rating displayed locally only');
                        // Still update the UI for preview purposes
                        stars.forEach((s, i) => {
                            if (i < score) {
                                s.classList.add('active');
                            } else {
                                s.classList.remove('active');
                            }
                        });
                    }
                } catch (error) {
                    console.log('Preview mode - backend not connected');
                    // Update UI anyway for preview
                    stars.forEach((s, i) => {
                        if (i < score) {
                            s.classList.add('active');
                        } else {
                            s.classList.remove('active');
                        }
                    });
                }
            });
            
            // Hover effect - preview rating
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    if (i <= index) {
                        s.style.color = '#f59e0b';
                    } else {
                        s.style.color = '';
                    }
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
});

/* ======================
   MODAL FUNCTIONS
   ====================== */

function showAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeAddItemModal() {
    const modal = document.getElementById('addItemModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside of it
window.addEventListener('click', function(event) {
    const modal = document.getElementById('addItemModal');
    if (modal && event.target === modal) {
        closeAddItemModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('addItemModal');
        if (modal && modal.style.display === 'block') {
            closeAddItemModal();
        }
    }
});

/* ======================
   JOIN/LEAVE GROUP FUNCTIONS
   ====================== */

async function joinGroup(groupId) {
    try {
        /* 
            BACKEND TODO:
            - Endpoint: POST /group/<group_id>/join
            - Return JSON: {success: true} or {error: "message"}
            - Add current user to group's members list
        */
        const response = await fetch(`/group/${groupId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            // Update button to show "Leave"
            const btn = document.getElementById(`btn-${groupId}`);
            if (btn) {
                btn.textContent = 'Leave';
                btn.className = 'btn btn-secondary btn-sm';
                btn.onclick = () => leaveGroup(groupId);
            }
        } else {
            console.log('Backend not connected - button toggled locally only');
            // Update UI anyway for preview
            const btn = document.getElementById(`btn-${groupId}`);
            if (btn) {
                btn.textContent = 'Leave';
                btn.className = 'btn btn-secondary btn-sm';
                btn.onclick = () => leaveGroup(groupId);
            }
        }
    } catch (error) {
        console.log('Preview mode - backend not connected');
        // Update UI for preview
        const btn = document.getElementById(`btn-${groupId}`);
        if (btn) {
            btn.textContent = 'Leave';
            btn.className = 'btn btn-secondary btn-sm';
            btn.onclick = () => leaveGroup(groupId);
        }
    }
}

async function leaveGroup(groupId) {
    try {
        /* 
            BACKEND TODO:
            - Endpoint: POST /group/<group_id>/leave
            - Return JSON: {success: true} or {error: "message"}
            - Remove current user from group's members list
        */
        const response = await fetch(`/group/${groupId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            // Update button to show "Join"
            const btn = document.getElementById(`btn-${groupId}`);
            if (btn) {
                btn.textContent = 'Join';
                btn.className = 'btn btn-primary btn-sm';
                btn.onclick = () => joinGroup(groupId);
            }
        } else {
            console.log('Backend not connected - button toggled locally only');
            // Update UI anyway for preview
            const btn = document.getElementById(`btn-${groupId}`);
            if (btn) {
                btn.textContent = 'Join';
                btn.className = 'btn btn-primary btn-sm';
                btn.onclick = () => joinGroup(groupId);
            }
        }
    } catch (error) {
        console.log('Preview mode - backend not connected');
        // Update UI for preview
        const btn = document.getElementById(`btn-${groupId}`);
        if (btn) {
            btn.textContent = 'Join';
            btn.className = 'btn btn-primary btn-sm';
            btn.onclick = () => joinGroup(groupId);
        }
    }
}

/* ======================
   AUTO-HIDE ALERTS
   ====================== */

// Automatically hide flash messages after 5 seconds
setTimeout(() => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        alert.style.transition = 'opacity 0.5s ease';
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 500);
    });
}, 5000);

/* ======================
   FORM VALIDATION
   ====================== */

// Add basic client-side validation for forms
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
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
});