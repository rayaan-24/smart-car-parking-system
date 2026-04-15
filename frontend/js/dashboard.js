const API_BASE = 'http://localhost:5000/api';
let slots = [];
let reservations = [];
let selectedSlotId = null;
let aiAssignedSlot = null;
let currentHighlightedSlot = null;
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
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
            return false;
        }
    } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

async function loadDashboard() {
    const isAuth = checkAuth();
    if (!isAuth) return;
    
    await loadSummary();
    await loadSlots();
    await loadReservations();
    setInterval(refreshData, 5000);
}

async function refreshData() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadSummary();
    await loadSlots();
}

async function loadSummary() {
    try {
        const response = await fetch(`${API_BASE}/parking/summary`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load summary');
        
        const data = await response.json();
        
        document.getElementById('availableCount').textContent = data.summary.available;
        document.getElementById('occupiedCount').textContent = data.summary.occupied;
        document.getElementById('reservedCount').textContent = data.summary.reserved;
        document.getElementById('totalCount').textContent = data.summary.total_slots;
        
        const footerAvailable = document.getElementById('footerAvailable');
        const footerOccupied = document.getElementById('footerOccupied');
        const footerReserved = document.getElementById('footerReserved');
        
        if (footerAvailable) footerAvailable.textContent = data.summary.available;
        if (footerOccupied) footerOccupied.textContent = data.summary.occupied;
        if (footerReserved) footerReserved.textContent = data.summary.reserved;
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadSlots() {
    try {
        const response = await fetch(`${API_BASE}/parking/slots`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load slots');
        
        const data = await response.json();
        slots = data.slots;
        
        renderParkingGrid(slots);
    } catch (error) {
        console.error('Error loading slots:', error);
    }
}

function renderParkingGrid(slots) {
    const grid = document.getElementById('parkingGrid');
    grid.innerHTML = '';
    
    const zonesContainer = document.getElementById('parkingZones');
    if (zonesContainer) zonesContainer.innerHTML = '';
    
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
        slot.calculated_distance = calculateDistance(rowIndex, slot.col_num, totalRows, totalCols);
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
            let slotClass = `slot ${slot.status}`;
            
            if (aiAssignedSlot && aiAssignedSlot.id === slot.id) {
                slotClass = 'slot ai-assigned';
            } else if (currentHighlightedSlot && currentHighlightedSlot.id === slot.id) {
                slotClass = 'slot ai-assigned';
            }
            
            const distance = slot.calculated_distance || slot.entrance_distance || 10;
            
            const slotDiv = document.createElement('div');
            slotDiv.className = slotClass;
            slotDiv.setAttribute('data-slot-id', slot.id);
            slotDiv.setAttribute('data-row', rowNum);
            slotDiv.setAttribute('data-col', slot.col_num);
            slotDiv.setAttribute('data-distance', distance);
            slotDiv.innerHTML = `
                <span class="slot-code">${slot.slot_code}</span>
                <span class="slot-type">${getSlotTypeIcon(slot.slot_type)}</span>
            `;
            slotDiv.title = `Slot ${slot.slot_code}\nType: ${slot.slot_type}\nDistance: ${distance}m from entrance\nExact Path: ${distance * 1.2 | 0}m`;
            slotDiv.onclick = () => {
                if (navigationMode) {
                    const gate = navigationMode;
                    clearNavigationMode();
                    drawPathFromGateToSlot(slot, gate);
                } else {
                    showSlotDetails(slot);
                }
            };
            slotsContainer.appendChild(slotDiv);
        });
        
        rowDiv.appendChild(slotsContainer);
        grid.appendChild(rowDiv);
    });
}

function calculateDistance(rowIndex, colIndex, totalRows, totalCols) {
    const ROAD_WIDTH = 8;
    const SLOT_DEPTH = 10;
    const ENTRY_OFFSET = 5;
    
    const rowDistance = (rowIndex * (SLOT_DEPTH + ROAD_WIDTH)) + ENTRY_OFFSET + SLOT_DEPTH;
    
    const colDistance = (colIndex * 8) + 5;
    
    const totalDistance = rowDistance + colDistance;
    
    return Math.round(totalDistance * 1.15);
}

