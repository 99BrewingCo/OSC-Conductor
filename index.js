const admin = require('firebase-admin');
var diff = require('deep-diff').diff;
var game = require('./game.js');
var osc = require("osc");

// process arguments
var args = require('minimist')(process.argv.slice(2));

let remoteAddress = undefined;
let remotePort = undefined;

if (args === Object(args)){

    // remote port
    if (args.hasOwnProperty('remote-port') && args['remote-port'] !== undefined){
        // set remote option
        remotePort = args['remote-port'];
    } else {
        // load in remote options from disk
        let diskConfig = JSON.parse(fs.readFileSync('config.json'));
        remotePort = diskConfig.osc.remotePort;
    }

    // remote address
    if (args.hasOwnProperty('remote-address') && args['remote-address'] !== undefined){
        // set remote option
        remoteAddress = args['remote-address'];
    } else {
        // load in remote options from disk
        let diskConfig = JSON.parse(fs.readFileSync('config.json'));
        remoteAddress = diskConfig.osc.remoteAddress;
    }

    // save configured options
    if (args.hasOwnProperty('save') && args.save){
        // save remote to disk
        // load in remote options from disk
        let diskConfig = JSON.parse(fs.readFileSync('config.json'));

        // write to disk
        diskConfig.osc.remoteAddress = remoteAddress;
        diskConfig.osc.remotePort = remotePort;
        fs.writeFileSync('config.json', JSON.stringify(diskConfig));
    }
} else {
    console.error('something unexpected happened while parsing the command line arguments.');
    process.exit();
}

// Initalise Firestore Connection
var serviceAccount = require('./credentials/project-99-firestore.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({timestampsInSnapshots: true});

// Initalise OSC Controller
var oscController = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 8000,
    remotePort: remotePort,
    remoteAddress: remoteAddress
});

var gameBoard = {};

var displayUnsubscribeHandle = db.collection('display').onSnapshot(snapshot => {
    if (snapshot.empty) {
        console.error('No display document changes found.');
    } else {
        // Assemble Snapshot from Query
        let gameBoardSnapshot = {};
        snapshot.forEach(function (docSnapshot) {
            gameBoardSnapshot[docSnapshot.id] = docSnapshot.data();
        });

        // Determine Differences
        let differences = diff(gameBoard, gameBoardSnapshot);
        differences.forEach(difference => {
            // Newly Added Property / Element
            if (difference.kind == 'N'){
                if ('event' in difference.rhs){
                    // Event > Empty
                    if ('empty' in difference.rhs.event && difference.rhs.event.empty){
                        game.sendEmptyBottleStatus(oscController, difference.rhs.number);
                    } else {
                        game.clearEmptyBottleStatus(oscController, difference.rhs.number);
                    }

                    // Event > Animation Complete
                    if ('animationComplete' in difference.rhs.event && difference.rhs.event.animationComplete){
                        game.sendAnimationCompleteStatus(oscController, difference.rhs.number);
                    } else {
                        game.clearAnimationCompleteStatus(oscController, difference.rhs.number);
                    }

                    // Event > Name
                    if ('name' in difference.rhs.event && difference.rhs.event.name){
                        game.sendNameStatus(oscController, difference.rhs.number);
                    } else {
                        game.clearNameStatus(oscController, difference.rhs.number);
                    }

                    // Display Name
                    if ('display' in difference.rhs.event && difference.rhs.name.display){
                        game.sendName(oscController, difference.rhs.number, difference.rhs.name.display);
                    } else {
                        game.clearName(oscController, difference.rhs.number);
                    }
                }
            // Property / Element Edited
            } else if (difference.kind == 'E'){
                if (['event', 'empty'].every(path => difference.path.includes(path))){
                    if (difference.rhs){
                        game.sendEmptyBottleStatus(oscController, difference.path[0]);
                    } else {
                        game.clearEmptyBottleStatus(oscController, difference.path[0]);
                    }
                }

                if (['event', 'animationComplete'].every(path => difference.path.includes(path))){
                    if (difference.rhs){
                        game.sendAnimationCompleteStatus(oscController, difference.path[0]);
                    } else {
                        game.clearAnimationCompleteStatus(oscController, difference.path[0]);
                    }
                }

                if (['event', 'name'].every(path => difference.path.includes(path))){
                    if (difference.rhs){
                        game.sendNameStatus(oscController, difference.path[0]);
                    } else {
                        game.clearNameStatus(oscController, difference.path[0]);
                    }
                }

                if (['name', 'display'].every(path => difference.path.includes(path))){
                    if (difference.rhs){
                        game.sendName(oscController, difference.path[0], difference.rhs);
                    } else {
                        game.clearName(oscController, difference.path[0]);
                    }
                }
            // 
            } else {
                console.log(difference);
            }
        });

        gameBoard = gameBoardSnapshot;
    }
}, (error) => {
    console.log('Error getting documents', err);
});

var gameMeta = {};

