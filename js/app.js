/**
 * CrosswordEditor - Main application
 * Orchestrates all components and provides the public API
 */

const CrosswordEditor = (function() {
    'use strict';

    /**
     * Create a new CrosswordEditor application
     * @param {object} options - Configuration options
     */
    function CrosswordEditor(options = {}) {
        // Configuration
        this.options = Object.assign({
            gridContainer: null,
            clueContainer: null,
            width: 15,
            height: 15,
            title: 'New Crossword'
        }, options);

        // Components
        this.model = null;
        this.commands = null;
        this.gridView = null;
        this.clueEditor = null;

        // Initialize
        this._init();
    }

    /**
     * Initialize the application
     */
    CrosswordEditor.prototype._init = function() {
        // Create model
        this.model = new GridModel(this.options.width, this.options.height);
        this.model.setMetadata('title', this.options.title);

        // Create command API
        this.commands = new CommandAPI(this.model);

        // Create grid view
        if (this.options.gridContainer) {
            const gridContainer = typeof this.options.gridContainer === 'string'
                ? document.querySelector(this.options.gridContainer)
                : this.options.gridContainer;

            if (gridContainer) {
                this.gridView = new GridView(gridContainer, this.model, this.commands);
            }
        }

        // Create clue editor
        if (this.options.clueContainer) {
            const clueContainer = typeof this.options.clueContainer === 'string'
                ? document.querySelector(this.options.clueContainer)
                : this.options.clueContainer;

            if (clueContainer) {
                this.clueEditor = new ClueEditor(clueContainer, this.model, this.commands);
            }
        }

        // Connect components
        this._connectComponents();

        // Expose global API
        this._exposeGlobalAPI();
    };

    /**
     * Connect component events
     */
    CrosswordEditor.prototype._connectComponents = function() {
        if (this.gridView && this.clueEditor) {
            // When a cell is selected, highlight the corresponding clue
            this.gridView.on('wordSelect', ({ word, direction }) => {
                if (word && word.number) {
                    this.clueEditor.selectClue(direction, word.number);
                    this.clueEditor.scrollToClue(direction, word.number);
                }
            });

            // When a clue is selected, select the corresponding cell
            this.clueEditor.on('clueSelect', ({ direction, row, col }) => {
                this.gridView.setDirection(direction);
                this.gridView.selectCell(row, col);
            });
        }
    };

    /**
     * Expose global API for console/script access
     */
    CrosswordEditor.prototype._exposeGlobalAPI = function() {
        const self = this;

        // Global crossword object
        window.crossword = {
            // Direct access to components
            model: this.model,
            commands: this.commands,
            gridView: this.gridView,
            clueEditor: this.clueEditor,

            // Convenience methods
            setCell: (row, col, letter) => self.commands.setCellSolution(row, col, letter),
            setBlock: (row, col) => self.commands.setCellType(row, col, 'block'),
            clearBlock: (row, col) => self.commands.setCellType(row, col, 'cell'),
            toggleBlock: (row, col) => self.commands.toggleBlock(row, col),

            setWord: (row, col, direction, word) => self.commands.setWordSolution(row, col, direction, word),
            fillWord: (number, direction, word) => self.commands.fillByNumber(number, direction, word, true),

            setClue: (direction, number, text) => self.commands.setClue(direction, number, text),

            autoNumber: () => self.commands.autoNumber(),

            clear: () => self.commands.clearSolutions(),
            reveal: () => self.commands.revealSolution(),

            undo: () => self.commands.undo(),
            redo: () => self.commands.redo(),

            resize: (w, h) => self.commands.resize(w, h),

            setTitle: (title) => self.commands.setMetadata('title', title),
            setAuthor: (author) => self.commands.setMetadata('author', author),

            // File operations
            load: (ipuzString) => self.loadFromIpuz(ipuzString),
            save: () => self.saveToIpuz(),
            download: (filename) => self.downloadIpuz(filename),

            // Pattern helpers
            pattern: (name) => self.commands.fillPattern(name),

            // Help
            help: () => self._printHelp()
        };
    };

    /**
     * Print help to console
     */
    CrosswordEditor.prototype._printHelp = function() {
        console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    CROSSWORD EDITOR - API HELP                     ║
╠═══════════════════════════════════════════════════════════════════╣
║ CELL OPERATIONS                                                    ║
║   crossword.setCell(row, col, 'A')     - Set cell letter          ║
║   crossword.setBlock(row, col)          - Make cell a block        ║
║   crossword.clearBlock(row, col)        - Clear block              ║
║   crossword.toggleBlock(row, col)       - Toggle block state       ║
║                                                                    ║
║ WORD OPERATIONS                                                    ║
║   crossword.setWord(row, col, 'across', 'WORD')                   ║
║   crossword.fillWord(1, 'across', 'HELLO')  - Fill by clue number ║
║                                                                    ║
║ CLUE OPERATIONS                                                    ║
║   crossword.setClue('across', 1, 'Clue text')                     ║
║                                                                    ║
║ GRID OPERATIONS                                                    ║
║   crossword.autoNumber()                - Auto-number grid         ║
║   crossword.clear()                     - Clear all letters        ║
║   crossword.reveal()                    - Show solution            ║
║   crossword.resize(width, height)       - Resize grid              ║
║   crossword.pattern('checkerboard')     - Fill with pattern        ║
║                                                                    ║
║ METADATA                                                           ║
║   crossword.setTitle('My Puzzle')                                 ║
║   crossword.setAuthor('Author Name')                              ║
║                                                                    ║
║ FILE OPERATIONS                                                    ║
║   crossword.save()                      - Get IPUZ JSON string     ║
║   crossword.load(ipuzString)            - Load from IPUZ           ║
║   crossword.download('puzzle.ipuz')     - Download file            ║
║                                                                    ║
║ UNDO/REDO                                                          ║
║   crossword.undo()                                                 ║
║   crossword.redo()                                                 ║
║                                                                    ║
║ PATTERNS                                                           ║
║   'checkerboard' - Alternating blocks                              ║
║   'border'       - Border of blocks                                ║
║   'clear'        - Clear all blocks                                ║
╚═══════════════════════════════════════════════════════════════════╝
        `);
    };

    /**
     * Load crossword from IPUZ string or object
     */
    CrosswordEditor.prototype.loadFromIpuz = function(data) {
        try {
            const parsed = IpuzParser.parse(data);
            this.model.loadFromIpuz(parsed);
            this.commands.clearHistory();
            return true;
        } catch (e) {
            console.error('Failed to load IPUZ:', e);
            return false;
        }
    };

    /**
     * Save crossword to IPUZ string
     */
    CrosswordEditor.prototype.saveToIpuz = function() {
        const data = this.model.toIpuzData();
        return IpuzParser.serialize(data);
    };

    /**
     * Download crossword as IPUZ file
     */
    CrosswordEditor.prototype.downloadIpuz = function(filename = 'crossword.ipuz') {
        const ipuzString = this.saveToIpuz();
        const blob = new Blob([ipuzString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * Load from file input
     */
    CrosswordEditor.prototype.loadFromFile = function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const success = this.loadFromIpuz(e.target.result);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    /**
     * Create a new empty crossword
     */
    CrosswordEditor.prototype.newCrossword = function(width, height, title) {
        this.model.width = width;
        this.model.height = height;
        this.model._initGrid();
        this.model.metadata.title = title || 'New Crossword';
        this.model.clues = { across: [], down: [] };
        this.commands.clearHistory();
        this.model._emit('change', { type: 'new' });
    };

    return CrosswordEditor;
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check for containers
    const gridContainer = document.getElementById('crossword-grid');
    const clueContainer = document.getElementById('clue-editor');

    if (gridContainer) {
        window.editor = new CrosswordEditor({
            gridContainer: gridContainer,
            clueContainer: clueContainer,
            width: 15,
            height: 15
        });

        // Initial auto-number
        window.crossword.autoNumber();

        console.log('Crossword Editor initialized. Type crossword.help() for available commands.');
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrosswordEditor;
}
