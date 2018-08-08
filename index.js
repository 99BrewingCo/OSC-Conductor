const admin = require('firebase-admin');
var diff = require('deep-diff').diff;
var game = require('./game.js');
var osc = require("osc");

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
    remotePort: 9000,
    remoteAddress: "192.168.0.8"
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
            if (difference.kind == 'N'){
                // Event > Empty
                if (difference.rhs.event.empty){
                    game.sendEmptyBottleStatus(oscController, difference.rhs.number);
                } else {
                    game.clearEmptyBottleStatus(oscController, difference.rhs.number);
                }

                // Event > Animation Complete
                if (difference.rhs.event.animationComplete){
                    game.sendAnimationCompleteStatus(oscController, difference.rhs.number);
                } else {
                    game.clearAnimationCompleteStatus(oscController, difference.rhs.number);
                }

                // Event > Name
                if (difference.rhs.event.name){
                    game.sendNameStatus(oscController, difference.rhs.number);
                } else {
                    game.clearNameStatus(oscController, difference.rhs.number);
                }

                // Display Name
                if (difference.rhs.name.display){
                    game.sendName(oscController, difference.rhs.number, difference.rhs.name.display);
                } else {
                    game.clearName(oscController, difference.rhs.number);
                }
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
            if (difference.kind == 'N'){
                // Game Round
                if (difference.rhs.game){
                    game.updateRound(oscController, difference.rhs.game);
                }
            } else if (difference.kind == 'E'){
                if (difference.path.includes('game')){
                    if (difference.rhs){
                        game.updateRound(oscController, difference.rhs);
                    }
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