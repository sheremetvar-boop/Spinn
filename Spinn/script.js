// --- КОНФИГУРАЦИЯ ---
const firebaseConfig = {
    apiKey: "AIzaSyCdxe_1o1qOe-Q0S9VqaanNt-ts-avioCc",
    authDomain: "spinn-f9913.firebaseapp.com",
    databaseURL: "https://spinn-f9913-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "spinn-f9913",
    storageBucket: "spinn-f9913.firebasestorage.app",
    messagingSenderId: "694847076025",
    appId: "1:694847076025:web:e10ccd43890216b5200d68"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- ПЕРЕМЕННЫЕ ---
let users = {}, globalShop = [], orders = {}, isSpinning = false, currentRotation = 0;
let currentUser = JSON.parse(localStorage.getItem('wheel_session')) || null;

const prizes = [
    { value: 1, chance: 3, color: '#4f46e5' }, { value: 5, chance: 25, color: '#6366f1' },
    { value: 10, chance: 38, color: '#818cf8' }, { value: 20, chance: 9.5, color: '#4f46e5' },
    { value: 25, chance: 13, color: '#6366f1' }, { value: 30, chance: 11.5, color: '#818cf8' }
];

// --- СИНХРОНИЗАЦИЯ ---
db.ref('/').on('value', (s) => {
    const data = s.val() || {};
    users = data.users || {};
    globalShop = data.shop || [];
    orders = data.orders || {};
    if (currentUser && users[currentUser.username]) currentUser = users[currentUser.username];
    updateUI();
});

function saveAll() {
    db.ref('users').set(users);
    db.ref('shop').set(globalShop);
}

// --- ФУНКЦИИ КОЛЕСА ---
function createWheel() {
    const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    let svg = `<svg id="wheel-svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">`;
    let cumulative = 0;
    prizes.forEach(p => {
        const start = cumulative; cumulative += p.chance;
        const x1 = 50 + 50 * Math.cos(2 * Math.PI * start / 100);
        const y1 = 50 + 50 * Math.sin(2 * Math.PI * start / 100);
        const x2 = 50 + 50 * Math.cos(2 * Math.PI * cumulative / 100);
        const y2 = 50 + 50 * Math.sin(2 * Math.PI * cumulative / 100);
        svg += `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${p.color}" stroke="#fff" stroke-width="0.3"/>`;
        const mid = (start + p.chance / 2) * (2 * Math.PI / 100);
        svg += `<text x="${50 + 35 * Math.cos(mid)}" y="${50 + 35 * Math.sin(mid)}" fill="white" font-size="5" text-anchor="middle" transform="rotate(${(mid*180/Math.PI)+90}, ${50+35*Math.cos(mid)}, ${50+35*Math.sin(mid)})">${p.value}</text>`;
    });
    container.innerHTML = svg + `</svg>`;
}

function spin() {
    if (isSpinning || !currentUser || currentUser.spins <= 0) return;
    isSpinning = true; currentUser.spins--; saveAll();
    const w = document.getElementById('wheel-svg');
    const idx = Math.floor(Math.random() * prizes.length);
    currentRotation += 1800 + (360 - (idx * (360 / prizes.length)));
    w.style.transition = "transform 4s ease-out";
    w.style.transform = `rotate(${currentRotation}deg)`;
    setTimeout(() => { isSpinning = false; currentUser.balance += prizes[idx].value; saveAll(); alert("Выиграли: " + prizes[idx].value); }, 4000);
}

// --- АДМИНКА ---
function checkAdmin() { if (prompt("Пароль:") === "qws853") show('admin-page'); }

function adminCheckUser() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const st = document.getElementById('admin-status');
    if (users[nick]) st.innerText = `Баланс: ${users[nick].balance} | Спины: ${users[nick].spins}`;
    else st.innerText = "Игрок не найден";
}

function adminAdjustBalance() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const amt = parseInt(document.getElementById('admin-amount').value);
    if (users[nick]) { users[nick].balance += amt; saveAll(); adminCheckUser(); }
}

function adminGiveSpin() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    if (users[nick]) { users[nick].spins++; saveAll(); adminCheckUser(); }
}

function adminAddItem() {
    globalShop.push({ name: document.getElementById('new-item-name').value, price: parseInt(document.getElementById('new-item-price').value) });
    saveAll();
}

function adminRemoveItem(i) { globalShop.splice(i, 1); saveAll(); }

// --- ИНТЕРФЕЙС И ПОЛЬЗОВАТЕЛЬ ---
function show(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function login() {
    const n = document.getElementById('username-input').value.trim(); const p = document.getElementById('password-input').value.trim();
    if (!users[n]) { users[n] = { username: n, password: p, balance: 0, spins: 0 }; saveAll(); }
    if (users[n].password === p) { currentUser = users[n]; localStorage.setItem('wheel_session', JSON.stringify(currentUser)); enterApp(); }
}
function enterApp() { document.getElementById('login-page').classList.remove('active'); document.getElementById('main-nav').style.display = 'flex'; document.getElementById('user-display-name').innerText = currentUser.username; show('wheel-page'); updateUI(); }
function buy(n, p) { if (currentUser.balance >= p) { currentUser.balance -= p; db.ref('orders').push({ username: currentUser.username, item: n }); saveAll(); } else alert("Мало монет!"); }
function logout() { localStorage.removeItem('wheel_session'); location.reload(); }

function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;
    
    const shopList = document.getElementById('shop-items-list');
    if (shopList) shopList.innerHTML = globalShop.map((item, i) => `<div class="card"><h4>${item.name}</h4><button onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button></div>`).join('');
    
    const adminShop = document.getElementById('admin-shop-manage');
    if (adminShop) adminShop.innerHTML = globalShop.map((item, i) => `<div>${item.name} <button onclick="adminRemoveItem(${i})">Удалить</button></div>`).join('');
    
    const adminOrders = document.getElementById('admin-orders-list');
    if (adminOrders) adminOrders.innerHTML = Object.entries(orders).map(([id, o]) => `<div>${o.username}: ${o.item} <button onclick="db.ref('orders/${id}').remove()">✅</button></div>`).join('');
}

window.onload = () => { createWheel(); if (currentUser) enterApp(); };
