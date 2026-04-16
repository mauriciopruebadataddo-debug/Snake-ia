// game.js - Motor del juego Snake

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridSize = 20;
let tileCountX = canvas.width / gridSize;
let tileCountY = canvas.height / gridSize;

// Estado del juego
let snake = [];
let dx = 0;
let dy = 0;
let foodX = 0;
let foodY = 0;
let score = 0;
let gameLoopId = null;
let isGameOver = false;

// Variables de IA exportadas por ai.js (las consultaremos)
window.gameActive = false; // Control loop

// DOM Game Elements
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');
const currentDirLabel = document.getElementById('current-dir');

// Inicializar Juego (Resetea estado)
function initGame() {
    snake = [
        { x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }
    ];
    // Empezar quieto hasta que haya un comando
    dx = 0; 
    dy = 0;
    score = 0;
    scoreDisplay.innerText = score;
    isGameOver = false;
    window.gameActive = true;
    currentDirLabel.innerText = "-";
    
    gameOverScreen.classList.add('hidden');
    spawnFood();
    
    if (gameLoopId) clearInterval(gameLoopId);
    
    // Iniciar loop lento al principio (Dificultad reducida = 400ms para que la IA entienda antes de chocar)
    gameLoopId = setInterval(gameLoop, 400);
}

function gameLoop() {
    if (isGameOver || !window.gameActive) return;
    
    update();
    draw();
}

function update() {
    // Si la IA aún no ha enviado un comando real de movimiento, la serpiente no se mueve
    if (dx === 0 && dy === 0) return;

    // Calcular nueva posición de la cabeza
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Regla de Colisión: Bordes del tablero
    if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
        triggerGameOver();
        return;
    }

    // Regla de Colisión: Propio cuerpo
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            triggerGameOver();
            return;
        }
    }

    snake.unshift(head); // Agregar nueva cabeza

    // Comer Manzana
    if (head.x === foodX && head.y === foodY) {
        score += 10;
        scoreDisplay.innerText = score;
        spawnFood();
        // A medida que come, puede hacerse más rápida (opcional), aquí mantenemos constante
    } else {
        snake.pop(); // Quitar cola si no comió
    }
}

function draw() {
    // Fondo limpio
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Dejar transparente respeta CSS detrás
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar Comida (Apple)
    ctx.fillStyle = 'var(--apple-color, #ff003c)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'var(--apple-color, #ff003c)';
    ctx.beginPath();
    ctx.arc(foodX * gridSize + gridSize/2, foodY * gridSize + gridSize/2, gridSize/2 - 2, 0, 2*Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dibujar Serpiente
    for (let i = 0; i < snake.length; i++) {
        // Cabeza color dif o cuerpo color dif
        ctx.fillStyle = i === 0 ? 'var(--snake-color, #39ff14)' : '#2bb812';
        
        if (i === 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'var(--snake-color, #39ff14)';
        } else {
            ctx.shadowBlur = 0;
        }

        // Dejar un pequeño borde de 1px simulando celdas (gridSize-2)
        ctx.fillRect(snake[i].x * gridSize + 1, snake[i].y * gridSize + 1, gridSize - 2, gridSize - 2);
    }
}

function spawnFood() {
    foodX = Math.floor(Math.random() * tileCountX);
    foodY = Math.floor(Math.random() * tileCountY);
    
    // Evitar que aparezca en la serpiente
    snake.forEach(segment => {
        if (segment.x === foodX && segment.y === foodY) {
            spawnFood();
        }
    });
}

function triggerGameOver() {
    isGameOver = true;
    window.gameActive = false;
    clearInterval(gameLoopId);
    
    // Guardar Puntuación en Storage (auth.js)
    if (typeof saveScore === 'function') {
        saveScore(score);
    }

    finalScore.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

// Interfaz para recibir comandos de AI
window.setSnakeDirection = function(command) {
    if (isGameOver || !window.gameActive) return;

    let newDx = dx;
    let newDy = dy;
    let dirName = "-";

    // Reglas de movimiento: S-W-O-T
    // S- Fortaleza: Arriba. Bloquea Abajo.
    // W- Debilidad: Abajo. Bloquea Arriba.
    // O- Oportunidades: Izquierda. Bloquea Derecha.
    // T- Amenaza: Derecha. Bloquea Izquierda.

    if (command === 'arriba' && dy !== 1) { // No está yendo hacia abajo
        newDx = 0; newDy = -1; dirName = "Arriba";
    }
    else if (command === 'abajo' && dy !== -1) { // No está yendo hacia arriba
        newDx = 0; newDy = 1; dirName = "Abajo";
    }
    else if (command === 'izquierdo' && dx !== 1) { // No está yendo hacia derecha
        newDx = -1; newDy = 0; dirName = "Izquierda";
    }
    else if (command === 'derecho' && dx !== -1) { // No está yendo hacia izquierda
        newDx = 1; newDy = 0; dirName = "Derecha";
    }
    
    // Aplicar si es válido
    if(newDx !== dx || newDy !== dy) {
        dx = newDx;
        dy = newDy;
        currentDirLabel.innerText = dirName;
    }
};

// Eventos de botones GUI
document.getElementById('btn-play').addEventListener('click', () => {
    switchView('game-view');
    // Inicializar cam/mic (ai.js debe proveer initAI())
    if (typeof initAI === 'function') {
        initAI();
    }
    initGame();
});

document.getElementById('btn-restart').addEventListener('click', () => {
    initGame();
});

document.getElementById('btn-menu-from-game').addEventListener('click', () => {
    window.gameActive = false;
    if (typeof stopAI === 'function') stopAI();
    switchView('menu-view');
});

document.getElementById('btn-quit-game').addEventListener('click', () => {
    triggerGameOver();
});
