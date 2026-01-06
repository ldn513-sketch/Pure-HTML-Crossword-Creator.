/**
 * ClueEditor - Editor component for crossword clues
 * Displays and allows editing of across and down clues
 */

const ClueEditor = (function() {
    'use strict';

    /**
     * Create a new ClueEditor
     * @param {HTMLElement} container - Container element for the clue editor
     * @param {GridModel} model - The data model
     * @param {CommandAPI} commandAPI - Command API for modifications
     */
    function ClueEditor(container, model, commandAPI) {
        this.container = container;
        this.model = model;
        this.commandAPI = commandAPI;

        // State
        this.selectedClue = null; // { direction, number }

        // DOM elements
        this.acrossContainer = null;
        this.downContainer = null;

        // Event listeners
        this._listeners = {
            clueSelect: [],
            clueEdit: []
        };

        // Initialize
        this._init();
    }

    /**
     * Add event listener
     */
    ClueEditor.prototype.on = function(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    };

    /**
     * Emit event
     */
    ClueEditor.prototype._emit = function(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(data));
        }
    };

    /**
     * Initialize the editor
     */
    ClueEditor.prototype._init = function() {
        // Create main structure
        this.container.innerHTML = '';
        this.container.className = 'clue-editor';

        // Across section
        const acrossSection = document.createElement('div');
        acrossSection.className = 'clue-section';

        const acrossTitle = document.createElement('h3');
        acrossTitle.textContent = 'Horizontal';
        acrossSection.appendChild(acrossTitle);

        this.acrossContainer = document.createElement('div');
        this.acrossContainer.className = 'clue-list';
        acrossSection.appendChild(this.acrossContainer);

        this.container.appendChild(acrossSection);

        // Down section
        const downSection = document.createElement('div');
        downSection.className = 'clue-section';

        const downTitle = document.createElement('h3');
        downTitle.textContent = 'Vertical';
        downSection.appendChild(downTitle);

        this.downContainer = document.createElement('div');
        this.downContainer.className = 'clue-list';
        downSection.appendChild(this.downContainer);

        this.container.appendChild(downSection);

        // Listen to model changes
        this.model.on('change', (data) => {
            if (data.type === 'autoNumber' || data.type === 'load' || data.type === 'clue') {
                this.render();
            }
        });

        // Initial render
        this.render();
    };

    /**
     * Render the clue lists
     */
    ClueEditor.prototype.render = function() {
        this._renderClueList(this.acrossContainer, 'across');
        this._renderClueList(this.downContainer, 'down');
    };

    /**
     * Render a single clue list
     */
    ClueEditor.prototype._renderClueList = function(container, direction) {
        container.innerHTML = '';

        // Find all numbered cells that start words in this direction
        const wordStarts = [];

        for (let row = 0; row < this.model.height; row++) {
            for (let col = 0; col < this.model.width; col++) {
                const cell = this.model.getCell(row, col);
                if (cell.number) {
                    const starts = this.model._isWordStart(row, col);
                    if ((direction === 'across' && starts.across) ||
                        (direction === 'down' && starts.down)) {
                        const word = this.model.getWord(row, col, direction);
                        wordStarts.push({
                            number: cell.number,
                            row,
                            col,
                            length: word ? word.cells.length : 0
                        });
                    }
                }
            }
        }

        // Sort by number
        wordStarts.sort((a, b) => a.number - b.number);

        // Create clue items
        wordStarts.forEach(({ number, row, col, length }) => {
            const clueItem = this._createClueItem(direction, number, row, col, length);
            container.appendChild(clueItem);
        });
    };

    /**
     * Create a clue item element
     */
    ClueEditor.prototype._createClueItem = function(direction, number, row, col, length) {
        const clue = this.model.getClue(direction, number);
        const clueText = clue ? clue.clue : '';

        const item = document.createElement('div');
        item.className = 'clue-item';
        item.dataset.direction = direction;
        item.dataset.number = number;
        item.dataset.row = row;
        item.dataset.col = col;

        if (this.selectedClue &&
            this.selectedClue.direction === direction &&
            this.selectedClue.number === number) {
            item.classList.add('selected');
        }

        // Number label
        const numLabel = document.createElement('span');
        numLabel.className = 'clue-number';
        numLabel.textContent = `${number}.`;
        item.appendChild(numLabel);

        // Clue text input
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'clue-input';
        input.value = clueText;
        input.placeholder = `(${length} lettres)`;

        input.addEventListener('change', (e) => {
            this.commandAPI.setClue(direction, number, e.target.value);
            this._emit('clueEdit', { direction, number, clue: e.target.value });
        });

        input.addEventListener('focus', () => {
            this.selectClue(direction, number);
        });

        item.appendChild(input);

        // Click on item to select
        item.addEventListener('click', (e) => {
            if (e.target !== input) {
                this.selectClue(direction, number);
                this._emit('clueSelect', { direction, number, row, col });
            }
        });

        return item;
    };

    /**
     * Select a clue
     */
    ClueEditor.prototype.selectClue = function(direction, number) {
        this.selectedClue = { direction, number };

        // Update visual selection
        this.container.querySelectorAll('.clue-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.direction === direction &&
                parseInt(item.dataset.number) === number) {
                item.classList.add('selected');
            }
        });
    };

    /**
     * Select clue by position
     */
    ClueEditor.prototype.selectClueByPosition = function(row, col, direction) {
        const word = this.model.getWord(row, col, direction);
        if (word && word.number) {
            this.selectClue(direction, word.number);
        }
    };

    /**
     * Get the selected clue
     */
    ClueEditor.prototype.getSelectedClue = function() {
        return this.selectedClue;
    };

    /**
     * Focus the input for a specific clue
     */
    ClueEditor.prototype.focusClue = function(direction, number) {
        const item = this.container.querySelector(
            `.clue-item[data-direction="${direction}"][data-number="${number}"]`
        );
        if (item) {
            const input = item.querySelector('.clue-input');
            if (input) {
                input.focus();
            }
        }
    };

    /**
     * Clear selection
     */
    ClueEditor.prototype.clearSelection = function() {
        this.selectedClue = null;
        this.container.querySelectorAll('.clue-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
    };

    /**
     * Scroll to a specific clue
     */
    ClueEditor.prototype.scrollToClue = function(direction, number) {
        const item = this.container.querySelector(
            `.clue-item[data-direction="${direction}"][data-number="${number}"]`
        );
        if (item) {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    return ClueEditor;
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClueEditor;
}