function getSlotTypeIcon(slotType) {
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
            navModeText.textContent = 'Click a parking slot to see path from ENTRY';
        } else {
            exitBtn.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
            entryBtn.style.boxShadow = 'none';
            indicator.style.background = 'rgba(239, 68, 68, 0.9)';
            navModeText.textContent = 'Click a parking slot to see path from EXIT';
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

function showSlotDetails(slot) {
    if (navigationMode) {
        const gate = navigationMode;
        clearNavigationMode();
        drawPathFromGateToSlot(slot, gate);
        return;
    }
    const content = document.getElementById('slotDetailContent');
    
    const rowLetter = String.fromCharCode(65 + parseInt(slot.row_num));
    const distance = slot.entrance_distance || 10;
    
    content.innerHTML = `
        <div class="ai-result">
            <div class="ai-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                Slot Information
            </div>
            
            <div class="ai-slot-display">${slot.slot_code}</div>
            
            <div class="ai-details">
                <div class="ai-detail">
                    <div class="ai-detail-label">Type</div>
                    <div class="ai-detail-value">${slot.slot_type}</div>
                </div>
                <div class="ai-detail">
                    <div class="ai-detail-label">Status</div>
                    <div class="ai-detail-value" style="color: ${getStatusColor(slot.status)}">${slot.status}</div>
                </div>
                <div class="ai-detail">
                    <div class="ai-detail-label">Distance</div>
                    <div class="ai-detail-value">${distance}m</div>
                </div>
            </div>
            
            <div class="path-info">
                <h4>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle;"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                    Navigation Path
                </h4>
                <p>Follow the main road from entry point. Row ${rowLetter} is on the ${getDirectionText(slot.row_num)} side. Walk ${distance} meters from the entrance to reach this slot.</p>
            </div>
            
            ${slot.status === 'available' ? `
                <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="closeModal('slotDetailModal'); showReserveModal(${slot.id}); drawPathToSlot(${slot.id});">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    Reserve This Slot
                </button>
            ` : `
                <p style="color: var(--text-muted); margin-top: 16px; text-align: center;">This slot is currently ${slot.status}</p>
            `}
        </div>
    `;
    
    document.getElementById('slotDetailModal').style.display = 'block';
    
    setTimeout(() => drawPathToSlot(slot.id), 100);
}

function getStatusColor(status) {
    const colors = {
        'available': '#10b981',
        'occupied': '#ef4444',
        'reserved': '#06b6d4',
        'maintenance': '#f59e0b'
    };
    return colors[status] || '#94a3b8';
}

function getDirectionText(rowNum) {
    const directions = {
        '0': 'left',
        '1': 'center-left',
        '2': 'center',
        '3': 'center-right',
        '4': 'right'
    };
    return directions[rowNum] || 'center';
}

function drawPathToSlot(slotId) {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;
    
    const grid = document.getElementById('parkingGrid');
    const gridRect = grid.getBoundingClientRect();
    const containerRect = document.querySelector('.parking-area').getBoundingClientRect();
    
    const slotElement = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (!slotElement) return;
    
    const slotRect = slotElement.getBoundingClientRect();
    
    const svg = document.getElementById('pathOverlay');
    
    const startX = containerRect.width / 2;
    const startY = -10;
    
    const endX = slotRect.left - containerRect.left + slotRect.width / 2;
    const endY = slotRect.top - containerRect.top + slotRect.height / 2;
    
    const midY = endY * 0.5;
    
    const pathD = `M ${startX} ${startY} Q ${startX} ${midY}, ${endX} ${midY} T ${endX} ${endY}`;
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1"/>
            </marker>
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        <circle cx="${startX}" cy="${startY}" r="12" fill="#10b981" filter="url(#glow)">
            <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <path d="${pathD}" class="path-line animated" stroke="url(#pathGradient)" stroke-width="4" fill="none" marker-end="url(#arrowhead)" filter="url(#glow)"/>
        
        <circle cx="${endX}" cy="${endY}" r="20" fill="rgba(99, 102, 241, 0.3)">
            <animate attributeName="r" values="18;25;18" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="${endX}" cy="${endY}" r="8" fill="#6366f1" filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>
        </circle>
        
        <rect x="${endX - 40}" y="${endY - 35}" width="80" height="24" rx="12" fill="rgba(99, 102, 241, 0.9)"/>
        <text x="${endX}" y="${endY - 18}" class="path-distance" fill="white" font-size="11" font-weight="600">
            ${slot.entrance_distance || 10}m
        </text>
    `;
    
    setTimeout(() => {
        const pathLine = svg.querySelector('.path-line');
        if (pathLine) {
            pathLine.style.strokeDashoffset = '0';
        }
    }, 50);
}

function clearPath() {
    const svg = document.getElementById('pathOverlay');
    svg.innerHTML = '';
}

function drawPathFromGateToSlot(slot, gate = 'entry') {
    const container = document.querySelector('.parking-area');
    const containerRect = container.getBoundingClientRect();
    const parkingLayout = document.querySelector('.real-parking-lot-layout');
    const layoutRect = parkingLayout.getBoundingClientRect();
    
    const slotElement = document.querySelector(`[data-slot-id="${slot.id}"]`);
    if (!slotElement) return;
    
    const slotRect = slotElement.getBoundingClientRect();
    const gridRows = document.querySelectorAll('.parking-row');
    const rowIndex = Array.from(gridRows).findIndex(row => row.contains(slotElement));
    
    const svg = document.getElementById('pathOverlay');
    
    const isEntry = gate === 'entry';
    const roadNetwork = document.querySelector('.road-network');
    const roadRect = roadNetwork ? roadNetwork.getBoundingClientRect() : null;
    
    const startX = isEntry ? 40 : containerRect.width - 40;
    const roadY = roadRect ? (roadRect.top - containerRect.top + roadRect.height / 2) : (containerRect.height / 2);
    
    const endX = slotRect.left - containerRect.left + slotRect.width / 2;
    const endY = slotRect.top - containerRect.top + slotRect.height / 2;
    
    const horizontalRoadY = roadY;
    const entryX = isEntry ? 20 : containerRect.width - 20;
    
    const horizontalPath = `M ${entryX} ${horizontalRoadY} L ${endX} ${horizontalRoadY}`;
    
    const verticalPath = `M ${endX} ${horizontalRoadY} L ${endX} ${endY}`;
    
    const distance = slot.calculated_distance || slot.entrance_distance || 10;
    const pathDistance = Math.round(distance * 1.2);
    
    const startColor = isEntry ? '#10b981' : '#ef4444';
    const pathColor = '#fbbf24';
    const endColor = '#6366f1';
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
                <stop offset="50%" style="stop-color:${pathColor};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
            </linearGradient>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="${endColor}"/>
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        <circle cx="${entryX}" cy="${horizontalRoadY}" r="20" fill="${startColor}" filter="url(#glow)">
            <animate attributeName="r" values="18;22;18" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <text x="${entryX}" y="${horizontalRoadY + 5}" text-anchor="middle" fill="white" font-size="12" font-weight="700">${isEntry ? 'IN' : 'OUT'}</text>
        
        <rect x="${entryX + 25}" y="${horizontalRoadY - 12}" width="80" height="24" rx="12" fill="rgba(${isEntry ? '16,185,129' : '239,68,68'}, 0.9)"/>
        <text x="${entryX + 65}" y="${horizontalRoadY + 4}" text-anchor="middle" fill="white" font-size="10" font-weight="600">START</text>
        
        <path d="${horizontalPath}" stroke="url(#pathGradient)" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#glow)" opacity="0.9"/>
        <path d="${verticalPath}" stroke="url(#pathGradient)" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#glow)"/>
        
        <circle cx="${endX}" cy="${endY}" r="35" fill="rgba(99, 102, 241, 0.2)">
            <animate attributeName="r" values="30;40;30" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${endX}" cy="${endY}" r="25" fill="rgba(99, 102, 241, 0.3)">
            <animate attributeName="r" values="22;28;22" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${endX}" cy="${endY}" r="12" fill="${endColor}" filter="url(#glow)"/>
        <text x="${endX}" y="${endY + 4}" text-anchor="middle" fill="white" font-size="11" font-weight="700">${slot.slot_code}</text>
        
        <rect x="${endX - 60}" y="${endY - 55}" width="120" height="40" rx="8" fill="rgba(15, 23, 42, 0.95)" stroke="${endColor}" stroke-width="2"/>
        <text x="${endX}" y="${endY - 38}" text-anchor="middle" fill="#94a3b8" font-size="10">Total Distance</text>
        <text x="${endX}" y="${endY - 22}" text-anchor="middle" fill="white" font-size="16" font-weight="700">${pathDistance}m</text>
        
        <rect x="${entryX + 65}" y="${horizontalRoadY + 18}" width="70" height="20" rx="4" fill="rgba(251, 191, 36, 0.2)" stroke="#fbbf24" stroke-width="1"/>
        <text x="${entryX + 100}" y="${horizontalRoadY + 32}" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">Follow Road</text>
    `;
}

function selectSlot(slot) {
    if (slot.status !== 'available') {
        showMessage(`Slot ${slot.slot_code} is not available`, 'error');
        return;
    }
    
    selectedSlotId = slot.id;
    showReserveModal(slot);
}

async function loadReservations() {
    try {
        const response = await fetch(`${API_BASE}/reservations/`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load reservations');
        
        const data = await response.json();
        reservations = data.reservations;
        
        renderReservations(reservations);
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

function renderReservations(reservations) {
    const list = document.getElementById('reservationsList');
    
    if (reservations.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <p style="font-size: 16px; margin-bottom: 8px;">No reservations yet</p>
                <p style="font-size: 13px;">Book your first parking spot using the map above!</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = reservations.map(res => `
        <div class="reservation-card">
            <div class="reservation-info">
                <div class="reservation-slot">
                    <div class="reservation-slot-code">${res.slot_code}</div>
                </div>
                <div class="reservation-details">
                    <h4>${res.vehicle_plate || 'No plate'}</h4>
                    <div class="reservation-meta">
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            ${res.reservation_date}
                        </div>
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                            ${res.start_time} - ${res.end_time}
                        </div>
                        <div class="reservation-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${res.entrance_distance}m
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
                    background: ${getStatusBgColor(res.status)};
                    color: ${getStatusColor(res.status)};
                ">${res.status}</span>
                ${res.status === 'confirmed' || res.status === 'pending' ? 
                    `<button class="btn btn-danger btn-small" onclick="cancelReservation(${res.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        Cancel
                    </button>` : ''}
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

async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reservations/${reservationId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showMessage('Reservation cancelled successfully', 'success');
            loadReservations();
            loadSummary();
            loadSlots();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to cancel reservation');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
}

function showReserveModal(slotId = null) {
    const modal = document.getElementById('reserveModal');
    modal.style.display = 'block';
    
    const slotSelect = document.getElementById('selectedSlot');
    slotSelect.innerHTML = '<option value="">Choose a slot...</option>';
    
    const availableSlots = slots.filter(s => s.status === 'available');
    availableSlots.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.slot_code} - ${s.slot_type} (${s.entrance_distance}m)`;
        if (slotId && s.id === slotId) {
            option.selected = true;
        }
        slotSelect.appendChild(option);
    });
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservationDate').value = today;
    document.getElementById('reservationDate').min = today;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'slotDetailModal') {
        clearPath();
    }
}

document.getElementById('reserveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        slot_id: formData.get('slot_id'),
        date: formData.get('date'),
        start_time: formData.get('start_time'),
        end_time: formData.get('end_time'),
        vehicle_plate: formData.get('vehicle_plate') || null
    };
    
    try {
        const response = await fetch(`${API_BASE}/reservations/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showMessage('Reservation created successfully!', 'success');
            closeModal('reserveModal');
            e.target.reset();
            loadReservations();
            loadSummary();
            loadSlots();
            clearPath();
        } else {
            const result = await response.json();
            showMessage(result.error || result.details ? result.details.join(', ') : 'Failed to create reservation');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
});

async function useAISlot() {
    const date = prompt('Enter reservation date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const startTime = prompt('Enter start time (HH:MM):', '09:00');
    if (!startTime) return;
    
    const endTime = prompt('Enter end time (HH:MM):', '17:00');
    if (!endTime) return;
    
    try {
        showMessage('AI is finding the optimal slot...', 'success');
        
        const response = await fetch(`${API_BASE}/reservations/ai-assign`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ date, start_time: startTime, end_time: endTime })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            aiAssignedSlot = data.slot;
            renderParkingGrid(slots);
            
            setTimeout(() => {
                const slotElement = document.querySelector(`[data-slot-id="${data.slot.id}"]`);
                if (slotElement) {
                    slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                drawPathToSlot(data.slot.id);
            }, 100);
            
            document.getElementById('aiResult').innerHTML = `
                <div class="ai-result">
                    <div class="ai-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                        AI Optimized Selection
                    </div>
                    
                    <div class="ai-slot-display">${data.slot.slot_code}</div>
                    
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">Genetic Algorithm found the optimal parking spot for you!</p>
                    
                    <div class="ai-details">
                        <div class="ai-detail">
                            <div class="ai-detail-label">Type</div>
                            <div class="ai-detail-value">${data.slot.slot_type}</div>
                        </div>
                        <div class="ai-detail">
                            <div class="ai-detail-label">Distance</div>
                            <div class="ai-detail-value">${data.slot.entrance_distance}m</div>
                        </div>
                        <div class="ai-detail">
                            <div class="ai-detail-label">Status</div>
                            <div class="ai-detail-value" style="color: var(--success)">${data.slot.status}</div>
                        </div>
                    </div>
                    
                    <div class="path-info">
                        <h4>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle;"><path d="M13 3L4 14h7v7l9-11h-7V3z"/></svg>
                            AI Optimization Details
                        </h4>
                        <p>This slot was selected by analyzing ${data.ga_stats.generations} generations with a fitness score of ${data.ga_stats.fitness.toFixed(4)}. The algorithm minimized your walking distance while considering slot availability.</p>
                    </div>
                    
                    <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="reserveAISlot(${data.slot.id}, '${date}', '${startTime}', '${endTime}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        Reserve AI-Recommended Slot
                    </button>
                    
                    <p style="margin-top: 16px; font-size: 11px; color: var(--text-muted);">
                        Generated in ${data.ga_stats.generations} generations | Fitness: ${data.ga_stats.fitness.toFixed(4)}
                    </p>
                </div>
            `;
            
            document.getElementById('aiResultModal').style.display = 'block';
        } else {
            const result = await response.json();
            showMessage(result.error || 'No available slots found');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
}

async function reserveAISlot(slotId, date, startTime, endTime) {
    try {
        const response = await fetch(`${API_BASE}/reservations/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                slot_id: slotId, 
                date: date, 
                start_time: startTime, 
                end_time: endTime 
            })
        });
        
        if (response.ok) {
            showMessage('Reservation created successfully!', 'success');
            closeModal('aiResultModal');
            aiAssignedSlot = null;
            clearPath();
            loadReservations();
            loadSummary();
            loadSlots();
        } else {
            const result = await response.json();
            showMessage(result.error || result.details ? result.details.join(', ') : 'Failed to create reservation');
        }
    } catch (error) {
        showMessage('Network error. Please try again.');
    }
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
            if (modal.id === 'slotDetailModal' || modal.id === 'aiResultModal') {
                clearPath();
            }
        }
    });
}

if (document.getElementById('parkingGrid')) {
    loadDashboard();
}
