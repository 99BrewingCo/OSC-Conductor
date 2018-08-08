var FieldValue = require('firebase-admin').firestore.FieldValue;

/**
 *  Reset's The Game Board
 */
exports.resetGameBoard = function (db){
    console.log("----> Reset Game Board");
    return db.runTransaction(function(transaction) {
        var currentCountRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentCountRef).then(function(currentCount) {
            if (!currentCount.exists) {
                return;
            }

            transaction.update(currentCountRef, {game: 1, count: 100, inProgress: [], namePending: []});

            for (var i = 99; i > 0; i--) {
                transaction.set(db.collection('display').doc(i.toString()), {
                    number: i.toString(),
                    event: {empty: false, animationComplete: false, name: false},
                    name:{display: '', first: '', last: ''},
                    skin:{color: 'black', override: ''}
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
                transaction.delete(removed.ref);
           }
        });
    }).catch(function(error) {
        console.error("Transaction failed: ", error);
    });
}

exports.triggerBottleEffect = function (bottleId){
    console.log(`----> Trigger Effect on Bottle ${bottleId}`);
}

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