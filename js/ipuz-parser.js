/**
 * IPUZ Parser/Serializer
 * Handles reading and writing IPUZ format files
 * Spec: http://www.ipuz.org/
 */

const IpuzParser = (function() {
    'use strict';

    const IPUZ_VERSION = 'http://ipuz.org/v2';
    const SUPPORTED_KINDS = ['http://ipuz.org/crossword#1'];

    /**
     * Parse an IPUZ JSON string or object
     * @param {string|object} data - IPUZ data
     * @returns {object} Parsed crossword data
     */
    function parse(data) {
        let ipuz;

        if (typeof data === 'string') {
            // Remove potential JSONP wrapper: ipuz({...})
            const jsonpMatch = data.match(/^ipuz\s*\(([\s\S]*)\)\s*$/);
            if (jsonpMatch) {
                data = jsonpMatch[1];
            }
            try {
                ipuz = JSON.parse(data);
            } catch (e) {
                throw new Error('Invalid IPUZ JSON: ' + e.message);
            }
        } else {
            ipuz = data;
        }

        // Validate basic structure
        if (!ipuz.version) {
            throw new Error('Missing IPUZ version');
        }

        if (!ipuz.kind || !Array.isArray(ipuz.kind)) {
            throw new Error('Missing or invalid IPUZ kind');
        }

        // Check if it's a crossword
        const isCrossword = ipuz.kind.some(k => k.startsWith('http://ipuz.org/crossword'));
        if (!isCrossword) {
            throw new Error('Only crossword puzzles are supported');
        }

        // Extract dimensions
        const dimensions = ipuz.dimensions || {};
        const width = dimensions.width || 15;
        const height = dimensions.height || 15;

        // Parse puzzle grid
        const puzzle = parsePuzzleGrid(ipuz.puzzle, width, height);

        // Parse solution grid if present
        const solution = ipuz.solution ? parseSolutionGrid(ipuz.solution, width, height) : null;

        // Parse clues
        const clues = parseClues(ipuz.clues || {});

        return {
            version: ipuz.version,
            kind: ipuz.kind,
            title: ipuz.title || '',
            author: ipuz.author || '',
            copyright: ipuz.copyright || '',
            publisher: ipuz.publisher || '',
            date: ipuz.date || '',
            notes: ipuz.notes || '',
            dimensions: { width, height },
            puzzle: puzzle,
            solution: solution,
            clues: clues,
            // Preserve original for round-trip
            _original: ipuz
        };
    }

    /**
     * Parse the puzzle grid (structure with blocks and numbers)
     */
    function parsePuzzleGrid(puzzleData, width, height) {
        const grid = [];

        for (let row = 0; row < height; row++) {
            grid[row] = [];
            for (let col = 0; col < width; col++) {
                const cellData = puzzleData && puzzleData[row] ? puzzleData[row][col] : null;
                grid[row][col] = parsePuzzleCell(cellData);
            }
        }

        return grid;
    }

    /**
     * Parse a single puzzle cell
     */
    function parsePuzzleCell(cellData) {
        // Block cell
        if (cellData === '#' || cellData === null) {
            return { type: 'block' };
        }

        // Empty cell (playable)
        if (cellData === 0 || cellData === '') {
            return { type: 'cell', number: null };
        }

        // Numbered cell
        if (typeof cellData === 'number') {
            return { type: 'cell', number: cellData };
        }

        // Object cell (complex)
        if (typeof cellData === 'object' && cellData !== null) {
            return {
                type: cellData.cell === '#' ? 'block' : 'cell',
                number: cellData.cell && cellData.cell !== '#' ? cellData.cell : null,
                style: cellData.style || null,
                value: cellData.value || null
            };
        }

        // String (could be a number as string)
        if (typeof cellData === 'string') {
            const num = parseInt(cellData, 10);
            if (!isNaN(num)) {
                return { type: 'cell', number: num };
            }
            return { type: 'cell', number: null };
        }

        return { type: 'cell', number: null };
    }

    /**
     * Parse the solution grid
     */
    function parseSolutionGrid(solutionData, width, height) {
        const grid = [];

        for (let row = 0; row < height; row++) {
            grid[row] = [];
            for (let col = 0; col < width; col++) {
                const cellData = solutionData && solutionData[row] ? solutionData[row][col] : null;
                grid[row][col] = parseSolutionCell(cellData);
            }
        }

        return grid;
    }

    /**
     * Parse a single solution cell
     */
    function parseSolutionCell(cellData) {
        if (cellData === '#' || cellData === null) {
            return null; // Block
        }

        if (typeof cellData === 'string') {
            return cellData.toUpperCase();
        }

        if (typeof cellData === 'object' && cellData !== null) {
            return cellData.value ? cellData.value.toUpperCase() : null;
        }

        return null;
    }

    /**
     * Parse clues from IPUZ format
     */
    function parseClues(cluesData) {
        const result = {
            across: [],
            down: []
        };

        if (cluesData.Across) {
            result.across = cluesData.Across.map(parseClue);
        }

        if (cluesData.Down) {
            result.down = cluesData.Down.map(parseClue);
        }

        return result;
    }

    /**
     * Parse a single clue
     */
    function parseClue(clueData) {
        if (Array.isArray(clueData)) {
            // Format: [number, "clue text"]
            return {
                number: clueData[0],
                clue: clueData[1] || '',
                answer: clueData[2] || null
            };
        }

        if (typeof clueData === 'object') {
            return {
                number: clueData.number,
                clue: clueData.clue || '',
                answer: clueData.answer || null
            };
        }

        return { number: 0, clue: String(clueData), answer: null };
    }

    /**
     * Serialize crossword data to IPUZ format
     * @param {object} crossword - Crossword data
     * @returns {string} IPUZ JSON string
     */
    function serialize(crossword) {
        const ipuz = {
            version: IPUZ_VERSION,
            kind: crossword.kind || SUPPORTED_KINDS,
            title: crossword.title || '',
            author: crossword.author || '',
            copyright: crossword.copyright || '',
            publisher: crossword.publisher || '',
            date: crossword.date || '',
            notes: crossword.notes || '',
            dimensions: {
                width: crossword.dimensions.width,
                height: crossword.dimensions.height
            },
            puzzle: serializePuzzleGrid(crossword.puzzle),
            solution: crossword.solution ? serializeSolutionGrid(crossword.solution, crossword.puzzle) : undefined,
            clues: serializeClues(crossword.clues)
        };

        // Remove undefined values
        Object.keys(ipuz).forEach(key => {
            if (ipuz[key] === undefined || ipuz[key] === '') {
                delete ipuz[key];
            }
        });

        return JSON.stringify(ipuz, null, 2);
    }

    /**
     * Serialize puzzle grid to IPUZ format
     */
    function serializePuzzleGrid(puzzle) {
        return puzzle.map(row =>
            row.map(cell => {
                if (cell.type === 'block') {
                    return '#';
                }
                if (cell.number) {
                    return cell.number;
                }
                return 0;
            })
        );
    }

    /**
     * Serialize solution grid to IPUZ format
     */
    function serializeSolutionGrid(solution, puzzle) {
        return solution.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
                if (puzzle[rowIndex][colIndex].type === 'block') {
                    return '#';
                }
                return cell || '';
            })
        );
    }

    /**
     * Serialize clues to IPUZ format
     */
    function serializeClues(clues) {
        const result = {};

        if (clues.across && clues.across.length > 0) {
            result.Across = clues.across.map(c => [c.number, c.clue]);
        }

        if (clues.down && clues.down.length > 0) {
            result.Down = clues.down.map(c => [c.number, c.clue]);
        }

        return result;
    }

    /**
     * Create an empty crossword
     */
    function createEmpty(width, height, title = 'New Crossword') {
        const puzzle = [];
        const solution = [];

        for (let row = 0; row < height; row++) {
            puzzle[row] = [];
            solution[row] = [];
            for (let col = 0; col < width; col++) {
                puzzle[row][col] = { type: 'cell', number: null };
                solution[row][col] = '';
            }
        }

        return {
            version: IPUZ_VERSION,
            kind: SUPPORTED_KINDS,
            title: title,
            author: '',
            copyright: '',
            publisher: '',
            date: new Date().toISOString().split('T')[0],
            notes: '',
            dimensions: { width, height },
            puzzle: puzzle,
            solution: solution,
            clues: { across: [], down: [] }
        };
    }

    // Public API
    return {
        parse,
        serialize,
        createEmpty,
        IPUZ_VERSION,
        SUPPORTED_KINDS
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IpuzParser;
}
