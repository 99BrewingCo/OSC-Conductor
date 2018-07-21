/**
 *  Reset's The Game Board
 */
exports.resetGameBoard = function (db){
    for (var i = 99; i >= 0; i--) {
        db.collection('display').doc(i.toString()).set({
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
}