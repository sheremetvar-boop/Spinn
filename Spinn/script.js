// 1. Инициализация Firebase
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

// Слушатель базы данных
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    users = data.users || {};
    globalShop = data.shop || [];
    orders = data.orders || {};
    
    if (currentUser && users[currentUser.username]) {
        currentUser = users[currentUser.username];
    }
    updateUI();
});

function saveAll() {
    db.ref('users').set(users);
    db.ref('shop').set(globalShop);
}

// Рендеринг колеса
function createWheel() {
    const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    
    let svg = `<svg id="wheel-svg" viewBox="0 0 100 100" style="width:100%; height:100%; overflow:visible;">`;
    let cumulative = 0;
    
    prizes.forEach((p) => {
        const start = cumulative;
        cumulative += p.chance;
        const x1 = 50 + 50 * Math.cos(2 * Math.PI * start / 100);
        const y1 = 50 + 50 * Math.sin(2 * Math.PI * start / 100);
        const x2 = 50 + 50 * Math.cos(2 * Math.PI * cumulative / 100);
        const y2 = 50 + 50 * Math.sin(2 * Math.PI * cumulative / 100);
        
        svg += `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${p.color}" stroke="#fff" stroke-width="0.3"/>`;
        
        // Подписи секторов
        const midAngle = (start + (p.chance / 2)) * (2 * Math.PI / 100);
        const tx = 50 + 35 * Math.cos(midAngle);
        const ty = 50 + 35 * Math.sin(midAngle);
        const rotate = (midAngle * 180 / Math.PI) + 90;
        svg += `<text x="${tx}" y="${ty}" fill="white" font-size="5" font-weight="bold" text-anchor="middle" transform="rotate(${rotate}, ${tx}, ${ty})">${p.value}</text>`;
    });
    
    container.innerHTML = svg + `</svg>`;
}

// Вращение
function spin() {
    if (isSpinning || !currentUser || currentUser.spins <= 0) return;
    isSpinning = true;
    currentUser.spins--;
    saveAll();

    const wheelSvg = document.getElementById('wheel-svg');
    const winnerIdx = Math.floor(Math.random() * prizes.length);
    currentRotation += 1800 + (360 - (winnerIdx * (360 / prizes.length)));
    
    wheelSvg.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";
    wheelSvg.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        currentUser.balance += prizes[winnerIdx].value;
        saveAll();
        alert(`Поздравляем! Вы выиграли ${prizes[winnerIdx].value} 🪙`);
    }, 4000);
}

// Авторизация
function login() {
    const name = document.getElementById('username-input').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    if (!name || !pass) return;

    if (!users[name]) {
        users[name] = { username: name, password: pass, balance: 0, spins: 0 };
        saveAll();
    }
    
    if (users[name].password === pass) {
        currentUser = users[name];
        localStorage.setItem('wheel_session', JSON.stringify(currentUser));
        enterApp();
    } else {
        const err = document.getElementById('login-error');
        err.innerText = "Неверный пароль!";
        err.style.display = "block";
    }
}

function enterApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-nav').style.display = 'flex';
    document.getElementById('user-display-name').innerText = currentUser.username;
    show('wheel-page');
    updateUI();
}

function show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Обновление интерфейса
function updateUI() {
    if (!currentUser) return;
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;

    // Магазин
    const shopList = document.getElementById('shop-items-list');
    if (shopList) {
        shopList.innerHTML = globalShop.map((item, idx) => `
            <div class="card">
                <h4>${item.name}</h4>
                <button class="btn-primary" onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button>
            </div>`).join('');
    }

    // Инвентарь игрока
    const invList = document.getElementById('inventory-list');
    if (invList) {
        const myOrders = Object.values(orders).filter(o => o.username === currentUser.username);
        invList.innerHTML = myOrders.map(o => `<div class="card">🎁 ${o.item}</div>`).join('') || 'У вас пока нет товаров';
    }

    // Заказы в админке
    const adminOrders = document.getElementById('admin-orders-list');
    if (adminOrders) {
        adminOrders.innerHTML = Object.entries(orders).map(([id, o]) => `
            <div class="admin-item-row" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>${o.username}: ${o.item}</span>
                <button onclick="db.ref('orders/${id}').remove()">✅</button>
            </div>`).join('');
    }
}

function buy(name, price) {
    if (currentUser.balance >= price) {
        currentUser.balance -= price;
        db.ref('orders').push({ username: currentUser.username, item: name });
        saveAll();
        alert("Покупка совершена!");
    } else alert("Недостаточно монет");
}

// Админка
function checkAdmin() {
    if (prompt("Введите пароль администратора:") === "qws853") show('admin-page');
}

function adminCheckUser() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const st = document.getElementById('admin-status');
    if (users[nick]) {
        st.innerText = `Ник: ${nick} | Баланс: ${users[nick].balance} | Спины: ${users[nick].spins}`;
    } else st.innerText = "Пользователь не найден";
}

function adminAdjustBalance() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const amt = parseInt(document.getElementById('admin-amount').value);
    if (users[nick] && !isNaN(amt)) {
        users[nick].balance += amt;
        saveAll();
        adminCheckUser();
    }
}

function adminGiveSpin() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    if (users[nick]) {
        users[nick].spins++;
        saveAll();
        adminCheckUser();
    }
}

function adminAddItem() {
    const name = document.getElementById('new-item-name').value;
    const price = parseInt(document.getElementById('new-item-price').value);
    if (name && !isNaN(price)) {
        globalShop.push({ name, price });
        saveAll();
        alert("Товар добавлен!");
    }
}

function logout() {
    localStorage.removeItem('wheel_session');
    location.reload();
}

window.onload = () => {
    createWheel();
    if (currentUser) enterApp();
};
