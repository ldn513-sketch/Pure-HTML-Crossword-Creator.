/**
 * CommandAPI - Command interface for the crossword editor
 * Provides a programmatic API to manipulate the grid
 * Supports undo/redo and command batching
 */

const CommandAPI = (function() {
    'use strict';

    /**
     * Create a new CommandAPI
     * @param {GridModel} gridModel - The grid model to operate on
     */
    function CommandAPI(gridModel) {
        this.grid = gridModel;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 100;
        this.batchMode = false;
        this.batchCommands = [];

        // Event listeners
        this._listeners = {
            execute: [],
            undo: [],
            redo: [],
            historyChange: []
        };

        // Register built-in commands
        this._commands = {};
        this._registerBuiltInCommands();
    }

    /**
     * Add event listener
     */
    CommandAPI.prototype.on = function(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event].push(callback);
        }
    };

    /**
     * Emit event
     */
    CommandAPI.prototype._emit = function(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(data));
        }
    };

    /**
     * Register a custom command
     * @param {string} name - Command name
     * @param {object} handler - { execute: fn, undo: fn }
     */
    CommandAPI.prototype.register = function(name, handler) {
        if (!handler.execute || typeof handler.execute !== 'function') {
            throw new Error('Command must have an execute function');
        }
        this._commands[name] = handler;
    };

    /**
     * Execute a command
     * @param {string} name - Command name
     * @param {object} params - Command parameters
     * @returns {*} Command result
     */
    CommandAPI.prototype.execute = function(name, params = {}) {
        const handler = this._commands[name];
        if (!handler) {
            throw new Error(`Unknown command: ${name}`);
        }

        // Create command record
        const command = {
            name,
            params: JSON.parse(JSON.stringify(params)),
            timestamp: Date.now()
        };

        // Capture state before execution for undo
        if (handler.captureState) {
            command.prevState = handler.captureState(this.grid, params);
        }

        // Execute command
        const result = handler.execute(this.grid, params);
        command.result = result;

        // Capture state after for redo
        if (handler.captureState) {
            command.newState = handler.captureState(this.grid, params);
        }

        // Add to history
        if (this.batchMode) {
            this.batchCommands.push(command);
        } else {
            this._addToHistory(command);
        }

        this._emit('execute', command);

        return result;
    };

    /**
     * Add command to undo history
     */
    CommandAPI.prototype._addToHistory = function(command) {
        this.undoStack.push(command);

        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        // Clear redo stack on new action
        this.redoStack = [];

        this._emit('historyChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
    };

    /**
     * Check if undo is available
     */
    CommandAPI.prototype.canUndo = function() {
        return this.undoStack.length > 0;
    };

    /**
     * Check if redo is available
     */
    CommandAPI.prototype.canRedo = function() {
        return this.redoStack.length > 0;
    };

    /**
     * Undo last command
     */
    CommandAPI.prototype.undo = function() {
        if (!this.canUndo()) return false;

        const command = this.undoStack.pop();
        const handler = this._commands[command.name];

        if (handler && handler.undo) {
            handler.undo(this.grid, command.params, command.prevState);
        }

        this.redoStack.push(command);

        this._emit('undo', command);
        this._emit('historyChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });

        return true;
    };

    /**
     * Redo last undone command
     */
    CommandAPI.prototype.redo = function() {
        if (!this.canRedo()) return false;

        const command = this.redoStack.pop();
        const handler = this._commands[command.name];

        if (handler && handler.redo) {
            handler.redo(this.grid, command.params, command.newState);
        } else if (handler) {
            handler.execute(this.grid, command.params);
        }

        this.undoStack.push(command);

        this._emit('redo', command);
        this._emit('historyChange', {
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });

        return true;
    };

    /**
     * Start batch mode (group multiple commands)
     */
    CommandAPI.prototype.beginBatch = function() {
        this.batchMode = true;
        this.batchCommands = [];
    };

    /**
     * End batch mode and commit as single undo unit
     */
    CommandAPI.prototype.endBatch = function(name = 'batch') {
        this.batchMode = false;

        if (this.batchCommands.length > 0) {
            const batchCommand = {
                name: name,
                params: {},
                commands: this.batchCommands,
                timestamp: Date.now()
            };
            this._addToHistory(batchCommand);
        }

        this.batchCommands = [];
    };

    /**
     * Cancel batch mode without committing
     */
    CommandAPI.prototype.cancelBatch = function() {
        // Undo all batch commands
        for (let i = this.batchCommands.length - 1; i >= 0; i--) {
            const cmd = this.batchCommands[i];
            const handler = this._commands[cmd.name];
            if (handler && handler.undo) {
                handler.undo(this.grid, cmd.params, cmd.prevState);
            }
        }

        this.batchMode = false;
        this.batchCommands = [];
    };

    /**
     * Clear history
     */
    CommandAPI.prototype.clearHistory = function() {
        this.undoStack = [];
        this.redoStack = [];
        this._emit('historyChange', {
            canUndo: false,
            canRedo: false
        });
    };

    /**
     * Register all built-in commands
     */
    CommandAPI.prototype._registerBuiltInCommands = function() {
        const self = this;

        // SET_CELL_VALUE - Set a cell's display value
        this.register('SET_CELL_VALUE', {
            execute: function(grid, params) {
                const { row, col, value } = params;
                return grid.setCellValue(row, col, value);
            },
            captureState: function(grid, params) {
                const cell = grid.getCell(params.row, params.col);
                return cell ? cell.value : '';
            },
            undo: function(grid, params, prevState) {
                grid.setCellValue(params.row, params.col, prevState);
            }
        });

        // SET_CELL_SOLUTION - Set a cell's solution value
        this.register('SET_CELL_SOLUTION', {
            execute: function(grid, params) {
                const { row, col, solution } = params;
                return grid.setCellSolution(row, col, solution);
            },
            captureState: function(grid, params) {
                const cell = grid.getCell(params.row, params.col);
                return cell ? cell.solution : '';
            },
            undo: function(grid, params, prevState) {
                grid.setCellSolution(params.row, params.col, prevState);
            }
        });

        // SET_CELL_TYPE - Set cell as block or cell
        this.register('SET_CELL_TYPE', {
            execute: function(grid, params) {
                const { row, col, type } = params;
                return grid.setCellType(row, col, type);
            },
            captureState: function(grid, params) {
                const cell = grid.getCell(params.row, params.col);
                return cell ? { type: cell.type, value: cell.value, solution: cell.solution, number: cell.number } : null;
            },
            undo: function(grid, params, prevState) {
                if (prevState) {
                    grid.setCellType(params.row, params.col, prevState.type);
                    if (prevState.type !== 'block') {
                        grid.setCellValue(params.row, params.col, prevState.value);
                        grid.setCellSolution(params.row, params.col, prevState.solution);
                    }
                }
            }
        });

        // TOGGLE_BLOCK - Toggle cell between block and cell
        this.register('TOGGLE_BLOCK', {
            execute: function(grid, params) {
                const { row, col } = params;
                return grid.toggleBlock(row, col);
            },
            captureState: function(grid, params) {
                const cell = grid.getCell(params.row, params.col);
                return cell ? { type: cell.type, value: cell.value, solution: cell.solution } : null;
            },
            undo: function(grid, params, prevState) {
                if (prevState) {
                    grid.setCellType(params.row, params.col, prevState.type);
                    if (prevState.type !== 'block') {
                        grid.setCellValue(params.row, params.col, prevState.value);
                        grid.setCellSolution(params.row, params.col, prevState.solution);
                    }
                }
            }
        });

        // SET_WORD - Set entire word value
        this.register('SET_WORD', {
            execute: function(grid, params) {
                const { row, col, direction, value } = params;
                return grid.setWord(row, col, direction, value);
            },
            captureState: function(grid, params) {
                const word = grid.getWord(params.row, params.col, params.direction);
                return word ? word.value : '';
            },
            undo: function(grid, params, prevState) {
                grid.setWord(params.row, params.col, params.direction, prevState);
            }
        });

        // SET_WORD_SOLUTION - Set entire word solution
        this.register('SET_WORD_SOLUTION', {
            execute: function(grid, params) {
                const { row, col, direction, solution } = params;
                return grid.setWordSolution(row, col, direction, solution);
            },
            captureState: function(grid, params) {
                const word = grid.getWord(params.row, params.col, params.direction);
                return word ? word.solution : '';
            },
            undo: function(grid, params, prevState) {
                grid.setWordSolution(params.row, params.col, params.direction, prevState);
            }
        });

        // SET_CLUE - Set clue text
        this.register('SET_CLUE', {
            execute: function(grid, params) {
                const { direction, number, clue } = params;
                return grid.setClue(direction, number, clue);
            },
            captureState: function(grid, params) {
                const existing = grid.getClue(params.direction, params.number);
                return existing ? existing.clue : '';
            },
            undo: function(grid, params, prevState) {
                grid.setClue(params.direction, params.number, prevState);
            }
        });

        // SET_METADATA - Set puzzle metadata
        this.register('SET_METADATA', {
            execute: function(grid, params) {
                const { key, value } = params;
                grid.setMetadata(key, value);
                return true;
            },
            captureState: function(grid, params) {
                return grid.metadata[params.key] || '';
            },
            undo: function(grid, params, prevState) {
                grid.setMetadata(params.key, prevState);
            }
        });

        // AUTO_NUMBER - Auto-number the grid
        this.register('AUTO_NUMBER', {
            execute: function(grid, params) {
                return grid.autoNumber();
            },
            captureState: function(grid, params) {
                // Capture all cell numbers
                const numbers = [];
                for (let row = 0; row < grid.height; row++) {
                    numbers[row] = [];
                    for (let col = 0; col < grid.width; col++) {
                        numbers[row][col] = grid.cells[row][col].number;
                    }
                }
                return numbers;
            },
            undo: function(grid, params, prevState) {
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        grid.cells[row][col].number = prevState[row][col];
                    }
                }
                grid._emit('change', { type: 'autoNumber' });
            }
        });

        // CLEAR_VALUES - Clear all cell values
        this.register('CLEAR_VALUES', {
            execute: function(grid, params) {
                grid.clearValues();
                return true;
            },
            captureState: function(grid, params) {
                const values = [];
                for (let row = 0; row < grid.height; row++) {
                    values[row] = [];
                    for (let col = 0; col < grid.width; col++) {
                        values[row][col] = grid.cells[row][col].value;
                    }
                }
                return values;
            },
            undo: function(grid, params, prevState) {
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        grid.cells[row][col].value = prevState[row][col];
                    }
                }
                grid._emit('change', { type: 'clearValues' });
            }
        });

        // CLEAR_SOLUTIONS - Clear all solutions
        this.register('CLEAR_SOLUTIONS', {
            execute: function(grid, params) {
                grid.clearSolutions();
                return true;
            },
            captureState: function(grid, params) {
                const solutions = [];
                for (let row = 0; row < grid.height; row++) {
                    solutions[row] = [];
                    for (let col = 0; col < grid.width; col++) {
                        solutions[row][col] = grid.cells[row][col].solution;
                    }
                }
                return solutions;
            },
            undo: function(grid, params, prevState) {
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        grid.cells[row][col].solution = prevState[row][col];
                    }
                }
                grid._emit('change', { type: 'clearSolutions' });
            }
        });

        // REVEAL_SOLUTION - Copy solution to values
        this.register('REVEAL_SOLUTION', {
            execute: function(grid, params) {
                grid.revealSolution();
                return true;
            },
            captureState: function(grid, params) {
                const values = [];
                for (let row = 0; row < grid.height; row++) {
                    values[row] = [];
                    for (let col = 0; col < grid.width; col++) {
                        values[row][col] = grid.cells[row][col].value;
                    }
                }
                return values;
            },
            undo: function(grid, params, prevState) {
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        grid.cells[row][col].value = prevState[row][col];
                    }
                }
                grid._emit('change', { type: 'revealSolution' });
            }
        });

        // RESIZE - Resize the grid
        this.register('RESIZE', {
            execute: function(grid, params) {
                const { width, height } = params;
                grid.resize(width, height);
                return true;
            },
            captureState: function(grid, params) {
                return {
                    width: grid.width,
                    height: grid.height,
                    cells: JSON.parse(JSON.stringify(grid.cells))
                };
            },
            undo: function(grid, params, prevState) {
                grid.width = prevState.width;
                grid.height = prevState.height;
                grid.cells = prevState.cells;
                grid._emit('change', { type: 'resize' });
            }
        });

        // FILL_PATTERN - Fill grid with a pattern (checkerboard, etc.)
        this.register('FILL_PATTERN', {
            execute: function(grid, params) {
                const { pattern } = params;
                switch (pattern) {
                    case 'checkerboard':
                        for (let row = 0; row < grid.height; row++) {
                            for (let col = 0; col < grid.width; col++) {
                                if ((row + col) % 2 === 1) {
                                    grid.setCellType(row, col, 'block');
                                }
                            }
                        }
                        break;
                    case 'border':
                        for (let row = 0; row < grid.height; row++) {
                            for (let col = 0; col < grid.width; col++) {
                                if (row === 0 || row === grid.height - 1 || col === 0 || col === grid.width - 1) {
                                    grid.setCellType(row, col, 'block');
                                }
                            }
                        }
                        break;
                    case 'clear':
                        for (let row = 0; row < grid.height; row++) {
                            for (let col = 0; col < grid.width; col++) {
                                grid.setCellType(row, col, 'cell');
                            }
                        }
                        break;
                }
                return true;
            },
            captureState: function(grid, params) {
                const types = [];
                for (let row = 0; row < grid.height; row++) {
                    types[row] = [];
                    for (let col = 0; col < grid.width; col++) {
                        types[row][col] = grid.cells[row][col].type;
                    }
                }
                return types;
            },
            undo: function(grid, params, prevState) {
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        grid.setCellType(row, col, prevState[row][col]);
                    }
                }
            }
        });

        // FILL_WORD_AT - Fill a word at specific coordinates
        this.register('FILL_WORD_AT', {
            execute: function(grid, params) {
                const { row, col, direction, word, asSolution } = params;
                if (asSolution) {
                    return grid.setWordSolution(row, col, direction, word);
                }
                return grid.setWord(row, col, direction, word);
            },
            captureState: function(grid, params) {
                const wordData = grid.getWord(params.row, params.col, params.direction);
                return wordData ? {
                    value: wordData.value,
                    solution: wordData.solution
                } : null;
            },
            undo: function(grid, params, prevState) {
                if (prevState) {
                    if (params.asSolution) {
                        grid.setWordSolution(params.row, params.col, params.direction, prevState.solution);
                    } else {
                        grid.setWord(params.row, params.col, params.direction, prevState.value);
                    }
                }
            }
        });

        // FILL_BY_NUMBER - Fill a word by its clue number
        this.register('FILL_BY_NUMBER', {
            execute: function(grid, params) {
                const { number, direction, word, asSolution } = params;
                // Find the cell with this number
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        if (grid.cells[row][col].number === number) {
                            if (asSolution) {
                                return grid.setWordSolution(row, col, direction, word);
                            }
                            return grid.setWord(row, col, direction, word);
                        }
                    }
                }
                return false;
            },
            captureState: function(grid, params) {
                // Find the cell with this number
                for (let row = 0; row < grid.height; row++) {
                    for (let col = 0; col < grid.width; col++) {
                        if (grid.cells[row][col].number === params.number) {
                            const wordData = grid.getWord(row, col, params.direction);
                            return {
                                row, col,
                                value: wordData ? wordData.value : '',
                                solution: wordData ? wordData.solution : ''
                            };
                        }
                    }
                }
                return null;
            },
            undo: function(grid, params, prevState) {
                if (prevState) {
                    if (params.asSolution) {
                        grid.setWordSolution(prevState.row, prevState.col, params.direction, prevState.solution);
                    } else {
                        grid.setWord(prevState.row, prevState.col, params.direction, prevState.value);
                    }
                }
            }
        });
    };

    // Convenience methods for common commands
    CommandAPI.prototype.setCellValue = function(row, col, value) {
        return this.execute('SET_CELL_VALUE', { row, col, value });
    };

    CommandAPI.prototype.setCellSolution = function(row, col, solution) {
        return this.execute('SET_CELL_SOLUTION', { row, col, solution });
    };

    CommandAPI.prototype.setCellType = function(row, col, type) {
        return this.execute('SET_CELL_TYPE', { row, col, type });
    };

    CommandAPI.prototype.toggleBlock = function(row, col) {
        return this.execute('TOGGLE_BLOCK', { row, col });
    };

    CommandAPI.prototype.setWord = function(row, col, direction, value) {
        return this.execute('SET_WORD', { row, col, direction, value });
    };

    CommandAPI.prototype.setWordSolution = function(row, col, direction, solution) {
        return this.execute('SET_WORD_SOLUTION', { row, col, direction, solution });
    };

    CommandAPI.prototype.setClue = function(direction, number, clue) {
        return this.execute('SET_CLUE', { direction, number, clue });
    };

    CommandAPI.prototype.setMetadata = function(key, value) {
        return this.execute('SET_METADATA', { key, value });
    };

    CommandAPI.prototype.autoNumber = function() {
        return this.execute('AUTO_NUMBER', {});
    };

    CommandAPI.prototype.clearValues = function() {
        return this.execute('CLEAR_VALUES', {});
    };

    CommandAPI.prototype.clearSolutions = function() {
        return this.execute('CLEAR_SOLUTIONS', {});
    };

    CommandAPI.prototype.revealSolution = function() {
        return this.execute('REVEAL_SOLUTION', {});
    };

    CommandAPI.prototype.resize = function(width, height) {
        return this.execute('RESIZE', { width, height });
    };

    CommandAPI.prototype.fillPattern = function(pattern) {
        return this.execute('FILL_PATTERN', { pattern });
    };

    CommandAPI.prototype.fillWordAt = function(row, col, direction, word, asSolution = false) {
        return this.execute('FILL_WORD_AT', { row, col, direction, word, asSolution });
    };

    CommandAPI.prototype.fillByNumber = function(number, direction, word, asSolution = false) {
        return this.execute('FILL_BY_NUMBER', { number, direction, word, asSolution });
    };

    return CommandAPI;
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandAPI;
}
