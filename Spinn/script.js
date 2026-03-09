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

// Инициализация облака
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Глобальные переменные
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

// --- ГЛАВНАЯ СИНХРОНИЗАЦИЯ С ОБЛАКОМ ---
// Этот блок следит за изменениями в базе в реальном времени
db.ref('/').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    users = data.users || {};
    globalShop = data.shop || [{ name: 'Стартовый меч', price: 50 }];
    
    // Если мы вошли в аккаунт, обновляем свои данные из облака
    if (currentUser && users[currentUser.username]) {
        currentUser = users[currentUser.username];
        localStorage.setItem('wheel_session', JSON.stringify(currentUser));
    }
    updateUI();
});

// Функция записи в облако
function saveAll() {
    db.ref('users').set(users);
    db.ref('shop').set(globalShop);
}

// --- ЛОГИКА ВХОДА ---
function login() {
    const name = document.getElementById('username-input').value.trim();
    const pass = document.getElementById('password-input').value.trim();
    const err = document.getElementById('login-error');

    if (name.length < 2 || pass.length < 3) return;

    if (!users[name]) {
        // Регистрация нового игрока
        users[name] = { 
            username: name, 
            password: pass, 
            balance: 0, 
            spins: 0, 
            lastLogin: Date.now() 
        };
        saveAll();
        enterApp(users[name]);
    } else {
        // Проверка пароля существующего
        if (users[name].password === pass) {
            users[name].lastLogin = Date.now();
            saveAll();
            enterApp(users[name]);
        } else {
            err.innerText = "Неверный пароль или имя.";
            err.style.display = "block";
        }
    }
}

function enterApp(userData) {
    currentUser = userData;
    localStorage.setItem('wheel_session', JSON.stringify(currentUser));
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('main-nav').style.display = 'flex';
    show('wheel-page');
}

function logout() {
    localStorage.removeItem('wheel_session');
    location.reload();
}

// --- ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ---
function updateUI() {
    if (!currentUser) return;
    
    // Принудительно держим темную тему (так как кнопку удалили)
    document.body.className = "dark-theme";

    document.getElementById('balance').innerText = currentUser.balance;
    document.getElementById('spins').innerText = currentUser.spins;
    document.getElementById('user-display-name').innerText = currentUser.username;
    
    // Магазин для игроков
    const shopList = document.getElementById('shop-items-list');
    if (shopList) {
        shopList.innerHTML = globalShop.map(item => `
            <div class="shop-item card">
                <h4>${item.name}</h4>
                <button onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button>
            </div>
        `).join('');
    }

    // Магазин в админке
    const adminShopList = document.getElementById('admin-shop-manage');
    if (adminShopList) {
        adminShopList.innerHTML = globalShop.map((item, index) => `
            <div class="admin-item-row">
                <span>${item.name} (${item.price}🪙)</span>
                <button onclick="adminRemoveItem(${index})">❌</button>
            </div>
        `).join('');
    }
}

// --- ЛОГИКА КОЛЕСА ---
function createWheel() {
    const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    let cumulativePercent = 0;
    const paths = prizes.map(p => {
        const startPercent = cumulativePercent;
        cumulativePercent += p.chance / 100;
        const [startX, startY] = getCoordinatesForPercent(startPercent);
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = p.chance / 100 > 0.5 ? 1 : 0;
        const pathData = [`M 0 0`, `L ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `Z`].join(' ');
        const textAngle = (startPercent + (p.chance / 100) / 2) * 360;
        return `<g><path d="${pathData}" fill="${p.color}" stroke="rgba(255,255,255,0.2)" stroke-width="0.01" />
                <text x="0.6" y="0" transform="rotate(${textAngle}) translate(0, 0.05)" fill="white" font-weight="bold" font-size="0.12" style="font-family: Arial">${p.value}</text></g>`;
    }).join('');
    container.innerHTML = `<svg id="wheel-svg" viewBox="-1.1 -1.1 2.2 2.2" style="transform: rotate(-90deg)">${paths}</svg>`;
}

function getCoordinatesForPercent(percent) {
    return [Math.cos(2 * Math.PI * percent), Math.sin(2 * Math.PI * percent)];
}

function spin() {
    if (isSpinning || currentUser.spins <= 0) return;
    isSpinning = true;
    
    // Отнимаем спин и сохраняем в облако
    currentUser.spins--;
    saveAll();

    const wheelSvg = document.getElementById('wheel-svg');
    const rand = Math.random() * 100;
    let cumulative = 0, winnerIndex = 0;

    for (let i = 0; i < prizes.length; i++) {
        cumulative += prizes[i].chance;
        if (rand <= cumulative) { winnerIndex = i; break; }
    }

    const winner = prizes[winnerIndex];
    let startDeg = 0;
    for (let i = 0; i < winnerIndex; i++) { startDeg += (prizes[i].chance / 100) * 360; }
    const targetCenterDeg = startDeg + ((winner.chance / 100) * 360 / 2);
    const rotationToTarget = 360 - targetCenterDeg;
    
    currentRotation = currentRotation + 1800 + (rotationToTarget - (currentRotation % 360));
    wheelSvg.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";
    wheelSvg.style.transform = `rotate(${currentRotation - 90}deg)`;

    setTimeout(() => {
        isSpinning = false;
        currentUser.balance += winner.value;
        document.getElementById('spin-result').innerText = `Выпало: +${winner.value} 🪙`;
        saveAll();
    }, 4000);
}

// --- МАГАЗИН И НАВИГАЦИЯ ---
function buy(name, price) {
    if (currentUser.balance >= price) {
        currentUser.balance -= price;
        alert(`Вы купили: ${name}`);
        saveAll(); 
    } else alert("Недостаточно средств");
}

function show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// --- АДМИН-ПАНЕЛЬ ---
function checkAdmin() { if (prompt("Пароль админа:") === "qws853") show('admin-page'); }

function adminCheckUser() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const st = document.getElementById('admin-status');
    if (users[nick]) { 
        st.innerText = `Ник: ${nick} | Баланс: ${users[nick].balance} | Спины: ${users[nick].spins}`; 
        st.style.color = "#4ade80";
    } else { 
        st.innerText = "Пользователь не найден"; 
        st.style.color = "red"; 
    }
}

function adminAdjustBalance() {
    const nick = document.getElementById('admin-target-nick').value.trim();
    const amount = parseInt(document.getElementById('admin-amount').value);
    if (users[nick] && !isNaN(amount)) {
        users[nick].balance += amount;
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

// Запуск при загрузке
createWheel();
if (currentUser) {
    // Небольшая задержка, чтобы облако успело ответить при старте
    setTimeout(() => enterApp(currentUser), 500);
}

