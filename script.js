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
        
        this.currentDifficulty = null;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isProcessing = false;
        this.score = 0;
        this.combo = 0;
        this.nextPoints = 1;
        this.attempts = 0;
        
        this.difficultySelection = document.getElementById('difficulty-selection');
        this.gameArea = document.getElementById('game-area');
        this.gameBoard = document.getElementById('game-board');
        this.pairsCount = document.getElementById('pairs-count');
        this.currentDifficultySpan = document.getElementById('current-difficulty');
        this.scoreSpan = document.getElementById('score');
        this.comboSpan = document.getElementById('combo');
        this.nextPointsSpan = document.getElementById('next-points');
        this.attemptsSpan = document.getElementById('attempts');
        this.message = document.getElementById('message');
        this.resetBtn = document.getElementById('reset-btn');
        this.backBtn = document.getElementById('back-btn');
        
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
                this.selectDifficulty(btn.dataset.level);
            });
        });
        
        // ゲーム内ボタン
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.backBtn.addEventListener('click', () => this.showDifficultySelection());
    }
    
    selectDifficulty(level) {
        this.currentDifficulty = level;
        this.cards = [...this.difficulties[level].cards];
        this.currentDifficultySpan.textContent = this.difficulties[level].name;
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
        this.createBoard();
        this.updateDisplay();
    }
    
    resetGameState() {
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isProcessing = false;
        this.score = 0;
        this.combo = 0;
        this.nextPoints = 1;
        this.attempts = 0;
        this.message.textContent = '';
        this.message.className = 'message';
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
            this.showMessage(`おめでとうございます！全てのペアを見つけました！最終スコア: ${this.score}点 (${this.attempts}回で完了)`, 'success');
        }
    }
    
    updateDisplay() {
        this.pairsCount.textContent = this.matchedPairs;
        this.scoreSpan.textContent = this.score;
        this.comboSpan.textContent = this.combo;
        this.nextPointsSpan.textContent = this.nextPoints;
        this.attemptsSpan.textContent = this.attempts;
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
    
    resetGame() {
        if (this.currentDifficulty) {
            this.cards = [...this.difficulties[this.currentDifficulty].cards];
            this.resetGameState();
            this.shuffleCards();
            this.createBoard();
            this.updateDisplay();
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
