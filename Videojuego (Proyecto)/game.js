/**
 * Juego de práctica de puntería
 * Objetivo: Disparar a los objetivos que aparecen en pantalla
 */

// Variables globales del juego
let canvas, ctx;
let gameState = {
    score: 0,
    timeLeft: 60,
    totalShots: 0,
    hits: 0,
    misses: 0,
    targets: [],
    powerUps: [],
    level: 1,
    isRunning: false,
    isPaused: false,
    gameOver: false,
    weapon: 'pistol',
    difficulty: 'easy',
    gameInterval: null,
    targetInterval: null
};

// Configuraciones según dificultad
const difficultySettings = {
    easy: {
        targetSpeed: 1.5,
        targetSpawnRate: 1500,
        targetSize: 40,
        targetLifetime: 4000,
        fakeTargetChance: 0.1
    },
    medium: {
        targetSpeed: 2.5,
        targetSpawnRate: 1000,
        targetSize: 35,
        targetLifetime: 3000,
        fakeTargetChance: 0.2
    },
    hard: {
        targetSpeed: 4,
        targetSpawnRate: 700,
        targetSize: 30,
        targetLifetime: 2500,
        fakeTargetChance: 0.3
    }
};

// Configuraciones de armas
const weaponSettings = {
    pistol: {
        damage: 10,
        speed: 'Normal',
        accuracy: 'Alta',
        color: '#00dbde'
    },
    rifle: {
        damage: 7,
        speed: 'Rápida',
        accuracy: 'Media',
        color: '#96c93d'
    },
    sniper: {
        damage: 25,
        speed: 'Lenta',
        accuracy: 'Muy Alta',
        color: '#fc00ff'
    }
};

// Inicialización del juego cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    loadLeaderboard();
    setupEventListeners();
});

function initializeGame() {
    // Obtener referencias a elementos del DOM
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Ajustar tamaño del canvas al contenedor
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Configurar crosshair que sigue al mouse
    const crosshair = document.getElementById('crosshair');
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        crosshair.style.left = `${x}px`;
        crosshair.style.top = `${y}px`;
    });
    
    // Inicializar estadísticas
    updateStats();
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function setupEventListeners() {
    // Botones de control
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
    document.getElementById('save-score-btn').addEventListener('click', saveScore);
    
    // Evento de disparo (clic en el canvas)
    canvas.addEventListener('click', handleShot);
    
    // Selector de dificultad
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    difficultyRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            gameState.difficulty = this.value;
        });
    });
    
    // Selector de arma
    const weaponOptions = document.querySelectorAll('.weapon-option');
    weaponOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Quitar clase active de todas las opciones
            weaponOptions.forEach(opt => opt.classList.remove('active'));
            // Agregar clase active a la opción seleccionada
            this.classList.add('active');
            
            // Cambiar arma
            const weapon = this.getAttribute('data-weapon');
            changeWeapon(weapon);
        });
    });
}

function startGame() {
    if (gameState.isRunning && !gameState.isPaused) return;
    
    if (gameState.gameOver) {
        resetGame();
        return;
    }
    
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.gameOver = false;
    
    // Ocultar pantalla de inicio
    document.getElementById('game-start').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    
    // Habilitar/deshabilitar botones
    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;
    
    // Iniciar temporizador del juego
    gameState.gameInterval = setInterval(updateGame, 1000);
    
    // Iniciar generación de objetivos
    const settings = difficultySettings[gameState.difficulty];
    gameState.targetInterval = setInterval(spawnTarget, settings.targetSpawnRate);
    
    // Iniciar bucle de animación
    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (!gameState.isRunning) return;
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        clearInterval(gameState.gameInterval);
        clearInterval(gameState.targetInterval);
        document.getElementById('pause-btn').innerHTML = '<i class="fas fa-play"></i> Reanudar';
    } else {
        const settings = difficultySettings[gameState.difficulty];
        gameState.gameInterval = setInterval(updateGame, 1000);
        gameState.targetInterval = setInterval(spawnTarget, settings.targetSpawnRate);
        document.getElementById('pause-btn').innerHTML = '<i class="fas fa-pause"></i> Pausar';
        requestAnimationFrame(gameLoop);
    }
}

