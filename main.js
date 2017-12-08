const Discord = require("discord.js");
const config = require('./config.json');

global.client = new Discord.Client();

let parser;

client.on('ready', () => {
	console.log(`[STATUS] Logged in as ${client.user.tag}`);
	parser = require('./parser.js');
});

client.on('message', msg => {
	if (msg.author.tag === client.user.tag) return;
	parser.parse(msg);
});

console.log("[STATUS] Logging in...");
client.login(config.token);
