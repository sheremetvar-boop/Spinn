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
    
    let svg = `<svg id="wheel-svg" viewBox="0 0 100 100" style="width:100%; height:100%; transition: transform 4s cubic-bezier(0.1, 0, 0.2, 1);">`;
    let cumulative = 0;
    
    prizes.forEach((p) => {
        const start = cumulative;
        cumulative += p.chance;
        
        const angle1 = (start / 100) * 360;
        const angle2 = (cumulative / 100) * 360;
        
        // Рисуем сектор
        const x1 = 50 + 50 * Math.cos(angle1 * Math.PI / 180);
        const y1 = 50 + 50 * Math.sin(angle1 * Math.PI / 180);
        const x2 = 50 + 50 * Math.cos(angle2 * Math.PI / 180);
        const y2 = 50 + 50 * Math.sin(angle2 * Math.PI / 180);
        
        svg += `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${p.color}" stroke="white" stroke-width="0.5"/>`;
        
        // Текст
        const midAngle = (start + p.chance / 2) / 100 * 360;
        const tx = 50 + 35 * Math.cos(midAngle * Math.PI / 180);
        const ty = 50 + 50 * Math.sin(midAngle * Math.PI / 180); // Текст чуть ближе к центру
        svg += `<text x="${tx}" y="${ty}" fill="white" font-size="5" text-anchor="middle" transform="rotate(${midAngle + 90}, ${tx}, ${ty})">${p.value}</text>`;
    });
    container.innerHTML = svg + `</svg>`;
}

function spin() {
    if (isSpinning || !currentUser || currentUser.spins <= 0) return;
    isSpinning = true;
    currentUser.spins--;
    saveAll();

    // 1. Выбираем приз по шансам
    const random = Math.random() * 100;
    let cumulative = 0;
    let winnerIdx = 0;
    
    for (let i = 0; i < prizes.length; i++) {
        cumulative += prizes[i].chance;
        if (random <= cumulative) {
            winnerIdx = i;
            break;
        }
    }

    // 2. Рассчитываем угол точно по границам секторов
    // Находим, где начинается и заканчивается выбранный сектор
    let startAngle = 0;
    for(let i=0; i < winnerIdx; i++) startAngle += prizes[i].chance;
    const endAngle = startAngle + prizes[winnerIdx].chance;
    
    // Целевой угол в середине выбранного сектора (в градусах)
    const targetAngle = (startAngle + (prizes[winnerIdx].chance / 2)) / 100 * 360;
    
    // Вращаем (добавляем полные обороты)
    currentRotation += 1800 + (360 - targetAngle);
    
    const wheelSvg = document.getElementById('wheel-svg');
    wheelSvg.style.transform = `rotate(${currentRotation}deg)`;

    wheelSvg.addEventListener('transitionend', function handler() {
        wheelSvg.removeEventListener('transitionend', handler);
        isSpinning = false;
        currentUser.balance += prizes[winnerIdx].value;
        saveAll();
        alert(`Вы выиграли: ${prizes[winnerIdx].value} 🪙`);
    }, {once: true});
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
    
    // 1. Обновление баланса и спинов
    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;

    // 2. Отображение магазина для обычных игроков
    const shopList = document.getElementById('shop-items-list');
    if (shopList) {
        shopList.innerHTML = globalShop.map((item, idx) => `
            <div class="card">
                <h4>${item.name}</h4>
                <button class="btn-primary" onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button>
            </div>`).join('');
    }

    // 3. Инвентарь игрока
    const invList = document.getElementById('inventory-list');
    if (invList) {
        const myOrders = Object.values(orders).filter(o => o.username === currentUser.username);
        invList.innerHTML = myOrders.map(o => `<div class="card">🎁 ${o.item}</div>`).join('') || 'У вас пока нет товаров';
    }

    // 4. Админ-панель: управление товарами
    const adminShopManage = document.getElementById('admin-shop-manage');
    if (adminShopManage) {
        if (globalShop.length === 0) {
            adminShopManage.innerHTML = '<p style="font-size: 0.8rem; opacity:0.5;">Магазин пуст</p>';
        } else {
            adminShopManage.innerHTML = globalShop.map((item, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#222; padding:8px; margin-top:5px; border-radius:5px;">
                    <span>${item.name} — <b>${item.price} 🪙</b></span>
                    <button onclick="adminRemoveItem(${idx})" style="background:#ff4444; border:none; color:white; padding:2px 8px; cursor:pointer;">Удалить</button>
                </div>`).join('');
        }
    }

    // 5. Админ-панель: заказы
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

// Функция переключения страниц
function show(id) {
    // 1. Скрываем все страницы (убираем класс active)
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // 2. Показываем нужную страницу (добавляем класс active)
    const targetPage = document.getElementById(id);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        console.error("Страница с id '" + id + "' не найдена!");
    }
}




