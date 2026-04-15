const API_BASE = 'http://localhost:5000/api';
let allSlots = [];
let allReservations = [];
let allUsers = [];
let activityLogs = [];
let navigationMode = null;

function showMessage(message, type = 'error') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (token) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
    return {
        'Content-Type': 'application/json'
    };
}

function checkAuth() {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        
        if (user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return false;
        }
        
        document.getElementById('adminName').textContent = user.name;
        document.getElementById('adminAvatar').textContent = user.name.charAt(0).toUpperCase();
    } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

async function loadAdminDashboard() {
    const isAuth = checkAuth();
    if (!isAuth) return;
    
    await loadDashboard();
    await loadSlots();
    setInterval(refreshData, 5000);
}

async function refreshData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadDashboard();
    await loadSlots();
}

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load dashboard');
        
        const data = await response.json();
        
        document.getElementById('totalSlots').textContent = data.dashboard.parking.total_slots;
        document.getElementById('availableSlots').textContent = data.dashboard.parking.available;
        document.getElementById('occupiedSlots').textContent = data.dashboard.parking.occupied;
        document.getElementById('totalUsers').textContent = data.dashboard.users.total;
        
        const footerAvailable = document.getElementById('footerAvailable');
        const footerOccupied = document.getElementById('footerOccupied');
        const footerReserved = document.getElementById('footerReserved');
        
        if (footerAvailable) footerAvailable.textContent = data.dashboard.parking.available;
        if (footerOccupied) footerOccupied.textContent = data.dashboard.parking.occupied;
        if (footerReserved) footerReserved.textContent = data.dashboard.parking.reserved;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadSlots() {
    try {
        const response = await fetch(`${API_BASE}/parking/slots`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load slots');
        
        const data = await response.json();
        allSlots = data.slots;
        
        renderAdminParkingGrid(allSlots);
    } catch (error) {
        console.error('Error loading slots:', error);
    }
}

function renderAdminParkingGrid(slots) {
    const grid = document.getElementById('adminParkingGrid');
    grid.innerHTML = '';
    
    const gridByRow = {};
    slots.forEach(slot => {
        if (!gridByRow[slot.row_num]) {
            gridByRow[slot.row_num] = [];
        }
        gridByRow[slot.row_num].push(slot);
    });
    
    const sortedRows = Object.keys(gridByRow).sort((a, b) => a - b);
    const totalRows = sortedRows.length;
    
    slots.forEach(slot => {
        const rowIndex = sortedRows.indexOf(String(slot.row_num));
        const totalCols = gridByRow[slot.row_num].length;
        slot.calculated_distance = calculateDistanceAdmin(rowIndex, slot.col_num, totalRows, totalCols);
    });
    
    sortedRows.forEach((rowNum, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'parking-row';
        
        const sidewalk = document.createElement('div');
        sidewalk.className = 'sidewalk';
        
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = String.fromCharCode(65 + parseInt(rowNum));
        sidewalk.appendChild(rowLabel);
        rowDiv.appendChild(sidewalk);
        
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'slots-container';
        
        gridByRow[rowNum].sort((a, b) => a.col_num - b.col_num).forEach(slot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = `slot ${slot.status}`;
            slotDiv.setAttribute('data-slot-id', slot.id);
            slotDiv.setAttribute('data-row', rowNum);
            slotDiv.setAttribute('data-col', slot.col_num);
            slotDiv.setAttribute('data-distance', slot.calculated_distance);
            slotDiv.innerHTML = `
                <span class="slot-code">${slot.slot_code}</span>
                <span class="slot-type">${getAdminSlotTypeIcon(slot.slot_type)}</span>
            `;
            slotDiv.title = `Slot ${slot.slot_code}\nType: ${slot.slot_type}\nStatus: ${slot.status}\nDistance: ${slot.calculated_distance}m`;
            slotDiv.onclick = () => {
                if (navigationMode) {
                    const gate = navigationMode;
                    clearNavigationMode();
                    drawPathFromGateToSlot(slot, gate);
                } else {
                    editSlot(slot);
                }
            };
            slotsContainer.appendChild(slotDiv);
        });
        
        rowDiv.appendChild(slotsContainer);
        grid.appendChild(rowDiv);
    });
}

