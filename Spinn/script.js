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

let users = {}, globalShop = [], isSpinning = false, currentRotation = 0;
let currentUser = JSON.parse(localStorage.getItem('wheel_session')) || null;

// Тот самый исходный список призов
const prizes = [
    { value: 1,  chance: 3,    color: '#4f46e5' },
    { value: 5,  chance: 25,   color: '#6366f1' },
    { value: 10, chance: 38,   color: '#818cf8' },
    { value: 20, chance: 9.5,  color: '#4f46e5' },
    { value: 25, chance: 13,   color: '#6366f1' },
    { value: 30, chance: 11.5, color: '#818cf8' }
];

// --- ЛОГИКА ОТРИСОВКИ (КАК В НАЧАЛЕ) ---
function createWheel() {
    const container = document.getElementById('wheel-canvas-container');
    if (!container) return;
    
    let svg = `<svg id="wheel-svg" viewBox="0 0 100 100">`;
    let cumulative = 0;
    
    prizes.forEach((p, i) => {
        const start = cumulative;
        cumulative += p.chance;
        const x1 = 50 + 50 * Math.cos(2 * Math.PI * start / 100);
        const y1 = 50 + 50 * Math.sin(2 * Math.PI * start / 100);
        const x2 = 50 + 50 * Math.cos(2 * Math.PI * cumulative / 100);
        const y2 = 50 + 50 * Math.sin(2 * Math.PI * cumulative / 100);
        
        svg += `<path d="M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z" fill="${p.color}" />`;
    });
    
    container.innerHTML = svg + `</svg>`;
}

// --- ЛОГИКА ВРАЩЕНИЯ ---
function spin() {
    if (isSpinning || currentUser.spins <= 0) return;
    isSpinning = true;
    currentUser.spins--;
    db.ref('users/' + currentUser.username).update({ spins: currentUser.spins });

    const wheelSvg = document.getElementById('wheel-svg');
    const winnerIndex = Math.floor(Math.random() * prizes.length);
    currentRotation += 1800 + (360 - (winnerIndex * (360/prizes.length)));
    
    wheelSvg.style.transition = "transform 4s cubic-bezier(0.1, 0, 0.2, 1)";
    wheelSvg.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        currentUser.balance += prizes[winnerIndex].value;
        db.ref('users/' + currentUser.username).update({ balance: currentUser.balance });
        alert(`Выпало: ${prizes[winnerIndex].value} 🪙`);
    }, 4000);
}

// Инициализация
window.onload = () => {
    createWheel();
    if (currentUser) {
        // ... (твоя логика входа)
        document.getElementById('user-display-name').innerText = currentUser.username;
        document.getElementById('balance').innerText = currentUser.balance;
        document.getElementById('spins').innerText = currentUser.spins;
    }
};
