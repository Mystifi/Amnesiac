const fs = require('fs');
const config = require('./config.json');

const commands = new Map();
const chatParsers = [];

print("[STATUS] Loading commands");

fs.readdirSync('./plugins')
	.filter((file) => file.endsWith('.js'))
	.forEach((file) => {
		let plugin = require(`./plugins/${file}`);
		if (plugin.commands) {
			for (let cmd in plugin.commands) {
				commands.set(cmd, plugin.commands[cmd]);
			}
		}
		if (plugin.parsers) {
			if (plugin.parsers.chat) {
				chatParsers.push(plugin.parsers.chat);
			}
		}
	});

print("[STATUS] Setup done.");

function nameFromId(id) {
	const user = client.users.get(id);
	if (!user) return "Unknown User";
	return user.username;
}

function parseIds(msg) {
	return msg.replace(/\<@\!?([0-9]{18})\>/g, (match, p1) => nameFromId(p1));
}

async function parse(msg) {
	if (msg.content.startsWith(config.commandToken)) {
		const cmd = msg.content.split(' ')[0].slice(config.commandToken.length);
		if (commands.has(cmd)) {
			commands.get(cmd).call({parseIds: parseIds, nameFromId: nameFromId}, msg.channel, msg.author, msg.content.split(' ').slice(1).join(' '));
		} else if (msg.channel.type === 'dm') {
			msg.channel.send(`Unknown command: ${cmd}`);
		}
	} else if (msg.channel.type === 'text') {
		for (let parser of chatParsers) {
			parser.call({parseIds: parseIds, nameFromId: nameFromId}, msg.channel, msg.author, msg.content, msg);
		}
	}
}

module.exports = {parse: parse};
