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

            transaction.update(currentCountRef, { count: 100 });

            for (var i = 99; i > 0; i--) {
                transaction.update(db.collection('display').doc(i.toString()), {
                    display: {
                        empty: false,
                        inProgress: false,
                        name: false
                    },
                    name:{
                        display: '',
                        first: '',
                        last: ''
                    },
                    number: i.toString(),
                    skin:{
                        color: 'black',
                        override: ''
                    }
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
        var currentCountRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentCountRef).then(function(currentCount) {
            if (!currentCount.exists) {
                return;
            }

            // Update Count
            var newCount = currentCount.data().count - 1;

            if (newCount > 0){
                transaction.update(currentCountRef, { count: newCount });

                // Update 
                var newBottleRef = db.collection("display").doc(newCount.toString());
                transaction.update(newBottleRef, { "display.empty": true, "display.inProgress": true });
                return true;               
            } else {
                return -1; // return exports.resetGameBoard(db);
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
}

exports.triggerBottleEffect = function (bottleId){
    console.log(`----> Trigger Effect on Bottle ${bottleId}`);
}

exports.sendEmptyBottleStatus = function(oscClient, bottleId){
    // console.log(`----> Sending Empy Bottle Status for Bottle ${bottleId}`);
    return oscClient.send({
        address: `/bottle/status/${bottleId}`,
        args: [
            {
                type: "f",
                value: 1.0
            }
        ]
    });
}

exports.clearEmptyBottleStatus = function(oscClient, bottleId){
    // console.log(`----> Clearing Empy Bottle Status for Bottle ${bottleId}`);
    return oscClient.send({
        address: `/bottle/status/${bottleId}`,
        args: [
            {
                type: "f",
                value: 0.0
            }
        ]
    });
}