function calculateDistanceAdmin(rowIndex, colIndex, totalRows, totalCols) {
    const ROAD_WIDTH = 8;
    const SLOT_DEPTH = 10;
    const ENTRY_OFFSET = 5;
    
    const rowDistance = (rowIndex * (SLOT_DEPTH + ROAD_WIDTH)) + ENTRY_OFFSET + SLOT_DEPTH;
    const colDistance = (colIndex * 8) + 5;
    const totalDistance = rowDistance + colDistance;
    
    return Math.round(totalDistance * 1.15);
}

function getAdminSlotTypeIcon(slotType) {
    const icons = {
        'standard': '&#9632;',
        'compact': '&#9633;',
        'electric': '&#9889;',
        'handicap': '&#9855;'
    };
    return icons[slotType] || icons['standard'];
}

function setNavigationMode(mode) {
    if (navigationMode === mode) {
        navigationMode = null;
        clearNavigationMode();
        showMessage('Navigation mode cancelled', 'success');
    } else {
        navigationMode = mode;
        const entryBtn = document.getElementById('entryBtn');
        const exitBtn = document.getElementById('exitBtn');
        const indicator = document.getElementById('navModeIndicator');
        const navModeText = document.getElementById('navModeText');
        
        if (mode === 'entry') {
            entryBtn.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.8)';
            exitBtn.style.boxShadow = 'none';
            indicator.style.background = 'rgba(16, 185, 129, 0.9)';
            navModeText.textContent = 'Click a slot to see path from ENTRY';
        } else {
            exitBtn.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
            entryBtn.style.boxShadow = 'none';
            indicator.style.background = 'rgba(239, 68, 68, 0.9)';
            navModeText.textContent = 'Click a slot to see path from EXIT';
        }
        indicator.style.display = 'block';
        showMessage(`${mode.toUpperCase()} mode: Click any slot to see the path`, 'success');
    }
}

function clearNavigationMode() {
    navigationMode = null;
    const entryBtn = document.getElementById('entryBtn');
    const exitBtn = document.getElementById('exitBtn');
    const indicator = document.getElementById('navModeIndicator');
    
    if (entryBtn) entryBtn.style.boxShadow = 'none';
    if (exitBtn) exitBtn.style.boxShadow = 'none';
    if (indicator) indicator.style.display = 'none';
}

function drawPathFromGateToSlot(slot, gate = 'entry') {
    const grid = document.getElementById('adminParkingGrid');
    const containerRect = document.querySelector('.parking-area').getBoundingClientRect();
    const parkingLayout = document.querySelector('.real-parking-lot-layout');
    const layoutRect = parkingLayout.getBoundingClientRect();
    
    const slotElement = document.querySelector(`[data-slot-id="${slot.id}"]`);
    if (!slotElement) return;
    
    const slotRect = slotElement.getBoundingClientRect();
    
    let pathOverlay = document.getElementById('pathOverlay');
    if (!pathOverlay) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'pathOverlay';
        svg.className = 'path-overlay';
        svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:20;';
        document.querySelector('.parking-area').appendChild(svg);
        pathOverlay = svg;
    }
    
    const isEntry = gate === 'entry';
    const startX = isEntry ? 40 : layoutRect.width - 40;
    const startY = containerRect.height / 2;
    
    const endX = slotRect.left - containerRect.left + slotRect.width / 2;
    const endY = slotRect.top - containerRect.top + slotRect.height / 2;
    
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 30;
    
    const pathD = `M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`;
    
    const startColor = isEntry ? '#10b981' : '#ef4444';
    const endColor = '#6366f1';
    
    pathOverlay.innerHTML = `
        <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="${endColor}"/>
            </marker>
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        <circle cx="${startX}" cy="${startY}" r="16" fill="${startColor}" filter="url(#glow)">
            <animate attributeName="r" values="14;18;14" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <text x="${startX}" y="${startY + 4}" text-anchor="middle" fill="white" font-size="10" font-weight="700">${isEntry ? 'IN' : 'OUT'}</text>
        
        <path d="${pathD}" stroke="url(#pathGradient)" stroke-width="5" fill="none" marker-end="url(#arrowhead)" filter="url(#glow)"/>
        
        <circle cx="${endX}" cy="${endY}" r="24" fill="rgba(99, 102, 241, 0.3)">
            <animate attributeName="r" values="20;28;20" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="${endX}" cy="${endY}" r="10" fill="${endColor}" filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
        </circle>
        
        <text x="${endX}" y="${endY + 4}" text-anchor="middle" fill="white" font-size="10" font-weight="700">${slot.slot_code}</text>
        
        <rect x="${endX - 45}" y="${endY - 40}" width="90" height="28" rx="14" fill="rgba(99, 102, 241, 0.95)"/>
        <text x="${endX}" y="${endY - 20}" text-anchor="middle" fill="white" font-size="11" font-weight="600">
            ${slot.entrance_distance || 10}m from ${gate}
        </text>
    `;
}