function resetGame() {
    // Detener intervalos
    clearInterval(gameState.gameInterval);
    clearInterval(gameState.targetInterval);
    
    // Reiniciar estado del juego
    gameState = {
        score: 0,
        timeLeft: 60,
        totalShots: 0,
        hits: 0,
        misses: 0,
        targets: [],
        powerUps: [],
        level: 1,
        isRunning: false,
        isPaused: false,
        gameOver: false,
        weapon: 'pistol',
        difficulty: document.querySelector('input[name="difficulty"]:checked').value,
        gameInterval: null,
        targetInterval: null
    };
    
    // Restablecer UI
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('game-start').classList.remove('hidden');
    
    // Actualizar estadísticas
    updateStats();
    updateWeaponStats();
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // Reducir tiempo
    gameState.timeLeft--;
    
    // Actualizar nivel según la puntuación
    const newLevel = Math.floor(gameState.score / 500) + 1;
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        // Aumentar dificultad con cada nivel
        increaseDifficulty();
    }
    
    // Verificar si el juego terminó
    if (gameState.timeLeft <= 0) {
        endGame();
    }
    
    // Actualizar estadísticas en pantalla
    updateStats();
}

function updateStats() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('time').textContent = `${gameState.timeLeft}s`;
    
    const accuracy = gameState.totalShots > 0 ? 
        (gameState.hits / gameState.totalShots * 100).toFixed(1) : 0;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    
    document.getElementById('shots').textContent = `${gameState.hits}/${gameState.totalShots}`;
    document.getElementById('targets').textContent = gameState.targets.length;
    document.getElementById('level').textContent = gameState.level;
}

function updateWeaponStats() {
    const weapon = weaponSettings[gameState.weapon];
    document.getElementById('weapon-damage').textContent = weapon.damage;
    document.getElementById('weapon-speed').textContent = weapon.speed;
    document.getElementById('weapon-accuracy').textContent = weapon.accuracy;
}

function changeWeapon(weapon) {
    gameState.weapon = weapon;
    updateWeaponStats();
}

function increaseDifficulty() {
    // Aumentar velocidad de generación de objetivos cada nivel
    if (gameState.targetInterval) {
        clearInterval(gameState.targetInterval);
        const settings = difficultySettings[gameState.difficulty];
        const newSpawnRate = Math.max(300, settings.targetSpawnRate - (gameState.level * 50));
        gameState.targetInterval = setInterval(spawnTarget, newSpawnRate);
    }
}

function spawnTarget() {
    if (!gameState.isRunning || gameState.isPaused || gameState.targets.length > 15) return;
    
    const settings = difficultySettings[gameState.difficulty];
    const size = settings.targetSize;
    
    // Posición aleatoria dentro del canvas
    const x = Math.random() * (canvas.width - size * 2) + size;
    const y = Math.random() * (canvas.height - size * 2) + size;
    
    // Determinar si es un objetivo falso
    const isFake = Math.random() < settings.fakeTargetChance;
    
    // Velocidad y dirección
    const angle = Math.random() * Math.PI * 2;
    const speed = settings.targetSpeed + (Math.random() * 1.5);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Tipo de objetivo (determina puntuación)
    const targetTypes = ['normal', 'small', 'moving', 'bonus'];
    const type = targetTypes[Math.floor(Math.random() * targetTypes.length)];
    
    const target = {
        x, y, size,
        vx, vy,
        type,
        isFake,
        createdAt: Date.now(),
        lifetime: settings.targetLifetime,
        color: isFake ? '#ff4757' : 
                type === 'small' ? '#00dbde' : 
                type === 'moving' ? '#ffa502' : 
                type === 'bonus' ? '#fc00ff' : '#2ed573'
    };
    
    gameState.targets.push(target);
}

