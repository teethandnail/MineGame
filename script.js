class Minesweeper {
    constructor(difficulty = 'easy') {
        this.setDifficulty(difficulty);
        // 初始化音效
        this.initSounds();
        this.init();
    }

    initSounds() {
        // 创建音效对象
        this.clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
        this.flagSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1115/1115-preview.mp3');
        this.winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        // this.loseSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3');
        this.gameOverSound = document.getElementById('gameOverSound');

        // 预加载音效
        this.clickSound.load();
        this.flagSound.load();
        this.winSound.load();
        // this.loseSound.load();

        // 设置音量（可选）
        this.clickSound.volume = 0.2;  // 降低点击音效的音量
        this.flagSound.volume = 0.15;   // 降低标记音效的音量更多一点
    }

    // 播放音效的辅助方法
    playSound(soundType) {
        try {
            switch (soundType) {
                case 'click':
                    this.clickSound.currentTime = 0;
                    this.clickSound.play();
                    break;
                case 'flag':
                    this.flagSound.currentTime = 0;
                    this.flagSound.play();
                    break;
                case 'win':
                    this.winSound.currentTime = 0;
                    this.winSound.play();
                    break;
                case 'lose':
                    this.gameOverSound.currentTime = 0;
                    this.gameOverSound.play();
                    break;
            }
        } catch (e) {
            console.log('音效播放失败:', e);
        }
    }

    setDifficulty(difficulty) {
        switch (difficulty) {
            case 'easy':
                this.rows = 9;
                this.cols = 9;
                this.mines = 10;
                break;
            case 'medium':
                this.rows = 16;
                this.cols = 16;
                this.mines = 40;
                break;
            case 'hard':
                this.rows = 16;
                this.cols = 30;
                this.mines = 99;
                break;
            default:
                this.rows = 9;
                this.cols = 9;
                this.mines = 10;
        }
        
        // 更新CSS变量以调整棋盘大小
        document.documentElement.style.setProperty('--rows', this.rows);
        document.documentElement.style.setProperty('--cols', this.cols);
        
        this.board = [];
        this.gameOver = false;
        this.timeStarted = false;
        this.timer = 0;
        this.timerInterval = null;
        this.remainingMines = this.mines;
        this.firstClick = true;
    }

    init() {
        // 初始化游戏板
        this.board = Array(this.rows).fill().map(() =>
            Array(this.cols).fill().map(() => ({
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            }))
        );
        
        this.firstClick = true;
        this.renderBoard();
        this.updateMinesCount();
        this.resetTimer();
    }

    placeMines(firstRow, firstCol) {
        // 随机放置地雷，避开第一次点击的位置及其周围
        let minesPlaced = 0;
        while (minesPlaced < this.mines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            // 检查是否在第一次点击的安全区域内
            if (Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1) {
                continue;
            }
            
            if (!this.board[row][col].isMine) {
                this.board[row][col].isMine = true;
                minesPlaced++;
            }
        }

        // 计算每个格子周围的地雷数
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.board[row][col].isMine) {
                    this.board[row][col].neighborMines = this.countNeighborMines(row, col);
                }
            }
        }
    }

    countNeighborMines(row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = row + i;
                const newCol = col + j;
                if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
                    if (this.board[newRow][newCol].isMine) count++;
                }
            }
        }
        return count;
    }

    renderBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (this.board[row][col].isRevealed) {
                    cell.classList.add('revealed');
                    if (this.board[row][col].isMine) {
                        cell.classList.add('mine');
                        cell.textContent = '💣';
                    } else if (this.board[row][col].neighborMines > 0) {
                        cell.textContent = this.board[row][col].neighborMines;
                        cell.dataset.number = this.board[row][col].neighborMines;
                    }
                } else if (this.board[row][col].isFlagged) {
                    cell.classList.add('flagged');
                    cell.textContent = '🚩';
                }

                cell.addEventListener('click', (e) => this.handleClick(row, col));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleRightClick(row, col);
                });
                cell.addEventListener('dblclick', (e) => this.handleDoubleClick(row, col));

                gameBoard.appendChild(cell);
            }
        }
    }

    handleClick(row, col) {
        if (this.gameOver || this.board[row][col].isFlagged) return;

        if (this.firstClick) {
            this.firstClick = false;
            this.placeMines(row, col);
            this.startTimer();
        }

        if (this.board[row][col].isMine) {
            this.gameOver = true;
            this.revealAll();
            this.stopTimer();
            this.playSound('lose');
            setTimeout(() => {
                alert('游戏结束！');
            }, 100);
            return;
        }

        this.playSound('click');
        this.reveal(row, col);
        this.renderBoard();

        if (this.checkWin()) {
            this.gameOver = true;
            this.stopTimer();
            this.playSound('win');
            setTimeout(() => {
                alert('恭喜你赢了！');
            }, 100);
        }
    }

    handleRightClick(row, col) {
        if (this.gameOver || this.board[row][col].isRevealed) return;

        this.board[row][col].isFlagged = !this.board[row][col].isFlagged;
        this.remainingMines += this.board[row][col].isFlagged ? -1 : 1;
        this.playSound('flag');
        this.updateMinesCount();
        this.renderBoard();
    }

    reveal(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols ||
            this.board[row][col].isRevealed || this.board[row][col].isFlagged) {
            return;
        }

        this.board[row][col].isRevealed = true;

        if (this.board[row][col].neighborMines === 0) {
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    this.reveal(row + i, col + j);
                }
            }
        }
    }

    revealAll() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.board[row][col].isRevealed = true;
            }
        }
        this.renderBoard();
    }

    checkWin() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.board[row][col].isMine && !this.board[row][col].isRevealed) {
                    return false;
                }
            }
        }
        return true;
    }

    updateMinesCount() {
        document.getElementById('mines-count').textContent = this.remainingMines;
    }

    startTimer() {
        this.timeStarted = true;
        this.timerInterval = setInterval(() => {
            this.timer++;
            document.getElementById('timer').textContent = this.timer;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    resetTimer() {
        this.stopTimer();
        this.timer = 0;
        this.timeStarted = false;
        document.getElementById('timer').textContent = '0';
    }

    handleDoubleClick(row, col) {
        if (!this.board[row][col].isRevealed || this.gameOver) return;
        
        if (this.board[row][col].neighborMines === 0) return;
        
        let flaggedCount = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const newRow = row + i;
                const newCol = col + j;
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols) {
                    if (this.board[newRow][newCol].isFlagged) {
                        flaggedCount++;
                    }
                }
            }
        }
        
        if (flaggedCount === this.board[row][col].neighborMines) {
            let hitMine = false;
            let revealed = false;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const newRow = row + i;
                    const newCol = col + j;
                    if (newRow >= 0 && newRow < this.rows && 
                        newCol >= 0 && newCol < this.cols) {
                        if (!this.board[newRow][newCol].isFlagged && 
                            !this.board[newRow][newCol].isRevealed) {
                            if (this.board[newRow][newCol].isMine) {
                                hitMine = true;
                                this.board[newRow][newCol].isRevealed = true;
                            } else {
                                this.reveal(newRow, newCol);
                                revealed = true;
                            }
                        }
                    }
                }
            }
            
            if (revealed) {
                this.playSound('click');
            }
            
            this.renderBoard();
            
            if (hitMine) {
                this.gameOver = true;
                this.revealAll();
                this.stopTimer();
                this.playSound('lose');
                setTimeout(() => {
                    alert('游戏结束！');
                }, 100);
            } else if (this.checkWin()) {
                this.gameOver = true;
                this.stopTimer();
                this.playSound('win');
                setTimeout(() => {
                    alert('恭喜你赢了！');
                }, 100);
            }
        }
    }
}

// 初始化游戏
let game = new Minesweeper('easy');

// 难度按钮事件监听
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 更新按钮状态
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // 开始新游戏
        game = new Minesweeper(e.target.dataset.difficulty);
    });
});

// 新游戏按钮事件监听
document.getElementById('new-game-btn').addEventListener('click', () => {
    const currentDifficulty = document.querySelector('.difficulty-btn.active').dataset.difficulty;
    game = new Minesweeper(currentDifficulty);
}); 