function editSlot(slot) {
    if (navigationMode) {
        const gate = navigationMode;
        clearNavigationMode();
        drawPathFromGateToSlot(slot, gate);
        return;
    }
    document.getElementById('editSlotId').value = slot.id;
    document.getElementById('editSlotCode').textContent = slot.slot_code;
    document.getElementById('editSlotStatus').value = slot.status;
    document.getElementById('slotEditModal').style.display = 'block';
}

document.getElementById('slotEditForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const slotId = document.getElementById('editSlotId').value;
    const status = document.getElementById('editSlotStatus').value;
    
    try {
        const response = await fetch(`${API_BASE}/admin/slots/${slotId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showMessage('Slot status updated successfully!', 'success');
            closeModal('slotEditModal');
            loadDashboard();
            loadSlots();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to update slot');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
});

async function loadAllReservations() {
    try {
        const response = await fetch(`${API_BASE}/admin/reservations`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load reservations');
        
        const data = await response.json();
        allReservations = data.reservations;
        
        renderAllReservations(allReservations);
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

function renderAllReservations(reservations) {
    const list = document.getElementById('allReservations');
    
    if (reservations.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <p style="font-size: 16px; margin-bottom: 8px;">No reservations found</p>
                <p style="font-size: 13px;">All reservations will appear here</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = reservations.map(res => `
        <div class="reservation-card">
            <div class="reservation-info">
                <div class="reservation-slot" style="background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);">
                    <div class="reservation-slot-code">${res.slot_code}</div>
                </div>
                <div class="reservation-details">
                    <h4>${res.user_name}</h4>
                    <p style="color: var(--text-muted); font-size: 13px;">${res.user_email}</p>
                    <div class="reservation-meta">
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            ${res.reservation_date}
                        </div>
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            ${res.start_time} - ${res.end_time}
                        </div>
                        ${res.vehicle_plate ? `
                            <div class="reservation-meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8zM5 19a2 2 0 100-4 2 2 0 000 4zM19 19a2 2 0 100-4 2 2 0 000 4z"/></svg>
                                ${res.vehicle_plate}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="reservation-actions">
                <span style="
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    background: ${getStatusBgColor(res.status)};
                    color: ${getStatusColor(res.status)};
                ">${res.status}</span>
                ${res.status !== 'cancelled' && res.status !== 'completed' ? 
                    `<button class="btn btn-danger btn-small" onclick="updateReservationStatus(${res.id}, 'cancelled')">Cancel</button>
                     <button class="btn btn-primary btn-small" onclick="updateReservationStatus(${res.id}, 'completed')">Complete</button>` : ''}
            </div>
        </div>
    `).join('');
}

function getStatusBgColor(status) {
    const colors = {
        'confirmed': 'rgba(16, 185, 129, 0.1)',
        'pending': 'rgba(245, 158, 11, 0.1)',
        'completed': 'rgba(99, 102, 241, 0.1)',
        'cancelled': 'rgba(239, 68, 68, 0.1)'
    };
    return colors[status] || 'rgba(148, 163, 184, 0.1)';
}

function getStatusColor(status) {
    const colors = {
        'confirmed': '#10b981',
        'pending': '#f59e0b',
        'completed': '#6366f1',
        'cancelled': '#ef4444'
    };
    return colors[status] || '#94a3b8';
}

async function updateReservationStatus(reservationId, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/reservations/${reservationId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showMessage(`Reservation marked as ${status}`, 'success');
            loadAllReservations();
            loadDashboard();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to update reservation');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
}

async function loadAllUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const data = await response.json();
        allUsers = data.users;
        
        renderAllUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderAllUsers(users) {
    const list = document.getElementById('usersList');
    
    if (users.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <p style="font-size: 16px; margin-bottom: 8px;">No users found</p>
                <p style="font-size: 13px;">Registered users will appear here</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = users.map(user => `
        <div class="reservation-card">
            <div class="reservation-info">
                <div class="reservation-slot" style="background: ${user.role === 'admin' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)'}">
                    <div style="font-size: 20px; font-weight: 700; color: white;">${user.name.charAt(0).toUpperCase()}</div>
                </div>
                <div class="reservation-details">
                    <h4>${user.name}</h4>
                    <p style="color: var(--text-muted); font-size: 13px;">${user.email}</p>
                    <div class="reservation-meta">
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            Joined ${new Date(user.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
            <div class="reservation-actions">
                <span style="
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    background: ${user.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
                    color: ${user.role === 'admin' ? '#ef4444' : '#6366f1'};
                ">${user.role}</span>
            </div>
        </div>
    `).join('');
}

async function loadActivityLogs() {
    try {
        const response = await fetch(`${API_BASE}/admin/activity`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load activity logs');
        
        const data = await response.json();
        activityLogs = data.activity_logs;
        
        renderActivityLogs(activityLogs);
    } catch (error) {
        console.error('Error loading activity logs:', error);
    }
}

function renderActivityLogs(logs) {
    const list = document.getElementById('activityLogs');
    
    if (logs.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
                <p style="font-size: 16px; margin-bottom: 8px;">No activity logs</p>
                <p style="font-size: 13px;">System activities will be logged here</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = logs.map(log => `
        <div class="reservation-card">
            <div class="reservation-info">
                <div class="reservation-slot" style="background: linear-gradient(135deg, var(--info) 0%, #0891b2 100%);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                </div>
                <div class="reservation-details">
                    <h4>${log.action}</h4>
                    <p style="color: var(--text-muted); font-size: 13px;">${log.user_name || 'System'}</p>
                    <div class="reservation-meta">
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            ${new Date(log.created_at).toLocaleString()}
                        </div>
                        ${log.ip_address ? `
                            <div class="reservation-meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                                ${log.ip_address}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function showAdminTab(tab) {
    const tabs = ['slots', 'reservations', 'users', 'activity'];
    const tabBtns = document.querySelectorAll('.admin-tabs .tab-btn');
    
    tabs.forEach((t, index) => {
        const content = document.getElementById(`${t}Tab`);
        if (t === tab) {
            content.style.display = 'block';
            tabBtns[index].classList.add('active');
            tabBtns[index].style.background = 'var(--primary)';
            tabBtns[index].style.color = 'white';
            tabBtns[index].style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
        } else {
            content.style.display = 'none';
            tabBtns[index].classList.remove('active');
            tabBtns[index].style.background = 'var(--bg-glass)';
            tabBtns[index].style.color = 'var(--text-secondary)';
            tabBtns[index].style.boxShadow = 'none';
        }
    });
    
    if (tab === 'reservations') loadAllReservations();
    if (tab === 'users') loadAllUsers();
    if (tab === 'activity') loadActivityLogs();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

if (document.getElementById('adminParkingGrid')) {
    loadAdminDashboard();
}