var countUnsubscribeHandle = db.collection('count').onSnapshot(snapshot => {
    if (snapshot.empty) {
        console.error('No count document changes found.');
    } else {
        // Assemble Snapshot from Query
        let gameMetaSnapshot = {};
        snapshot.forEach(function (docSnapshot) {
            gameMetaSnapshot[docSnapshot.id] = docSnapshot.data();
        });

        // Determine Differences
        let differences = diff(gameMeta, gameMetaSnapshot);
        differences.forEach(difference => {
            // Newly Added Property / Element
            if (difference.kind == 'N'){
                // Game Round
                if (difference.rhs.round){
                    let round = parseInt(difference.rhs.round);
                    game.updateRound(oscController, round);

                    // Switch to Correct Page
                    if (difference.rhs.schedule[round] === undefined){
                        console.error(`----> Error: Unknown Round '${round}'`);
                    } else {
                        game.switchToUI(oscController, difference.rhs.schedule[round].game);
                    }
                }
                
                if (difference.rhs['0'] || difference.rhs['1'] || difference.rhs['2'] || difference.rhs['3']){
                    ['0', '1', '2', '3', '4'].forEach(y => {
                        if(difference.rhs[y]){
                            difference.rhs[y].forEach((player, x) => {
                                if (difference.rhs.game === 'connect4'){
                                    game.sendConnect4BottleStatus(oscController, player, x, y);
                                } else if (difference.rhs.game === 'tictactoe') {
                                    game.sendTicTacToeBottleStatus(oscController, player, x, y);
                                } else {
                                    console.error(`----> Error: Unknown Game`);
                                }
                            });
                        }
                    });
                }
            // Property / Element Edited
            } else if (difference.kind == 'E'){
                if (['current', 'round'].every(path => difference.path.includes(path))){
                    if (difference.rhs){
                        game.updateRound(oscController, difference.rhs);
                    }
                }
                if (['current', 'game'].every(path => difference.path.includes(path))){
                    if (difference.rhs){
                        game.switchToUI(oscController, difference.rhs);
                    }
                }
                if (difference.path[0] === 'connect4' && ['0', '1', '2', '3', '4'].some(path => difference.path.includes(path))){
                    game.sendConnect4BottleStatus(oscController, difference.rhs, difference.path[2], difference.path[1]);
                }
                if (difference.path[0] === 'tictactoe' && ['0', '1', '2'].some(path => difference.path.includes(path))){
                    game.sendTicTacToeBottleStatus(oscController, difference.rhs, difference.path[2], difference.path[1]);
                }
            // Property / Element Edited
            } else if (difference.kind == 'A'){
                if (['current', 'namePending'].every(path => difference.path.includes(path))){
                    // pass
                }
                if (['current', 'inProgress'].every(path => difference.path.includes(path))){
                    // pass
                }
            } else {
                console.log(difference);
            }
        });

        gameMeta = gameMetaSnapshot;
    }
}, (error) => {
    console.log('Error getting documents', err);
});

oscController.open();
oscController.on("message", function(message, timetag, info) {
    if (message.address == '/bottle/next/' && message.args[0] == 1){
        console.log('something is starting to work');
        game.startBottlePour(db);
    } else if (message.address == '/bottle/cancel/' && message.args[0] == 1){
        game.cancelBottlePour(db);
    } else if (message.address.indexOf('/bottle/trigger') > -1){
        let bottleId = message.address.split('/')[3];
        if (bottleId >= 1 && bottleId <= 99){
            game.triggerBottleEffect(bottleId);
        } else {
            console.error(`----> Error: Incorrect Index. Recieved Effect Trigger on Bottle with index <${bottleId}>.`);
        }
    }  else if (message.address.indexOf('/column/trigger') > -1){
        let columnId = message.address.split('/')[3];
        if (columnId >= 0 && columnId <= 19){
            game.triggerColumnMove(db, columnId);
        } else {
            console.error(`----> Error: Incorrect Index. Recieved Effect Trigger on Bottle with index <${columnId}>.`);
        }
    } else if (message.address.indexOf('/ttt/current/trigger/') > -1){
        let addressSplit = message.address.split('/');
        let xPos = addressSplit[5];
        let yPos = addressSplit[4];

        if ((xPos >= 0 && xPos <= 2) && (yPos >= 0 && yPos <= 2)){
            game.triggerTicTacToeMove(db, xPos, yPos);
        } else {
            console.error(`----> Error: Incorrect Index. Recieved Effect Trigger on Bottle with index <${columnId}>.`);
        }
    } else {
        console.log(message);
    }
});

process.on('SIGINT', function() {

    console.log("\nUnsubscribing from Display Game Board Updates.");
    displayUnsubscribeHandle();

    console.log("Unsubscribing from Game Meta Updates.");
    countUnsubscribeHandle();

    console.log("Closing connection to Firebase Cloud Firestore Database.");
    admin.app().delete();

    // console.log("Closing OSC Socket Collection");
    // socket.close();

    console.log("Exiting conductor application.");
    process.exit();
});