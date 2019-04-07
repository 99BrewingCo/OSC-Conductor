var request = require('request');

const admin = require('firebase-admin');
var game = require('./game.js');

// Initalise Firestore Connection
var serviceAccount = require('./credentials/project-99-firestore.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({timestampsInSnapshots: true});

console.log('started or something');
var displayUnsubscribeHandle = db.collection('display').onSnapshot(snapshot => {
    if (snapshot.empty) {
        console.error('No display document changes found.');
    } else {
      console.log('new snapshot');
      // Assemble Snapshot from Query
      let gameBoardSnapshot = {};
      snapshot.forEach(function (docSnapshot) {
          gameBoardSnapshot[docSnapshot.id] = docSnapshot.data();
      });

      console.log(gameBoardSnapshot);
      request({
        uri: 'http://127.0.0.1:12132/model',
        method: 'POST',
        json: gameBoardSnapshot
      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          console.log('responded :)', body);
        }else {
          console.log('wtf', error, response, body);
        }
      });
    }
}, (error) => {
    console.log('Error getting documents', err);
});

process.on('SIGINT', function() {
    console.log("Closing connection to Firebase Cloud Firestore Database.");
    admin.app().delete();

    console.log("Exiting conductor application.");
    process.exit();
});