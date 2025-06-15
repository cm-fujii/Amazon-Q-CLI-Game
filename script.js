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
        this.missCount = 0; // ミス回数の累計を追加
        this.startTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.timeLimit = 120000; // 2分 = 120秒 = 120000ミリ秒
        
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
        this.missCountSpan = document.getElementById('miss-count');
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
        
        // 地獄モード用クリック操作（ボール発射）
        this.hellMode.canvas.addEventListener('click', (e) => {
            if (this.gameMode === 'hell' && this.hellMode.waitingForLaunch) {
                this.launchNewBall();
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
        this.missCount = 0; // ミス回数もリセット
        this.startTime = null;
        this.elapsedTime = 0;
        this.timeLimit = 120000; // 2分制限をリセット時にも設定
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
        this.hellMode.waitingForLaunch = false;
        
        // 地獄モードのボールストックをリセット
        if (this.gameMode === 'hell') {
            const ballCounts = { easy: 5, normal: 4, hard: 3 };
            this.hellMode.ballStock = ballCounts[this.currentDifficulty];
            this.hellMode.waitingForLaunch = true; // 発射待機状態に設定
        }
        
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
                
                // 改良されたスコア計算
                this.combo++;
                const matchScore = this.calculateMatchScore();
                this.score += matchScore;
                
                this.updateDisplay();
                this.checkGameComplete();
                this.flippedCards = [];
                this.isProcessing = false;
                
                // コンボメッセージ表示
                if (this.combo > 1) {
                    this.showMessage(`${this.combo}連続！ +${matchScore}点`, 'success');
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
                
                // ミスペナルティとコンボリセット
                this.handleMiss();
                this.updateDisplay();
                this.showMessage('もう一度挑戦！', 'info');
            }, 1000);
        }
    }
    
    checkGameComplete() {
        if (this.matchedPairs === 4) {
            this.stopTimer();
            const finalTime = this.formatTime(this.elapsedTime);
            
            try {
                // 地獄モードかどうかで表示を分ける
                if (this.gameMode === 'hell') {
                    // 地獄モードクリア専用表示
                    this.showMessage('🔥 地獄モードクリア！ 🔥', 'success');
                } else {
                    // 通常モード表示
                    this.showMessage('🎉 時間内クリア！ 🎉', 'success');
                }
                
                // 1秒後に詳細表示
                setTimeout(() => {
                    // 最終スコア計算
                    const finalScore = this.calculateFinalScore();
                    const breakdown = this.getScoreBreakdown();
                    
                    this.score = finalScore; // 最終スコアを設定
                    this.updateDisplay();
                    
                    // 詳細なスコア内訳を表示
                    const timeInSeconds = Math.floor(this.elapsedTime / 1000);
                    const remainingSeconds = Math.floor((this.timeLimit - this.elapsedTime) / 1000);
                    
                    // パフォーマンス評価
                    const totalScore = breakdown.total;
                    let rating = '';
                    let comment = '';
                    
                    if (this.gameMode === 'hell') {
                        // 地獄モード専用評価（10倍スコア対応）
                        if (totalScore >= 20000) {
                            rating = '👑 HELL MASTER 👑';
                            comment = '地獄を制覇！完璧すぎる！';
                        } else if (totalScore >= 15000) {
                            rating = '🔥 HELL CONQUEROR 🔥';
                            comment = '地獄モードを征服！';
                        } else if (totalScore >= 12000) {
                            rating = '⚡ HELL SURVIVOR ⚡';
                            comment = '地獄を生き抜いた！';
                        } else if (totalScore >= 10000) {
                            rating = '💀 HELL FIGHTER 💀';
                            comment = '地獄で戦い抜いた！';
                        } else if (totalScore >= 8000) {
                            rating = '🎯 HELL CHALLENGER 🎯';
                            comment = '地獄に挑戦し勝利！';
                        } else {
                            rating = '🔥 HELL CLEAR 🔥';
                            comment = '地獄モードクリア！';
                        }
                    } else {
                        // 通常モード評価（10倍スコア対応）
                        if (totalScore >= 20000) {
                            rating = '🌟 PERFECT MASTER 🌟';
                            comment = '完璧なプレイ！神業です！';
                        } else if (totalScore >= 15000) {
                            rating = '⭐ EXCELLENT ⭐';
                            comment = '素晴らしいプレイ！';
                        } else if (totalScore >= 12000) {
                            rating = '🔥 GREAT 🔥';
                            comment = 'とても良いプレイ！';
                        } else if (totalScore >= 10000) {
                            rating = '👍 GOOD 👍';
                            comment = '良いプレイ！';
                        } else if (totalScore >= 8000) {
                            rating = '📈 NICE 📈';
                            comment = 'なかなか良いプレイ！';
                        } else {
                            rating = '🎯 CLEAR 🎯';
                            comment = 'クリアおめでとう！';
                        }
                    }
                    
                    // 特別な評価コメント
                    const specialComments = [];
                    if (remainingSeconds >= 90) specialComments.push('⚡ 超高速クリア！');
                    if (this.missCount === 0) specialComments.push('🎯 ノーミス達成！');
                    if (this.combo >= 4) specialComments.push('🔥 全連続コンボ！');
                    if (this.gameMode === 'hell') specialComments.push('💀 地獄モード制覇！');
                    
                    const performanceRating = `${rating}\n${comment}${specialComments.length > 0 ? '\n' + specialComments.join(' ') : ''}`;
                    
                    const modeTitle = this.gameMode === 'hell' ? 
                        '🔥 地獄モード完全制覇！おめでとうございます！ 🔥' : 
                        '🎉 時間内クリア！おめでとうございます！ 🎉';
                    
                    const details = `${modeTitle}

📊 スコア内訳
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 最終スコア: ${breakdown.total}点

📋 詳細内訳:
├─ 🎯 マッチ点数: ${breakdown.base}点
├─ ⏱️ 時間ボーナス: ${breakdown.time}点
│   └─ 完了時間: ${finalTime} (残り${remainingSeconds}秒)
├─ 🎯 精度ボーナス: ${breakdown.accuracy}点
│   └─ ミス回数: ${this.missCount}回 (試行${this.attempts}回)
└─ 🔥 コンボボーナス: ${breakdown.combo}点
    └─ 最大連続: ${this.combo}回

📈 パフォーマンス評価:
${performanceRating}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                    
                    this.showMessage(details, 'success');
                }, 1000);
                
            } catch (error) {
                this.showMessage(`ゲームクリア！最終スコア: ${this.score}点 (${this.attempts}回、${finalTime}で完了)`, 'success');
            }
        }
    }
    
    // パフォーマンス評価
    getPerformanceRating(breakdown, timeInSeconds, missCount) {
        const totalScore = breakdown.total;
        let rating = '';
        let comment = '';
        
        if (totalScore >= 4000) {
            rating = '🌟 PERFECT MASTER 🌟';
            comment = '完璧なプレイ！神業です！';
        } else if (totalScore >= 3500) {
            rating = '⭐ EXCELLENT ⭐';
            comment = '素晴らしいプレイ！';
        } else if (totalScore >= 3000) {
            rating = '🔥 GREAT 🔥';
            comment = 'とても良いプレイ！';
        } else if (totalScore >= 2500) {
            rating = '👍 GOOD 👍';
            comment = '良いプレイ！';
        } else if (totalScore >= 2000) {
            rating = '📈 NICE 📈';
            comment = 'なかなか良いプレイ！';
        } else {
            rating = '🎯 CLEAR 🎯';
            comment = 'クリアおめでとう！';
        }
        
        // 特別な評価コメント
        const specialComments = [];
        if (timeInSeconds <= 30) specialComments.push('⚡ 超高速クリア！');
        if (missCount === 0) specialComments.push('🎯 ノーミス達成！');
        if (this.combo >= 4) specialComments.push('🔥 全連続コンボ！');
        
        return `${rating}\n${comment}${specialComments.length > 0 ? '\n' + specialComments.join(' ') : ''}`;
    }
    
    updateDisplay() {
        this.pairsCount.textContent = this.matchedPairs;
        this.scoreSpan.textContent = this.score;
        this.comboSpan.textContent = this.combo;
        this.nextPointsSpan.textContent = this.nextPoints;
        this.attemptsSpan.textContent = this.attempts;
        this.missCountSpan.textContent = this.missCount;
        
        // 残り時間を表示
        const remainingTime = Math.max(0, this.timeLimit - this.elapsedTime);
        this.elapsedTimeSpan.textContent = this.formatTime(remainingTime);
        
        if (this.gameMode === 'hell') {
            this.ballsCount.textContent = this.hellMode.ballStock;
        }
    }
    
    // 改良されたスコア計算システム
    calculateFinalScore() {
        // 実際に獲得したマッチスコアを基本点数として使用
        const baseScore = this.score; // 現在のスコア（マッチで獲得した点数）
        const timeBonus = this.calculateTimeBonus();
        const accuracyBonus = this.calculateAccuracyBonus();
        const comboBonus = this.calculateComboBonus();
        
        const totalScore = baseScore + timeBonus + accuracyBonus + comboBonus;
        return Math.max(0, totalScore);
    }
    
    // 時間ボーナス計算（残り時間が多いほど高得点）
    calculateTimeBonus() {
        const remainingTime = Math.max(0, this.timeLimit - this.elapsedTime);
        const remainingSeconds = remainingTime / 1000;
        const maxTimeBonus = 2000;
        
        // 残り時間に応じてボーナス計算（残り時間が多いほど高得点）
        const timeRatio = remainingSeconds / 120; // 120秒が最大
        const bonus = Math.floor(maxTimeBonus * timeRatio);
        
        return Math.max(0, bonus);
    }
    
    // 精度ボーナス計算（ミスが少ないほど高得点）
    calculateAccuracyBonus() {
        const maxAccuracyBonus = 1500;
        const penalty = this.missCount * 100; // 1ミスごとに100点減点
        
        return Math.max(0, maxAccuracyBonus - penalty);
    }
    
    // コンボボーナス計算（連続正解ほど高得点）
    calculateComboBonus() {
        if (this.combo <= 1) return 0;
        
        // 連続正解数に応じた指数的ボーナス
        return Math.floor(Math.pow(this.combo, 2) * 50);
    }
    
    // マッチ時のスコア計算
    calculateMatchScore() {
        const baseMatchScore = 1000; // 100から1000に変更（10倍）
        const comboMultiplier = Math.max(1, this.combo * 0.5);
        const timeMultiplier = this.getTimeMultiplier();
        
        const result = Math.floor(baseMatchScore * comboMultiplier * timeMultiplier);
        return result || 1000; // デフォルト値も1000に変更
    }
    
    // 時間による倍率計算
    getTimeMultiplier() {
        const timeInSeconds = (this.elapsedTime || 0) / 1000;
        if (timeInSeconds <= 10) return 2.0;      // 10秒以内: 2倍
        if (timeInSeconds <= 30) return 1.5;      // 30秒以内: 1.5倍
        if (timeInSeconds <= 60) return 1.2;      // 60秒以内: 1.2倍
        return 1.0;                               // それ以上: 等倍
    }
    
    // スコア詳細を取得
    getScoreBreakdown() {
        const baseScore = this.score; // 実際に獲得したマッチスコア
        const timeBonus = this.calculateTimeBonus();
        const accuracyBonus = this.calculateAccuracyBonus();
        const comboBonus = this.calculateComboBonus();
        
        return {
            base: baseScore,
            time: timeBonus,
            accuracy: accuracyBonus,
            combo: comboBonus,
            total: baseScore + timeBonus + accuracyBonus + comboBonus
        };
    }
    
    // ミス処理
    handleMiss() {
        // ミス回数をカウント
        this.missCount++;
        
        // コンボリセット
        this.combo = 0;
        this.nextPoints = 1;
        
        // ミスペナルティ（スコアから減点）
        const penalty = 50;
        this.score = Math.max(0, this.score - penalty);
    }
    
    showMessage(text, type = '') {
        // 複数の方法でメッセージを表示
        const messageElement = document.getElementById('message');
        
        if (messageElement) {
            // 内容をクリア
            messageElement.innerHTML = '';
            messageElement.textContent = '';
            
            // 新しい内容を設定
            messageElement.textContent = text;
            messageElement.className = `message ${type}`;
            
            // スタイルを強制的に適用
            messageElement.style.display = 'block';
            messageElement.style.visibility = 'visible';
            messageElement.style.opacity = '1';
            
        } else {
            // フォールバック: アラートで表示
            alert(text);
        }
        
        // this.messageも更新
        if (this.message) {
            this.message.textContent = text;
            this.message.className = `message ${type}`;
        }
        
        // 成功メッセージ（スコア内訳など）は消さない
        if (text && type === 'info' && !text.includes('スコア内訳') && !text.includes('最終結果')) {
            setTimeout(() => {
                if (messageElement) {
                    messageElement.textContent = '';
                    messageElement.className = 'message';
                }
                if (this.message) {
                    this.message.textContent = '';
                    this.message.className = 'message';
                }
            }, 2000);
        }
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            
            // 時間切れチェック
            if (this.elapsedTime >= this.timeLimit) {
                this.handleTimeUp();
                return;
            }
            
            this.updateDisplay();
        }, 100); // 100ms間隔で更新
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    // 時間切れ処理
    handleTimeUp() {
        this.stopTimer();
        
        // 地獄モードのアニメーションも停止
        if (this.gameMode === 'hell' && this.hellMode.animationId) {
            cancelAnimationFrame(this.hellMode.animationId);
            this.hellMode.animationId = null;
        }
        
        // 最終スコア計算
        const finalScore = this.calculateFinalScore();
        const breakdown = this.getScoreBreakdown();
        this.score = finalScore;
        this.updateDisplay();
        
        // 時間切れメッセージ表示
        setTimeout(() => {
            const timeInSeconds = Math.floor(this.elapsedTime / 1000);
            
            // パフォーマンス評価（時間切れ用）
            let rating = '';
            let comment = '';
            
            if (this.matchedPairs >= 3) {
                rating = '⏰ TIME UP - GREAT EFFORT ⏰';
                comment = 'あと少しでした！時間が足りませんでした！';
            } else if (this.matchedPairs >= 2) {
                rating = '⏰ TIME UP - GOOD PROGRESS ⏰';
                comment = '良いペースでした！もう少し時間があれば！';
            } else if (this.matchedPairs >= 1) {
                rating = '⏰ TIME UP - KEEP TRYING ⏰';
                comment = '時間切れ！次回はもっと素早く！';
            } else {
                rating = '⏰ TIME UP - CHALLENGE AGAIN ⏰';
                comment = '時間切れ！もう一度挑戦してみましょう！';
            }
            
            // 特別な評価コメント
            const specialComments = [];
            if (this.missCount <= 2) specialComments.push('🎯 高精度プレイ！');
            if (this.combo >= 2) specialComments.push('🔥 コンボ達成！');
            if (this.gameMode === 'hell') specialComments.push('💀 地獄モード挑戦！');
            
            const performanceRating = `${rating}\n${comment}${specialComments.length > 0 ? '\n' + specialComments.join(' ') : ''}`;
            
            const modeTitle = this.gameMode === 'hell' ? 
                '💀 地獄モード - 時間切れ 💀' : 
                '⏰ 時間切れ - ゲーム終了 ⏰';
            
            const details = `${modeTitle}

📊 最終結果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 最終スコア: ${breakdown.total}点
📋 達成度: ${this.matchedPairs}/4ペア完了
⏰ 制限時間: 2分00秒で終了

📋 詳細スコア内訳:
├─ 🎯 マッチ点数: ${breakdown.base}点
├─ ⏱️ 時間ボーナス: ${breakdown.time}点
│   └─ プレイ時間: 02:00 (120秒)
├─ 🎯 精度ボーナス: ${breakdown.accuracy}点
│   └─ ミス回数: ${this.missCount}回 (試行${this.attempts}回)
└─ 🔥 コンボボーナス: ${breakdown.combo}点
    └─ 最大連続: ${this.combo}回

📈 パフォーマンス評価:
${performanceRating}

💡 次回のコツ:
• より素早い判断を心がける
• パターンを覚えて効率的にプレイ
• コンボを狙って高得点を目指す
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            
            this.showMessage(details, 'info');
        }, 500);
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
            const baseX = startX + col * (cardWidth + spacingX);
            const baseY = startY + row * (cardHeight + spacingY);
            
            // ランダムな回転方向と速度
            const direction = Math.random() > 0.5 ? 1 : -1; // 1=右回り, -1=左回り
            const baseSpeed = 0.015 + Math.random() * 0.01; // 0.015〜0.025の範囲
            
            this.hellMode.cards.push({
                x: baseX,
                y: baseY,
                baseX: baseX, // 回転の中心X座標
                baseY: baseY, // 回転の中心Y座標
                width: cardWidth,
                height: cardHeight,
                value: this.cards[i],
                flipped: false,
                matched: false,
                angle: Math.random() * Math.PI * 2, // 初期角度もランダム
                rotationRadius: 15, // 回転半径
                rotationSpeed: baseSpeed * direction // ランダムな方向と速度
            });
        }
        
        // ボール発射待機状態に設定
        this.hellMode.waitingForLaunch = true;
        
        this.hellGameLoop();
    }
    
    hellGameLoop() {
        this.updateHellGame();
        this.drawHellGame();
        this.hellMode.animationId = requestAnimationFrame(() => this.hellGameLoop());
    }
    
    launchNewBall() {
        if (this.hellMode.ballStock > 0 && this.hellMode.waitingForLaunch) {
            const canvas = this.hellMode.canvas;
            this.hellMode.ball = {
                x: this.hellMode.paddle.x + this.hellMode.paddle.width / 2,  // パドルの中心X座標
                y: this.hellMode.paddle.y - 10, // パドルの少し上から発射
                dx: (Math.random() - 0.5) * 4,
                dy: -4,
                radius: 8
            };
            this.hellMode.ballStock--;
            this.hellMode.waitingForLaunch = false; // 発射待機状態を解除
            this.updateDisplay();
        }
    }
    
    updateHellGame() {
        const canvas = this.hellMode.canvas;
        const ball = this.hellMode.ball;
        
        // ブロックの回転更新（右回り）
        this.hellMode.cards.forEach(card => {
            if (!card.matched) { // マッチしていないブロックのみ回転
                card.angle += card.rotationSpeed;
                // 円運動の計算
                card.x = card.baseX + Math.cos(card.angle) * card.rotationRadius;
                card.y = card.baseY + Math.sin(card.angle) * card.rotationRadius;
            }
        });
        
        if (!ball) return;
        
        // ボールの速度制限（異常な高速移動を防ぐ）
        const maxSpeed = 8;
        if (Math.abs(ball.dx) > maxSpeed) {
            ball.dx = ball.dx > 0 ? maxSpeed : -maxSpeed;
        }
        if (Math.abs(ball.dy) > maxSpeed) {
            ball.dy = ball.dy > 0 ? maxSpeed : -maxSpeed;
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // 壁との衝突
        if (ball.x <= ball.radius || ball.x >= canvas.width - ball.radius) {
            ball.dx = -ball.dx;
            // ボールを壁の内側に押し戻す
            if (ball.x <= ball.radius) {
                ball.x = ball.radius;
            } else {
                ball.x = canvas.width - ball.radius;
            }
        }
        if (ball.y <= ball.radius) {
            ball.dy = -ball.dy;
            ball.y = ball.radius;
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
        
        // カードとの衝突 - 改良版（確実な反射処理）
        this.hellMode.cards.forEach(card => {
            if (!card.matched &&
                ball.x + ball.radius >= card.x && ball.x - ball.radius <= card.x + card.width &&
                ball.y + ball.radius >= card.y && ball.y - ball.radius <= card.y + card.height) {
                
                // ボールがカードのどの面に当たったかを判定
                const ballCenterX = ball.x;
                const ballCenterY = ball.y;
                const cardCenterX = card.x + card.width / 2;
                const cardCenterY = card.y + card.height / 2;
                
                // カードの各辺からの距離を計算
                const distanceFromLeft = Math.abs(ballCenterX - card.x);
                const distanceFromRight = Math.abs(ballCenterX - (card.x + card.width));
                const distanceFromTop = Math.abs(ballCenterY - card.y);
                const distanceFromBottom = Math.abs(ballCenterY - (card.y + card.height));
                
                // 最も近い辺を特定
                const minDistance = Math.min(distanceFromLeft, distanceFromRight, distanceFromTop, distanceFromBottom);
                
                if (minDistance === distanceFromLeft || minDistance === distanceFromRight) {
                    // 左右の辺に当たった場合
                    ball.dx = -ball.dx;
                    // ボールをカードの外に押し出す
                    if (ballCenterX < cardCenterX) {
                        ball.x = card.x - ball.radius - 1;
                    } else {
                        ball.x = card.x + card.width + ball.radius + 1;
                    }
                } else {
                    // 上下の辺に当たった場合
                    ball.dy = -ball.dy;
                    // ボールをカードの外に押し出す
                    if (ballCenterY < cardCenterY) {
                        ball.y = card.y - ball.radius - 1;
                    } else {
                        ball.y = card.y + card.height + ball.radius + 1;
                    }
                }
                
                // カードをめくる処理
                if (!card.flipped) {
                    card.flipped = true;
                    this.handleHellCardFlip(card);
                }
            }
        });
        
        // ボールが画面下に落ちた場合
        if (ball.y > canvas.height) {
            this.hellMode.ball = null;
            // 次のボール発射待機状態に設定
            setTimeout(() => {
                if (this.hellMode.ballStock > 0) {
                    this.hellMode.waitingForLaunch = true;
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
                    
                    // 改良されたスコア計算
                    this.combo++;
                    const matchScore = this.calculateMatchScore();
                    this.score += matchScore;
                    
                    this.updateDisplay();
                    this.checkGameComplete();
                    
                    if (this.combo > 1) {
                        this.showMessage(`${this.combo}連続！ +${matchScore}点`, 'success');
                    }
                }, 500);
            } else {
                // マッチしなかった場合
                setTimeout(() => {
                    card1.flipped = false;
                    card2.flipped = false;
                    this.handleMiss();
                    this.updateDisplay();
                    this.showMessage('もう一度挑戦！', 'info');
                }, 1000);
            }
        }
    }
    
    checkHellGameOver() {
        if (this.matchedPairs < 4) {
            this.stopTimer();
            const finalTime = this.formatTime(this.elapsedTime);
            
            // 最終スコア計算
            const finalScore = this.calculateFinalScore();
            const breakdown = this.getScoreBreakdown();
            
            // 最終スコアを設定
            this.score = finalScore;
            this.updateDisplay();
            
            // アニメーション停止
            if (this.hellMode.animationId) {
                cancelAnimationFrame(this.hellMode.animationId);
                this.hellMode.animationId = null;
            }
            
            // 少し遅延してからメッセージ表示（アニメーション停止後）
            setTimeout(() => {
                const timeInSeconds = Math.floor(this.elapsedTime / 1000);
                
                // パフォーマンス評価（部分クリア用）
                let rating = '';
                let comment = '';
                
                if (this.matchedPairs >= 3) {
                    rating = '🔥 GREAT EFFORT 🔥';
                    comment = 'あと少しでした！素晴らしい健闘！';
                } else if (this.matchedPairs >= 2) {
                    rating = '👍 GOOD FIGHT 👍';
                    comment = '良い戦いでした！';
                } else if (this.matchedPairs >= 1) {
                    rating = '💪 KEEP TRYING 💪';
                    comment = '諦めずに頑張りました！';
                } else {
                    rating = '🎯 CHALLENGE ACCEPTED 🎯';
                    comment = '地獄モードに挑戦！';
                }
                
                // 特別な評価コメント
                const specialComments = [];
                if (timeInSeconds >= 120) specialComments.push('⏰ 長時間プレイ！');
                if (this.missCount <= 3) specialComments.push('🎯 高精度プレイ！');
                if (this.combo >= 2) specialComments.push('🔥 コンボ達成！');
                
                const performanceRating = `${rating}\n${comment}${specialComments.length > 0 ? '\n' + specialComments.join(' ') : ''}`;
                
                const details = `💀 地獄モード - ゲームオーバー 💀

📊 最終結果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 最終スコア: ${breakdown.total}点
📋 達成度: ${this.matchedPairs}/4ペア完了

📋 詳細スコア内訳:
├─ 🎯 マッチ点数: ${breakdown.base}点
├─ ⏱️ 時間ボーナス: ${breakdown.time}点
│   └─ プレイ時間: ${finalTime} (${timeInSeconds}秒)
├─ 🎯 精度ボーナス: ${breakdown.accuracy}点
│   └─ ミス回数: ${this.missCount}回 (試行${this.attempts}回)
└─ 🔥 コンボボーナス: ${breakdown.combo}点
    └─ 最大連続: ${this.combo}回

📈 パフォーマンス評価:
${performanceRating}

💡 地獄モードのコツ:
• ボールの軌道を予測してカードを守る
• 連続正解でコンボボーナスを狙う
• 時間をかけすぎず、素早く判断する
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                
                // 確実にメッセージを表示
                const messageElement = document.getElementById('message');
                if (messageElement) {
                    // 既存のメッセージをクリア
                    messageElement.innerHTML = '';
                    messageElement.textContent = '';
                    
                    // 新しいメッセージを設定
                    messageElement.textContent = details;
                    messageElement.className = 'message info';
                    
                    // スタイルを強制的に適用
                    messageElement.style.display = 'block';
                    messageElement.style.visibility = 'visible';
                    messageElement.style.opacity = '1';
                    messageElement.style.position = 'relative';
                    messageElement.style.zIndex = '9999';
                    
                } else {
                    // フォールバック: アラート表示
                    alert(details);
                }
                
                // showMessage関数も呼ぶ
                this.showMessage(details, 'info');
                
            }, 500); // 0.5秒後に表示
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
        
        // 発射待機状態の表示
        if (this.hellMode.waitingForLaunch && this.hellMode.ballStock > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('クリックでボール発射！', canvas.width / 2, canvas.height - 100);
        }
    }
    
    resetGame() {
        if (this.currentDifficulty) {
            this.cards = [...this.difficulties[this.currentDifficulty].cards];
            this.resetGameState();
            this.shuffleCards();
            
            // ゲームモードに応じて適切な初期化を実行
            if (this.gameMode === 'hell') {
                this.initHellMode();
            } else {
                this.createBoard();
            }
            
            this.updateDisplay();
            this.startTimer();
        }
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
});
