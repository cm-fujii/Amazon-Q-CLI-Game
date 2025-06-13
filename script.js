class MemoryGame {
    constructor() {
        this.cards = ['あ', 'あ', 'お', 'お', 'ぬ', 'ぬ', 'め', 'め'];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isProcessing = false;
        
        this.gameBoard = document.getElementById('game-board');
        this.pairsCount = document.getElementById('pairs-count');
        this.message = document.getElementById('message');
        this.resetBtn = document.getElementById('reset-btn');
        
        this.init();
    }
    
    init() {
        this.shuffleCards();
        this.createBoard();
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.updateDisplay();
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
        const [card1, card2] = this.flippedCards;
        
        if (card1.dataset.value === card2.dataset.value) {
            // マッチした場合
            setTimeout(() => {
                card1.classList.add('matched');
                card2.classList.add('matched');
                this.matchedPairs++;
                this.updateDisplay();
                this.checkGameComplete();
                this.flippedCards = [];
                this.isProcessing = false;
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
                this.showMessage('もう一度挑戦！', 'info');
            }, 1000);
        }
    }
    
    checkGameComplete() {
        if (this.matchedPairs === 4) {
            this.showMessage('おめでとうございます！全てのペアを見つけました！', 'success');
        }
    }
    
    updateDisplay() {
        this.pairsCount.textContent = this.matchedPairs;
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
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.isProcessing = false;
        this.message.textContent = '';
        this.message.className = 'message';
        
        this.shuffleCards();
        this.createBoard();
        this.updateDisplay();
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
