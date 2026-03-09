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



db.ref('/').on('value', (snapshot) => {

    const data = snapshot.val() || {};

    users = data.users || {};

    globalShop = data.shop || [{ name: 'Стартовый меч', price: 50 }];

    

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



function updateUI() {

    if (!currentUser) return;

    document.body.className = "dark-theme";

    document.getElementById('balance').innerText = currentUser.balance;

    document.getElementById('spins').innerText = currentUser.spins;

    document.getElementById('user-display-name').innerText = currentUser.username;

    

    const shopList = document.getElementById('shop-items-list');

    if (shopList) shopList.innerHTML = globalShop.map(item => `

        <div class="shop-item card">

            <h4>${item.name}</h4>

            <button onclick="buy('${item.name}', ${item.price})">${item.price} 🪙</button>

        </div>`).join('');



    const adminShopList = document.getElementById('admin-shop-manage');

    if (adminShopList) adminShopList.innerHTML = globalShop.map((item, index) => `

        <div class="admin-item-row">

            <span>${item.name} (${item.price}🪙)</span>

            <button onclick="adminRemoveItem(${index})">❌</button>

        </div>`).join('');

}



// --- КОЛЕСО И ПОКУПКИ ---

function buy(name, price) {

    if (currentUser.balance >= price) {

        currentUser.balance -= price;

        // Запись лога покупки

        db.ref('logs').push({ username: currentUser.username, item: name, time: Date.now() });

        saveAll();

        alert(`Куплено: ${name}`);

    } else alert("Недостаточно средств");

}



function spin() {

    if (isSpinning || currentUser.spins <= 0) return;

    isSpinning = true;

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

    currentRotation += 1800 + (360 - (winnerIndex * (360/prizes.length)));

    wheelSvg.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";

    wheelSvg.style.transform = `rotate(${currentRotation}deg)`;



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

    if (n && p) {

        globalShop.push({ name: n, price: p });

        saveAll();

        alert("Товар добавлен!");

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



// Инициализация

if (document.getElementById('wheel-canvas-container')) {

    // Вспомогательный код для отрисовки колеса (без изменений)

    // ... (код createWheel и getCoordinatesForPercent оставь как был)

}

if (currentUser) setTimeout(() => enterApp(currentUser), 500);

