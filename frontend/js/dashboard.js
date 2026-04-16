const API_BASE = 'http://localhost:5000/api';
let slots = [];
let reservations = [];
let selectedSlotId = null;
let aiAssignedSlot = null;
let navigationMode = null;

function setNavigationMode(mode) {
    navigationMode = mode;
    
    const btnEntry = document.getElementById('btnEntry');
    const btnExit = document.getElementById('btnExit');
    
    btnEntry.classList.remove('active');
    btnExit.classList.remove('active');
    
    if (mode === 'entry') {
        btnEntry.classList.add('active');
    } else if (mode === 'exit') {
        btnExit.classList.add('active');
    }
    
    if (selectedSlotId) {
        const slot = slots.find(s => s.id === selectedSlotId);
        if (slot) {
            drawPathToSlot(slot);
        }
    }
}

const CONFIG = {
    TOTAL_SLOTS: 30,
    ROWS: 3,
    COLS: 10
};

// Slot position mapping for path visualization
const SLOT_POSITIONS = {
    A: { startX: 100, y: 100 },
    B: { startX: 100, y: 340 },
    C: { startX: 100, y: 580 }
};

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
    return { 'Content-Type': 'application/json' };
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
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load summary');
        
        const data = await response.json();
        document.getElementById('availableCount').textContent = data.summary.available;
        document.getElementById('occupiedCount').textContent = data.summary.occupied;
        document.getElementById('reservedCount').textContent = data.summary.reserved;
        document.getElementById('totalCount').textContent = data.summary.total_slots;
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
            window.location.href = 'index.html';
            return;
        }
        
        if (!response.ok) throw new Error('Failed to load slots');
        
        const data = await response.json();
        const limitedSlots = data.slots.slice(0, CONFIG.TOTAL_SLOTS);
        
        // Assign row, col, and position data
        const rowLabels = ['A', 'B', 'C'];
        slots = limitedSlots.map((slot, index) => {
            const rowIndex = Math.floor(index / CONFIG.COLS);
            const colIndex = index % CONFIG.COLS;
            
            return {
                ...slot,
                row: rowLabels[rowIndex],
                row_index: rowIndex,
                col: colIndex + 1,
                distance: calculateDistance(rowLabels[rowIndex], colIndex + 1)
            };
        });
        
        renderParkingGrid(slots);
    } catch (error) {
        console.error('Error loading slots:', error);
        // Generate demo slots
        generateDemoSlots();
        renderParkingGrid(slots);
    }
}

function generateDemoSlots() {
    const rowLabels = ['A', 'B', 'C'];
    const statuses = ['available', 'occupied', 'reserved'];
    
    slots = [];
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
        
        slots.push({
            id: i + 1,
            slot_code: `${row}${col}`,
            row: row,
            row_index: rowIndex,
            col: col,
            status: status,
            slot_type: 'standard',
            entrance_distance: 10,
            distance: calculateDistance(row, col)
        });
    }
    
    console.log('Demo slots generated:', slots.length);
}

function calculateDistance(row, col) {
    // Entry point is at B10 (x=860, y=280)
    const ENTRY_X = 860;
    const ENTRY_Y = 280;
    
    // Get slot position
    const slotPos = getSlotElementPosition({ row, col, slot_code: `${row}${col}` });
    
    // Manhattan distance: |x1-x2| + |y1-y2|
    const distance = Math.abs(ENTRY_X - slotPos.roadX) + Math.abs(ENTRY_Y - slotPos.roadY);
    return Math.round(distance / 10);
}

