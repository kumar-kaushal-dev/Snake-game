  // Game constants and variables
        let board = document.getElementById('board');
        let scoreBox = document.getElementById('scoreBox');
        let highScoreBox = document.getElementById('highScoreBox');
        let levelBox = document.getElementById('levelBox');
        let gameOverModal = document.getElementById('gameOverModal');
        let pauseIndicator = document.getElementById('pauseIndicator');

        let inputDir = { x: 0, y: 0 };
        let nextDir = { x: 0, y: 0 };
        
        // Audio with fallback
        let audioEnabled = true;
        let foodSound, gameOverSound, moveSound, musicSound, levelUpSound, powerUpSound;
        
        try {
            foodSound = new Audio('music/food.wav');
            gameOverSound = new Audio('music/gameover.wav');
            moveSound = new Audio('music/turn.wav');
            musicSound = new Audio('music/beat_box.mp3');
            levelUpSound = new Audio('music/food.wav'); // Fallback
            powerUpSound = new Audio('music/turn.wav'); // Fallback
            
            musicSound.loop = true;
            musicSound.volume = 0.3;
            
            // Test audio loading
            foodSound.volume = 0.5;
            gameOverSound.volume = 0.7;
            moveSound.volume = 0.3;
        } catch (e) {
            audioEnabled = false;
            console.log('Audio files not found, running in silent mode');
        }

        let gameState = 'playing'; // playing, paused, gameOver
        let speed = 6;
        let baseSpeed = 6;
        let lastPaintTime = 0;
        let score = 0;
        let level = 1;
        let snakeArr = [{ x: 10, y: 10 }];
        let food = { x: 6, y: 7 };
        let powerUp = null;
        let powerUpTimer = 0;
        let highScoreval = 0;
        let gridSize = 20;
        let gameStarted = false;

        // Particle system
        let particles = [];

        // Initialize game
        function initGame() {
            let highScore = localStorage.getItem('highScore');
            if (highScore === null) {
                highScoreval = 0;
                localStorage.setItem('highScore', JSON.stringify(highScoreval));
            } else {
                highScoreval = JSON.parse(highScore);
                highScoreBox.innerHTML = "High Score: " + highScoreval;
            }
            
            if (audioEnabled) {
                try {
                    musicSound.play().catch(e => console.log('Music autoplay prevented'));
                } catch (e) {
                    console.log('Music playback failed');
                }
            }
            
            generateFood();
            render(); // Initial render to show food
            window.requestAnimationFrame(main);
        }

        // Main game loop
        function main(ctime) {
            window.requestAnimationFrame(main);
            
            if (gameState !== 'playing') return;
            
            if ((ctime - lastPaintTime) / 1000 < 1 / speed) return;
            lastPaintTime = ctime;
            
            updateParticles();
            gameEngine();
        }

        // Collision detection
        function isCollide(snake) {
            // Self collision
            for (let i = 1; i < snake.length; i++) {
                if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
            }
            // Wall collision
            return (
                snake[0].x >= gridSize ||
                snake[0].x < 0 ||
                snake[0].y >= gridSize ||
                snake[0].y < 0
            );
        }

        // Generate food at random position
        function generateFood() {
            let validPosition = false;
            while (!validPosition) {
                food = {
                    x: Math.floor(Math.random() * gridSize),
                    y: Math.floor(Math.random() * gridSize)
                };
                
                validPosition = true;
                for (let segment of snakeArr) {
                    if (segment.x === food.x && segment.y === food.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
        }

        // Generate power-up
        function generatePowerUp() {
            if (Math.random() < 0.4 && !powerUp) { // 40% chance
                let validPosition = false;
                while (!validPosition) {
                    powerUp = {
                        x: Math.floor(Math.random() * gridSize),
                        y: Math.floor(Math.random() * gridSize),
                        type: Math.random() < 0.7 ? 'energy' : 'speed' // 70% energy, 30% speed
                    };
                    
                    validPosition = true;
                    for (let segment of snakeArr) {
                        if (segment.x === powerUp.x && segment.y === powerUp.y) {
                            validPosition = false;
                            break;
                        }
                    }
                    if (powerUp.x === food.x && powerUp.y === food.y) {
                        validPosition = false;
                    }
                }
                powerUpTimer = 400; // ~6.5 seconds at 60fps
            }
        }

        // Create particles
        function createParticles(x, y, color = '#ffd700') {
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: x,
                    y: y,
                    dx: (Math.random() - 0.5) * 100,
                    dy: (Math.random() - 0.5) * 100,
                    life: 60,
                    maxLife: 60,
                    color: color
                });
            }
        }

        // Update particles
        function updateParticles() {
            particles = particles.filter(particle => {
                particle.life--;
                return particle.life > 0;
            });
        }

        // Render particles
        function renderParticles() {
            particles.forEach(particle => {
                let particleElement = document.createElement('div');
                particleElement.className = 'particle';
                particleElement.style.left = `${particle.x}px`;
                particleElement.style.top = `${particle.y}px`;
                particleElement.style.background = particle.color;
                particleElement.style.setProperty('--dx', `${particle.dx}px`);
                particleElement.style.setProperty('--dy', `${particle.dy}px`);
                board.appendChild(particleElement);
                
                setTimeout(() => {
                    if (particleElement.parentNode) {
                        particleElement.parentNode.removeChild(particleElement);
                    }
                }, 1000);
            });
        }

        // Update level and speed
        function updateLevel() {
            let newLevel = Math.floor(score / 5) + 1;
            if (newLevel > level) {
                level = newLevel;
                speed = baseSpeed + (level - 1) * 2;
                levelBox.innerHTML = "Level: " + level;
                
                if (audioEnabled) {
                    try {
                        levelUpSound.play();
                    } catch (e) {}
                }
                
                // Level up particle effect
                createParticles(board.offsetWidth / 2, board.offsetHeight / 2, '#00ff88');
            }
        }

        // Main game engine
        function gameEngine() {
            // Apply buffered input
            if (nextDir.x !== 0 || nextDir.y !== 0) {
                if ((nextDir.x !== 0 && inputDir.x === 0) || (nextDir.y !== 0 && inputDir.y === 0)) {
                    inputDir = { ...nextDir };
                    nextDir = { x: 0, y: 0 };
                }
            }

            // Collision check
            if (isCollide(snakeArr)) {
                gameOver();
                return;
            }

            // Food consumption
            if (snakeArr[0].x === food.x && snakeArr[0].y === food.y) {
                if (audioEnabled) {
                    try {
                        foodSound.play();
                    } catch (e) {}
                }
                
                score++;
                updateScore();
                updateLevel();
                
                // Grow snake
                snakeArr.unshift({
                    x: snakeArr[0].x + inputDir.x,
                    y: snakeArr[0].y + inputDir.y
                });
                
                generateFood();
                generatePowerUp();
                
                // Food eaten particle effect
                let rect = board.getBoundingClientRect();
                let cellSize = rect.width / gridSize;
                createParticles(
                    rect.left + food.x * cellSize + cellSize / 2,
                    rect.top + food.y * cellSize + cellSize / 2
                );
            }

            // Power-up consumption
            if (powerUp && snakeArr[0].x === powerUp.x && snakeArr[0].y === powerUp.y) {
                if (audioEnabled) {
                    try {
                        powerUpSound.play();
                    } catch (e) {}
                }
                
                if (powerUp.type === 'energy') {
                    score += 5; // Energy boost gives 5 points
                } else if (powerUp.type === 'speed') {
                    score += 3; // Speed boost gives 3 points
                    // Temporary speed boost
                    let originalSpeed = speed;
                    speed += 3;
                    setTimeout(() => {
                        speed = originalSpeed;
                    }, 3000); // Speed boost lasts 3 seconds
                }
                
                updateScore();
                
                let rect = board.getBoundingClientRect();
                let cellSize = rect.width / gridSize;
                createParticles(
                    rect.left + powerUp.x * cellSize + cellSize / 2,
                    rect.top + powerUp.y * cellSize + cellSize / 2,
                    powerUp.type === 'speed' ? '#ff6b6b' : '#00ff88'
                );
                
                powerUp = null;
            }

            // Power-up timer
            if (powerUp) {
                powerUpTimer--;
                if (powerUpTimer <= 0) {
                    powerUp = null;
                }
            }

            // Move snake
            for (let i = snakeArr.length - 2; i >= 0; i--) {
                snakeArr[i + 1] = { ...snakeArr[i] };
            }

            snakeArr[0].x += inputDir.x;
            snakeArr[0].y += inputDir.y;

            render();
        }

        // Render game
        function render() {
            // Clear board but keep pause indicator
            const pauseDiv = board.querySelector('.pause-indicator');
            board.innerHTML = '';
            if (pauseDiv) {
                board.appendChild(pauseDiv);
            } else {
                board.innerHTML = '<div class="pause-indicator" id="pauseIndicator" style="display: none;">PAUSED</div>';
            }

            // Render snake
            snakeArr.forEach((segment, index) => {
                let element = document.createElement('div');
                element.style.gridRowStart = segment.y + 1;
                element.style.gridColumnStart = segment.x + 1;
                element.classList.add(index === 0 ? 'head' : 'snake');
                board.appendChild(element);
            });

            // Render food - Enhanced visibility
            let foodElement = document.createElement('div');
            foodElement.style.gridRowStart = food.y + 1;
            foodElement.style.gridColumnStart = food.x + 1;
            foodElement.classList.add('food');
            foodElement.style.position = 'relative';
            foodElement.style.zIndex = '200';
            board.appendChild(foodElement);

            // Render power-up
            if (powerUp) {
                let powerUpElement = document.createElement('div');
                powerUpElement.style.gridRowStart = powerUp.y + 1;
                powerUpElement.style.gridColumnStart = powerUp.x + 1;
                powerUpElement.classList.add(powerUp.type === 'speed' ? 'speed-boost' : 'power-up');
                powerUpElement.style.position = 'relative';
                powerUpElement.style.zIndex = '200';
                board.appendChild(powerUpElement);
            }

            renderParticles();
        }

        // Update score display
        function updateScore() {
            scoreBox.innerHTML = "Score: " + score;
            if (score > highScoreval) {
                highScoreval = score;
                localStorage.setItem('highScore', JSON.stringify(highScoreval));
                highScoreBox.innerHTML = 'High Score: ' + highScoreval;
            }
        }

        // Game over
        function gameOver() {
            gameState = 'gameOver';
            
            if (audioEnabled) {
                try {
                    gameOverSound.play();
                    musicSound.pause();
                } catch (e) {}
            }
            
            document.getElementById('finalScoreText').innerHTML = `Your Score: ${score}`;
            document.getElementById('levelReachedText').innerHTML = `Level Reached: ${level}`;
            gameOverModal.style.display = 'flex';
        }

        // Restart game
        function restartGame() {
            gameState = 'playing';
            inputDir = { x: 0, y: 0 };
            nextDir = { x: 0, y: 0 };
            snakeArr = [{ x: 10, y: 10 }];
            score = 0;
            level = 1;
            speed = baseSpeed;
            powerUp = null;
            particles = [];
            
            scoreBox.innerHTML = "Score: 0";
            levelBox.innerHTML = "Level: 1";
            gameOverModal.style.display = 'none';
            
            generateFood();
            
            if (audioEnabled) {
                try {
                    musicSound.play();
                } catch (e) {}
            }
        }

        // Pause game
        function togglePause() {
            if (gameState === 'playing') {
                gameState = 'paused';
                pauseIndicator.style.display = 'block';
                if (audioEnabled) {
                    try {
                        musicSound.pause();
                    } catch (e) {}
                }
            } else if (gameState === 'paused') {
                gameState = 'playing';
                pauseIndicator.style.display = 'none';
                if (audioEnabled) {
                    try {
                        musicSound.play();
                    } catch (e) {}
                }
            }
        }

        // Keyboard controls
        window.addEventListener('keydown', e => {
            if (gameState === 'gameOver') return;
            
            if (audioEnabled && gameStarted) {
                try {
                    moveSound.play();
                } catch (e) {}
            }
            
            switch (e.key) {
                case "ArrowUp":
                case "w":
                case "W":
                    e.preventDefault();
                    if (inputDir.y !== 1) {
                        nextDir = { x: 0, y: -1 };
                    }
                    break;
                case "ArrowDown":
                case "s":
                case "S":
                    e.preventDefault();
                    if (inputDir.y !== -1) {
                        nextDir = { x: 0, y: 1 };
                    }
                    break;
                case "ArrowLeft":
                case "a":
                case "A":
                    e.preventDefault();
                    if (inputDir.x !== 1) {
                        nextDir = { x: -1, y: 0 };
                    }
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    e.preventDefault();
                    if (inputDir.x !== -1) {
                        nextDir = { x: 1, y: 0 };
                    }
                    break;
                case " ":
                    e.preventDefault();
                    togglePause();
                    break;
                case "r":
                case "R":
                    if (gameState === 'gameOver') {
                        restartGame();
                    }
                    break;
            }
            
            if (!gameStarted) {
                gameStarted = true;
            }
        });

        // Touch controls - Enhanced for better responsiveness
        document.querySelectorAll('.touch-btn').forEach(btn => {
            // Handle both touch and mouse events
            ['touchstart', 'mousedown'].forEach(eventType => {
                btn.addEventListener(eventType, e => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (gameState === 'gameOver') return;
                    
                    let direction = btn.dataset.direction;
                    
                    switch (direction) {
                        case 'up':
                            if (inputDir.y !== 1) {
                                nextDir = { x: 0, y: -1 };
                                gameStarted = true;
                            }
                            break;
                        case 'down':
                            if (inputDir.y !== -1) {
                                nextDir = { x: 0, y: 1 };
                                gameStarted = true;
                            }
                            break;
                        case 'left':
                            if (inputDir.x !== 1) {
                                nextDir = { x: -1, y: 0 };
                                gameStarted = true;
                            }
                            break;
                        case 'right':
                            if (inputDir.x !== -1) {
                                nextDir = { x: 1, y: 0 };
                                gameStarted = true;
                            }
                            break;
                        case 'pause':
                            togglePause();
                            break;
                    }
                    
                    if (audioEnabled && gameStarted) {
                        try {
                            moveSound.play();
                        } catch (e) {}
                    }
                    
                    // Visual feedback
                    btn.style.transform = 'scale(0.9)';
                    setTimeout(() => {
                        btn.style.transform = 'scale(1)';
                    }, 100);
                });
            });
            
            // Prevent context menu on long press
            btn.addEventListener('contextmenu', e => {
                e.preventDefault();
            });
        });

        // Initialize game on load
        initGame();