const admin = require('firebase-admin');
var diff = require('deep-diff').diff;
var game = require('./game.js');

var serviceAccount = require('./credentials/project-99-firestore.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

var gameBoard = {};

var displayUnsubscribeHandle = db.collection('display').onSnapshot(snapshot => {
    console.log(snapshot);
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
        console.log(differences);

        gameBoard = gameBoardSnapshot;
    }
}, (error) => {
    console.log('Error getting documents', err);
});

process.on('SIGINT', function() {
    console.log("\nUnsubscribing from Display Game Board Updates.");
    displayUnsubscribeHandle();

    console.log("Closing connection to Firebase Cloud Firestore Database.");
    admin.app().delete();

    console.log("Exiting conductor application.");
    process.exit();
});