function renderParkingGrid(slots) {
    console.log('Rendering parking grid with', slots.length, 'slots');
    
    // Get containers
    const containers = {
        A: document.getElementById('rowASlots'),
        B: document.getElementById('rowBSlots'),
        C: document.getElementById('rowCSlots')
    };
    
    console.log('Containers found:', {
        A: !!containers.A,
        B: !!containers.B,
        C: !!containers.C
    });
    
    // Clear containers
    Object.values(containers).forEach(c => c && (c.innerHTML = ''));
    
    // Group slots by row
    const slotsByRow = { A: [], B: [], C: [] };
    slots.forEach(slot => {
        if (slotsByRow[slot.row]) {
            slotsByRow[slot.row].push(slot);
        }
    });
    
    console.log('Slots by row:', {
        A: slotsByRow.A.length,
        B: slotsByRow.B.length,
        C: slotsByRow.C.length
    });
    
    // Sort and render
    ['A', 'B', 'C'].forEach(row => {
        slotsByRow[row].sort((a, b) => a.col - b.col);
        const container = containers[row];
        if (container) {
            slotsByRow[row].forEach(slot => {
                const el = createSlotElement(slot);
                container.appendChild(el);
            });
            console.log(`Rendered ${slotsByRow[row].length} slots for row ${row}`);
        }
    });
}

function createSlotElement(slot) {
    const div = document.createElement('div');
    div.className = `parking-slot ${slot.status}`;
    div.setAttribute('data-slot-id', slot.id);
    div.setAttribute('data-row', slot.row);
    div.setAttribute('data-col', slot.col);
    div.setAttribute('data-distance', slot.distance);
    
    console.log('Creating slot element:', slot.slot_code, slot.status);
    
    if (aiAssignedSlot && aiAssignedSlot.id === slot.id) {
        div.classList.add('ai-highlight');
    }
    
    // Slot number
    const numDiv = document.createElement('div');
    numDiv.className = 'slot-number';
    numDiv.textContent = slot.slot_code;
    div.appendChild(numDiv);
    
    // Type icon
    if (slot.slot_type && slot.slot_type !== 'standard') {
        const typeDiv = document.createElement('div');
        typeDiv.className = 'slot-type';
        typeDiv.innerHTML = getTypeIcon(slot.slot_type);
        div.appendChild(typeDiv);
    }
    
    // Car icon for occupied
    if (slot.status === 'occupied') {
        const carDiv = document.createElement('div');
        carDiv.className = 'slot-car';
        carDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;
        div.appendChild(carDiv);
    }
    
    // Click handler
    div.addEventListener('click', () => handleSlotClick(slot));
    
    return div;
}

function getTypeIcon(type) {
    const icons = { electric: '⚡', handicap: '♿', compact: 'C' };
    return icons[type] || '';
}

function handleSlotClick(slot) {
    selectedSlotId = slot.id;
    showSlotDetails(slot);
    drawPathToSlot(slot);
}

function showSlotDetails(slot) {
    const content = document.getElementById('slotDetailContent');
    
    content.innerHTML = `
        <div class="ai-result">
            <div class="ai-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                Slot Information
            </div>
            
            <div class="ai-slot-display">${slot.slot_code}</div>
            
            <div class="ai-details">
                <div class="ai-detail">
                    <div class="ai-detail-label">Zone</div>
                    <div class="ai-detail-value">${slot.row}</div>
                </div>
                <div class="ai-detail">
                    <div class="ai-detail-label">Type</div>
                    <div class="ai-detail-value">${slot.slot_type || 'standard'}</div>
                </div>
                <div class="ai-detail">
                    <div class="ai-detail-label">Distance</div>
                    <div class="ai-detail-value">${slot.distance}m</div>
                </div>
                <div class="ai-detail">
                    <div class="ai-detail-label">Status</div>
                    <div class="ai-detail-value" style="color: ${getStatusColor(slot.status)}">${slot.status}</div>
                </div>
            </div>
            
            ${slot.status === 'available' ? `
                <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="closeModal('slotDetailModal'); showReserveModal(${slot.id});">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    Reserve This Slot
                </button>
            ` : `<p style="color: var(--text-muted); margin-top: 16px; text-align: center;">This slot is ${slot.status}</p>`}
        </div>
    `;
    
    document.getElementById('slotDetailModal').style.display = 'block';
}

function getStatusColor(status) {
    const colors = { available: '#10b981', occupied: '#ef4444', reserved: '#06b6d4', maintenance: '#f59e0b', assigned: '#3b82f6' };
    return colors[status] || '#94a3b8';
}

