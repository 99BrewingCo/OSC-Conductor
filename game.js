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
        var currentRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentRef).then(function(current) {
            if (!current.exists) {
                return;
            }

            // Update Count
            let data = current.data();
            let newCount = data.count - 1;

            if (newCount > 0){

                data.inProgress.push(newCount);
                data.namePending.push(newCount);
                
                transaction.update(currentRef, {
                    count: newCount, // Update Current Count
                    inProgress: data.inProgress, // Add to in progress tracker
                    namePending: data.namePending // Add to name pending tracker
                });

                // Update Bottle Display
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
    return db.runTransaction(function(transaction) {
        var currentRef = db.collection("count").doc("current");
        // This code may get re-run multiple times if there are conflicts.
        return transaction.get(currentRef).then(function(current) {
            if (!current.exists) {
                return;
            }

            let data = current.data();
            if (data.inProgress.length > 0){
                let removed = data.inProgress.pop();
                
                transaction.update(currentRef, {
                    count: data.count + 1, // Update Current Count
                    inProgress: data.inProgress, // Add to in progress tracker
                    namePending: data.namePending.filter(bottle => bottle !== removed) // Add to name pending tracker
                });

                // Update Bottle Display
                var cancelledBottleRef = db.collection("display").doc(removed.toString());
                transaction.update(cancelledBottleRef, { "display.empty": false, "display.inProgress": false });
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

    // Send Name Status
    exports.sendNameStatus(oscClient, bottleId);

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