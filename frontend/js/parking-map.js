/* ===========================================
   SMART PARKING - REAL PARKING MAP JS
   Genetic Algorithm + Path Visualization
   =========================================== */

const CONFIG = {
    API_BASE: 'http://localhost:5000/api',
    TOTAL_SLOTS: 30,
    ROWS: 3,
    COLS: 10,
    GA_POPULATION_SIZE: 50,
    GA_GENERATIONS: 100,
    GA_MUTATION_RATE: 0.1,
    GA_ELITE_COUNT: 5
};

const SLOT_STATUS = {
    AVAILABLE: 'available',
    OCCUPIED: 'occupied',
    ASSIGNED: 'assigned',
    RESERVED: 'reserved',
    MAINTENANCE: 'maintenance'
};

const SLOT_TYPES = {
    STANDARD: 'standard',
    COMPACT: 'compact',
    ELECTRIC: 'electric',
    HANDICAP: 'handicapped'
};

let slots = [];
let selectedSlot = null;
let assignedSlot = null;
let isGARunning = false;

document.addEventListener('DOMContentLoaded', () => {
    initParkingMap();
    startClock();
    setupEventListeners();
    startAutoRefresh();
});

async function initParkingMap() {
    try {
        await loadSlotsFromBackend();
        renderAllSlots();
        updateStats();
        showToast('Parking lot loaded successfully', 'success');
    } catch (error) {
        console.error('Backend not connected, using demo data:', error);
        generateDemoSlots();
        renderAllSlots();
        updateStats();
        showToast('Running in demo mode', 'info');
    }
}

function setupEventListeners() {
    document.getElementById('btnFindParking')?.addEventListener('click', runGeneticAlgorithm);
    document.getElementById('btnRefresh')?.addEventListener('click', refreshParkingMap);
    document.getElementById('closePanel')?.addEventListener('click', hideAssignmentPanel);
}

function generateDemoSlots() {
    slots = [];
    const rowLabels = ['A', 'B', 'C'];
    
    for (let i = 1; i <= CONFIG.TOTAL_SLOTS; i++) {
        const rowIndex = Math.floor((i - 1) / CONFIG.COLS);
        const colIndex = (i - 1) % CONFIG.COLS;
        
        let type = SLOT_TYPES.STANDARD;
        if (i % 8 === 0) type = SLOT_TYPES.ELECTRIC;
        if (i % 11 === 0) type = SLOT_TYPES.HANDICAP;
        if (i % 13 === 0) type = SLOT_TYPES.COMPACT;
        
        let status;
        const rand = Math.random();
        if (rand < 0.4) status = SLOT_STATUS.AVAILABLE;
        else if (rand < 0.75) status = SLOT_STATUS.OCCUPIED;
        else if (rand < 0.9) status = SLOT_STATUS.RESERVED;
        else status = SLOT_STATUS.MAINTENANCE;
        
        slots.push({
            id: i,
            slot_number: `${rowLabels[rowIndex]}${colIndex + 1}`,
            row: rowLabels[rowIndex],
            row_index: rowIndex,
            col: colIndex + 1,
            status: status,
            type: type,
            distance: calculateDistance(rowIndex, colIndex)
        });
    }
}

function calculateDistance(rowIndex, colIndex) {
    const baseDist = 10;
    const rowDist = rowIndex * 80;
    const colDist = colIndex * 12;
    return baseDist + rowDist + colDist;
}

