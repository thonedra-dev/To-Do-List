'use strict';

// ═══════════════════════════════════════════════════════
//  THEME — same localStorage key as homepage.js
// ═══════════════════════════════════════════════════════
function toggleNotiTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem(
        'theme',
        document.body.classList.contains('light-mode') ? 'light' : 'dark'
    );
}

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let allNotifications = [];

const STATUS_INFO = {
    0: { cls: 'pending',  label: '⏳ Pending'  },
    1: { cls: 'accepted', label: '✅ Accepted' },
    2: { cls: 'denied',   label: '❌ Denied'   },
};

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════
function esc(str) {
    return String(str || '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;');
}

function fmtDate(raw) {
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Pull a value from the pre-formatted notification message.
 * e.g. extractField(msg, '📌') → everything after "📌 Project   : "
 */
function extractField(message, emoji) {
    const lines = (message || '').split('\n');
    for (const line of lines) {
        if (line.includes(emoji)) {
            const idx = line.indexOf(':');
            if (idx !== -1) return line.slice(idx + 1).trim();
        }
    }
    return '';
}

let toastTimer;
function showToast(msg, type = 'success') {
    const el = document.getElementById('toast');
    clearTimeout(toastTimer);
    el.textContent = msg;
    el.className   = `toast ${type} show`;
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ═══════════════════════════════════════════════════════
//  RED DOT
// ═══════════════════════════════════════════════════════
function updateDot(notifications) {
    const hasPending = notifications.some(n => n.acceptance_status === 0);
    document.getElementById('noti-dot-nav').classList.toggle('active', hasPending);
}

// ═══════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════
function renderAll() {
    const list  = document.getElementById('noti-list');
    const empty = document.getElementById('empty-state');
    list.innerHTML = '';

    if (allNotifications.length === 0) {
        empty.classList.add('visible');
        return;
    }
    empty.classList.remove('visible');

    // Newest first
    const sorted = [...allNotifications].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    sorted.forEach(n => list.appendChild(buildCard(n)));
    updateDot(allNotifications);
}

function buildCard(n) {
    const si  = STATUS_INFO[n.acceptance_status] ?? STATUS_INFO[0];
    const msg = n.message || '';

    const projectName = extractField(msg, '📌');
    const about       = extractField(msg, '📝');
    const coverPath   = extractField(msg, '📸');
    const section     = extractField(msg, '📂');
    const role        = extractField(msg, '🎯');
    const duties      = extractField(msg, '📋');
    const invitedBy   = extractField(msg, '👤');
    const email       = extractField(msg, '📧');
    const position    = extractField(msg, '💼');

    // Cover — portrait thumbnail, floated right
    let coverHtml = '';
    if (coverPath) {
        const src = `/static${coverPath.startsWith('/') ? coverPath : '/' + coverPath}`;
        coverHtml = `<img class="noti-cover-img" src="${esc(src)}" alt="Cover">`;
    }

    // Footer
    let footerHtml = '';
    if (n.acceptance_status === 0) {
        footerHtml = `
            <div class="card-footer">
                <button class="btn-accept" id="accept-btn-${n.noti_id}"
                    onclick="respond(${n.section_id},'accept',${n.noti_id})">
                    ✅ &nbsp;Accept
                </button>
                <button class="btn-deny" id="deny-btn-${n.noti_id}"
                    onclick="respond(${n.section_id},'deny',${n.noti_id})">
                    ❌ &nbsp;Deny
                </button>
            </div>`;
    } else {
        const word = n.acceptance_status === 1
            ? '✅ You accepted this invitation.'
            : '❌ You declined this invitation.';
        footerHtml = `<div class="card-footer"><span class="responded-label">${word}</span></div>`;
    }

    const initial = (invitedBy || '?')[0].toUpperCase();

    const card = document.createElement('div');
    card.className = `noti-card ${si.cls}`;
    card.id        = `noti-card-${n.noti_id}`;
    card.innerHTML = `
        <div class="card-header">
            <span class="card-time">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${fmtDate(n.created_at)}
            </span>
            <span class="status-pill ${si.cls}">${si.label}</span>
        </div>

        <div class="card-body">
            <div class="card-content-wrap">
                ${coverHtml}
                <div class="project-name-headline">${esc(projectName) || 'Untitled Project'}</div>
                ${about ? `<div class="project-about">${esc(about)}</div>` : ''}

                <div class="info-grid">
                    <div class="info-cell">
                        <div class="info-label">📂 Section</div>
                        <div class="info-value">${esc(section) || '—'}</div>
                    </div>
                    <div class="info-cell">
                        <div class="info-label">🎯 Role</div>
                        <div class="info-value">${esc(role) || '—'}</div>
                    </div>
                    ${duties ? `
                    <div class="info-cell full">
                        <div class="info-label">📋 Duties</div>
                        <div class="info-value">${esc(duties)}</div>
                    </div>` : ''}
                </div>

                <div class="invited-strip">
                    <div class="invited-avatar">${esc(initial)}</div>
                    <div class="invited-text">
                        <div class="invited-name">Invited by ${esc(invitedBy) || '—'}</div>
                        <div class="invited-meta">
                            ${esc(email) || ''}${position ? ' · ' + esc(position) : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        ${footerHtml}
    `;
    return card;
}

// ═══════════════════════════════════════════════════════
//  FETCH NOTIFICATIONS
// ═══════════════════════════════════════════════════════
async function loadNotifications() {
    try {
        const res  = await fetch('/notifications');
        const data = await res.json();

        document.getElementById('skeleton-wrap').style.display = 'none';

        if (!data.success) {
            showToast('Failed to load notifications.', 'error');
            return;
        }

        allNotifications = data.notifications || [];
        renderAll();

    } catch (err) {
        document.getElementById('skeleton-wrap').style.display = 'none';
        showToast('Network error. Please refresh.', 'error');
    }
}

// ═══════════════════════════════════════════════════════
//  RESPOND  →  POST /respond_invitation
// ═══════════════════════════════════════════════════════
async function respond(sectionId, response, notiId) {
    const aBtn = document.getElementById(`accept-btn-${notiId}`);
    const dBtn = document.getElementById(`deny-btn-${notiId}`);
    [aBtn, dBtn].forEach(b => { if (b) b.disabled = true; });

    try {
        const fd = new FormData();
        fd.append('section_id', sectionId);
        fd.append('response',   response);

        const res  = await fetch('/respond_invitation', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
            showToast(
                response === 'accept' ? 'Invitation accepted ✅' : 'Invitation denied ❌',
                'success'
            );
            const noti = allNotifications.find(n => n.noti_id === notiId);
            if (noti) noti.acceptance_status = response === 'accept' ? 1 : 2;
            renderAll();
        } else {
            showToast(data.message || 'Could not respond. Try again.', 'error');
            [aBtn, dBtn].forEach(b => { if (b) b.disabled = false; });
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
        [aBtn, dBtn].forEach(b => { if (b) b.disabled = false; });
    }
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', loadNotifications);