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

// Слушаем изменения в базе
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    users = data.users || {};
    globalShop = data.shop || [];
    const orders = data.orders || {}; // Получаем все заказы
    
    if (currentUser && users[currentUser.username]) {
        currentUser = users[currentUser.username];
    }
    updateUI(orders);
});

function saveAll() {
    db.ref('users').set(users);
    db.ref('shop').set(globalShop);
}

// --- ЛОГИКА ПОКУПКИ ---
function buy(name, price) {
    if (currentUser.balance >= price) {
        currentUser.balance -= price;
        // Создаем заказ в базе вместо простого лога
        db.ref('orders').push({ 
            username: currentUser.username, 
            item: name, 
            time: Date.now() 
        });
        saveAll();
        alert(`Заказ на "${name}" создан!`);
    } else alert("Недостаточно средств");
}

function closeOrder(orderId) {
    db.ref('orders/' + orderId).remove();
}

// --- ОБНОВЛЕНИЕ UI ---
function updateUI(orders = {}) {
    if (!currentUser) return;
    
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;
    document.getElementById('user-display-name').innerText = currentUser.username;
    
    // 1. Рендер Магазина
    const shopList = document.getElementById('shop-items-list');
    if (shopList) shopList.innerHTML = globalShop.map(item => `
        <div class="shop-item card">
            <h4>${item.name}</h4>
            <button onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button>
        </div>`).join('');

    // 2. Рендер Инвентаря (фильтруем заказы текущего юзера)
    const invList = document.getElementById('inventory-list');
    const myOrders = Object.entries(orders).filter(([id, o]) => o.username === currentUser.username);
    if (invList) invList.innerHTML = myOrders.length ? myOrders.map(([id, o]) => `
        <div class="card">Товар: <b>${o.item}</b> <br><small style="color:#fbbf24">Ожидает выдачи</small></div>
    `).join('') : '<p style="opacity:0.5; font-size: 0.8rem;">Инвентарь пуст</p>';

    // 3. Рендер Заказов для Админа
    const adminOrders = document.getElementById('admin-orders-list');
    if (adminOrders) {
        adminOrders.innerHTML = Object.entries(orders).map(([id, o]) => `
            <div class="admin-item-row">
                <span><b>${o.username}</b> купил ${o.item}</span>
                <button onclick="closeOrder('${id}')" style="background:#22c55e; border:none; color:white; border-radius:4px; padding:5px;">✅ Закрыть</button>
            </div>`).join('');
    }

    // 4. Админ-магазин
    const adminShopList = document.getElementById('admin-shop-manage');
    if (adminShopList) adminShopList.innerHTML = globalShop.map((item, index) => `
        <div class="admin-item-row">
            <span>${item.name} (${item.price}🪙)</span>
            <button onclick="adminRemoveItem(${index})">❌</button>
        </div>`).join('');
}

// --- АДМИНКА ---
function adminAddItem() {
    const n = document.getElementById('new-item-name').value;
    const p = parseInt(document.getElementById('new-item-price').value);
    if (n && p) {
        globalShop.push({ name: n, price: p });
        saveAll();
    }
}

function adminRemoveItem(i) {
    globalShop.splice(i, 1);
    saveAll();
}

function adminAdjustBalance() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const amount = parseInt(document.getElementById('admin-amount').value);
    if (users[nick]) {
        users[nick].balance += amount;
        saveAll();
        adminCheckUser();
    }
}

function adminCheckUser() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const st = document.getElementById('admin-status');
    st.innerText = users[nick] ? `Баланс: ${users[nick].balance}` : "Не найден";
}

function show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function checkAdmin() { if (prompt("Пароль:") === "qws853") show('admin-page'); }
function logout() { localStorage.removeItem('wheel_session'); location.reload(); }

// Инициализация
if (currentUser) setTimeout(() => enterApp(currentUser), 500);
function enterApp(userData) {
    currentUser = userData;
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-nav').style.display = 'flex';
    show('wheel-page');
}
