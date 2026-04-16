const API_BASE = 'http://localhost:5000/api';
let slots = [];
let reservations = [];
let selectedSlotId = null;
let aiAssignedSlot = null;
let navigationMode = null;

// ENTRY & EXIT POSITIONS (Change these values to move entry/exit points)
// SVG viewBox: 1000x650
// Entry point - position where vehicles enter (left side)
// Exit point - position where vehicles exit (right side)
const ENTRY_POSITION = { x: -130, y: 240 };   // Entry gate position (Zone B level)
const EXIT_POSITION = { x: 1150, y: 240 };   // Exit gate position (Zone B level)

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
// These coordinates are calibrated to match exact CSS grid positions
const SLOT_POSITIONS = {
    A: { startX: 100, y: 100 },
    B: { startX: 100, y: 340 },
    C: { startX: 100, y: 580 }
};

// Exact slot dimensions matching CSS grid
const SLOT_CONFIG = {
    width: 75,
    height: 100,
    gap: 8,
    containerPadding: 20,
    zoneLabelWidth: 62
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
    // SVG viewBox coordinates: 0-1000 width, 0-650 height
    const slotWidth = 75;
    const slotHeight = 90;
    const slotGap = 8;
    
    const rowPositions = {
        'A': { baseY: 50, roadY: 35 },
        'B': { baseY: 260, roadY: 240 },
        'C': { baseY: 470, roadY: 455 }
    };
    
    const slotAreaStartX = 100;
    const slotCenterX = slotAreaStartX + (col - 1) * (slotWidth + slotGap) + slotWidth / 2;
    
    const rowPos = rowPositions[row];
    const slotCenterY = rowPos.baseY + slotHeight / 2;
    
    // Entry point at right edge (B10 column), on Zone B road
    const entryX = 30; // Entry at left
    const entryY = 240; // Zone B road Y
    
    // Calculate Manhattan distance
    const distancePixels = Math.abs(entryX - slotCenterX) + Math.abs(entryY - slotCenterY);
    
    // Convert to meters (1 SVG unit = 0.1 meters)
    return Math.round(distancePixels * 0.1);
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
    
    // Sort and render (ascending order for all rows)
    ['A', 'B', 'C'].forEach(row => {
        slotsByRow[row].sort((a, b) => a.col - b.col);
        const container = containers[row];
        if (container) {
            container.classList.remove('reversed');
            slotsByRow[row].forEach(slot => {
                container.appendChild(createSlotElement(slot));
            });
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
    
    // Single click: show path
    div.addEventListener('click', () => handleSlotClick(slot));
    
    // Double click: show slot details
    div.addEventListener('dblclick', () => handleSlotDoubleClick(slot));
    
    return div;
}

function getTypeIcon(type) {
    const icons = { electric: '⚡', handicap: '♿', compact: 'C' };
    return icons[type] || '';
}

function handleSlotClick(slot) {
    selectedSlotId = slot.id;
    
    // Single click: show path from entry/exit
    drawPathToSlot(slot);
}

function handleSlotDoubleClick(slot) {
    selectedSlotId = slot.id;
    // Double click: show slot details
    showSlotDetails(slot);
}

function showSlotDetails(slot) {
    const content = document.getElementById('slotDetailContent');
    
    // Calculate exact distance from entry point
    const exactDistance = calculateExactDistance(slot);
    
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
                    <div class="ai-detail-label">Distance from Entry</div>
                    <div class="ai-detail-value" style="color: #10b981; font-weight: 700;">${exactDistance}m</div>
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

function calculateExactDistance(slot) {
    // Use the same calibrated position calculation
    const slotPos = getSlotElementPosition(slot);
    
    const entryX = ENTRY_POSITION.x;
    const entryY = slotPos.roadY;
    
    // Manhattan distance in SVG coordinates
    const horizontalDist = Math.abs(entryX - slotPos.x);
    const verticalDist = Math.abs(entryY - slotPos.y);
    const totalPixels = horizontalDist + verticalDist;
    
    // Convert to meters (1 SVG unit = 0.1 meters)
    return Math.round(totalPixels * 0.1);
}

function getStatusColor(status) {
    const colors = { available: '#10b981', occupied: '#ef4444', reserved: '#06b6d4', maintenance: '#f59e0b', assigned: '#3b82f6' };
    return colors[status] || '#94a3b8';
}

function getSlotElementPosition(slot) {
    const row = slot.row;
    const col = slot.col;
    
    // Exact dimensions matching CSS grid (slots-container: 100px height, gap: 8px)
    const slotWidth = SLOT_CONFIG.width;
    const slotHeight = SLOT_CONFIG.height;
    const slotGap = SLOT_CONFIG.gap;
    
    // SVG viewBox: 1000 x 650
    // The parking main area spans ~900px wide (from x=80 to x=980)
    // 10 slots per row with 8px gap = 10*75 + 9*8 = 822px total slot width
    // Starting from x=90 (after zone label)
    
    // Zone positions in SVG coordinates (calibrated to match CSS layout)
    // Each zone row: zone-label (62px) + slots (10 * 83px slots including gap)
    // Total row height including gap: ~110px
    const svgViewBoxWidth = 1000;
    const svgViewBoxHeight = 650;
    
    // Calculate pixel-to-svg ratio based on container width
    // The slots area spans from ~80px to ~920px in viewBox (840px wide)
    // CSS grid: 10 slots × 75px + 9 × 8px gaps = 750 + 72 = 822px
    // We map this to SVG x range: 90 to 912 (822px span)
    
    const zonePositions = {
        A: { 
            slotY: 60,           // Top of slot area in SVG
            centerY: 110,        // Center of slots in SVG
            roadY: 50            // Main road Y position
        },
        B: { 
            slotY: 280,          // Top of slot area in SVG
            centerY: 330,        // Center of slots in SVG (accounting for 100px slot height)
            roadY: 270           // Main road Y position
        },
        C: { 
            slotY: 500,          // Top of slot area in SVG
            centerY: 550,        // Center of slots in SVG
            roadY: 490           // Main road Y position
        }
    };
    
    // Slot area starts after zone label (62px) + padding
    const slotAreaStartX = 90;
    
    // Calculate slot center X position
    // Each slot is 75px wide with 8px gap, 83px total spacing
    const slotSpacing = slotWidth + slotGap;
    
    // CORRECT FORMULA: slot starts at (startX + (col-1)*spacing), center is + width/2
    // For col=1: startX + 0 + 37.5 = 127.5 (not 202.5)
    // For col=2: startX + 83 + 37.5 = 210.5
    // For col=10: startX + 747 + 37.5 = 874.5
    const baseX = slotAreaStartX + (col - 1) * slotSpacing;
    
    // Zone B in dashboard.html has NO 'reversed' class - all zones use normal order
    // Slots appear left-to-right: A1, A2...A10 | B1, B2...B10 | C1, C2...C10
    const finalX = baseX + slotWidth / 2;
    
    const zonePos = zonePositions[row];
    
    return {
        x: finalX,
        y: zonePos.centerY,
        roadX: finalX,
        roadY: zonePos.roadY,
        slotCenterY: zonePos.centerY,
        slotWidth,
        slotHeight,
        // For waypoint calculation
        zonePos: zonePos
    };
}

function drawPathToSlot(slot) {
    const svg = document.getElementById('parkingPathSvg');
    const pathGroup = document.getElementById('pathGroup');
    if (!svg || !pathGroup) return;
    
    pathGroup.innerHTML = '';
    
    const isExit = navigationMode === 'exit';
    
    // Get exact slot position using calibrated function
    const slotPos = getSlotElementPosition(slot);
    
    const slotCenterX = slotPos.x;
    const slotCenterY = slotPos.y;
    
    // Entry/Exit positions
    const startX = isExit ? EXIT_POSITION.x : ENTRY_POSITION.x;
    const startY = slotPos.roadY;
    
    // Calculate distance (Manhattan distance in SVG coordinates)
    const horizontalDist = Math.abs(startX - slotCenterX);
    const verticalDist = Math.abs(startY - slotCenterY);
    const totalPixels = horizontalDist + verticalDist;
    
    // Convert to real meters: SVG units to meters (1 SVG unit = 0.1 meters)
    const distanceMeters = Math.round(totalPixels * 0.1);
    const distanceText = distanceMeters < 1 ? '<1m' : `${distanceMeters}m`;
    
    // Path waypoints - direct path from entry/exit to slot
    const waypoints = [
        { x: slotCenterX, y: startY },
        { x: slotCenterX, y: slotCenterY }
    ];
    
    // Build path
    let pathD = `M ${startX} ${startY}`;
    waypoints.forEach(wp => {
        pathD += ` L ${wp.x} ${wp.y}`;
    });
    
    // Draw path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', 'url(#pathGradient)');
    path.setAttribute('stroke-width', '6');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(path);
    
    // Start marker
    const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startMarker.setAttribute('cx', startX);
    startMarker.setAttribute('cy', startY);
    startMarker.setAttribute('r', '18');
    startMarker.setAttribute('fill', isExit ? '#ef4444' : '#10b981');
    startMarker.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(startMarker);
    
    // Start label
    const startLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    startLabel.setAttribute('x', startX);
    startLabel.setAttribute('y', startY + 5);
    startLabel.setAttribute('text-anchor', 'middle');
    startLabel.setAttribute('fill', 'white');
    startLabel.setAttribute('font-size', '10');
    startLabel.setAttribute('font-weight', 'bold');
    startLabel.textContent = isExit ? 'EXIT' : 'ENTRY';
    pathGroup.appendChild(startLabel);
    
    // End marker (pulsing ring)
    const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endMarker.setAttribute('cx', slotCenterX);
    endMarker.setAttribute('cy', slotCenterY);
    endMarker.setAttribute('r', '22');
    endMarker.setAttribute('fill', 'rgba(139, 92, 246, 0.3)');
    endMarker.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(endMarker);
    
    // End dot
    const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endDot.setAttribute('cx', slotCenterX);
    endDot.setAttribute('cy', slotCenterY);
    endDot.setAttribute('r', '10');
    endDot.setAttribute('fill', '#8b5cf6');
    endDot.setAttribute('filter', 'url(#pathGlow)');
    pathGroup.appendChild(endDot);
    
    // Slot label (exact slot code)
    const slotLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    slotLabel.setAttribute('x', slotCenterX);
    slotLabel.setAttribute('y', slotCenterY + 4);
    slotLabel.setAttribute('text-anchor', 'middle');
    slotLabel.setAttribute('fill', 'white');
    slotLabel.setAttribute('font-size', '11');
    slotLabel.setAttribute('font-weight', 'bold');
    slotLabel.textContent = slot.slot_code;
    pathGroup.appendChild(slotLabel);
    
    // Distance label box
    const distBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    distBox.setAttribute('x', slotCenterX - 30);
    distBox.setAttribute('y', slotCenterY + 18);
    distBox.setAttribute('width', '60');
    distBox.setAttribute('height', '22');
    distBox.setAttribute('rx', '11');
    distBox.setAttribute('fill', 'rgba(15, 23, 42, 0.95)');
    distBox.setAttribute('stroke', '#8b5cf6');
    distBox.setAttribute('stroke-width', '2');
    pathGroup.appendChild(distBox);
    
    // Distance text
    const distText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    distText.setAttribute('x', slotCenterX);
    distText.setAttribute('y', slotCenterY + 33);
    distText.setAttribute('text-anchor', 'middle');
    distText.setAttribute('fill', '#10b981');
    distText.setAttribute('font-size', '11');
    distText.setAttribute('font-weight', 'bold');
    distText.textContent = distanceText;
    pathGroup.appendChild(distText);
    
    // Highlight the corresponding slot element
    highlightSlot(slot);
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
        
        // Show exact distance
        const exactDistance = calculateExactDistance(slot);
        document.getElementById('selectedSlotDistance').textContent = `${exactDistance} meters from Entry`;
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
