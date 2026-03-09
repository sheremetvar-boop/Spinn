// 1. КОНФИГУРАЦИЯ
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

let users = {}, globalShop = [], orders = {}, isSpinning = false, currentRotation = 0;
let currentUser = JSON.parse(localStorage.getItem('wheel_session')) || null;

const prizes = [
    { value: 1,  chance: 3,    color: '#4f46e5' },
    { value: 5,  chance: 25,   color: '#6366f1' },
    { value: 10, chance: 38,   color: '#818cf8' },
    { value: 20, chance: 9.5,  color: '#4f46e5' },
    { value: 25, chance: 13,   color: '#6366f1' },
    { value: 30, chance: 11.5, color: '#818cf8' }
];

// Синхронизация
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
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

// --- ОТРИСОВКА КОЛЕСА ---
function createWheel() {
    const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    
    // Очищаем перед отрисовкой
    container.innerHTML = ''; 
    
    let svg = <svg id="wheel-svg" viewBox="0 0 100 100" style="width:100%; height:100%;">;
    let cumulative = 0;
    
    prizes.forEach((p) => {
        const start = cumulative;
        cumulative += p.chance;
        const x1 = 50 + 50 * Math.cos(2 * Math.PI * start / 100);
        const y1 = 50 + 50 * Math.sin(2 * Math.PI * start / 100);
        const x2 = 50 + 50 * Math.cos(2 * Math.PI * cumulative / 100);
        const y2 = 50 + 50 * Math.sin(2 * Math.PI * cumulative / 100);
        svg += <path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${p.color}" />;
    });
    
    container.innerHTML = svg + </svg>;
    console.log("Колесо отрисовано");
}

function spin() {
    if (isSpinning || currentUser.spins <= 0) return;
    isSpinning = true;
    currentUser.spins--;
    saveAll();
    const wheelSvg = document.getElementById('wheel-svg');
    const winnerIndex = Math.floor(Math.random() * prizes.length);
    currentRotation += 1800 + (360 - (winnerIndex * (360/prizes.length)));
    wheelSvg.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";
    wheelSvg.style.transform = rotate(${currentRotation}deg);
    setTimeout(() => {
        isSpinning = false;
        currentUser.balance += prizes[winnerIndex].value;
        saveAll();
        alert(`Выпало: +${prizes[winnerIndex].value} 🪙`);
    }, 4000);
}

// --- UI ОБНОВЛЕНИЕ ---
function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;
    document.getElementById('user-display-name').innerText = currentUser.username;

    // Магазин
    const shopList = document.getElementById('shop-items-list');
    if (shopList) shopList.innerHTML = globalShop.map(item => `
        <div class="card"><h4>${item.name}</h4><button onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button></div>`).join('');

    // Инвентарь игрока
    const invList = document.getElementById('inventory-list');
    if (invList) {
        const myOrders = Object.entries(orders).filter(([id, o]) => o.username === currentUser.username);
        invList.innerHTML = myOrders.length ? myOrders.map(([id, o]) => `<div class="card">Товар: ${o.item} (Ожидает)</div>`).join('') : 'Пусто';
    }

    // Админка - Заказы
    const adminOrders = document.getElementById('admin-orders-list');
    if (adminOrders) {
        adminOrders.innerHTML = Object.entries(orders).map(([id, o])
=> `
            <div class="admin-item-row"><span>${o.username}: ${o.item}</span><button onclick="db.ref('orders/${id}').remove()">✅</button></div>`).join('');
    }
}

function buy(name, price) {
    if (currentUser.balance >= price) {
        currentUser.balance -= price;
        db.ref('orders').push({ username: currentUser.username, item: name });
        saveAll();
        alert("Заказ создан!");
    } else alert("Недостаточно средств");
}

// --- СЕРВИСНЫЕ ---
function login() { /* твой код входа */ }
function enterApp(userData) { currentUser = userData; document.getElementById('login-page').classList.remove('active'); document.getElementById('main-nav').style.display = 'flex'; show('wheel-page'); }
function show(id) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }
function checkAdmin() { if (prompt("Пароль:") === "qws853") show('admin-page'); }
function logout() { localStorage.removeItem('wheel_session'); location.reload(); }
function adminAddItem() { const n = document.getElementById('new-item-name').value; const p = parseInt(document.getElementById('new-item-price').value); if (n && p) { globalShop.push({ name: n, price: p }); saveAll(); } }
function adminAdjustBalance() { const nick = document.getElementById('admin-target-nick').value.trim(); const amount = parseInt(document.getElementById('admin-amount').value); if (users[nick]) { users[nick].balance += amount; saveAll(); } }
function adminGiveSpin() { const nick = document.getElementById('admin-target-nick').value.trim(); if (users[nick]) { users[nick].spins++; saveAll(); } }

window.onload = () => { createWheel(); if (currentUser) enterApp(currentUser); };
