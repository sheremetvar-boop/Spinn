const firebaseConfig = { /* твой конфиг */ };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let users = {}, globalShop = [], orders = {}, isSpinning = false, currentRotation = 0;
let currentUser = JSON.parse(localStorage.getItem('wheel_session')) || null;

const prizes = [
    { value: 1, chance: 3, color: '#4f46e5' }, { value: 5, chance: 25, color: '#6366f1' },
    { value: 10, chance: 38, color: '#818cf8' }, { value: 20, chance: 9.5, color: '#4f46e5' },
    { value: 25, chance: 13, color: '#6366f1' }, { value: 30, chance: 11.5, color: '#818cf8' }
];

db.ref('/').on('value', (s) => {
    const d = s.val() || {};
    users = d.users || {}; globalShop = d.shop || []; orders = d.orders || {};
    if (currentUser && users[currentUser.username]) currentUser = users[currentUser.username];
    updateUI();
});

function saveAll() { db.ref('users').set(users); db.ref('shop').set(globalShop); }

function createWheel() {
    const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    let svg = `<svg id="wheel-svg" viewBox="0 0 100 100" style="width:100%; height:100%; font-size:5px; fill:white; text-anchor:middle;">`;
    let cumulative = 0;
    prizes.forEach(p => {
        const start = cumulative; cumulative += p.chance;
        const x1 = 50 + 50 * Math.cos(2 * Math.PI * start / 100);
        const y1 = 50 + 50 * Math.sin(2 * Math.PI * start / 100);
        const x2 = 50 + 50 * Math.cos(2 * Math.PI * cumulative / 100);
        const y2 = 50 + 50 * Math.sin(2 * Math.PI * cumulative / 100);
        svg += `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${p.color}" />`;
        const mid = (start + (p.chance / 2)) * (2 * Math.PI / 100);
        svg += `<text x="${50+35*Math.cos(mid)}" y="${50+35*Math.sin(mid)}" transform="rotate(${(mid*180/Math.PI)+90}, ${50+35*Math.cos(mid)}, ${50+35*Math.sin(mid)})">${p.value}</text>`;
    });
    container.innerHTML = svg + `</svg>`;
}

function spin() {
    if (isSpinning || currentUser.spins <= 0) return;
    isSpinning = true; currentUser.spins--; saveAll();
    const wheelSvg = document.getElementById('wheel-svg');
    const idx = Math.floor(Math.random() * prizes.length);
    currentRotation += 1800 + (360 - (idx * (360/prizes.length)));
    wheelSvg.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";
    wheelSvg.style.transform = `rotate(${currentRotation}deg)`;
    setTimeout(() => { isSpinning = false; currentUser.balance += prizes[idx].value; saveAll(); alert(`Выпало: ${prizes[idx].value}`); }, 4000);
}

function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;
    document.getElementById('user-display-name').innerText = currentUser.username;
    // Обновление списков (Shop, Inventory, Orders) аналогично тому, что мы обсуждали
}

function login() { /* логика входа */ }
function show(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function checkAdmin() { if (prompt("Пароль:") === "qws853") show('admin-page'); }
function logout() { localStorage.removeItem('wheel_session'); location.reload(); }
function adminAdjustBalance() { const nick = document.getElementById('admin-target-nick').value.trim(); const amt = parseInt(document.getElementById('admin-amount').value); if (users[nick]) { users[nick].balance += amt; saveAll(); document.getElementById('admin-status').innerText = "Готово!"; } }
function adminGiveSpin() { const nick = document.getElementById('admin-target-nick').value.trim(); if (users[nick]) { users[nick].spins++; saveAll(); } }

window.onload = () => { createWheel(); if (currentUser) enterApp(currentUser); };
