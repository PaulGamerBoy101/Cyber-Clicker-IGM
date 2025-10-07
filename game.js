// ==========================
// ===== GAME STATE =====
// ==========================
let state = {
    computerchips: 0,     // Total number of computer chips
    goldenchips: 0,       // Total number of golden chips
    ps: 0,                // Computer Chips per second
    upgrades: {},         // Purchased upgrades
    buildings: {},        // Purchased buildings
    achievements: {},     // Achievements unlocked
};

// ===== Load saved progress from localStorage on game start =====
const savedData = localStorage.getItem("cyberClickerSave");
if (savedData) {
    try {
        const parsedState = JSON.parse(savedData);

        // Merge saved state into current state safely
        if (parsedState) {
            state.computerchips   = parsedState.computerchips   ?? state.computerchips;
            state.goldenchips     = parsedState.goldenchips     ?? state.goldenchips;
            state.ps              = parsedState.ps              ?? state.ps;
            state.upgrades        = parsedState.upgrades        ?? {};
            state.buildings       = parsedState.buildings       ?? {};
            state.achievements    = parsedState.achievements    ?? {};
        }

    } catch (err) {
        console.error("Failed to load saved data:", err);
    }
}


// ==========================
// ===== ULTRA-SAFE AUTOSAVE =====
setInterval(() => {
    // Ensure all dynamic fields are updated in state
    calculatePS();        // recalc ps
    checkAchievements();  // sync achievements into state.achievements

    // Save everything in state
    localStorage.setItem("cyberClickerSave", JSON.stringify(state));
}, 100); // 100 ms



// ==========================
// ===== DOM ELEMENTS =====
// ==========================
const chipButton = document.getElementById("chipButton");


// ==========================
// ===== HELPER FUNCTIONS =====
// ==========================

// Add Computer Chips and update display
function addChips(amount) {
    state.computerchips += amount;
    updateAllDisplays();
    checkAchievements();
}

// Add Golden Chips and update display
function addGoldenChips(amount) {
    state.goldenchips += amount;
    updateAllDisplays();
    checkAchievements();
}

// Returns true with a given percentage chance
function chance(percent) { return Math.random() < percent / 100; }


// ==========================
// ===== CLICK HANDLER =====
// ==========================

// Helper function to handle a single click
function handleChipClick() {
    let yieldAmount = 1;
    if (state.upgrades.goldenTouch) yieldAmount += 2;
    if (state.upgrades.superClick) yieldAmount += 5;
    if (state.upgrades.superClick2) yieldAmount += 500;

    addChips(yieldAmount);

    if (state.upgrades.goldenTouch && chance(1)) addGoldenChips(1);

    // Wobble effect
    chipButton.classList.add("wobble");
    setTimeout(() => chipButton.classList.remove("wobble"), 300);
}

// Pointerdown event for multi-touch support
chipButton.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" || e.pointerType === "mouse") {
        // Only trigger once per actual finger press
        if (!e.isPrimary && e.pointerType === "touch") return;
        handleChipClick();
    }
});

// Prevent default gesture interference (pinch, scroll) for left-side
document.querySelector('.left-side').style.touchAction = "none";


// ==========================
// ===== UPGRADES =====
// ==========================
const upgradesData = [
    { id: 'goldenTouch', name: 'Golden Touch', desc: '1% chance of golden chip per click', cost: { goldenchips: 1 } },
{ id: 'powerIncrease', name: 'Power Increase', desc: '+2 chips per click', cost: { computerchips: 1000, goldenchips: 2 } },
{ id: 'superClick', name: 'Super Click', desc: '+5 chips per click', cost: { computerchips: 5000, goldenchips: 2 } },
{ id: 'superClick2', name: 'Super Click 2', desc: '+500 chips per click', cost: { computerchips: 10000, goldenchips: 2 } },
];

function formatCost(costObj) {
    const parts = [];
    if (costObj.computerchips) parts.push(`${costObj.computerchips.toLocaleString()} Computer Chips`);
    if (costObj.goldenchips) parts.push(`${costObj.goldenchips.toLocaleString()} Golden Chip${costObj.goldenchips > 1 ? "s" : ""}`);
    return parts.join(" & ");
}

function renderUpgrades() {
    const container = document.querySelector("#upgrades .items");
    container.innerHTML = '';
    upgradesData.forEach(upg => {
        if (state.upgrades[upg.id]) return;
        let div = document.createElement("div");
        div.className = "upgrade";
        div.innerHTML = `
        <strong>${upg.name}</strong><br>
        ${upg.desc}<br>
        <span class="cost">Cost: ${formatCost(upg.cost)}</span>
        `;
        div.addEventListener("click", () => buyUpgrade(upg));
        container.appendChild(div);
    });
}

function buyUpgrade(upg) {
    let canBuy = true;
    if (upg.cost.computerchips && state.computerchips < upg.cost.computerchips) canBuy = false;
    if (upg.cost.goldenchips && state.goldenchips < upg.cost.goldenchips) canBuy = false;
    if (!canBuy) return alert("Not enough resources!");

    if (upg.cost.computerchips) state.computerchips -= upg.cost.computerchips;
    if (upg.cost.goldenchips) state.goldenchips -= upg.cost.goldenchips;

    state.upgrades[upg.id] = true;
    renderUpgrades();
    updateAllDisplays();
}

renderUpgrades();


// ==========================
// ===== BUILDINGS =====
// ==========================
const buildingsData = [
    { id: 'powersupply', name: 'Power Supply', cost: 15, cps: 0.1 },
{ id: 'motherboard', name: 'Motherboard', cost: 100, cps: 0.5 },
{ id: 'laptop', name: 'Laptop', cost: 600, cps: 5 },
];

