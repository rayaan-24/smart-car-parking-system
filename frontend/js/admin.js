const API_BASE = 'http://localhost:5000/api';
let allSlots = [];
let allReservations = [];
let allUsers = [];
let activityLogs = [];
let navigationMode = null;

const CONFIG = {
    TOTAL_SLOTS: 30,
    ROWS: 3,
    COLS: 10
};

const ENTRY_POSITION = { x: -130, y: 240 };   // Entry gate position (Zone B level)
const EXIT_POSITION = { x: 1150, y: 240 }; 

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
    console.log('Loading dashboard data...');
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: getAuthHeaders()
        });
        
        console.log('Dashboard response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.error('Auth failed, redirecting...');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load dashboard');
        
        const data = await response.json();
        console.log('Dashboard data:', data);
        
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
    console.log('Loading slots...');
    try {
        const response = await fetch(`${API_BASE}/parking/slots`, {
            headers: getAuthHeaders()
        });
        
        console.log('Slots response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.error('Auth failed, redirecting...');
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load slots');
        
        const data = await response.json();
        console.log('Slots loaded:', data.slots ? data.slots.length : 0, 'slots');
        const limitedSlots = data.slots.slice(0, CONFIG.TOTAL_SLOTS);
        
        const rowLabels = ['A', 'B', 'C'];
        allSlots = limitedSlots.map((slot, index) => {
            const rowIndex = Math.floor(index / CONFIG.COLS);
            const colIndex = index % CONFIG.COLS;
            
            return {
                ...slot,
                row: rowLabels[rowIndex],
                col: colIndex + 1,
                distance: calculateSlotDistance(rowLabels[rowIndex], colIndex + 1)
            };
        });
        
        renderAdminParkingGrid(allSlots);
    } catch (error) {
        console.error('Error loading slots:', error);
        generateDemoSlots();
        renderAdminParkingGrid(allSlots);
    }
}

function generateDemoSlots() {
    const rowLabels = ['A', 'B', 'C'];
    const statuses = ['available', 'occupied', 'reserved', 'maintenance'];
    
    allSlots = [];
    for (let i = 0; i < CONFIG.TOTAL_SLOTS; i++) {
        const rowIndex = Math.floor(i / CONFIG.COLS);
        const colIndex = i % CONFIG.COLS;
        const rand = Math.random();
        
        let status;
        if (rand < 0.4) status = 'available';
        else if (rand < 0.75) status = 'occupied';
        else if (rand < 0.9) status = 'reserved';
        else status = 'maintenance';
        
        const row = rowLabels[rowIndex];
        const col = colIndex + 1;
        
        allSlots.push({
            id: i + 1,
            slot_code: `${row}${col}`,
            row: row,
            col: col,
            status: status,
            slot_type: 'standard',
            entrance_distance: 10,
            distance: calculateSlotDistance(row, col)
        });
    }
}

function calculateSlotDistance(row, col) {
    const slotPos = getSlotPosition({ row, col, slot_code: `${row}${col}` });
    const distancePixels = Math.abs(ENTRY_POSITION.x - slotPos.roadX) + Math.abs(ENTRY_POSITION.y - slotPos.roadY);
    return Math.round(distancePixels * 0.1);
}

function getSlotPosition(slot) {
    const row = slot.row;
    const col = slot.col;
    
    const slotWidth = 75;
    const slotHeight = 90;
    const slotGap = 8;
    const slotAreaStartX = 100;
    
    const zonePositions = {
        A: { slotY: 65, roadY: 50 },
        B: { slotY: 285, roadY: 280 },
        C: { slotY: 505, roadY: 600 }
    };
    
    const baseX = slotAreaStartX + (col - 1) * (slotWidth + slotGap);
    const baseY = zonePositions[row].slotY;
    
    return {
        x: baseX + slotWidth / 2,
        y: baseY + slotHeight / 2,
        roadX: baseX + slotWidth / 2,
        roadY: zonePositions[row].roadY,
        slotWidth,
        slotHeight
    };
}