async function loadSlotsFromBackend() {
    const response = await fetch(`${CONFIG.API_BASE}/parking/slots`, {
        method: 'GET',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to load slots');
    
    const data = await response.json();
    const rowLabels = ['A', 'B', 'C'];
    
    slots = data.slots.slice(0, CONFIG.TOTAL_SLOTS).map((slot, index) => {
        const rowIndex = Math.floor(index / CONFIG.COLS);
        const colIndex = index % CONFIG.COLS;
        
        return {
            ...slot,
            slot_number: slot.slot_code || `${rowLabels[rowIndex]}${colIndex + 1}`,
            row: rowLabels[rowIndex],
            row_index: rowIndex,
            col: colIndex + 1,
            status: slot.status || SLOT_STATUS.AVAILABLE,
            distance: slot.entrance_distance || calculateDistance(rowIndex, colIndex)
        };
    });
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

function renderAllSlots() {
    const containers = {
        A: document.getElementById('rowASlots'),
        B: document.getElementById('rowBSlots'),
        C: document.getElementById('rowCSlots')
    };
    
    Object.values(containers).forEach(c => c && (c.innerHTML = ''));
    
    const slotsByRow = { A: [], B: [], C: [] };
    slots.forEach(slot => {
        if (slotsByRow[slot.row]) slotsByRow[slot.row].push(slot);
    });
    
    ['A', 'B', 'C'].forEach(row => {
        slotsByRow[row].sort((a, b) => a.col - b.col);
        const container = containers[row];
        if (container) {
            slotsByRow[row].forEach(slot => container.appendChild(createSlotElement(slot)));
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
    
    if (selectedSlot?.id === slot.id) div.classList.add('selected');
    if (assignedSlot?.id === slot.id) div.classList.add('assigned');
    
    const numDiv = document.createElement('div');
    numDiv.className = 'slot-number';
    numDiv.textContent = slot.slot_number;
    div.appendChild(numDiv);
    
    if (slot.type !== SLOT_TYPES.STANDARD) {
        const typeDiv = document.createElement('div');
        typeDiv.className = 'slot-type';
        typeDiv.textContent = getTypeIcon(slot.type);
        div.appendChild(typeDiv);
    }
    
    if (slot.status === SLOT_STATUS.OCCUPIED) {
        const carDiv = document.createElement('div');
        carDiv.className = 'slot-car';
        carDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`;
        div.appendChild(carDiv);
    }
    
    div.addEventListener('click', () => {
        selectedSlot = slot;
        renderAllSlots();
        showAssignmentPanel(slot);
        drawPathToSlot(slot);
    });
    
    return div;
}

function getTypeIcon(type) {
    const icons = { electric: '⚡', handicap: '♿', compact: 'C' };
    return icons[type] || '';
}

function updateStats() {
    const stats = {
        available: slots.filter(s => s.status === SLOT_STATUS.AVAILABLE).length,
        occupied: slots.filter(s => s.status === SLOT_STATUS.OCCUPIED).length,
        assigned: slots.filter(s => s.status === SLOT_STATUS.ASSIGNED).length,
        reserved: slots.filter(s => s.status === SLOT_STATUS.RESERVED).length
    };
    
    document.getElementById('availableCount').textContent = stats.available;
    document.getElementById('occupiedCount').textContent = stats.occupied;
    document.getElementById('assignedCount').textContent = stats.assigned;
    document.getElementById('reservedCount').textContent = stats.reserved;
}

function getSlotPosition(slot) {
    const row = slot.row;
    const col = slot.col;
    const slotWidth = 75;
    const slotGap = 8;
    
    const positions = { A: { baseY: 65 }, B: { baseY: 295 }, C: { baseY: 525 } };
    const baseX = 80 + (col - 1) * (slotWidth + slotGap);
    const baseY = positions[row].baseY;
    
    return { x: baseX + slotWidth / 2, y: baseY + 45 };
}

function drawPathToSlot(slot) {
    const svg = document.getElementById('pathSvg');
    const pathGroup = document.getElementById('pathGroup');
    if (!svg || !pathGroup) return;
    
    pathGroup.innerHTML = '';
    
    // Entry point
    const entryX = 30;
    const entryY = 325;
    
    // Slot position
    const slotPos = getSlotPosition(slot);
    
    // Calculate waypoints
    const waypoints = calculateWaypoints(entryX, entryY, slot);
    
    // Create path
    let pathD = `M ${waypoints[0].x} ${waypoints[0].y}`;
    for (let i = 1; i < waypoints.length; i++) {
        pathD += ` L ${waypoints[i].x} ${waypoints[i].y}`;
    }
    
    // Draw path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('stroke', 'url(#pathGrad)');
    path.setAttribute('stroke-width', '8');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('filter', 'url(#glow)');
    path.setAttribute('stroke-dasharray', '2000');
    path.setAttribute('stroke-dashoffset', '2000');
    path.style.animation = 'drawPath 1.5s ease forwards';
    pathGroup.appendChild(path);
    
    // Start marker
    const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startMarker.setAttribute('cx', entryX);
    startMarker.setAttribute('cy', entryY);
    startMarker.setAttribute('r', '15');
    startMarker.setAttribute('fill', '#10b981');
    startMarker.setAttribute('filter', 'url(#glow)');
    pathGroup.appendChild(startMarker);
    
    const startLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    startLabel.setAttribute('x', entryX);
    startLabel.setAttribute('y', entryY + 5);
    startLabel.setAttribute('text-anchor', 'middle');
    startLabel.setAttribute('fill', 'white');
    startLabel.setAttribute('font-size', '10');
    startLabel.setAttribute('font-weight', 'bold');
    startLabel.textContent = 'IN';
    pathGroup.appendChild(startLabel);
    
    // End marker
    const endMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endMarker.setAttribute('cx', slotPos.x);
    endMarker.setAttribute('cy', slotPos.y);
    endMarker.setAttribute('r', '25');
    endMarker.setAttribute('fill', 'rgba(139, 92, 246, 0.3)');
    endMarker.setAttribute('filter', 'url(#glow)');
    pathGroup.appendChild(endMarker);
    
    const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endDot.setAttribute('cx', slotPos.x);
    endDot.setAttribute('cy', slotPos.y);
    endDot.setAttribute('r', '12');
    endDot.setAttribute('fill', '#8b5cf6');
    endDot.setAttribute('filter', 'url(#glow)');
    pathGroup.appendChild(endDot);
    
    const slotLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    slotLabel.setAttribute('x', slotPos.x);
    slotLabel.setAttribute('y', slotPos.y + 4);
    slotLabel.setAttribute('text-anchor', 'middle');
    slotLabel.setAttribute('fill', 'white');
    slotLabel.setAttribute('font-size', '11');
    slotLabel.setAttribute('font-weight', 'bold');
    slotLabel.textContent = slot.slot_number;
    pathGroup.appendChild(slotLabel);
    
    // Distance label
    const distBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    distBox.setAttribute('x', slotPos.x - 35);
    distBox.setAttribute('y', slotPos.y + 20);
    distBox.setAttribute('width', '70');
    distBox.setAttribute('height', '24');
    distBox.setAttribute('rx', '12');
    distBox.setAttribute('fill', 'rgba(15, 23, 42, 0.95)');
    distBox.setAttribute('stroke', '#8b5cf6');
    distBox.setAttribute('stroke-width', '2');
    pathGroup.appendChild(distBox);
    
    const distText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    distText.setAttribute('x', slotPos.x);
    distText.setAttribute('y', slotPos.y + 36);
    distText.setAttribute('text-anchor', 'middle');
    distText.setAttribute('fill', '#10b981');
    distText.setAttribute('font-size', '12');
    distText.setAttribute('font-weight', 'bold');
    distText.textContent = `${slot.distance}m`;
    pathGroup.appendChild(distText);
}

function calculateWaypoints(entryX, entryY, slot) {
    const waypoints = [{ x: entryX, y: entryY }];
    const roadY = { A: 180, B: 270, C: 450 };
    const midX = entryX + 200;
    
    if (slot.row === 'A') {
        waypoints.push({ x: midX, y: entryY });
        waypoints.push({ x: midX, y: roadY.A });
        waypoints.push({ x: getSlotPosition(slot).x, y: roadY.A });
        waypoints.push({ x: getSlotPosition(slot).x, y: getSlotPosition(slot).y });
    } else if (slot.row === 'B') {
        waypoints.push({ x: midX, y: entryY });
        waypoints.push({ x: midX, y: roadY.B });
        waypoints.push({ x: getSlotPosition(slot).x, y: roadY.B });
        waypoints.push({ x: getSlotPosition(slot).x, y: getSlotPosition(slot).y });
    } else if (slot.row === 'C') {
        waypoints.push({ x: midX, y: entryY });
        waypoints.push({ x: midX, y: roadY.C });
        waypoints.push({ x: getSlotPosition(slot).x, y: roadY.C });
        waypoints.push({ x: getSlotPosition(slot).x, y: getSlotPosition(slot).y });
    }
    
    return waypoints;
}

function clearPath() {
    const pathGroup = document.getElementById('pathGroup');
    if (pathGroup) pathGroup.innerHTML = '';
}

async function runGeneticAlgorithm() {
    if (isGARunning) return;
    
    const btn = document.getElementById('btnFindParking');
    btn.classList.add('running');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="spin"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg><span>Optimizing...</span>`;
    
    isGARunning = true;
    showToast('Running Genetic Algorithm...', 'loading');
    
    const startTime = performance.now();
    const availableSlots = slots.filter(s => s.status === SLOT_STATUS.AVAILABLE);
    
    if (availableSlots.length === 0) {
        showToast('No available slots!', 'error');
        resetGAButton();
        return;
    }
    
    const result = await runGA(availableSlots, startTime);
    
    if (result) {
        assignedSlot = result.slot;
        assignedSlot.status = SLOT_STATUS.ASSIGNED;
        renderAllSlots();
        drawPathToSlot(assignedSlot);
        showAssignmentPanel(assignedSlot, result);
        showToast(`Assigned: ${assignedSlot.slot_number}`, 'success');
    } else {
        showToast('No optimal slot found', 'error');
    }
    
    resetGAButton();
}

async function runGA(availableSlots, startTime) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const population = [];
            
            for (let i = 0; i < CONFIG.GA_POPULATION_SIZE; i++) {
                const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
                population.push({ slot, fitness: calculateFitness(slot) });
            }
            
            let bestSolution = null;
            let bestFitness = -Infinity;
            let generation = 0;
            
            const evolve = () => {
                population.sort((a, b) => b.fitness - a.fitness);
                
                if (population[0].fitness > bestFitness) {
                    bestFitness = population[0].fitness;
                    bestSolution = { ...population[0] };
                }
                
                updateGAStats(generation, bestFitness, performance.now() - startTime);
                
                if (generation >= CONFIG.GA_GENERATIONS) {
                    resolve({
                        slot: bestSolution.slot,
                        generation,
                        fitness: bestFitness.toFixed(4),
                        elapsed: Math.round(performance.now() - startTime)
                    });
                    return;
                }
                
                const newPopulation = population.slice(0, CONFIG.GA_ELITE_COUNT);
                
                while (newPopulation.length < CONFIG.GA_POPULATION_SIZE) {
                    const parent1 = tournamentSelect(population);
                    const parent2 = tournamentSelect(population);
                    let child = Math.random() < 0.7 ? (Math.random() < 0.5 ? parent1 : parent2) : { slot: availableSlots[Math.floor(Math.random() * availableSlots.length)], fitness: 0 };
                    
                    if (Math.random() < CONFIG.GA_MUTATION_RATE) {
                        child = { slot: availableSlots[Math.floor(Math.random() * availableSlots.length)], fitness: 0 };
                    }
                    
                    child.fitness = calculateFitness(child.slot);
                    newPopulation.push(child);
                }
                
                population.length = 0;
                population.push(...newPopulation);
                generation++;
                
                if (generation % 10 === 0) setTimeout(evolve, 0);
                else evolve();
            };
            
            evolve();
        }, 100);
    });
}

function calculateFitness(slot) {
    const distanceScore = 1 - (slot.distance / 250);
    const typeScore = slot.type === SLOT_TYPES.STANDARD ? 1 : 0.8;
    return (distanceScore * 0.6) + (typeScore * 0.4);
}

function tournamentSelect(population, size = 3) {
    let best = null;
    for (let i = 0; i < size; i++) {
        const candidate = population[Math.floor(Math.random() * population.length)];
        if (!best || candidate.fitness > best.fitness) best = candidate;
    }
    return best;
}

function updateGAStats(generation, fitness, elapsed) {
    const genEl = document.getElementById('gaGeneration');
    const fitEl = document.getElementById('gaFitness');
    const timeEl = document.getElementById('gaElapsed');
    
    if (genEl) genEl.textContent = generation;
    if (fitEl) fitEl.textContent = fitness.toFixed(4);
    if (timeEl) timeEl.textContent = `${Math.round(elapsed)}ms`;
}

function resetGAButton() {
    isGARunning = false;
    const btn = document.getElementById('btnFindParking');
    btn.classList.remove('running');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>Find Parking (GA)</span>`;
}

function showAssignmentPanel(slot, result = null) {
    const panel = document.getElementById('assignmentPanel');
    const badge = document.getElementById('slotBadge');
    const rowEl = document.getElementById('assignedRow');
    const spotEl = document.getElementById('assignedSpot');
    const distEl = document.getElementById('assignedDistance');
    
    if (badge) badge.textContent = slot.slot_number;
    if (rowEl) rowEl.textContent = slot.row;
    if (spotEl) spotEl.textContent = slot.col;
    if (distEl) distEl.textContent = slot.distance;
    
    if (result) {
        const genEl = document.getElementById('gaGeneration');
        const fitEl = document.getElementById('gaFitness');
        const timeEl = document.getElementById('gaElapsed');
        if (genEl) genEl.textContent = result.generation;
        if (fitEl) fitEl.textContent = result.fitness;
        if (timeEl) timeEl.textContent = `${result.elapsed}ms`;
    }
    
    panel.classList.add('show');
}

function hideAssignmentPanel() {
    document.getElementById('assignmentPanel')?.classList.remove('show');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function startClock() {
    function updateClock() {
        const now = new Date();
        const timeEl = document.getElementById('currentTime');
        const dateEl = document.getElementById('currentDate');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        if (dateEl) dateEl.textContent = now.toLocaleDateString();
    }
    updateClock();
    setInterval(updateClock, 1000);
}

async function refreshParkingMap() {
    clearPath();
    assignedSlot = null;
    selectedSlot = null;
    
    try {
        await loadSlotsFromBackend();
    } catch (error) {
        generateDemoSlots();
    }
    
    renderAllSlots();
    updateStats();
    showToast('Parking map refreshed', 'success');
}

function startAutoRefresh() {
    setInterval(async () => {
        try {
            await loadSlotsFromBackend();
            renderAllSlots();
            updateStats();
        } catch (error) {}
    }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes drawPath { to { stroke-dashoffset: 0; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);