function getSlotElementPosition(slot) {
    const row = slot.row;
    const col = slot.col;
    
    const slotWidth = 75;
    const slotHeight = 90;
    const slotGap = 8;
    
    // Slot area starts after entry gate
    const slotAreaStartX = 100;
    
    // Zone positions (based on actual layout)
    const zonePositions = {
        A: { slotY: 65, roadY: 50 },      // Zone A at top
        B: { slotY: 285, roadY: 280 },    // Zone B in middle (road is at slot level)
        C: { slotY: 505, roadY: 600 }     // Zone C at bottom
    };
    
    const baseX = slotAreaStartX + (col - 1) * (slotWidth + slotGap);
    const baseY = zonePositions[row].slotY;
    
    return {
        x: baseX + slotWidth / 2,
        y: baseY + slotHeight / 2,
        roadX: baseX + slotWidth / 2,
        roadY: zonePositions[row].roadY,
        slotCenterY: baseY + slotHeight / 2,
        slotWidth,
        slotHeight
    };
}

function drawPathToSlot(slot) {
    const svg = document.getElementById('parkingPathSvg');
    const pathGroup = document.getElementById('pathGroup');
    if (!svg || !pathGroup) return;
    
    pathGroup.innerHTML = '';
    
    const isExit = navigationMode === 'exit';
    
    // CONSTANT entry/exit points (NEVER change these)
    const ENTRY_POINT = { x: 0, y: 280  };  // B10 position
    // const ENTRY_POINT = { x: 860, y: 280 };  // B10 position
    const EXIT_POINT = { x: 1160, y: 280 };   // B2 position
    
    // Use entry or exit based on mode
    const startPoint = isExit ? EXIT_POINT : ENTRY_POINT;
    
    // Get slot position
    const slotPos = getSlotElementPosition(slot);
    
    // Calculate waypoints using proper road-based routing
    const waypoints = calculatePathWaypoints(startPoint, slot, isExit);
    
    // Debug logging
    console.log('Path Debug:', {
        mode: isExit ? 'Exit' : 'Entry',
        start: startPoint,
        slot: slot.slot_code,
        slotPos: slotPos,
        waypoints: waypoints
    });
    
    // Create path string - ALWAYS start from entry/exit point
    let pathD = `M ${startPoint.x} ${startPoint.y}`;
    for (let i = 0; i < waypoints.length; i++) {
        pathD += ` L ${waypoints[i].x} ${waypoints[i].y}`;
    }
    
    // Draw main path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', 'url(#pathGradient)');
    path.setAttribute('stroke-width', '8');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('filter', 'url(#pathGlow)');
    path.setAttribute('stroke-dasharray', '2000');
    path.setAttribute('stroke-dashoffset', '2000');
    path.style.animation = 'drawPath 1.5s ease forwards';
    pathGroup.appendChild(path);
    
    // Start marker (entry/exit point)
    const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startMarker.setAttribute('cx', startPoint.x);
    startMarker.setAttribute('cy', startPoint.y);
    startMarker.setAttribute('r', '20');
    startMarker.setAttribute('fill', isExit ? '#ef4444' : '#10b981');
    startMarker.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(startMarker);
    
    // Start label
    const startLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    startLabel.setAttribute('x', startPoint.x);
    startLabel.setAttribute('y', startPoint.y + 5);
    startLabel.setAttribute('text-anchor', 'middle');
    startLabel.setAttribute('fill', 'white');
    startLabel.setAttribute('font-size', '11');
    startLabel.setAttribute('font-weight', 'bold');
    startLabel.textContent = isExit ? 'EXIT' : 'ENTRY';
    pathGroup.appendChild(startLabel);
    
    // End marker at slot
    const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endMarker.setAttribute('cx', slotPos.roadX);
    endMarker.setAttribute('cy', slotPos.roadY);
    endMarker.setAttribute('r', '25');
    endMarker.setAttribute('fill', 'rgba(139, 92, 246, 0.3)');
    endMarker.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(endMarker);
    
    const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endDot.setAttribute('cx', slotPos.roadX);
    endDot.setAttribute('cy', slotPos.roadY);
    endDot.setAttribute('r', '12');
    endDot.setAttribute('fill', '#8b5cf6');
    endDot.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(endDot);
    
    // Slot label
    const slotLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    slotLabel.setAttribute('x', slotPos.roadX);
    slotLabel.setAttribute('y', slotPos.roadY + 4);
    slotLabel.setAttribute('text-anchor', 'middle');
    slotLabel.setAttribute('fill', 'white');
    slotLabel.setAttribute('font-size', '11');
    slotLabel.setAttribute('font-weight', 'bold');
    slotLabel.textContent = slot.slot_code;
    pathGroup.appendChild(slotLabel);
    
    // Distance label
    const distance = calculateManhattanDistance(startPoint, slotPos);
    const distBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    distBox.setAttribute('x', slotPos.roadX - 35);
    distBox.setAttribute('y', slotPos.roadY + 20);
    distBox.setAttribute('width', '70');
    distBox.setAttribute('height', '24');
    distBox.setAttribute('rx', '12');
    distBox.setAttribute('fill', 'rgba(15, 23, 42, 0.95)');
    distBox.setAttribute('stroke', '#8b5cf6');
    distBox.setAttribute('stroke-width', '2');
    pathGroup.appendChild(distBox);
    
    const distText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    distText.setAttribute('x', slotPos.roadX);
    distText.setAttribute('y', slotPos.roadY + 36);
    distText.setAttribute('text-anchor', 'middle');
    distText.setAttribute('fill', '#10b981');
    distText.setAttribute('font-size', '12');
    distText.setAttribute('font-weight', 'bold');
    distText.textContent = `${distance}m`;
    pathGroup.appendChild(distText);
    
    // Highlight the slot
    highlightSlot(slot);
}

