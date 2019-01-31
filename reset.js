const admin = require('firebase-admin');
var game = require('./game.js');

// Initalise Firestore Connection
var serviceAccount = require('./credentials/project-99-firestore.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({timestampsInSnapshots: true});

game.resetGameBoard(db, true).then(function (){
    console.log("Closing connection to Firebase Cloud Firestore Database.");
    admin.app().delete();

    console.log("Exiting conductor application.");
    process.exit();	
});