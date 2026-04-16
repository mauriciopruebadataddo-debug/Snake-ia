// auth.js - Sistema de Autenticación y Ranking Local

// --- Base de Datos Fake (LocalStorage) ---
if (!localStorage.getItem('snakeUsers')) {
    localStorage.setItem('snakeUsers', JSON.stringify({})); // { "usuario": "password123" }
}
if (!localStorage.getItem('snakeScores')) {
    localStorage.setItem('snakeScores', JSON.stringify([])); // [{user, score, date}]
}

let currentUser = sessionStorage.getItem('currentUser') || null;

// --- DOM Elements ---
const authView = document.getElementById('auth-view');
const menuView = document.getElementById('menu-view');
const gameView = document.getElementById('game-view');

const btnShowLogin = document.getElementById('btn-show-login');
const btnShowRegister = document.getElementById('btn-show-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const loginError = document.getElementById('login-error');
const regError = document.getElementById('reg-error');
const currentUsernameSpan = document.getElementById('current-username');

const modalContainer = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnCloseModal = document.getElementById('btn-close-modal');

// --- Navigation ---
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    
    const target = document.getElementById(viewId);
    target.classList.remove('hidden');
    // Pequeño timeout para permitir que se quite hidden antes de animar opacidad
    setTimeout(() => target.classList.add('active'), 50);
}

// Inicialización de Pantalla
if (currentUser) {
    currentUsernameSpan.innerText = currentUser;
    switchView('menu-view');
} else {
    switchView('auth-view');
}

// --- Toggle Login/Register Forms ---
btnShowLogin.addEventListener('click', () => {
    btnShowLogin.classList.add('active');
    btnShowRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    loginError.innerText = "";
});

btnShowRegister.addEventListener('click', () => {
    btnShowRegister.classList.add('active');
    btnShowLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    regError.innerText = "";
});

// --- Auth Logic ---
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('reg-user').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    
    if(!user || !pass) return;

    let users = JSON.parse(localStorage.getItem('snakeUsers'));
    
    if (users[user]) {
        regError.innerText = "Error: El usuario ya existe.";
        return;
    }
    
    users[user] = pass;
    localStorage.setItem('snakeUsers', JSON.stringify(users));
    
    // Auto login post registration
    loginSuccess(user);
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    
    if(!user || !pass) return;

    let users = JSON.parse(localStorage.getItem('snakeUsers'));
    
    if (users[user] && users[user] === pass) {
        loginSuccess(user);
    } else {
        loginError.innerText = "Error: Usuario o contraseña incorrectos.";
    }
});

function loginSuccess(username) {
    currentUser = username;
    sessionStorage.setItem('currentUser', username);
    currentUsernameSpan.innerText = username;
    switchView('menu-view');
    
    // Limpiar inputs
    document.getElementById('login-user').value = "";
    document.getElementById('login-pass').value = "";
    document.getElementById('reg-user').value = "";
    document.getElementById('reg-pass').value = "";
}

document.getElementById('btn-logout').addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    switchView('auth-view');
});

// --- Ranking & History ---
function saveScore(score) {
    if(!currentUser) return;
    let scores = JSON.parse(localStorage.getItem('snakeScores'));
    scores.push({
        user: currentUser,
        score: score,
        date: new Date().toLocaleString()
    });
    localStorage.setItem('snakeScores', JSON.stringify(scores));
}

document.getElementById('btn-ranking').addEventListener('click', () => {
    modalTitle.innerText = "Ranking Global";
    let scores = JSON.parse(localStorage.getItem('snakeScores'));
    
    // Agrupar mayor puntaje por usuario y ordenar
    let highestScores = {};
    scores.forEach(s => {
        if (!highestScores[s.user] || s.score > highestScores[s.user]) {
            highestScores[s.user] = s.score;
        }
    });
    
    let sortedArr = Object.entries(highestScores)
        .map(([user, score]) => ({user, score}))
        .sort((a, b) => b.score - a.score);

    renderList(sortedArr, true);
    openModal();
});

document.getElementById('btn-history').addEventListener('click', () => {
    modalTitle.innerText = "Mi Historial";
    let scores = JSON.parse(localStorage.getItem('snakeScores'));
    
    // Filtrar por usuario actual y ordenar por fecha (más reciente primero) descendente real = reverse 
    // Como push mete al final, al hacer reverse los últimos son los primeros
    let userHistory = scores.filter(s => s.user === currentUser).reverse();
    
    renderList(userHistory, false);
    openModal();
});

function renderList(list, isRanking) {
    modalBody.innerHTML = "";
    if (list.length === 0) {
        modalBody.innerHTML = "<p style='text-align:center; color:#999'>No hay datos disponibles aún.</p>";
        return;
    }

    list.forEach((item, index) => {
        let div = document.createElement('div');
        div.className = `record-item ${isRanking && index < 3 ? 'top-'+(index+1) : ''}`;
        
        let leftSpan = document.createElement('span');
        if (isRanking) {
            leftSpan.innerHTML = `<strong>#${index+1}</strong> ${item.user}`;
        } else {
            leftSpan.innerText = item.date;
        }

        let rightSpan = document.createElement('span');
        rightSpan.innerHTML = `<strong class="highlight">${item.score} pts</strong>`;

        div.appendChild(leftSpan);
        div.appendChild(rightSpan);
        modalBody.appendChild(div);
    });
}

function openModal() {
    modalContainer.classList.remove('hidden');
}

btnCloseModal.addEventListener('click', () => {
    modalContainer.classList.add('hidden');
});
