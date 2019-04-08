// import modules
const delay = require('delay');
const fs = require('fs');
var osc = require("osc");

// import project
var game = require('./game.js');

// process arguments
var args = require('minimist')(process.argv.slice(2));

let clear = false;
let remoteAddress = undefined;
let remotePort = undefined;

if (args === Object(args)){
	if (args.hasOwnProperty('clear') && args.clear !== undefined){
		if (args.clear){
			clear = true;
		}
	}

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

// Initalise OSC Controller
var oscController = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 8000,
    remotePort: remotePort,
    remoteAddress: remoteAddress
});

oscController.open();

oscController.on('ready', function (){
	(async () => {
		for (var i = 99; i > 0; i--) {
			console.log(`----> Lamp Test for Bottle ${i}`);

			// Send Empy Bottle
			if (!clear){
				game.sendEmptyBottleStatus(oscController, i);
			} else {
				game.clearEmptyBottleStatus(oscController, i);
			}

			await delay(250);

			// Send Animation Complete
			if (!clear){
				game.sendAnimationCompleteStatus(oscController, i);
			} else {
				game.clearAnimationCompleteStatus(oscController, i);
			}

			await delay(250);
			// Send Animation Name
			if (!clear){
				game.sendName(oscController, i, `Name ${i}`);
			} else {
				game.clearName(oscController, i);
			}
		}
	})();
});

oscController.on("message", function(message, timetag, info) {
	console.log(message);
});

oscController.on("error", function (err) {
    console.log(err);
});

