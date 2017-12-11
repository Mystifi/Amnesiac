const dex = require('../lib/dex.js');

exports.commands = {
	ds: function (channel, user, message) {
		dex.search('pokemon', message).then(results => {
			if (results.reply) {
				return channel.send(results.reply);
			} else if (results.data) {
				let displayed = results.data;
				if (channel.type === 'text') displayed = displayed.slice(0, 20);
				return channel.send(`ds ${message}: **${results.data.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);
			}
		}, () => channel.send("Something went wrong running the dexsearch query. Please PM the bot's owner and tell them what you entered."));
	},
	randpoke: function (channel, user, message) {
		dex.search('randpoke', message).then(results => {
			if (results.reply) {
				return channel.send(results.reply);
			} else if (results.data) {
				let displayed = results.data;
				if (channel.type === 'text') displayed = displayed.slice(0, 20);
				return channel.send(`randpoke ${message}: **${results.data.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);			}
		}, () => channel.send("Something went wrong running the dexsearch query. Please PM the bot's owner and tell them what you entered."));
	},
	movesearch: function (channel, user, message) {
		dex.search('move', message).then(results => {
			if (results.reply) {
				return channel.send(results.reply);
			} else if (results.data) {
				let displayed = results.data;
				if (channel.type === 'text') displayed = displayed.slice(0, 20);
				return channel.send(`movesearch ${message}: **${results.data.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);			}
		}, () => channel.send("Something went wrong running the dexsearch query. Please PM the bot's owner and tell them what you entered."));
	},
	itemsearch: function (channel, user, message) {
		dex.search('item', message).then(results => {
			if (results.reply) {
				return channel.send(results.reply);
			} else if (results.data) {
				let displayed = results.data;
				if (channel.type === 'text') displayed = displayed.slice(0, 20);
				return channel.send(`itemsearch ${message}: **${results.data.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);			}
		}, () => channel.send("Something went wrong running the dexsearch query. Please PM the bot's owner and tell them what you entered."));
	},
};
