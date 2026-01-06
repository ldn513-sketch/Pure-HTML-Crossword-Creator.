/**
 * GridModel - Data model for the crossword grid
 * Provides the underlying data structure and logic
 */

const GridModel = (function() {
    'use strict';

    /**
     * Create a new GridModel
     * @param {number} width - Grid width
     * @param {number} height - Grid height
     */
    function GridModel(width, height) {
        this.width = width;
        this.height = height;
        this.cells = [];
        this.metadata = {
            title: '',
            author: '',
            copyright: '',
            publisher: '',
            date: '',
            notes: ''
        };
        this.clues = {
            across: [],
            down: []
        };

        // Event listeners
        this._listeners = {
            change: [],
            cellChange: [],
            clueChange: [],
            metadataChange: []
        };

        // Initialize empty grid
        this._initGrid();
    }

    /**
     * Initialize empty grid
     */
    GridModel.prototype._initGrid = function() {
        this.cells = [];
        for (let row = 0; row < this.height; row++) {
            this.cells[row] = [];
            for (let col = 0; col < this.width; col++) {
                this.cells[row][col] = {
                    type: 'cell',      // 'cell' or 'block'
                    number: null,       // Clue number
                    value: '',          // Current letter
                    solution: '',       // Solution letter
                    style: null         // Optional styling
                };
            }
        }
    };

    /**
     * Add event listener
     */
    GridModel.prototype.on = function(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    };

    /**
     * Remove event listener
     */
    GridModel.prototype.off = function(event, callback) {
        if (this._listeners[event]) {
            const idx = this._listeners[event].indexOf(callback);
            if (idx > -1) {
                this._listeners[event].splice(idx, 1);
            }
        }
    };

    /**
     * Emit event
     */
    GridModel.prototype._emit = function(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(data));
        }
    };

    /**
     * Check if coordinates are valid
     */
    GridModel.prototype.isValidCell = function(row, col) {
        return row >= 0 && row < this.height && col >= 0 && col < this.width;
    };

    /**
     * Get cell at position
     */
    GridModel.prototype.getCell = function(row, col) {
        if (!this.isValidCell(row, col)) {
            return null;
        }
        return this.cells[row][col];
    };

    /**
     * Set cell type (cell or block)
     */
    GridModel.prototype.setCellType = function(row, col, type) {
        if (!this.isValidCell(row, col)) return false;

        const cell = this.cells[row][col];
        const oldType = cell.type;

        cell.type = type;

        if (type === 'block') {
            cell.value = '';
            cell.solution = '';
            cell.number = null;
        }

        this._emit('cellChange', { row, col, cell, oldType });
        this._emit('change', { type: 'cellType', row, col });

        return true;
    };

    /**
     * Toggle cell between block and cell
     */
    GridModel.prototype.toggleBlock = function(row, col) {
        const cell = this.getCell(row, col);
        if (!cell) return false;

        const newType = cell.type === 'block' ? 'cell' : 'block';
        return this.setCellType(row, col, newType);
    };

    /**
     * Set cell value (letter)
     */
    GridModel.prototype.setCellValue = function(row, col, value) {
        if (!this.isValidCell(row, col)) return false;

        const cell = this.cells[row][col];
        if (cell.type === 'block') return false;

        const oldValue = cell.value;
        cell.value = value.toUpperCase();

        this._emit('cellChange', { row, col, cell, oldValue });
        this._emit('change', { type: 'cellValue', row, col });

        return true;
    };

    /**
     * Set cell solution
     */
    GridModel.prototype.setCellSolution = function(row, col, solution) {
        if (!this.isValidCell(row, col)) return false;

        const cell = this.cells[row][col];
        if (cell.type === 'block') return false;

        cell.solution = solution.toUpperCase();

        this._emit('cellChange', { row, col, cell });
        this._emit('change', { type: 'cellSolution', row, col });

        return true;
    };

    /**
     * Set cell number
     */
    GridModel.prototype.setCellNumber = function(row, col, number) {
        if (!this.isValidCell(row, col)) return false;

        const cell = this.cells[row][col];
        if (cell.type === 'block') return false;

        cell.number = number;

        this._emit('cellChange', { row, col, cell });
        this._emit('change', { type: 'cellNumber', row, col });

        return true;
    };

    /**
     * Auto-number the grid based on block positions
     */
    GridModel.prototype.autoNumber = function() {
        let num = 1;
        const acrossStarts = [];
        const downStarts = [];

        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells[row][col];

                if (cell.type === 'block') {
                    cell.number = null;
                    continue;
                }

                const needsNumber = this._isWordStart(row, col);

                if (needsNumber.across || needsNumber.down) {
                    cell.number = num;

                    if (needsNumber.across) {
                        acrossStarts.push({ number: num, row, col });
                    }
                    if (needsNumber.down) {
                        downStarts.push({ number: num, row, col });
                    }

                    num++;
                } else {
                    cell.number = null;
                }
            }
        }

        this._emit('change', { type: 'autoNumber' });

        return { acrossStarts, downStarts };
    };

    /**
     * Check if a cell is the start of a word
     */
    GridModel.prototype._isWordStart = function(row, col) {
        const cell = this.cells[row][col];
        if (cell.type === 'block') {
            return { across: false, down: false };
        }

        // Check if start of across word
        const leftIsBlocked = col === 0 || this.cells[row][col - 1].type === 'block';
        const rightExists = col < this.width - 1 && this.cells[row][col + 1].type !== 'block';
        const isAcrossStart = leftIsBlocked && rightExists;

        // Check if start of down word
        const topIsBlocked = row === 0 || this.cells[row - 1][col].type === 'block';
        const bottomExists = row < this.height - 1 && this.cells[row + 1][col].type !== 'block';
        const isDownStart = topIsBlocked && bottomExists;

        return { across: isAcrossStart, down: isDownStart };
    };

    /**
     * Get word at position in given direction
     */
    GridModel.prototype.getWord = function(row, col, direction) {
        const cell = this.getCell(row, col);
        if (!cell || cell.type === 'block') return null;

        const word = {
            cells: [],
            start: { row, col },
            direction: direction,
            value: '',
            solution: ''
        };

        if (direction === 'across') {
            // Find start of word
            let startCol = col;
            while (startCol > 0 && this.cells[row][startCol - 1].type !== 'block') {
                startCol--;
            }
            word.start.col = startCol;

            // Collect word cells
            for (let c = startCol; c < this.width && this.cells[row][c].type !== 'block'; c++) {
                const wordCell = this.cells[row][c];
                word.cells.push({ row, col: c, cell: wordCell });
                word.value += wordCell.value || ' ';
                word.solution += wordCell.solution || ' ';
            }
        } else {
            // Find start of word
            let startRow = row;
            while (startRow > 0 && this.cells[startRow - 1][col].type !== 'block') {
                startRow--;
            }
            word.start.row = startRow;

            // Collect word cells
            for (let r = startRow; r < this.height && this.cells[r][col].type !== 'block'; r++) {
                const wordCell = this.cells[r][col];
                word.cells.push({ row: r, col, cell: wordCell });
                word.value += wordCell.value || ' ';
                word.solution += wordCell.solution || ' ';
            }
        }

        // Get clue number
        const startCell = this.cells[word.start.row][word.start.col];
        word.number = startCell.number;

        return word;
    };

    /**
     * Set word value at position
     */
    GridModel.prototype.setWord = function(row, col, direction, value) {
        const word = this.getWord(row, col, direction);
        if (!word) return false;

        const chars = value.toUpperCase().split('');

        for (let i = 0; i < word.cells.length; i++) {
            const { row: r, col: c } = word.cells[i];
            this.cells[r][c].value = chars[i] || '';
        }

        this._emit('change', { type: 'wordValue', row, col, direction });

        return true;
    };

    /**
     * Set word solution at position
     */
    GridModel.prototype.setWordSolution = function(row, col, direction, solution) {
        const word = this.getWord(row, col, direction);
        if (!word) return false;

        const chars = solution.toUpperCase().split('');

        for (let i = 0; i < word.cells.length; i++) {
            const { row: r, col: c } = word.cells[i];
            this.cells[r][c].solution = chars[i] || '';
        }

        this._emit('change', { type: 'wordSolution', row, col, direction });

        return true;
    };

    /**
     * Clear all cell values
     */
    GridModel.prototype.clearValues = function() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells[row][col].type !== 'block') {
                    this.cells[row][col].value = '';
                }
            }
        }
        this._emit('change', { type: 'clearValues' });
    };

    /**
     * Clear all solutions
     */
    GridModel.prototype.clearSolutions = function() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                if (this.cells[row][col].type !== 'block') {
                    this.cells[row][col].solution = '';
                }
            }
        }
        this._emit('change', { type: 'clearSolutions' });
    };

    /**
     * Reveal solution (copy solution to values)
     */
    GridModel.prototype.revealSolution = function() {
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const cell = this.cells[row][col];
                if (cell.type !== 'block' && cell.solution) {
                    cell.value = cell.solution;
                }
            }
        }
        this._emit('change', { type: 'revealSolution' });
    };

    /**
     * Resize grid
     */
    GridModel.prototype.resize = function(newWidth, newHeight) {
        const oldCells = this.cells;
        const oldWidth = this.width;
        const oldHeight = this.height;

        this.width = newWidth;
        this.height = newHeight;
        this._initGrid();

        // Copy existing cells
        for (let row = 0; row < Math.min(oldHeight, newHeight); row++) {
            for (let col = 0; col < Math.min(oldWidth, newWidth); col++) {
                this.cells[row][col] = oldCells[row][col];
            }
        }

        this._emit('change', { type: 'resize', oldWidth, oldHeight, newWidth, newHeight });
    };

    /**
     * Set metadata
     */
    GridModel.prototype.setMetadata = function(key, value) {
        if (key in this.metadata) {
            this.metadata[key] = value;
            this._emit('metadataChange', { key, value });
            this._emit('change', { type: 'metadata', key });
        }
    };

    /**
     * Set clue
     */
    GridModel.prototype.setClue = function(direction, number, clueText) {
        const clueList = this.clues[direction];
        if (!clueList) return false;

        const existing = clueList.find(c => c.number === number);
        if (existing) {
            existing.clue = clueText;
        } else {
            clueList.push({ number, clue: clueText });
            clueList.sort((a, b) => a.number - b.number);
        }

        this._emit('clueChange', { direction, number, clue: clueText });
        this._emit('change', { type: 'clue', direction, number });

        return true;
    };

    /**
     * Get clue
     */
    GridModel.prototype.getClue = function(direction, number) {
        const clueList = this.clues[direction];
        if (!clueList) return null;

        return clueList.find(c => c.number === number) || null;
    };

    /**
     * Load from IPUZ data
     */
    GridModel.prototype.loadFromIpuz = function(ipuzData) {
        this.width = ipuzData.dimensions.width;
        this.height = ipuzData.dimensions.height;
        this._initGrid();

        // Load puzzle structure
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const puzzleCell = ipuzData.puzzle[row][col];
                const cell = this.cells[row][col];

                cell.type = puzzleCell.type;
                cell.number = puzzleCell.number;

                if (ipuzData.solution && ipuzData.solution[row]) {
                    cell.solution = ipuzData.solution[row][col] || '';
                }
            }
        }

        // Load metadata
        this.metadata.title = ipuzData.title || '';
        this.metadata.author = ipuzData.author || '';
        this.metadata.copyright = ipuzData.copyright || '';
        this.metadata.publisher = ipuzData.publisher || '';
        this.metadata.date = ipuzData.date || '';
        this.metadata.notes = ipuzData.notes || '';

        // Load clues
        this.clues = {
            across: ipuzData.clues.across || [],
            down: ipuzData.clues.down || []
        };

        this._emit('change', { type: 'load' });
    };

    /**
     * Export to IPUZ format data
     */
    GridModel.prototype.toIpuzData = function() {
        const puzzle = [];
        const solution = [];

        for (let row = 0; row < this.height; row++) {
            puzzle[row] = [];
            solution[row] = [];

            for (let col = 0; col < this.width; col++) {
                const cell = this.cells[row][col];
                puzzle[row][col] = {
                    type: cell.type,
                    number: cell.number
                };
                solution[row][col] = cell.solution || '';
            }
        }

        return {
            title: this.metadata.title,
            author: this.metadata.author,
            copyright: this.metadata.copyright,
            publisher: this.metadata.publisher,
            date: this.metadata.date,
            notes: this.metadata.notes,
            dimensions: {
                width: this.width,
                height: this.height
            },
            puzzle: puzzle,
            solution: solution,
            clues: this.clues
        };
    };

    return GridModel;
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridModel;
}
