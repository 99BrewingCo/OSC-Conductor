/**
 * If there are empty positions below the one chose, return the new y-position
 * we should drop the piece to.
 *
 * @param int x_pos The x-position of the location chosen.
 * @return bool returns true or false for the question "Is this at the bottom?".
 */
exports.dropToBottom = function (board, x_pos) {
    var yMax = board.length - 1,
        xMax = board[0].length - 1;

    // Start at the bottom of the column, and step up, checking to make sure
    // each position has been filled. If one hasn't, return the empty position.
    for (var y = yMax; y >= 0; y--) {
        if (board[y][x_pos] === null) {
            return y;
        }
    }
    return -1;
}

/**
 * Determine if the game is a draw (all peices on the board are filled).
 *
 * @return bool Returns true or false for the question "Is this a draw?".
 */
exports.gameIsDraw = function (board) {
    var yMax = board.length - 1,
        xMax = board[0].length - 1;

    for (var y = 0; y <= yMax; y++) {
        for (var x = 0; x <= xMax; x++) {
            if (board[y][x] === null) {
                return false;
            }
        }
    }

    // No locations were empty. Return true to indicate that the game is a draw.
    return true;
}

/**
 * Test to see if somebody got four consecutive horizontal pieces.
 *
 * @return bool Returns true if a win was found, and otherwise false.
 */
exports.horizontalWin = function (board, countToWin) {
    var yMax = board.length - 1,
        xMax = board[0].length - 1;

    var currentValue = null,
        previousValue = 0,
        tally = 0;

    // Scan each row in series, tallying the length of each series. If a series
    // ever reaches four, return true for a win.
    for (var y = 0; y <= yMax; y++) {
        for (var x = 0; x <= xMax; x++) {
            currentValue = board[y][x];
            if (currentValue === previousValue && currentValue !== null) {
                tally += 1;
            } else {
                // Reset the tally if you find a gap.
                tally = 0;
            }
            if (tally === countToWin - 1) {
                return currentValue;
            }
            previousValue = currentValue;
        }

        // After each row, reset the tally and previous value.
        tally = 0;
        previousValue = 0;
    }

    // No horizontal win was found.
    return false;
}

/**
 * Test to see if somebody got four consecutive vertical pieces.
 *
 * @return bool Returns true if a win was found, and otherwise false.
 */
exports.verticalWin = function (board, countToWin) {
    var yMax = board.length - 1,
        xMax = board[0].length - 1;

    var currentValue = null,
        previousValue = 0,
        tally = 0;

    // Scan each column in series, tallying the length of each series. If a
    // series ever reaches four, return true for a win.
    for (var x = 0; x <= xMax; x++) {
        for (var y = 0; y <= yMax; y++) {
            currentValue = board[y][x];
            if (currentValue === previousValue && currentValue !== null) {
                tally += 1;
            } else {
                // Reset the tally if you find a gap.
                tally = 0;
            }
            if (tally === countToWin - 1) {
                return currentValue;
            }
            previousValue = currentValue;
        }

        // After each column, reset the tally and previous value.
        tally = 0;
        previousValue = 0;
    }

    // No vertical win was found.
    return false;
}

/**
 * Test to see if somebody got four consecutive diagonel pieces.
 *
 * @todo: refactor this to make it more DRY.
 * @return bool Returns true if a win was found, and otherwise false.
 */
exports.diagonalWin = function (board, countToWin) {
    var yMax = board.length - 1,
        xMax = board[0].length - 1;

    var x = null,
        y = null,
        xtemp = null,
        ytemp = null,
        currentValue = null,
        previousValue = 0,
        tally = 0;

    // Test for down-right diagonals across the top.
    for (x = 0; x <= xMax; x++) {
        xtemp = x;
        ytemp = 0;

        while (xtemp <= xMax && ytemp <= yMax) {
            currentValue = board[ytemp][xtemp];
            if (currentValue === previousValue && currentValue !== null) {
                tally += 1;
            } else {
                // Reset the tally if you find a gap.
                tally = 0;
            }
            if (tally === countToWin - 1) {
                return currentValue;
            }
            previousValue = currentValue;

            // Shift down-right one diagonal index.
            xtemp++;
            ytemp++;
        }
        // Reset the tally and previous value when changing diagonals.
        tally = 0;
        previousValue = 0;
    }

    // Test for down-left diagonals across the top.
    for (x = 0; x <= xMax; x++) {
        xtemp = x;
        ytemp = 0;

        while (0 <= xtemp && ytemp <= yMax) {
            currentValue = board[ytemp][xtemp];
            if (currentValue === previousValue && currentValue !== null) {
                tally += 1;
            } else {
                // Reset the tally if you find a gap.
                tally = 0;
            }
            if (tally === countToWin - 1) {
                return currentValue;
            }
            previousValue = currentValue;

            // Shift down-left one diagonal index.
            xtemp--;
            ytemp++;
        }
        // Reset the tally and previous value when changing diagonals.
        tally = 0;
        previousValue = 0;
    }

    // Test for down-right diagonals down the left side.
    for (y = 0; y <= yMax; y++) {
        xtemp = 0;
        ytemp = y;

        while (xtemp <= xMax && ytemp <= yMax) {
            currentValue = board[ytemp][xtemp];
            if (currentValue === previousValue && currentValue !== null) {
                tally += 1;
            } else {
                // Reset the tally if you find a gap.
                tally = 0;
            }
            if (tally === countToWin - 1) {
                return currentValue;
            }
            previousValue = currentValue;

            // Shift down-right one diagonal index.
            xtemp++;
            ytemp++;
        }
        // Reset the tally and previous value when changing diagonals.
        tally = 0;
        previousValue = 0;
    }

    // Test for down-left diagonals down the right side.
    for (y = 0; y <= yMax; y++) {
        xtemp = xMax;
        ytemp = y;

        while (0 <= xtemp && ytemp <= yMax) {
            currentValue = board[ytemp][xtemp];
            if (currentValue === previousValue && currentValue !== null) {
                tally += 1;
            } else {
                // Reset the tally if you find a gap.
                tally = 0;
            }
            if (tally === countToWin - 1) {
                return currentValue;
            }
            previousValue = currentValue;

            // Shift down-left one diagonal index.
            xtemp--;
            ytemp++;
        }
        // Reset the tally and previous value when changing diagonals.
        tally = 0;
        previousValue = 0;
    }

    // No diagonal wins found. Return false.
    return false;
}