function calculateManhattanDistance(startPoint, slotPos) {
    // Manhattan distance: |x1-x2| + |y1-y2|
    const dx = Math.abs(startPoint.x - slotPos.roadX);
    const dy = Math.abs(startPoint.y - slotPos.roadY);
    return Math.round((dx + dy) / 10);  // Scale down for display
}

function calculatePathWaypoints(startPoint, slot, isExit) {
    const waypoints = [];
    
    // Get slot position
    const slotPos = getSlotElementPosition(slot);
    
    // Zone B row is the road level (y = 280)
    const ZONE_B_ROAD_Y = 280;
    
    // Target slot's row Y position
    const targetRow = slot.row;
    let targetRoadY;
    
    if (targetRow === 'A') {
        targetRoadY = 50;   // Top road
    } else if (targetRow === 'B') {
        targetRoadY = 280;  // Zone B road (same level as entry/exit)
    } else if (targetRow === 'C') {
        targetRoadY = 600;  // Bottom road
    }
    
    // ROUTING LOGIC:
    // 1. Start from entry/exit point (already done in drawPathToSlot)
    // 2. Go to slot's X position on Zone B road (horizontal movement)
    // 3. Go up/down to target row's road (vertical movement)
    
    // Step 1: Move horizontally to slot's X position on Zone B road
    waypoints.push({ 
        x: slotPos.roadX, 
        y: ZONE_B_ROAD_Y 
    });
    
    // Step 2: Move vertically to target row's road
    waypoints.push({ 
        x: slotPos.roadX, 
        y: targetRoadY 
    });
    
    return waypoints;
}

function highlightSlot(slot) {
    document.querySelectorAll('.parking-slot').forEach(el => {
        el.classList.remove('slot-highlight', 'slot-selected');
    });
    
    const slotEl = document.querySelector(`[data-slot-id="${slot.id}"]`);
    if (slotEl) {
        slotEl.classList.add('slot-highlight');
    }
}

function clearPath() {
    const pathGroup = document.getElementById('pathGroup');
    if (pathGroup) {
        pathGroup.innerHTML = '';
    }
    
    document.querySelectorAll('.parking-slot').forEach(el => {
        el.classList.remove('slot-highlight', 'slot-selected');
    });
}

