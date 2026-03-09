// 1. КОНФИГУРАЦИЯ FIREBASE
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

let users = {};
let globalShop = [];
let orders = {}; // Хранилище заказов
let currentUser = JSON.parse(localStorage.getItem('wheel_session')) || null;
let isSpinning = false;
let currentRotation = 0;

const prizes = [
    { value: 1,  chance: 3,    color: '#4f46e5' },
    { value: 5,  chance: 25,   color: '#6366f1' },
    { value: 10, chance: 38,   color: '#818cf8' },
    { value: 20, chance: 9.5,  color: '#4f46e5' },
    { value: 25, chance: 13,   color: '#6366f1' },
    { value: 30, chance: 11.5, color: '#818cf8' }
];

// Основная синхронизация
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    users = data.users || {};
    globalShop = data.shop || [];
    orders = data.orders || {};
    
    if (currentUser && users[currentUser.username]) {
        currentUser = users[currentUser.username];
        localStorage.setItem('wheel_session', JSON.stringify(currentUser));
    }
    updateUI();
});

function saveAll() {
    db.ref('users').set(users);
    db.ref('shop').set(globalShop);
}

// --- ЛОГИКА ВХОДА ---
function login() {
    const name = document.getElementById('username-input').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    if (name.length < 2 || pass.length < 3) return;

    if (!users[name]) {
        users[name] = { username: name, password: pass, balance: 0, spins: 0, lastLogin: Date.now() };
        saveAll();
        enterApp(users[name]);
    } else if (users[name].password === pass) {
        users[name].lastLogin = Date.now();
        saveAll();
        enterApp(users[name]);
    } else {
        document.getElementById('login-error').innerText = "Неверный пароль!";
        document.getElementById('login-error').style.display = "block";
    }
}

function enterApp(userData) {
    currentUser = userData;
    localStorage.setItem('wheel_session', JSON.stringify(currentUser));
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-nav').style.display = 'flex';
    show('wheel-page');
}

// --- ИНТЕРФЕЙС ---
function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;
    document.getElementById('user-display-name').innerText = currentUser.username;
    
    // Магазин
    const shopList = document.getElementById('shop-items-list');
    if (shopList) shopList.innerHTML = globalShop.map(item => `
        <div class="shop-item card">
            <h4>${item.name}</h4>
            <button onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button>
        </div>`).join('');

    // Инвентарь (только для игрока)
    const invList = document.getElementById('inventory-list');
    if (invList) {
        const myOrders = Object.entries(orders).filter(([id, o]) => o.username === currentUser.username);
        invList.innerHTML = myOrders.length ? myOrders.map(([id, o]) => `
            <div class="card" style="border: 1px solid #6366f1">Товар: <b>${o.item}</b><br><small>Статус: В очереди</small></div>
        `).join('') : '<p style="opacity:0.5">Пусто</p>';
    }

    // Заказы для Админа
    const adminOrders = document.getElementById('admin-orders-list');
    if (adminOrders) {
        adminOrders.innerHTML = Object.entries(orders).map(([id, o]) => `
            <div class="admin-item-row">
                <span><b>${o.username}</b>: ${o.item}</span>
                <button onclick="closeOrder('${id}')">✅ Закрыть</button>
            </div>`).join('');
    }

    // Управление товарами
    const adminShopList = document.getElementById('admin-shop-manage');
    if (adminShopList) adminShopList.innerHTML = globalShop.map((item, index) => `
        <div class="admin-item-row">
            <span>${item.name} (${item.price}🪙)</span>
            <button onclick="adminRemoveItem(${index})">❌</button>
        </div>`).join('');
}

// --- ФУНКЦИИ ---
function buy(name, price) {
    if (currentUser.balance >= price) {
        currentUser.balance -= price;
        db.ref('orders').push({ username: currentUser.username, item: name, time: Date.now() });
        saveAll();
        alert(`Заказ на "${name}" создан!`);
    } else alert("Недостаточно средств");
}

function closeOrder(id) { db.ref('orders/' + id).remove(); }

function spin() {
    if (isSpinning || currentUser.spins <= 0) return;
    isSpinning = true;
    currentUser.spins--;
    saveAll();
    
    // (Логика колеса осталась прежней)
    const winnerIndex = Math.floor(Math.random() * prizes.length);
    const winner = prizes[winnerIndex];
    currentRotation += 1800 + (360 - (winnerIndex * (360/prizes.length)));
    document.getElementById('wheel-svg').style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";
    document.getElementById('wheel-svg').style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        currentUser.balance += winner.value;
        saveAll();
        alert(`Выпало: +${winner.value} 🪙`);
    }, 4000);
}

// --- АДМИНКА ---
function adminAddItem() {
    const n = document.getElementById('new-item-name').value;
    const p = parseInt(document.getElementById('new-item-price').value);
    if (n && p) { globalShop.push({ name: n, price: p }); saveAll(); }
}
function adminRemoveItem(i) { globalShop.splice(i, 1); saveAll(); }
function adminAdjustBalance() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const amount = parseInt(document.getElementById('admin-amount').value);
    if (users[nick]) { users[nick].balance += amount; saveAll(); adminCheckUser(); }
}
function adminGiveSpin() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    if (users[nick]) { users[nick].spins++; saveAll(); adminCheckUser(); }
}
function adminCheckUser() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    document.getElementById('admin-status').innerText = users[nick] ? `Баланс: ${users[nick].balance}` : "Не найден";
}
function show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
function checkAdmin() { if (prompt("Пароль:") === "qws853") show('admin-page'); }
function logout() { localStorage.removeItem('wheel_session'); location.reload(); }
window.onload = () => { if (currentUser) enterApp(currentUser); };

const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    
    let svg = `<svg id="wheel-svg" viewBox="0 0 100 100">`;
    let cumulativePercent = 0;
    
    prizes.forEach((prize, i) => {
        const start = cumulativePercent;
        const percent = prize.chance;
        cumulativePercent += percent;
        
        const x1 = 50 + 50 * Math.cos(2 * Math.PI * start / 100);
        const y1 = 50 + 50 * Math.sin(2 * Math.PI * start / 100);
        const x2 = 50 + 50 * Math.cos(2 * Math.PI * (start + percent) / 100);
        const y2 = 50 + 50 * Math.sin(2 * Math.PI * (start + percent) / 100);
        
        svg += `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${prize.color}" />`;
    });
    
    svg += `</svg>`;
    container.innerHTML = svg;
}

// Вызываем отрисовку при запуске
window.onload = () => { 
    if (currentUser) enterApp(currentUser); 
    createWheel(); 
};
