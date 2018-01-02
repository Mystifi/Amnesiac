const Discord = require("discord.js");
const config = require('./config.json');

global.client = new Discord.Client();

global.print = function (message) {
	if (process.send) {
		process.send(`msg|${message}`);
	} else {
		console.log(message);
	}
};

let parser;

client.on('ready', () => {
	print(`[STATUS] Logged in as ${client.user.tag}`);
	parser = require('./parser.js');
});

client.on('message', msg => {
	if (msg.author.tag === client.user.tag) return;
	parser.parse(msg);
});

print("[STATUS] Logging in...");
client.login(config.token);