function renderAdminParkingGrid(slots) {
    console.log('Rendering admin parking grid with', slots.length, 'slots');
    
    const containers = {
        A: document.getElementById('rowASlots'),
        B: document.getElementById('rowBSlots'),
        C: document.getElementById('rowCSlots')
    };
    
    Object.values(containers).forEach(c => c && (c.innerHTML = ''));
    
    const slotsByRow = { A: [], B: [], C: [] };
    slots.forEach(slot => {
        if (slotsByRow[slot.row]) {
            slotsByRow[slot.row].push(slot);
        }
    });
    
    // Sort slots by column in ascending order for ALL rows
    ['A', 'B', 'C'].forEach(row => {
        slotsByRow[row].sort((a, b) => a.col - b.col);
    });
    
    // Remove 'reversed' class from containers to ensure consistent ordering
    ['A', 'B', 'C'].forEach(row => {
        const container = containers[row];
        if (container) {
            container.classList.remove('reversed');
        }
    });
    
    // Render slots in ascending order for all rows
    ['A', 'B', 'C'].forEach(row => {
        const container = containers[row];
        if (container) {
            slotsByRow[row].forEach(slot => {
                const el = createAdminSlotElement(slot);
                container.appendChild(el);
            });
            console.log(`Rendered ${slotsByRow[row].length} slots for row ${row} (ascending)`);
        }
    });
}

function createAdminSlotElement(slot) {
    const div = document.createElement('div');
    div.className = `parking-slot ${slot.status}`;
    div.setAttribute('data-slot-id', slot.id);
    div.setAttribute('data-row', slot.row);
    div.setAttribute('data-col', slot.col);
    div.setAttribute('data-distance', slot.distance);
    
    const numDiv = document.createElement('div');
    numDiv.className = 'slot-number';
    numDiv.textContent = slot.slot_code;
    div.appendChild(numDiv);
    
    if (slot.status === 'occupied') {
        const carDiv = document.createElement('div');
        carDiv.className = 'slot-car';
        carDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;
        div.appendChild(carDiv);
    }
    
    div.addEventListener('click', () => handleAdminSlotClick(slot));
    div.addEventListener('dblclick', () => handleAdminSlotDoubleClick(slot));
    
    return div;
}

function handleAdminSlotClick(slot) {
    // Single click: show path (if navigation mode is set) or just highlight
    if (navigationMode) {
        drawAdminPathToSlot(slot);
    } else {
        // Clear any existing path and highlight slot
        clearPath();
        highlightSlot(slot);
    }
}

function handleAdminSlotDoubleClick(slot) {
    // Double click: edit slot
    editSlot(slot);
}

function clearPath() {
    const svg = document.getElementById('pathOverlay');
    if (svg) svg.innerHTML = '';
    document.querySelectorAll('.parking-slot').forEach(el => {
        el.classList.remove('slot-highlight');
    });
}

function highlightSlot(slot) {
    const slotEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
    if (slotEl) {
        slotEl.classList.add('slot-highlight');
    }
}