async function loadReservations() {
    try {
        const response = await fetch(`${API_BASE}/reservations/`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
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
                    </div>
                </div>
            </div>
            <div class="reservation-actions">
                <span style="padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; background: ${getStatusBgColor(res.status)}; color: ${getStatusColor(res.status)};">${res.status}</span>
                ${res.status === 'confirmed' || res.status === 'pending' ? 
                    `<button class="btn btn-danger btn-small" onclick="cancelReservation(${res.id})">Cancel</button>` : ''}
            </div>
        </div>
    `).join('');
}

function getStatusBgColor(status) {
    const colors = {
        confirmed: 'rgba(16, 185, 129, 0.1)',
        pending: 'rgba(245, 158, 11, 0.1)',
        completed: 'rgba(99, 102, 241, 0.1)',
        cancelled: 'rgba(239, 68, 68, 0.1)'
    };
    return colors[status] || 'rgba(148, 163, 184, 0.1)';
}

async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/reservations/${reservationId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            showMessage('Reservation cancelled', 'success');
            loadReservations();
            loadSummary();
            loadSlots();
        }
    } catch (error) {
        showMessage('Network error');
    }
}

function showReserveModal(slotId) {
    const modal = document.getElementById('reserveModal');
    modal.style.display = 'block';
    
    const slot = slots.find(s => s.id === slotId);
    if (slot) {
        document.getElementById('selectedSlotDisplay').textContent = `${slot.slot_code} - ${slot.slot_type || 'standard'}`;
        document.getElementById('reserveSlotId').value = slot.id;
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reservationDate').value = today;
    document.getElementById('reservationDate').min = today;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'slotDetailModal' || modalId === 'aiResultModal') {
        clearPath();
    }
}

document.getElementById('reserveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const slotId = parseInt(document.getElementById('reserveSlotId').value);
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE}/reservations/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                slot_id: slotId,
                date: formData.get('date'),
                start_time: formData.get('start_time'),
                end_time: formData.get('end_time')
            })
        });
        
        if (response.ok) {
            showMessage('Reservation created!', 'success');
            closeModal('reserveModal');
            e.target.reset();
            loadReservations();
            loadSummary();
            loadSlots();
        } else {
            const result = await response.json();
            showMessage(result.error || 'Failed to create reservation');
        }
    } catch (error) {
        showMessage('Network error');
    }
});

async function useAISlot() {
    const date = new Date().toISOString().split('T')[0];
    const startTime = '09:00';
    const endTime = '17:00';
    
    try {
        showMessage('AI finding optimal slot...', 'success');
        
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
                drawPathToSlot(data.slot);
                showSlotDetails(data.slot);
            }, 100);
            
            document.getElementById('aiResult').innerHTML = `
                <div class="ai-result">
                    <div class="ai-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                        AI Optimized Selection
                    </div>
                    <div class="ai-slot-display">${data.slot.slot_code}</div>
                    <p style="color: var(--text-secondary); margin-bottom: 16px;">Genetic Algorithm found the optimal parking spot!</p>
                    <div class="ai-details">
                        <div class="ai-detail">
                            <div class="ai-detail-label">Distance</div>
                            <div class="ai-detail-value">${data.slot.entrance_distance}m</div>
                        </div>
                        <div class="ai-detail">
                            <div class="ai-detail-label">Zone</div>
                            <div class="ai-detail-value">${data.slot.slot_code.charAt(0)}</div>
                        </div>
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" onclick="reserveAISlot(${data.slot.id}, '${date}', '${startTime}', '${endTime}')">
                        Reserve AI Slot
                    </button>
                </div>
            `;
            
            document.getElementById('aiResultModal').style.display = 'block';
        } else {
            showMessage('No available slots');
        }
    } catch (error) {
        showMessage('Network error');
    }
}

async function reserveAISlot(slotId, date, startTime, endTime) {
    try {
        const response = await fetch(`${API_BASE}/reservations/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ slot_id: slotId, date, start_time: startTime, end_time: endTime })
        });
        
        if (response.ok) {
            showMessage('Reservation created!', 'success');
            closeModal('aiResultModal');
            aiAssignedSlot = null;
            loadReservations();
            loadSummary();
            loadSlots();
        }
    } catch (error) {
        showMessage('Network error');
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
            if (modal.id !== 'reserveModal') clearPath();
        }
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes drawPath {
        to { stroke-dashoffset: 0; }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard...');
    if (document.getElementById('rowASlots')) {
        loadDashboard();
    }
});
