/**
 * GridView - Visual component for the crossword grid
 * Renders the grid using CSS Grid and handles user interactions
 */

const GridView = (function() {
    'use strict';

    /**
     * Create a new GridView
     * @param {HTMLElement} container - Container element for the grid
     * @param {GridModel} model - The data model
     * @param {CommandAPI} commandAPI - Command API for modifications
     */
    function GridView(container, model, commandAPI) {
        this.container = container;
        this.model = model;
        this.commandAPI = commandAPI;

        // State
        this.selectedCell = null;
        this.direction = 'across'; // 'across' or 'down'
        this.editMode = 'solution'; // 'solution' or 'value'
        this.showSolution = false;

        // DOM elements cache
        this.gridElement = null;
        this.cells = [];

        // Event listeners
        this._listeners = {
            cellSelect: [],
            directionChange: [],
            wordSelect: []
        };

        // Initialize
        this._init();
    }

    /**
     * Add event listener
     */
    GridView.prototype.on = function(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    };

    /**
     * Emit event
     */
    GridView.prototype._emit = function(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(data));
        }
    };

    /**
     * Initialize the view
     */
    GridView.prototype._init = function() {
        // Create grid element
        this.gridElement = document.createElement('div');
        this.gridElement.className = 'crossword-grid';
        this.container.appendChild(this.gridElement);

        // Render initial state
        this.render();

        // Listen to model changes
        this.model.on('change', () => this.render());

        // Setup keyboard handler
        this._setupKeyboard();
    };

    /**
     * Render the grid
     */
    GridView.prototype.render = function() {
        // Clear existing
        this.gridElement.innerHTML = '';
        this.cells = [];

        // Set grid dimensions
        this.gridElement.style.gridTemplateColumns = `repeat(${this.model.width}, var(--cell-size, 40px))`;
        this.gridElement.style.gridTemplateRows = `repeat(${this.model.height}, var(--cell-size, 40px))`;

        // Create cells
        for (let row = 0; row < this.model.height; row++) {
            this.cells[row] = [];
            for (let col = 0; col < this.model.width; col++) {
                const cellEl = this._createCellElement(row, col);
                this.cells[row][col] = cellEl;
                this.gridElement.appendChild(cellEl);
            }
        }

        // Update selection
        this._updateSelection();
    };

    /**
     * Create a cell element
     */
    GridView.prototype._createCellElement = function(row, col) {
        const cell = this.model.getCell(row, col);
        const cellEl = document.createElement('div');
        cellEl.className = 'grid-cell';
        cellEl.dataset.row = row;
        cellEl.dataset.col = col;

        if (cell.type === 'block') {
            cellEl.classList.add('block');
        } else {
            // Number label
            if (cell.number) {
                const numEl = document.createElement('span');
                numEl.className = 'cell-number';
                numEl.textContent = cell.number;
                cellEl.appendChild(numEl);
            }

            // Letter content
            const letterEl = document.createElement('span');
            letterEl.className = 'cell-letter';

            if (this.showSolution && cell.solution) {
                letterEl.textContent = cell.solution;
                letterEl.classList.add('solution');
            } else {
                letterEl.textContent = cell.value || '';
            }

            cellEl.appendChild(letterEl);
        }

        // Click handler
        cellEl.addEventListener('click', (e) => this._onCellClick(row, col, e));

        // Double-click to toggle block
        cellEl.addEventListener('dblclick', (e) => this._onCellDoubleClick(row, col, e));

        return cellEl;
    };

    /**
     * Handle cell click
     */
    GridView.prototype._onCellClick = function(row, col, event) {
        const cell = this.model.getCell(row, col);

        if (cell.type === 'block') {
            return;
        }

        // If clicking same cell, toggle direction
        if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
            this.direction = this.direction === 'across' ? 'down' : 'across';
            this._emit('directionChange', { direction: this.direction });
        }

        this.selectedCell = { row, col };
        this._updateSelection();

        this._emit('cellSelect', { row, col, cell });

        // Emit word select
        const word = this.model.getWord(row, col, this.direction);
        if (word) {
            this._emit('wordSelect', { word, direction: this.direction });
        }
    };

    /**
     * Handle cell double-click (toggle block)
     */
    GridView.prototype._onCellDoubleClick = function(row, col, event) {
        event.preventDefault();
        this.commandAPI.toggleBlock(row, col);
        this.commandAPI.autoNumber();
    };

    /**
     * Update selection highlighting
     */
    GridView.prototype._updateSelection = function() {
        // Remove all highlights
        this.gridElement.querySelectorAll('.selected, .highlighted').forEach(el => {
            el.classList.remove('selected', 'highlighted');
        });

        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;
        const cellEl = this.cells[row]?.[col];

        if (cellEl) {
            cellEl.classList.add('selected');
        }

        // Highlight current word
        const word = this.model.getWord(row, col, this.direction);
        if (word) {
            word.cells.forEach(({ row: r, col: c }) => {
                if (this.cells[r]?.[c]) {
                    this.cells[r][c].classList.add('highlighted');
                }
            });
        }
    };

    /**
     * Setup keyboard navigation and input
     */
    GridView.prototype._setupKeyboard = function() {
        document.addEventListener('keydown', (e) => {
            if (!this.selectedCell) return;

            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const { row, col } = this.selectedCell;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this._moveSelection(row - 1, col);
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    this._moveSelection(row + 1, col);
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    this._moveSelection(row, col - 1);
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    this._moveSelection(row, col + 1);
                    break;

                case 'Tab':
                    e.preventDefault();
                    this._moveToNextWord(e.shiftKey);
                    break;

                case ' ':
                    e.preventDefault();
                    this.direction = this.direction === 'across' ? 'down' : 'across';
                    this._updateSelection();
                    this._emit('directionChange', { direction: this.direction });
                    break;

                case 'Backspace':
                case 'Delete':
                    e.preventDefault();
                    this._clearCurrentCell();
                    if (e.key === 'Backspace') {
                        this._movePrevious();
                    }
                    break;

                default:
                    // Letter input
                    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
                        e.preventDefault();
                        this._enterLetter(e.key.toUpperCase());
                    }
                    break;
            }
        });
    };

    /**
     * Move selection to a new cell
     */
    GridView.prototype._moveSelection = function(row, col) {
        if (!this.model.isValidCell(row, col)) return;

        const cell = this.model.getCell(row, col);
        if (cell.type === 'block') {
            // Skip blocks
            const dRow = row - this.selectedCell.row;
            const dCol = col - this.selectedCell.col;
            this._moveSelection(row + dRow, col + dCol);
            return;
        }

        this.selectedCell = { row, col };
        this._updateSelection();

        this._emit('cellSelect', { row, col, cell });
    };

    /**
     * Move to next cell in current direction
     */
    GridView.prototype._moveNext = function() {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;

        if (this.direction === 'across') {
            this._moveSelection(row, col + 1);
        } else {
            this._moveSelection(row + 1, col);
        }
    };

    /**
     * Move to previous cell in current direction
     */
    GridView.prototype._movePrevious = function() {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;

        if (this.direction === 'across') {
            this._moveSelection(row, col - 1);
        } else {
            this._moveSelection(row - 1, col);
        }
    };

    /**
     * Move to next/previous word
     */
    GridView.prototype._moveToNextWord = function(reverse = false) {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;
        const currentWord = this.model.getWord(row, col, this.direction);
        if (!currentWord) return;

        // Find all word starts
        const wordStarts = [];
        for (let r = 0; r < this.model.height; r++) {
            for (let c = 0; c < this.model.width; c++) {
                const cell = this.model.getCell(r, c);
                if (cell.number) {
                    const starts = this.model._isWordStart(r, c);
                    if (this.direction === 'across' && starts.across) {
                        wordStarts.push({ row: r, col: c, number: cell.number });
                    }
                    if (this.direction === 'down' && starts.down) {
                        wordStarts.push({ row: r, col: c, number: cell.number });
                    }
                }
            }
        }

        // Find current index
        const currentIdx = wordStarts.findIndex(w =>
            w.row === currentWord.start.row && w.col === currentWord.start.col
        );

        let nextIdx;
        if (reverse) {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : wordStarts.length - 1;
        } else {
            nextIdx = currentIdx < wordStarts.length - 1 ? currentIdx + 1 : 0;
        }

        const next = wordStarts[nextIdx];
        if (next) {
            this._moveSelection(next.row, next.col);
        }
    };

    /**
     * Enter a letter in the current cell
     */
    GridView.prototype._enterLetter = function(letter) {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;

        if (this.editMode === 'solution') {
            this.commandAPI.setCellSolution(row, col, letter);
        } else {
            this.commandAPI.setCellValue(row, col, letter);
        }

        this._moveNext();
    };

    /**
     * Clear the current cell
     */
    GridView.prototype._clearCurrentCell = function() {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;

        if (this.editMode === 'solution') {
            this.commandAPI.setCellSolution(row, col, '');
        } else {
            this.commandAPI.setCellValue(row, col, '');
        }
    };

    /**
     * Select a cell programmatically
     */
    GridView.prototype.selectCell = function(row, col) {
        if (!this.model.isValidCell(row, col)) return;

        const cell = this.model.getCell(row, col);
        if (cell.type === 'block') return;

        this.selectedCell = { row, col };
        this._updateSelection();
    };

    /**
     * Set direction
     */
    GridView.prototype.setDirection = function(direction) {
        if (direction === 'across' || direction === 'down') {
            this.direction = direction;
            this._updateSelection();
            this._emit('directionChange', { direction });
        }
    };

    /**
     * Set edit mode
     */
    GridView.prototype.setEditMode = function(mode) {
        if (mode === 'solution' || mode === 'value') {
            this.editMode = mode;
        }
    };

    /**
     * Toggle solution display
     */
    GridView.prototype.toggleSolutionDisplay = function() {
        this.showSolution = !this.showSolution;
        this.render();
    };

    /**
     * Set solution display
     */
    GridView.prototype.setShowSolution = function(show) {
        this.showSolution = show;
        this.render();
    };

    /**
     * Get current selection
     */
    GridView.prototype.getSelection = function() {
        return this.selectedCell;
    };

    /**
     * Get current direction
     */
    GridView.prototype.getDirection = function() {
        return this.direction;
    };

    /**
     * Focus on grid (for keyboard input)
     */
    GridView.prototype.focus = function() {
        this.gridElement.focus();
    };

    return GridView;
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridView;
}