function handleShot(e) {
    if (!gameState.isRunning || gameState.isPaused || gameState.gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    gameState.totalShots++;
    
    // Verificar si se ha golpeado algún objetivo
    let hit = false;
    
    for (let i = gameState.targets.length - 1; i >= 0; i--) {
        const target = gameState.targets[i];
        const distance = Math.sqrt(
            Math.pow(mouseX - target.x, 2) + 
            Math.pow(mouseY - target.y, 2)
        );
        
        // Si el clic está dentro del objetivo
        if (distance < target.size) {
            hit = true;
            
            // Si es un objetivo falso, penalizar
            if (target.isFake) {
                gameState.score = Math.max(0, gameState.score - 50);
                createHitEffect(mouseX, mouseY, target.color, '-50');
            } else {
                // Calcular puntuación según tipo de objetivo
                let points = weaponSettings[gameState.weapon].damage;
                
                switch(target.type) {
                    case 'small':
                        points *= 2;
                        break;
                    case 'moving':
                        points *= 1.5;
                        break;
                    case 'bonus':
                        points *= 3;
                        break;
                }
                
                gameState.score += points;
                gameState.hits++;
                createHitEffect(mouseX, mouseY, target.color, `+${points}`);
            }
            
            // Eliminar el objetivo
            gameState.targets.splice(i, 1);
            break;
        }
    }
    
    // Si no se acertó a ningún objetivo
    if (!hit) {
        gameState.misses++;
        createHitEffect(mouseX, mouseY, '#ffffff', 'Fallaste!', false);
    }
    
    // Actualizar estadísticas
    updateStats();
    
    // Reproducir sonido de disparo (simulado)
    playShotSound();
}

function createHitEffect(x, y, color, text, isHit = true) {
    // Crear efecto visual de impacto
    const hitEffect = {
        x, y,
        color,
        text,
        alpha: 1,
        size: isHit ? 20 : 15,
        createdAt: Date.now(),
        duration: 1000 // 1 segundo
    };
    
    // Agregar a una lista temporal de efectos (simplificado)
    setTimeout(() => {
        // Dibujar el efecto en el siguiente frame
        // En una implementación completa, se manejaría con un array de efectos
    }, 0);
    
    // Mostrar texto de puntuación
    showScorePopup(x, y, text, color);
}

function showScorePopup(x, y, text, color) {
    // Crear elemento temporal para mostrar la puntuación
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = text;
    popup.style.position = 'absolute';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.color = color;
    popup.style.fontWeight = 'bold';
    popup.style.fontSize = '1.2rem';
    popup.style.pointerEvents = 'none';
    popup.style.zIndex = '1000';
    popup.style.textShadow = '0 0 5px rgba(0,0,0,0.8)';
    popup.style.animation = 'scorePopup 1s forwards';
    
    // Agregar al contenedor del juego
    const container = document.querySelector('.game-canvas-container');
    container.appendChild(popup);
    
    // Eliminar después de la animación
    setTimeout(() => {
        container.removeChild(popup);
    }, 1000);
}

function playShotSound() {
    // Crear sonido de disparo sintético
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log("Audio no soportado o deshabilitado");
    }
}

function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused || gameState.gameOver) {
        return;
    }
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar fondo
    drawBackground();
    
    // Actualizar y dibujar objetivos
    updateTargets();
    drawTargets();
    
    // Dibujar información del juego
    drawGameInfo();
    
    // Solicitar siguiente frame
    requestAnimationFrame(gameLoop);
}

