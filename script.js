class MemoryGame {
    constructor() {
        this.difficulties = {
            easy: {
                name: 'かんたん',
                cards: ['あ', 'あ', 'お', 'お', 'ぬ', 'ぬ', 'め', 'め']
            },
            normal: {
                name: '普通',
                cards: ['ソ', 'ソ', 'ン', 'ン', 'ㇱ', 'ㇱ', 'ツ', 'ツ']
            },
            hard: {
                name: '難しい',
                cards: ['‐', '‐', '-', '-', '‑', '‑', '⁃', '⁃']
            }
        };
        
        // ハイフンの名称マッピング
        this.hyphenNames = {
            '‐': 'HYPHEN',
            '-': 'HYPHEN-MINUS',
            '‑': 'NON-BREAKING HYPHEN',
            '⁃': 'HYPHEN BULLET'
        };
        
        this.currentDifficulty = null;
        this.gameMode = 'normal'; // 'normal' or 'hell'
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isProcessing = false;
        this.score = 0;
        this.combo = 0;
        this.nextPoints = 1;
        this.attempts = 0;
        this.startTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        
        // 地獄モード用変数
        this.hellMode = {
            canvas: null,
            ctx: null,
            ball: null, // 単一のボール
            ballStock: 0, // ボールのストック数
            paddle: { x: 0, y: 0, width: 100, height: 10 },
            cards: [],
            animationId: null
        };
        
        this.difficultySelection = document.getElementById('difficulty-selection');
        this.gameArea = document.getElementById('game-area');
        this.gameBoard = document.getElementById('game-board');
        this.pairsCount = document.getElementById('pairs-count');
        this.currentDifficultySpan = document.getElementById('current-difficulty');
        this.scoreSpan = document.getElementById('score');
        this.comboSpan = document.getElementById('combo');
        this.nextPointsSpan = document.getElementById('next-points');
        this.attemptsSpan = document.getElementById('attempts');
        this.elapsedTimeSpan = document.getElementById('elapsed-time');
        this.ballsInfo = document.getElementById('balls-info');
        this.ballsCount = document.getElementById('balls-count');
        this.message = document.getElementById('message');
        this.resetBtn = document.getElementById('reset-btn');
        this.backBtn = document.getElementById('back-btn');
        
        // 地獄モード用要素
        this.hellMode.canvas = document.getElementById('hell-canvas');
        this.hellMode.ctx = this.hellMode.canvas.getContext('2d');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showDifficultySelection();
    }
    
    setupEventListeners() {
        // 難易度選択ボタン
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDifficulty(btn.dataset.level, btn.dataset.mode);
            });
        });
        
        // ゲーム内ボタン
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.backBtn.addEventListener('click', () => this.showDifficultySelection());
        
        // 地獄モード用マウス操作
        this.hellMode.canvas.addEventListener('mousemove', (e) => {
            if (this.gameMode === 'hell') {
                const rect = this.hellMode.canvas.getBoundingClientRect();
                this.hellMode.paddle.x = e.clientX - rect.left - this.hellMode.paddle.width / 2;
            }
        });
    }
    
    selectDifficulty(level, mode = 'normal') {
        this.currentDifficulty = level;
        this.gameMode = mode;
        this.cards = [...this.difficulties[level].cards];
        
        const modeName = mode === 'hell' ? ` (地獄)` : '';
        this.currentDifficultySpan.textContent = this.difficulties[level].name + modeName;
        
        // 地獄モードのボールストック数設定
        if (mode === 'hell') {
            const ballCounts = { easy: 5, normal: 4, hard: 3 };
            this.hellMode.ballStock = ballCounts[level];
        }
        
        this.startGame();
    }
    
    showDifficultySelection() {
        this.difficultySelection.style.display = 'block';
        this.gameArea.style.display = 'none';
        this.resetGameState();
    }
    
    startGame() {
        this.difficultySelection.style.display = 'none';
        this.gameArea.style.display = 'block';
        this.resetGameState();
        this.shuffleCards();
        
        if (this.gameMode === 'hell') {
            this.initHellMode();
        } else {
            this.createBoard();
        }
        
        this.updateDisplay();
        this.startTimer();
    }
    
    resetGameState() {
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isProcessing = false;
        this.score = 0;
        this.combo = 0;
        this.nextPoints = 1;
        this.attempts = 0;
        this.startTime = null;
        this.elapsedTime = 0;
        this.stopTimer();
        this.message.textContent = '';
        this.message.className = 'message';
        
        // 地獄モードのリセット
        if (this.hellMode.animationId) {
            cancelAnimationFrame(this.hellMode.animationId);
            this.hellMode.animationId = null;
        }
        this.hellMode.ball = null;
        this.hellMode.cards = [];
        
        // UI表示の切り替え
        if (this.gameMode === 'hell') {
            this.gameBoard.style.display = 'none';
            this.hellMode.canvas.style.display = 'block';
            this.ballsInfo.style.display = 'block';
        } else {
            this.gameBoard.style.display = 'grid';
            this.hellMode.canvas.style.display = 'none';
            this.ballsInfo.style.display = 'none';
        }
    }
    
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    createBoard() {
        this.gameBoard.innerHTML = '';
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            cardElement.dataset.value = card;
            cardElement.addEventListener('click', () => this.flipCard(cardElement));
            this.gameBoard.appendChild(cardElement);
        });
    }
    
    flipCard(cardElement) {
        if (this.isProcessing || 
            cardElement.classList.contains('flipped') || 
            cardElement.classList.contains('matched') ||
            this.flippedCards.length >= 2) {
            return;
        }
        
        cardElement.classList.add('flipped');
        cardElement.textContent = cardElement.dataset.value;
        this.flippedCards.push(cardElement);
        
        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }
    
    checkMatch() {
        this.isProcessing = true;
        this.attempts++; // 試行回数をカウント
        const [card1, card2] = this.flippedCards;
        
        if (card1.dataset.value === card2.dataset.value) {
            // マッチした場合
            setTimeout(() => {
                card1.classList.add('matched');
                card2.classList.add('matched');
                
                // 難しい難易度の場合、ハイフン名称を表示
                if (this.currentDifficulty === 'hard') {
                    const hyphenName = this.hyphenNames[card1.dataset.value];
                    card1.innerHTML = `${card1.dataset.value}<div class="hyphen-name">${hyphenName}</div>`;
                    card2.innerHTML = `${card2.dataset.value}<div class="hyphen-name">${hyphenName}</div>`;
                }
                
                this.matchedPairs++;
                
                // 点数計算
                this.score += this.nextPoints;
                this.combo++;
                this.nextPoints = Math.pow(2, this.combo);
                
                this.updateDisplay();
                this.checkGameComplete();
                this.flippedCards = [];
                this.isProcessing = false;
                
                // コンボメッセージ表示
                if (this.combo > 1) {
                    this.showMessage(`${this.combo}連続！ +${this.score >= this.nextPoints/2 ? this.nextPoints/2 : this.nextPoints}点`, 'success');
                }
            }, 500);
        } else {
            // マッチしなかった場合
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                card1.textContent = '';
                card2.textContent = '';
                this.flippedCards = [];
                this.isProcessing = false;
                
                // コンボリセット
                this.combo = 0;
                this.nextPoints = 1;
                this.updateDisplay();
                this.showMessage('もう一度挑戦！', 'info');
            }, 1000);
        }
    }
    
    checkGameComplete() {
        if (this.matchedPairs === 4) {
            this.stopTimer();
            const finalTime = this.formatTime(this.elapsedTime);
            this.showMessage(`おめでとうございます！全てのペアを見つけました！最終スコア: ${this.score}点 (${this.attempts}回、${finalTime}で完了)`, 'success');
        }
    }
    
    updateDisplay() {
        this.pairsCount.textContent = this.matchedPairs;
        this.scoreSpan.textContent = this.score;
        this.comboSpan.textContent = this.combo;
        this.nextPointsSpan.textContent = this.nextPoints;
        this.attemptsSpan.textContent = this.attempts;
        this.elapsedTimeSpan.textContent = this.formatTime(this.elapsedTime);
        
        if (this.gameMode === 'hell') {
            this.ballsCount.textContent = this.hellMode.ballStock;
        }
    }
    
    showMessage(text, type = '') {
        this.message.textContent = text;
        this.message.className = `message ${type}`;
        
        if (text && type !== 'success') {
            setTimeout(() => {
                this.message.textContent = '';
                this.message.className = 'message';
            }, 2000);
        }
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateDisplay();
        }, 100); // 100ms間隔で更新
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 地獄モード関連メソッド
    initHellMode() {
        const canvas = this.hellMode.canvas;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // パドルの初期位置
        this.hellMode.paddle.x = canvas.width / 2 - this.hellMode.paddle.width / 2;
        this.hellMode.paddle.y = canvas.height - 30;
        
        // カードの配置（2列4個）- ブロックと同じぐらいのスキマ
        const cardWidth = 80;
        const cardHeight = 50;
        const spacingX = 80; // 横間隔をブロック幅と同じに（80px）
        const spacingY = 50; // 縦間隔をブロック高さと同じに（50px）
        const cols = 4;
        const rows = 2;
        const totalWidth = cols * cardWidth + (cols - 1) * spacingX;
        const totalHeight = rows * cardHeight + (rows - 1) * spacingY;
        const startX = (canvas.width - totalWidth) / 2;
        const startY = 60;
        
        this.hellMode.cards = [];
        for (let i = 0; i < this.cards.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            this.hellMode.cards.push({
                x: startX + col * (cardWidth + spacingX),
                y: startY + row * (cardHeight + spacingY),
                width: cardWidth,
                height: cardHeight,
                value: this.cards[i],
                flipped: false,
                matched: false
            });
        }
        
        // 最初のボールを発射
        this.launchNewBall();
        
        this.hellGameLoop();
    }
    
    hellGameLoop() {
        this.updateHellGame();
        this.drawHellGame();
        this.hellMode.animationId = requestAnimationFrame(() => this.hellGameLoop());
    }
    
    launchNewBall() {
        if (this.hellMode.ballStock > 0) {
            const canvas = this.hellMode.canvas;
            this.hellMode.ball = {
                x: canvas.width / 2,
                y: canvas.height - 60,
                dx: (Math.random() - 0.5) * 4,
                dy: -4,
                radius: 8
            };
            this.hellMode.ballStock--;
            this.updateDisplay();
        }
    }
    
    updateHellGame() {
        const canvas = this.hellMode.canvas;
        const ball = this.hellMode.ball;
        
        if (!ball) return;
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 壁との衝突
        if (ball.x <= ball.radius || ball.x >= canvas.width - ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y <= ball.radius) {
            ball.dy = -ball.dy;
        }
        
        // パドルとの衝突
        if (ball.y + ball.radius >= this.hellMode.paddle.y &&
            ball.x >= this.hellMode.paddle.x &&
            ball.x <= this.hellMode.paddle.x + this.hellMode.paddle.width &&
            ball.dy > 0) {
            ball.dy = -Math.abs(ball.dy);
            // パドルの位置によってボールの角度を変える
            const hitPos = (ball.x - this.hellMode.paddle.x) / this.hellMode.paddle.width;
            ball.dx = (hitPos - 0.5) * 6;
        }
        
        // カードとの衝突
        this.hellMode.cards.forEach(card => {
            if (!card.matched &&
                ball.x + ball.radius >= card.x && ball.x - ball.radius <= card.x + card.width &&
                ball.y + ball.radius >= card.y && ball.y - ball.radius <= card.y + card.height) {
                ball.dy = -ball.dy;
                if (!card.flipped) {
                    card.flipped = true;
                    this.handleHellCardFlip(card);
                }
            }
        });
        
        // ボールが画面下に落ちた場合
        if (ball.y > canvas.height) {
            this.hellMode.ball = null;
            // 新しいボールを発射するか、ゲーム終了チェック
            setTimeout(() => {
                if (this.hellMode.ballStock > 0) {
                    this.launchNewBall();
                } else {
                    this.checkHellGameOver();
                }
            }, 1000);
        }
    }
    
    handleHellCardFlip(card) {
        // 既にめくられているカードがあるかチェック
        const flippedCards = this.hellMode.cards.filter(c => c.flipped && !c.matched);
        
        if (flippedCards.length === 2) {
            this.attempts++;
            const [card1, card2] = flippedCards;
            
            if (card1.value === card2.value) {
                // マッチした場合
                setTimeout(() => {
                    card1.matched = true;
                    card2.matched = true;
                    this.matchedPairs++;
                    
                    // 点数計算
                    this.score += this.nextPoints;
                    this.combo++;
                    this.nextPoints = Math.pow(2, this.combo);
                    
                    this.updateDisplay();
                    this.checkGameComplete();
                    
                    if (this.combo > 1) {
                        this.showMessage(`${this.combo}連続！ +${this.score >= this.nextPoints/2 ? this.nextPoints/2 : this.nextPoints}点`, 'success');
                    }
                }, 500);
            } else {
                // マッチしなかった場合
                setTimeout(() => {
                    card1.flipped = false;
                    card2.flipped = false;
                    this.combo = 0;
                    this.nextPoints = 1;
                    this.updateDisplay();
                    this.showMessage('もう一度挑戦！', 'info');
                }, 1000);
            }
        }
    }
    
    checkHellGameOver() {
        if (this.matchedPairs < 4) {
            this.stopTimer();
            this.showMessage(`ゲームオーバー！ボールがなくなりました。最終スコア: ${this.score}点 (${this.matchedPairs}/4ペア完了)`, 'info');
            if (this.hellMode.animationId) {
                cancelAnimationFrame(this.hellMode.animationId);
                this.hellMode.animationId = null;
            }
        }
    }
    
    drawHellGame() {
        const ctx = this.hellMode.ctx;
        const canvas = this.hellMode.canvas;
        
        // 背景をクリア
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // カードを描画
        this.hellMode.cards.forEach(card => {
            if (card.matched) {
                ctx.fillStyle = '#28a745';
            } else if (card.flipped) {
                ctx.fillStyle = '#fff';
            } else {
                ctx.fillStyle = '#4a90e2';
            }
            
            ctx.fillRect(card.x, card.y, card.width, card.height);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(card.x, card.y, card.width, card.height);
            
            if (card.flipped || card.matched) {
                ctx.fillStyle = card.matched ? '#fff' : '#333';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(card.value, card.x + card.width/2, card.y + card.height/2 + 5);
                
                // 難しい難易度でマッチした場合、ハイフン名称も表示
                if (card.matched && this.currentDifficulty === 'hard' && this.hyphenNames[card.value]) {
                    ctx.font = '8px Arial';
                    ctx.fillText(this.hyphenNames[card.value], card.x + card.width/2, card.y + card.height - 5);
                }
            }
        });
        
        // パドルを描画
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.hellMode.paddle.x, this.hellMode.paddle.y, 
                    this.hellMode.paddle.width, this.hellMode.paddle.height);
        
        // ボールを描画
        if (this.hellMode.ball) {
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(this.hellMode.ball.x, this.hellMode.ball.y, this.hellMode.ball.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // ボールストック数を画面に表示
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`残りボール: ${this.hellMode.ballStock}`, 10, 25);
    }
    
    resetGame() {
        if (this.currentDifficulty) {
            this.cards = [...this.difficulties[this.currentDifficulty].cards];
            this.resetGameState();
            this.shuffleCards();
            this.createBoard();
            this.updateDisplay();
            this.startTimer();
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
