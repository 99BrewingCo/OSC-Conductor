var connect4 = require('./connect4.js');

var FieldValue = require('firebase-admin').firestore.FieldValue;

/**
 *  Reset's The Game Board
 */
exports.resetGameBoard = function (db, force = false){
    console.log("----> Reset Game Board");
    return db.runTransaction(function(transaction) {
        var currentCountRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentCountRef).then(function(currentCount) {
            if (!currentCount.exists) {
                return;
            }

            let currentCountUpdate = {count: 100, inProgress: [], namePending: []};
            if (force){
                currentCountUpdate = Object.assign(currentCountUpdate, {
                    game: "basic", round: "0", 
                });
            }

            transaction.update(currentCountRef, currentCountUpdate);

            // Fetch New Round Skin Color
            let currentCountData = currentCount.data();
            let currentSkin = "#eed202"; // critical error color
            if (currentCountData.schedule[currentCountData.round] !== undefined){
                let currentRound = parseInt(currentCountData.round);
                // Correct for Forcing Full Game Reset
                currentRound = force ? 0 : currentRound;
                currentSkin = currentCountData.schedule[currentRound].skin;
            }

            for (var i = 99; i > 0; i--) {
                transaction.set(db.collection('display').doc(i.toString()), {
                    number: i.toString(),
                    event: {empty: false, animationComplete: false, name: false, override: false},
                    name:{display: '', first: '', last: ''},
                    skin:{color: currentSkin, override: ''}
                });
            }

            // Connect 4 Game Board Reset
            if (force){
                transaction.set(db.collection('count').doc('connect4'), {
                    game: 'connect4',
                    0: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    1: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    4: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    countToWin: 4,
                    currentPlayer: "blue",
                    archived: [],
                    wins: {blue: 0, red: 0}
                });
            }

            // Tic-Tac-Toe Game Board Reset
            if (force){
                transaction.set(db.collection('count').doc('tictactoe'), {
                    game: 'tictactoe',
                    0: [null, null, null],
                    1: [null, null, null],
                    2: [null, null, null],
                    M0: [null, null, null],
                    M1: [null, null, null],
                    M2: [null, null, null],
                    mPos: {x: 0, y: 0},
                    countToWin: 3,
                    currentPlayer: "x",
                    archived: [],
                    wins: {x: 0, o: 0}
                });
            }
        });
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.startBottlePour = function (db){
    console.log("----> Start Beer Pouring");
    return db.runTransaction(function(transaction) {
        var currentRef = db.collection("count").doc("current");
        return transaction.get(currentRef).then(function(current) {
            if (!current.exists) return;

            // Update Count
            let data = current.data();
            let newCount = data.count - 1;

            if (newCount > 0){

                let beerRef= db.collection('beers').doc();

                data.inProgress.push({id: newCount, beer: beerRef});
                data.namePending.push({id: newCount, beer: beerRef});

                transaction.update(currentRef, {
                    count: newCount, // Update Current Count
                    inProgress: data.inProgress, // Add to in progress tracker
                    namePending: data.namePending // Add to name pending tracker
                });

                // Update Bottle Display
                transaction.update(db.collection("display").doc(newCount.toString()), {
                    "event.empty": true
                });

                // Create New Bottle
                transaction.set(beerRef, {
                    display: {game: data.game, bottle: newCount},
                    beer: {brewer:'', id: null, name: ''},
                    events: {bottle: true, name: false, tracker: false},
                    name: {first: '', last: ''},
                    payment: {timestamp: null, transaction: ''},
                    timestamp: FieldValue.serverTimestamp()
                });
                return true;
            } else {
                return -1;
            }
        });
    }).then(function(data) {
        if (data === -1){
            console.log("      Final Beer Consumed in Round.");
            exports.resetGameBoard(db);
        }
        return true;
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.cancelBottlePour = function (db){
    console.log("----> Cancel Beer Pouring");
    return db.runTransaction(function(transaction) {
        var currentRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentRef).then(function(current) {
            if (!current.exists) return;

            let data = current.data();
            if (data.inProgress.length > 0){
                let removed = data.inProgress.pop();

                transaction.update(currentRef, {
                    count: data.count + 1, // Update Current Count
                    inProgress: data.inProgress, // Add to in progress tracker
                    namePending: data.namePending.filter(bottle => bottle.id !== removed.id) // Add to name pending tracker
                });

                // Update Bottle Display
                transaction.update(db.collection("display").doc(removed.id.toString()), {
                    "event.empty": false
                });

                // Delete Beer Record
                transaction.delete(removed.beer);
           }
        });
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.triggerBottleEffect = function (bottleId){
    console.log(`----> Trigger Effect on Bottle ${bottleId}`);
}

/**
 * Basic Bottle Logic
 */
function sendLedStatus(oscClient, address, value){
    return oscClient.send({
        address: address,
        args: [
            {
                type: "f",
                value: value ? 1.0 : 0.0
            }
        ]
    });
}

exports.sendAnimationCompleteStatus = function(oscClient, bottleId){
    console.log(`      Sending Animation Complete Status for Bottle ${bottleId}`);
    return sendLedStatus(oscClient, `/bottle/status/complete/${bottleId}`, true);
}

exports.clearAnimationCompleteStatus = function(oscClient, bottleId){
    console.log(`      Clearing Animation Complete Status for Bottle ${bottleId}`);
    return sendLedStatus(oscClient, `/bottle/status/complete/${bottleId}`, false);
}

exports.sendNameStatus = function(oscClient, bottleId){
    console.log(`      Sending Name Status for Bottle ${bottleId}`);
    return sendLedStatus(oscClient, `/bottle/status/name/${bottleId}`, true);
}

exports.clearNameStatus = function(oscClient, bottleId){
    console.log(`      Clearing Name Status for Bottle ${bottleId}`);
    return sendLedStatus(oscClient, `/bottle/status/name/${bottleId}`, false);
}

exports.sendName = function(oscClient, bottleId, name){
    return oscClient.send({
        address: `/bottle/name/${bottleId}`,
        args: [
            {
                type: "s",
                value: name
            }
        ]
    });
}

exports.clearName = function(oscClient, bottleId){
    return oscClient.send({
        address: `/bottle/name/${bottleId}`,
        args: [
            {
                type: "s",
                value: ""
            }
        ]
    });
}

exports.sendEmptyBottleStatus = function(oscClient, bottleId){
    console.log(`      Sending Empty Bottle Status for Bottle ${bottleId}`);
    return sendLedStatus(oscClient, `/bottle/status/${bottleId}`, true);
}

exports.clearEmptyBottleStatus = function(oscClient, bottleId){
    console.log(`      Clearing Empy Bottle Status for Bottle ${bottleId}`);
    return sendLedStatus(oscClient, `/bottle/status/${bottleId}`, false);
}

/**
 * Round Mechanics
 */
exports.updateRound = function(oscClient, round){
    console.log(`----> Updating Round to '${round}'`);
    [1,2,3,4,5,6].forEach(round => sendLedStatus(oscClient, `/round/${round}`, false));
    sendLedStatus(oscClient, `/round/${round}`, true);
}

exports.switchToUI = function(oscClient, currentGame){
    if (currentGame == 'basic'){
        game.switchToBasicUI(oscController);
    } else if (currentGame == 'connect4'){
        game.switchToConnect4UI(oscController);
    } else if (currentGame == 'tictactoe'){
        game.switchToTicTacToeUI(oscController);
    }
}

exports.switchToBasicUI = function(oscClient){
    return oscClient.send({
        address: `/Project 99 Status`,
    });
}

exports.switchToConnect4UI = function(oscClient){
    return oscClient.send({
        address: `/2`,
    });
}

exports.switchToTicTacToeUI = function(oscClient){
    return oscClient.send({
        address: `/4`,
    });
}

/**
 * Connect 4 Game Play
 */

let getConnect4BottleId = function(x_pos, y_pos){
    x_pos = parseInt(x_pos);
    y_pos = parseInt(y_pos);
    return 100 - (y_pos*20 + x_pos);
}

exports.triggerColumnMove = function(db, x_pos){
    return db.runTransaction(function(transaction) {
        var connect4Ref = db.collection("count").doc("connect4");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(connect4Ref).then(function(connect4Data) {
            if (!connect4Data.exists) {
                return;
            }

            return transaction.get(db.collection("display").where("event.override", "==", true).select()).then(function(displayData){
                if (displayData.empty) {
                    console.log('No matching documents.');
                    return;
                }

                let currentDisplayIds = []; 
                displayData.forEach(doc => currentDisplayIds.push(doc.id));

                let data = connect4Data.data();
                let board = [data['0'], data['1'], data['2'], data['3'], data['4']];

                let y_pos = connect4.dropToBottom(board, x_pos);
                board[y_pos][x_pos] = data.currentPlayer;

                // Check for Win
                gameWon = connect4.horizontalWin(board, data['countToWin']) || connect4.verticalWin(board, data['countToWin']) || connect4.diagonalWin(board, data['countToWin']);

                console.log(`----> Drop Token for ${data.currentPlayer} at row ${y_pos}, column ${x_pos}`);

                // Database Update
                let gameTransactionUpdate = {};
                if (gameWon){
                    data['wins'][gameWon]++;
                    data['archived'].push({board: JSON.stringify(board), timestamp: new Date()});

                    gameTransactionUpdate = {
                        0: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                        1: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                        2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                        3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                        4: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                        wins: data['wins'],
                        archived: data['archived']
                    };

                    let displayRef = db.collection("display");
                    currentDisplayIds.forEach(function(bottleId){
                        transaction.update(displayRef.doc(bottleId.toString()), {
                            "event.override": false,
                            "skin.override": ""
                        });
                    })


                } else {
                    gameTransactionUpdate = { 0: board[0], 1: board[1], 2: board[2], 3: board[3], 4: board[4] };

                    let bottleId = getConnect4BottleId(x_pos, y_pos);
                    transaction.update(db.collection("display").doc(bottleId.toString()), {
                        "event.override": true,
                        "skin.override": data.currentPlayer
                    });
                }

                gameTransactionUpdate = Object.assign(gameTransactionUpdate, {
                    currentPlayer: (data.currentPlayer === "red") ? "blue" : "red"
                });

                transaction.update(connect4Ref, gameTransactionUpdate);
            });
        });
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.sendConnect4BottleStatus = function(oscClient, player, x_pos, y_pos){
    let bottleId = getConnect4BottleId(x_pos, y_pos);

    if (player === null){
        console.log(`      Clearing Connect 4 Bottle at row ${x_pos}, column ${y_pos} at bottle ${bottleId}`);
        sendLedStatus(oscClient, `/bottle/red/${bottleId}`, false);
        sendLedStatus(oscClient, `/bottle/blue/${bottleId}`, false);
    } else {
        console.log(`      Setting a Connect 4 move for player ${player} for Bottle at row ${x_pos}, column ${y_pos} at bottle ${bottleId}`);
        return sendLedStatus(oscClient, `/bottle/${player}/${bottleId}`, true);
    }
}

/**
 * Tic Tac Toe Game Play
 */

exports.triggerTicTacToeMove = function(db, x_pos, y_pos){
    return db.runTransaction(function(transaction) {
        var tictactoeRef = db.collection('count').doc('tictactoe');
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(tictactoeRef).then(function(tictactoeData) {
            if (!tictactoeData.exists) {
                return;
            }

            let data = tictactoeData.data();
            let board = [data['0'], data['1'], data['2']];

            board[y_pos][x_pos] = data.currentPlayer;

            // Check for Win
            gameWon = connect4.horizontalWin(board, data.countToWin) || connect4.verticalWin(board, data.countToWin) || connect4.diagonalWin(board, data.countToWin);

            console.log(`----> ${data.currentPlayer} placed a move at row ${y_pos}, column ${x_pos}`);

            // Database Update
            let gameTransactionUpdate = {};
            if (gameWon){
                data.wins[gameWon]++;
                data.archived.push({board: JSON.stringify(board), timestamp: new Date()});

                gameTransactionUpdate = {
                    0: [null, null, null],
                    1: [null, null, null],
                    2: [null, null, null],
                    wins: data.wins,
                    archived: data.archived
                };
            } else if (connect4.gameIsDraw(board)) {
                console.log('game is a draw');

                data.archived.push({board: JSON.stringify(board), timestamp: new Date()});
                gameTransactionUpdate = {
                    0: [null, null, null],
                    1: [null, null, null],
                    2: [null, null, null],
                    archived: data.archived
                };
            } else {
                gameTransactionUpdate = { 0: board[0], 1: board[1], 2: board[2] }
            }

            gameTransactionUpdate = Object.assign(gameTransactionUpdate, {
                currentPlayer: (data.currentPlayer === "x") ? "o" : "x"
            });

            transaction.update(tictactoeRef, gameTransactionUpdate);

        });
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.sendTicTacToeBottleStatus = function(oscClient, player, x_pos, y_pos, game = "current"){
    if (player === null){
        console.log(`      Clearing Tic-Tac-Toe Bottle at row ${x_pos}, column ${y_pos}`);
        return oscClient.send({
        address: `/ttt/${game}/status/${y_pos}/${x_pos}`,
        args: [
            {
                type: "s",
                value: ' '
            }
        ]
    });
    } else {
        console.log(`      Setting a Tic-Tac-Toe move for player ${player} for Bottle at row ${x_pos}, column ${y_pos}`);
        return oscClient.send({
        address: `/ttt/${game}/status/${y_pos}/${x_pos}`,
        args: [
            {
                type: "s",
                value: player
            }
        ]
    });
    }
}