function drawBackground() {
    // Fondo degradado
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a1929');
    gradient.addColorStop(1, '#1a2b3c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Rejilla de referencia
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Líneas verticales
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Líneas horizontales
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Punto central
    ctx.fillStyle = 'rgba(0, 219, 222, 0.5)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();
}

function updateTargets() {
    const currentTime = Date.now();
    
    for (let i = gameState.targets.length - 1; i >= 0; i--) {
        const target = gameState.targets[i];
        
        // Verificar si el objetivo ha expirado
        if (currentTime - target.createdAt > target.lifetime) {
            gameState.targets.splice(i, 1);
            if (!target.isFake) {
                gameState.misses++;
            }
            continue;
        }
        
        // Actualizar posición
        target.x += target.vx;
        target.y += target.vy;
        
        // Rebotar en los bordes
        if (target.x < target.size || target.x > canvas.width - target.size) {
            target.vx *= -1;
            target.x = Math.max(target.size, Math.min(canvas.width - target.size, target.x));
        }
        
        if (target.y < target.size || target.y > canvas.height - target.size) {
            target.vy *= -1;
            target.y = Math.max(target.size, Math.min(canvas.height - target.size, target.y));
        }
        
        // Actualizar velocidad según tipo
        if (target.type === 'moving') {
            // Cambio aleatorio de dirección
            if (Math.random() < 0.02) {
                target.vx = (Math.random() - 0.5) * difficultySettings[gameState.difficulty].targetSpeed * 2;
                target.vy = (Math.random() - 0.5) * difficultySettings[gameState.difficulty].targetSpeed * 2;
            }
        }
    }
}

function drawTargets() {
    gameState.targets.forEach(target => {
        // Dibujar círculo del objetivo
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.size, 0, Math.PI * 2);
        
        // Relleno con gradiente
        const gradient = ctx.createRadialGradient(
            target.x, target.y, 0,
            target.x, target.y, target.size
        );
        
        gradient.addColorStop(0, target.color);
        gradient.addColorStop(0.7, target.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Borde
        ctx.strokeStyle = target.isFake ? '#ff4757' : '#ffffff';
        ctx.lineWidth = target.isFake ? 3 : 2;
        ctx.stroke();
        
        // Dibujar símbolo según tipo
        ctx.fillStyle = '#ffffff';
        ctx.font = `${target.size * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let symbol = '●';
        if (target.isFake) symbol = '✗';
        else if (target.type === 'small') symbol = '◎';
        else if (target.type === 'moving') symbol = '↻';
        else if (target.type === 'bonus') symbol = '★';
        
        ctx.fillText(symbol, target.x, target.y);
        
        // Dibujar tiempo restante (anillo exterior)
        const elapsed = Date.now() - target.createdAt;
        const remaining = 1 - (elapsed / target.lifetime);
        
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.size + 5, -Math.PI/2, -Math.PI/2 + (remaining * Math.PI * 2));
        ctx.strokeStyle = remaining > 0.5 ? '#2ed573' : remaining > 0.2 ? '#ffa502' : '#ff4757';
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

function drawGameInfo() {
    // Dibujar información en la esquina superior izquierda
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillText(`Puntuación: ${gameState.score}`, 20, 35);
    ctx.fillText(`Tiempo: ${gameState.timeLeft}s`, 20, 55);
    ctx.fillText(`Precisión: ${gameState.totalShots > 0 ? (gameState.hits/gameState.totalShots*100).toFixed(1) : 0}%`, 20, 75);
    ctx.fillText(`Nivel: ${gameState.level}`, 20, 95);
    
    // Dibujar arma actual en la esquina inferior derecha
    const weapon = weaponSettings[gameState.weapon];
    ctx.fillStyle = weapon.color;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Arma: ${gameState.weapon.toUpperCase()}`, canvas.width - 20, canvas.height - 40);
    ctx.font = '14px Arial';
    ctx.fillText(`Daño: ${weapon.damage}`, canvas.width - 20, canvas.height - 20);
}

function endGame() {
    gameState.isRunning = false;
    gameState.gameOver = true;
    
    // Detener intervalos
    clearInterval(gameState.gameInterval);
    clearInterval(gameState.targetInterval);
    
    // Mostrar pantalla de fin de juego
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-score').textContent = gameState.score;
    
    const accuracy = gameState.totalShots > 0 ? 
        (gameState.hits / gameState.totalShots * 100).toFixed(1) : 0;
    document.getElementById('final-accuracy').textContent = `${accuracy}%`;
    
    // Habilitar/deshabilitar botones
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
}

async function saveScore() {
    const playerNameInput = document.getElementById('player-name');
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        alert('Por favor ingresa tu nombre para guardar la puntuación');
        playerNameInput.focus();
        return;
    }
    
    const accuracy = gameState.totalShots > 0 ? 
        (gameState.hits / gameState.totalShots * 100) : 0;
    
    const scoreData = {
        player_name: playerName,
        score: gameState.score,
        accuracy: accuracy
    };
    
    try {
        const response = await fetch('/save_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scoreData)
        });
        
        if (response.ok) {
            alert('Puntuación guardada exitosamente');
            loadLeaderboard();
            playerNameInput.value = '';
        } else {
            alert('Error al guardar la puntuación');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar con el servidor. La puntuación se guardará localmente.');
        
        // Guardar en localStorage como respaldo
        saveScoreLocal(playerName, gameState.score, accuracy);
    }
}

function saveScoreLocal(playerName, score, accuracy) {
    let scores = JSON.parse(localStorage.getItem('aimTrainingScores') || '[]');
    scores.push({
        player_name: playerName,
        score: score,
        accuracy: accuracy.toFixed(1) + '%',
        time: new Date().toLocaleDateString('es-ES')
    });
    
    // Ordenar por puntuación y mantener solo las top 10
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    
    localStorage.setItem('aimTrainingScores', JSON.stringify(scores));
    loadLeaderboard(); // Recargar tabla de líderes
}

async function loadLeaderboard() {
    const leaderboardElement = document.getElementById('leaderboard');
    
    try {
        const response = await fetch('/scores');
        
        if (response.ok) {
            const scores = await response.json();
            displayLeaderboard(scores, leaderboardElement);
        } else {
            throw new Error('Error al cargar puntuaciones del servidor');
        }
    } catch (error) {
        console.error('Error cargando puntuaciones:', error);
        
        // Intentar cargar desde localStorage
        const localScores = JSON.parse(localStorage.getItem('aimTrainingScores') || '[]');
        if (localScores.length > 0) {
            displayLeaderboard(localScores, leaderboardElement);
        } else {
            leaderboardElement.innerHTML = '<div class="loading">No hay puntuaciones guardadas</div>';
        }
    }
}

function displayLeaderboard(scores, element) {
    if (scores.length === 0) {
        element.innerHTML = '<div class="loading">No hay puntuaciones guardadas</div>';
        return;
    }
    
    let html = '';
    scores.forEach((score, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        html += `
            <div class="leaderboard-item">
                <div class="player-info">
                    <span class="medal">${medal}</span> ${score.player_name}
                </div>
                <div class="player-score">
                    ${score.score} pts (${score.accuracy})
                </div>
                <div class="player-time">
                    ${score.time || ''}
                </div>
            </div>
        `;
    });
    
    element.innerHTML = html;
}

// Estilos adicionales para elementos dinámicos
const style = document.createElement('style');
style.textContent = `
    .score-popup {
        animation: scorePopup 1s forwards;
    }
    
    @keyframes scorePopup {
        0% { transform: translateY(0) scale(0.5); opacity: 0; }
        50% { transform: translateY(-20px) scale(1); opacity: 1; }
        100% { transform: translateY(-40px) scale(0.5); opacity: 0; }
    }
    
    .leaderboard-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border-left: 4px solid #00dbde;
    }
    
    .leaderboard-item .medal {
        font-size: 1.2rem;
        margin-right: 8px;
    }
    
    .player-time {
        font-size: 0.8rem;
        opacity: 0.7;
    }
`;
document.head.appendChild(style);