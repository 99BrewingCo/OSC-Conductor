var connect4 = require('./connect4.js');

var FieldValue = require('firebase-admin').firestore.FieldValue;

/**
 *  Reset's The Game Board
 */
exports.resetGameBoard = function (db, force = false){
    console.log("----> Reset Game Board");

    let _force = {
        startOver: false,
        connect4: false,
        memory: false,
        ticTacToe: false
    };

    // Parcel Force Out
    if (force === Object(force)){
        if (force.hasOwnProperty('startOver') && force.startOver !== undefined && force.startOver){
            _force.startOver = true;
        }
        if (force.hasOwnProperty('connect4') && force.connect4 !== undefined && force.connect4){
            _force.connect4 = true;
        }
        if (force.hasOwnProperty('memory') && force.memory !== undefined && force.memory){
            _force.memory = true;
        }
        if (force.hasOwnProperty('ticTacToe') && force.ticTacToe !== undefined && force.ticTacToe){
            _force.ticTacToe = true;
        }
    } else if (force === true){
        _force = {
            startOver: true,
            connect4: true,
            memory: true,
            ticTacToe: true
        };
    }

    return db.runTransaction(function(transaction) {
        var currentCountRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentCountRef).then(function(currentCount) {
            if (!currentCount.exists) {
                return;
            }

            let currentCountUpdate = {count: 100, inProgress: [], namePending: []};
            if (_force.startOver){
                // force game to start over at round 1 with a basic (no) game
                currentCountUpdate = Object.assign(currentCountUpdate, {
                    game: "basic", round: "1", 
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
            } else {
                console.error(`[resetGameBoard] unknown round <${currentCountData.round}> in schedule, cannot update as requested.`);
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
            if (_force.connect4){
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

            // Connect 4 Game Board Reset
            if (_force.memory){
                transaction.set(db.collection('count').doc('memory'), {
                    game: 'memory',
                    0: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    1: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    2: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    3: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    4: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
                    archived: [],
                    movesCount: 0
                });
            }

            // Tic-Tac-Toe Game Board Reset
            if (_force.ticTacToe){
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
        switchToBasicUI(oscClient);
    } else if (currentGame == 'connect4'){
        switchToConnect4UI(oscClient);
    } else if (currentGame == 'tictactoe'){
        switchToTicTacToeUI(oscClient);
    } else {
        console.error(`----> Error: Unknown game interface requested '${currentGame}'`);
    }
}

function switchToBasicUI(oscClient){
    console.log(`----> Switching Basic Game UI`);
    return oscClient.send({
        address: `/Project 99 Status`,
    });
}

function switchToConnect4UI(oscClient){
    console.log(`----> Switching Connect 4 Game UI`);
    return oscClient.send({
        address: `/2`,
    });
}

function switchToTicTacToeUI(oscClient){
    console.log(`----> Switching Tic-Tac-Toe Game UI`);
    return oscClient.send({
        address: `/4`,
    });
}

/**
 * 2D Bit Map Display
 */

let range = function(start, stop){
    return [...Array(stop).keys()].map(i => i + start);
}

let bottlesBitMap = {
    'red': {99:0, 98:0, 97:1, 96:1, 95:1, 94:0, 93:0, 92:1, 91:1, 90:1, 89:1, 88:0, 87:1, 86:1, 85:1, 84:0, 83:0, 82:0, 81:0, 80:0, 79:0, 78:0, 77:1, 76:0, 75:0, 74:1, 73:0, 72:1, 71:0, 70:0, 69:0, 68:0, 67:1, 66:0, 65:0, 64:1, 63:0, 62:0, 61:0, 60:0, 59:0, 58:0, 57:1, 56:1, 55:1, 54:0, 53:0, 52:1, 51:1, 50:1, 49:0, 48:0, 47:1, 46:0, 45:0, 44:1, 43:0, 42:0, 41:0, 40:0, 39:0, 38:0, 37:1, 36:0, 35:1, 34:0, 33:0, 32:1, 31:0, 30:0, 29:0, 28:0, 27:1, 26:0, 25:0, 24:1, 23:0, 22:0, 21:0, 20:0, 19:0, 18:0, 17:1, 16:0, 15:0, 14:1, 13:0, 12:1, 11:1, 10:1, 9:1, 8:0, 7:1, 6:1, 5:1, 4:0, 3:0, 2:0, 1:0},
    'blue': {99:1, 98:1, 97:1, 96:0, 95:0, 94:1, 93:0, 92:0, 91:0, 90:1, 89:0, 88:0, 87:0, 86:1, 85:0, 84:1, 83:1, 82:1, 81:0, 80:0, 79:1, 78:0, 77:0, 76:1, 75:0, 74:1, 73:0, 72:0, 71:0, 70:1, 69:0, 68:0, 67:0, 66:1, 65:0, 64:1, 63:0, 62:0, 61:0, 60:0, 59:1, 58:1, 57:1, 56:0, 55:0, 54:1, 53:0, 52:0, 51:0, 50:1, 49:0, 48:0, 47:0, 46:1, 45:0, 44:1, 43:1, 42:0, 41:0, 40:0, 39:1, 38:0, 37:0, 36:1, 35:0, 34:1, 33:0, 32:0, 31:0, 30:1, 29:0, 28:0, 27:0, 26:1, 25:0, 24:1, 23:0, 22:0, 21:0, 20:0, 19:1, 18:1, 17:1, 16:0, 15:0, 14:1, 13:1, 12:1, 11:0, 10:0, 9:1, 8:1, 7:1, 6:0, 5:0, 4:1, 3:1, 2:1, 1:0},
    'won': {99:1, 98:0, 97:0, 96:0, 95:1, 94:0, 93:0, 92:0, 91:1, 90:1, 89:0, 88:0, 87:0, 86:1, 85:0, 84:0, 83:0, 82:1, 81:0, 80:0, 79:1, 78:0, 77:0, 76:0, 75:1, 74:0, 73:0, 72:1, 71:0, 70:0, 69:1, 68:0, 67:0, 66:1, 65:1, 64:0, 63:0, 62:1, 61:0, 60:0, 59:1, 58:0, 57:1, 56:0, 55:1, 54:0, 53:0, 52:1, 51:0, 50:0, 49:1, 48:0, 47:0, 46:1, 45:0, 44:1, 43:0, 42:1, 41:0, 40:0, 39:1, 38:0, 37:1, 36:0, 35:1, 34:0, 33:0, 32:1, 31:0, 30:0, 29:1, 28:0, 27:0, 26:1, 25:0, 24:0, 23:1, 22:1, 21:0, 20:0, 19:0, 18:1, 17:0, 16:1, 15:0, 14:0, 13:0, 12:0, 11:1, 10:1, 9:0, 8:0, 7:0, 6:1, 5:0, 4:0, 3:0, 2:1, 1:0},
    'clear': {99:0, 98:0, 97:0, 96:0, 95:0, 94:0, 93:0, 92:0, 91:0, 90:0, 89:0, 88:0, 87:0, 86:0, 85:0, 84:0, 83:0, 82:0, 81:0, 80:0, 79:0, 78:0, 77:0, 76:0, 75:0, 74:0, 73:0, 72:0, 71:0, 70:0, 69:0, 68:0, 67:0, 66:0, 65:0, 64:0, 63:0, 62:0, 61:0, 60:0, 59:0, 58:0, 57:0, 56:0, 55:0, 54:0, 53:0, 52:0, 51:0, 50:0, 49:0, 48:0, 47:0, 46:0, 45:0, 44:0, 43:0, 42:0, 41:0, 40:0, 39:0, 38:0, 37:0, 36:0, 35:0, 34:0, 33:0, 32:0, 31:0, 30:0, 29:0, 28:0, 27:0, 26:0, 25:0, 24:0, 23:0, 22:0, 21:0, 20:0, 19:0, 18:0, 17:0, 16:0, 15:0, 14:0, 13:0, 12:0, 11:0, 10:0, 9:0, 8:0, 7:0, 6:0, 5:0, 4:0, 3:0, 2:0, 1:0}
};

let bottlesColorMap = {
    'red': {
        'primary': {
            'foreground': 'red',
            'background': 'white'        
        },
        'alternate': {
            'foreground': 'white',
            'background': 'red'
        }
    },
    'blue': {
        'primary': {
            'foreground': 'blue',
            'background': 'white'        
        },
        'alternate': {
            'foreground': 'white',
            'background': 'blue'
        }
    },
};

let animationSequence = {
    'red': [
        {name: 'red primary', map: bottlesBitMap.red, color: bottlesColorMap.red.primary, duration: 1000},
        {name: 'red alternate', map: bottlesBitMap.red, color: bottlesColorMap.red.alternate, duration: 1000},
        {name: 'won primary', map: bottlesBitMap.won, color: bottlesColorMap.red.primary, duration: 1000},
        {name: 'won alternate', map: bottlesBitMap.won, color: bottlesColorMap.red.alternate, duration: 1000},
        {name: 'clear', map: bottlesBitMap.won, color: bottlesColorMap.red.alternate, duration: 0},
    ],
    'blue': [
        {name: 'blue primary', map: bottlesBitMap.blue, color: bottlesColorMap.blue.primary, duration: 1000},
        {name: 'blue alternate', map: bottlesBitMap.blue, color: bottlesColorMap.blue.alternate, duration: 1000},
        {name: 'won primary', map: bottlesBitMap.won, color: bottlesColorMap.blue.primary, duration: 1000},
        {name: 'won alternate', map: bottlesBitMap.won, color: bottlesColorMap.blue.alternate, duration: 1000},
        {name: 'clear', map: bottlesBitMap.won, color: bottlesColorMap.blue.alternate, duration: 0},
    ],
};

exports.clearBitmap = function(db, options){
    console.log(`----> [${new Date().toTimeString()}] Clearing Connect Four Bottles`);

    let bottles = null;
    // if options object provided
    if (options === Object(options)){
        if (options.hasOwnProperty('start') && options.hasOwnProperty('stop')){
            bottles = range(options.start, options.stop);
        }
        if (options.hasOwnProperty('ids')){
            bottles = options.ids;
        }
    } else {
        bottles = range(1, 99);
    }

    return db.runTransaction(function(transaction) {
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(db.collection("count").doc("current")).then(function(current) {
            let displayRef = db.collection("display");
            bottles.forEach(function(bottleId){
                transaction.update(displayRef.doc(bottleId.toString()), {
                    "event.override": false,
                    "skin.override": ""
                });
            });
        });
    });
}

exports.drawBitmap = function(db, bottleMap, colormap, name){
    console.log(`----> [${new Date().toTimeString()}] Flashing 2D Bit Map Image ${name}`);
    // Get a new write batch
    let batch = db.batch();

    let displayRef = db.collection("display");

    for (let bottleId in bottleMap) {
        // skip loop if the property is from prototype
        if (!bottleMap.hasOwnProperty(bottleId)) continue;
        if (colormap.background === null && !bottleMap[bottleId]) continue;
        batch.update(displayRef.doc(bottleId.toString()), {
            "event.override": true,
            "skin.override": bottleMap[bottleId] ? colormap.foreground : colormap.background
        });
        
    }

    return batch.commit().then(function () {
        return true;
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.flashAnimatedSequence = function(db, animation){
    console.log(`----> Flashing Animated Bit Map Sequence`);

    // play first frame
    exports.drawBitmap(db, animation[0].map, animation[0].color, animation[0].name);
    let previousDuration = animation[0].duration;

    // remove first frame as we've already shown it. 
    animation.shift();

    return animation.reduce((promiseChain, currentTask) => {
        return promiseChain.then(chainResults =>
            new Promise((resolve, reject) => {
                let wait = setTimeout(() => {
                    exports.drawBitmap(db, currentTask.map, currentTask.color, currentTask.name).then(function (){
                        clearTimeout(wait);
                        resolve(currentTask.name);
                    });
                }, previousDuration);
                previousDuration = currentTask.duration;
            }).then(currentResult =>
                [ ...chainResults, currentResult ]
            )
        );
    }, Promise.resolve([])).then(data => { return exports.clearBitmap(db);});
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
                    // return;
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

                gameTransactionUpdate = { 0: board[0], 1: board[1], 2: board[2], 3: board[3], 4: board[4] };

                let bottleId = getConnect4BottleId(x_pos, y_pos);
                transaction.update(db.collection("display").doc(bottleId.toString()), {
                    "event.override": true,
                    "skin.override": data.currentPlayer
                });

                if (gameWon){                    
                    data['wins'][gameWon.player]++;
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

                    winningBottles = gameWon.coordinates.map(function(value){return getConnect4BottleId(value[0], value[1]);});
                    lostBottles = currentDisplayIds.filter(function(el){return !winningBottles.includes(parseInt(el));});

                    let displayRef = db.collection("display");
                    lostBottles.forEach(function(bottleId){
                        transaction.update(displayRef.doc(bottleId.toString()), {
                            "event.override": false,
                            "skin.override": ""
                        });
                    });

                    // Celebrate Winner
                    setTimeout(exports.flashAnimatedSequence, 5000, db, animationSequence[gameWon.player]);
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

let ticTacToeBoard = {99:0, 98:1, 97:0, 96:1, 95:0, 94:0, 93:0, 92:1, 91:0, 90:1, 89:0, 88:0, 87:0, 86:1, 85:0, 84:1, 83:0, 82:0, 81:0, 80:0, 79:1, 78:1, 77:1, 76:1, 75:1, 74:0, 73:1, 72:1, 71:1, 70:1, 69:1, 68:0, 67:1, 66:1, 65:1, 64:1, 63:1, 62:0, 61:0, 60:0, 59:0, 58:1, 57:0, 56:1, 55:0, 54:0, 53:0, 52:1, 51:0, 50:1, 49:0, 48:0, 47:0, 46:1, 45:0, 44:1, 43:0, 42:0, 41:0, 40:0, 39:1, 38:1, 37:1, 36:1, 35:1, 34:0, 33:1, 32:1, 31:1, 30:1, 29:1, 28:0, 27:1, 26:1, 25:1, 24:1, 23:1, 22:0, 21:0, 20:0, 19:0, 18:1, 17:0, 16:1, 15:0, 14:0, 13:0, 12:1, 11:0, 10:1, 9:0, 8:0, 7:0, 6:1, 5:0, 4:1, 3:0, 2:0, 1:0};
exports.displayTicTacToeBoards = function(db){
    return exports.drawBitmap(db, ticTacToeBoard, {foreground: 'black', background: null}, 'tic tac toe board');
}

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