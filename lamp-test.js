var osc = require("osc");
var game = require('./game.js');
const delay = require('delay');

// Initalise OSC Controller
var oscController = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 8000,
    remotePort: 9000,
    remoteAddress: "192.168.0.8"
});

oscController.open();

oscController.on('ready', function (){
	(async () => {
		for (var i = 99; i > 0; i--) {
			console.log(`----> Lamp Test for Bottle ${i}`);

			// Send Empy Bottle
			// game.sendEmptyBottleStatus(oscController, i);
			game.clearEmptyBottleStatus(oscController, i);

			await delay(250);

			// Send Animation Complete
			// game.sendAnimationCompleteStatus(oscController, i);
			game.clearAnimationCompleteStatus(oscController, i);

			await delay(250);
			// Send Animation Name
			// game.sendName(oscController, i, `Name ${i}`);
			game.clearName(oscController, i);
		}
	})();
});

oscController.on("message", function(message, timetag, info) {
	console.log(message); 
});

oscController.on("error", function (err) {
    console.log(err);
});