function drawAdminPathToSlot(slot) {
    const svg = document.getElementById('pathOverlay');
    if (!svg) return;
    
    svg.innerHTML = '';
    
    const isExit = navigationMode === 'exit';
    
    // SVG viewBox coordinates
    const slotWidth = 75;
    const slotHeight = 90;
    const slotGap = 8;
    
    const rowPositions = {
        'A': { baseY: 50, roadY: 35 },
        'B': { baseY: 260, roadY: 240 },
        'C': { baseY: 470, roadY: 455 }
    };
    
    const col = slot.col;
    const row = slot.row;
    
    const slotAreaStartX = 100;
    const slotCenterX = slotAreaStartX + (col - 1) * (slotWidth + slotGap) + slotWidth / 2;
    
    const rowPos = rowPositions[row];
    const slotCenterY = rowPos.baseY + slotHeight / 2;
    
    const startX = isExit ? EXIT_POSITION.x : ENTRY_POSITION.x;
    const startY = rowPos.roadY;
    
    // Calculate distance
    const horizontalDist = Math.abs(startX - slotCenterX);
    const verticalDist = Math.abs(startY - slotCenterY);
    const totalPixels = horizontalDist + verticalDist;
    const distanceMeters = Math.round(totalPixels * 0.1);
    const distanceText = distanceMeters < 1 ? '<1m' : `${distanceMeters}m`;
    
    // Path waypoints
    const waypoints = [
        { x: slotCenterX, y: startY },
        { x: slotCenterX, y: slotCenterY }
    ];
    
    let pathD = `M ${startX} ${startY}`;
    waypoints.forEach(wp => {
        pathD += ` L ${wp.x} ${wp.y}`;
    });
    
    const startColor = isExit ? '#ef4444' : '#10b981';
    const endColor = '#8b5cf6';
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${startColor}"/>
                <stop offset="100%" style="stop-color:${endColor}"/>
            </linearGradient>
            <filter id="pathGlow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
        
        <circle cx="${startX}" cy="${startY}" r="18" fill="${startColor}" filter="url(#pathGlow)"/>
        <text x="${startX}" y="${startY + 5}" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${isExit ? 'EXIT' : 'ENTRY'}</text>
        
        <path d="${pathD}" stroke="url(#pathGradient)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#pathGlow)"/>
        
        <circle cx="${slotCenterX}" cy="${slotCenterY}" r="22" fill="rgba(139, 92, 246, 0.3)" filter="url(#pathGlow)"/>
        <circle cx="${slotCenterX}" cy="${slotCenterY}" r="10" fill="${endColor}" filter="url(#pathGlow)"/>
        <text x="${slotCenterX}" y="${slotCenterY + 4}" text-anchor="middle" fill="white" font-size="11" font-weight="bold">${slot.slot_code}</text>
        
        <rect x="${slotCenterX - 30}" y="${slotCenterY + 15}" width="60" height="22" rx="11" fill="rgba(15, 23, 42, 0.95)" stroke="#8b5cf6" stroke-width="2"/>
        <text x="${slotCenterX}" y="${slotCenterY + 30}" text-anchor="middle" fill="#10b981" font-size="11" font-weight="bold">${distanceText}</text>
    `;
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
    const svg = document.getElementById('pathOverlay');
    
    if (entryBtn) entryBtn.style.boxShadow = 'none';
    if (exitBtn) exitBtn.style.boxShadow = 'none';
    if (indicator) indicator.style.display = 'none';
    if (svg) svg.innerHTML = '';
}

function editSlot(slot) {
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
    console.log('Loading reservations...');
    try {
        const response = await fetch(`${API_BASE}/admin/reservations`, {
            headers: getAuthHeaders()
        });
        
        console.log('Reservations response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load reservations');
        
        const data = await response.json();
        console.log('Reservations loaded:', data.reservations ? data.reservations.length : 0);
        allReservations = data.reservations || [];
        
        renderAllReservations(allReservations);
    } catch (error) {
        console.error('Error loading reservations:', error);
        allReservations = [];
        renderAllReservations([]);
    }
}

function renderAllReservations(reservations) {
    console.log('Rendering reservations:', reservations.length);
    const list = document.getElementById('allReservations');
    console.log('Reservations list element:', !!list);
    
    if (!list) {
        console.error('Reservations list element not found!');
        return;
    }
    
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
                    </div>
                </div>
            </div>
            <div class="reservation-actions">
                <span style="padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; background: ${getStatusBgColor(res.status)}; color: ${getStatusColor(res.status)};">${res.status}</span>
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
    console.log('Loading users...');
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: getAuthHeaders()
        });
        
        console.log('Users response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const data = await response.json();
        console.log('Users loaded:', data.users ? data.users.length : 0);
        allUsers = data.users || [];
        
        renderAllUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        allUsers = [];
        renderAllUsers([]);
    }
}

function renderAllUsers(users) {
    console.log('Rendering users:', users.length);
    const list = document.getElementById('usersList');
    console.log('Users list element:', !!list);
    
    if (!list) {
        console.error('Users list element not found!');
        return;
    }
    
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
                <span style="padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; background: ${user.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'}; color: ${user.role === 'admin' ? '#ef4444' : '#6366f1'};">${user.role}</span>
            </div>
        </div>
    `).join('');
}

function showAdminTab(tab) {
    const tabs = ['slots', 'reservations', 'users'];
    const tabBtns = document.querySelectorAll('.admin-tabs .tab-btn');
    
    tabs.forEach((t, index) => {
        const content = document.getElementById(`${t}Tab`);
        if (content) {
            if (t === tab) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        }
        
        if (tabBtns[index]) {
            if (t === tab) {
                tabBtns[index].classList.add('active');
                tabBtns[index].style.background = 'var(--primary)';
                tabBtns[index].style.color = 'white';
                tabBtns[index].style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
            } else {
                tabBtns[index].classList.remove('active');
                tabBtns[index].style.background = 'var(--bg-glass)';
                tabBtns[index].style.color = 'var(--text-secondary)';
                tabBtns[index].style.boxShadow = 'none';
            }
        }
    });
    
    if (tab === 'reservations') loadAllReservations();
    if (tab === 'users') loadAllUsers();
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    
    // Show slots tab by default if not already shown
    const slotsTab = document.getElementById('slotsTab');
    if (slotsTab) {
        slotsTab.style.display = 'block';
    }
    
    if (document.getElementById('rowASlots')) {
        console.log('Loading admin dashboard...');
        loadAdminDashboard();
    } else {
        console.error('rowASlots element not found!');
    }
});

// Also run immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('Document already ready, checking...');
    const slotsTab = document.getElementById('slotsTab');
    if (slotsTab) {
        slotsTab.style.display = 'block';
    }
    if (document.getElementById('rowASlots')) {
        console.log('Loading admin dashboard (fallback)...');
        loadAdminDashboard();
    }
}