function renderBuildings() {
    const container = document.querySelector("#buildings .items");
    container.innerHTML = '';
    buildingsData.forEach(build => {
        let div = document.createElement("div");
        div.className = "building";
        div.innerHTML = `
        <strong>${build.name}</strong><br>
        Produces ${build.cps} chips/sec<br>
        <span class="cost">Cost: ${build.cost.toLocaleString()} Computer Chips</span>
        `;
        div.addEventListener("click", () => buyBuilding(build));
        container.appendChild(div);
    });
}

function buyBuilding(build) {
    if (state.computerchips < build.cost) return alert("Not enough chips!");
    state.computerchips -= build.cost;
    if (!state.buildings[build.id]) state.buildings[build.id] = 0;
    state.buildings[build.id] += 1;

    calculatePS();
    renderBuildings();
    updateAllDisplays();
}

renderBuildings();

function calculatePS() {
    let ps = 0;
    for (let b in state.buildings) {
        let building = buildingsData.find(x => x.id === b);
        ps += building.cps * state.buildings[b];
    }
    state.ps = ps;
}


// ==========================
// ===== AUTO PRODUCTION =====
// ==========================
setInterval(() => { addChips(state.ps); }, 1000);


// ==========================
// ===== ACHIEVEMENTS =====
// ==========================
const achievementsData = [
    { id: 'firstChip', name: 'First Chip', desc: 'Get 1 chip', req: () => state.computerchips >= 1 },
    { id: 'hundredChip', name: 'Hundred Chips', desc: 'Get 100 chips', req: () => state.computerchips >= 100 },
];

function renderAchievements() {
    const container = document.getElementById("achievements");
    achievementsData.forEach(a => {
        if (a.req() && !state.achievements[a.id]) {
            state.achievements[a.id] = true;
            let div = document.createElement("div");
            div.className = "achievement";
            div.innerText = `Achievement Unlocked: ${a.name}`;
            container.appendChild(div);
        }
    });
}

function checkAchievements() { renderAchievements(); }


// ==========================
// ===== DISPLAY UPDATES =====
function updatePS() {
    document.getElementById("chipPS").innerText = state.ps.toFixed(1);
}

function updateClickEffect() {
    let yieldAmount = 1;
    if(state.upgrades.goldenTouch) yieldAmount += 2;
    if(state.upgrades.superClick) yieldAmount += 5;
    if(state.upgrades.superClick2) yieldAmount += 500;

    document.getElementById("clickEffect").innerText = yieldAmount;

    let goldenEffect = state.upgrades.goldenTouch ? 1 : 0;
    document.getElementById("clickGoldenEffect").innerText = goldenEffect;
}

function updateAllDisplays() {
    document.getElementById("computerchips").innerText = Math.floor(state.computerchips);
    document.getElementById("goldenchips").innerText = Math.floor(state.goldenchips);
    updatePS();
    updateClickEffect();
}


// ==========================
// ===== RIGHT-CLICK DISABLE =====
document.addEventListener('contextmenu', e => e.preventDefault());


// ==========================
// ===== LUCKY GOLDEN CHIP =====
function spawnLuckyGoldenChip() {
    const leftSide = document.querySelector('.left-side');
    const chip = document.createElement('div');
    chip.className = 'floatingGoldenChip';
    chip.innerText = '💛';

    const button = document.getElementById('chipButton');
    const offsetX = (Math.random() < 0.5)
    ? button.offsetLeft - 60
    : button.offsetLeft + button.offsetWidth + 20;

    const offsetY = button.offsetTop + Math.random() * button.offsetHeight - 20;

    chip.style.position = 'absolute';
    chip.style.left = `${offsetX}px`;
    chip.style.top = `${offsetY}px`;
    chip.style.zIndex = 1000;

    leftSide.appendChild(chip);

    chip.addEventListener('click', () => {
        const bonus = 1 + (state.upgrades.goldenTouch ? 1 : 0);
        addGoldenChips(bonus);
        chip.remove();
        scheduleNextLuckyChip();
    });

    setTimeout(() => chip.remove(), 30000);
}

function scheduleNextLuckyChip() {
    const minutes = 5 + Math.random() * 5;
    const ms = minutes * 60 * 1000;
    setTimeout(spawnLuckyGoldenChip, ms);
}

setTimeout(spawnLuckyGoldenChip, 5 * 60 * 1000);


// ========================================
// ===== Export Progress as JSON File =====
document.getElementById("exportProgress").addEventListener("click", () => {
    const exportData = JSON.stringify(state, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "CyberClickerSave.json";
    a.click();

    URL.revokeObjectURL(url);
});


// ==========================================
// ===== Import Progress from JSON File =====
// ==========================================

document.getElementById("importProgress").addEventListener("click", () => {
    document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsedState = JSON.parse(event.target.result);
            if (parsedState.computerchips !== undefined && parsedState.upgrades !== undefined) {
                state = parsedState;
                updateAllDisplays();
                renderBuildings();
                renderUpgrades();
                renderAchievements();
                alert("Progress imported successfully!");
            } else {
                alert("Invalid save file!");
            }
        } catch (err) {
            alert("Error parsing JSON: " + err);
        }
    };
    reader.readAsText(file);
});


// ==========================================
// ========== Reset Button Logic ============
// ==========================================
document.getElementById("resetProgress").addEventListener("click", () => {
    if (!confirm("Are you sure you want to reset all progress? This cannot be undone.")) return;

    // Reset state
    state = {
        computerchips: 0,
        goldenchips: 0,
        ps: 0,
        upgrades: {},
        buildings: {},
        achievements: {},
    };

    // Clear localStorage save
    localStorage.removeItem("cyberClickerSave");

    // Update all displays immediately
    updateAllDisplays();
    renderBuildings();
    renderUpgrades();
    renderAchievements();
});

