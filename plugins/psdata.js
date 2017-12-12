const dex = require('../lib/dex.js');

exports.commands = {
	ds: function (channel, user, message) {
		dex.search('pokemon', message).then(results => {
			if (results.reply) {
				return channel.send(results.reply);
			} else if (results.data) {
				let displayed = results.data;
				if (channel.type === 'text') displayed = displayed.slice(0, 20);
				return channel.send(`ds ${message}: **${displayed.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);
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
				return channel.send(`randpoke ${message}: **${displayed.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);			
			}
		}, () => channel.send("Something went wrong running the dexsearch query. Please PM the bot's owner and tell them what you entered."));
	},
	movesearch: function (channel, user, message) {
		dex.search('move', message).then(results => {
			if (results.reply) {
				return channel.send(results.reply);
			} else if (results.data) {
				let displayed = results.data;
				if (channel.type === 'text') displayed = displayed.slice(0, 20);
				return channel.send(`movesearch ${message}: **${displayed.map(template => template.name).join(', ')}**${displayed.length !== results.data.length ? ` and ${results.data.length - displayed.length} more. Use this command in PM to see all results.` : ""}`);			
			}
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
	dt: function (channel, user, message) {
		dex.get(message).then(results => {
			if (results[0].reply) {
				return channel.send(results.reply);
			} else if (results[0].data) {
				let entry = results[0].data;
				if (entry.fullname.startsWith('pokemon')) {
					channel.send(
						`[${entry.num}] **${entry.name}**, a **${entry.types.join(',')}** Pokémon from Generation **${entry.gen}**. ` +
						`Abilities: **${Object.keys(entry.abilities).map(id => id === 'H' ? `__${entry.abilities[id]}__` : entry.abilities[id]).join(', ')}**. ` +
						`Base stats: **${Object.values(entry.baseStats).join('/')}**. Egg groups: **${entry.eggGroups.join(', ')}**. Tier: **${entry.tier}**. ` +
						`Randbats moves: _${entry.randomBattleMoves.join(', ')}_. Color: ${entry.color}. Height: ${entry.heightm}m. Weight: ${entry.weightkg}kg. `
					);
				} else if (entry.fullname.startsWith('move')) {
					channel.send(
						`**${entry.name}**, a **${entry.category} ${entry.type} type** ${entry.isZ ? 'Z-' : ''}move from Generation ${entry.gen}. ` +
						(entry.isZ ?
							`Effect: ${entry.shortDesc}. Requires ${entry.isZ}.` :
							`Description: **_${entry.desc}_**. Base Power: **${entry.basePower}**. Accuracy: **${entry.accuracy === true ? '-' : entry.accuracy}**. PP: **${entry.pp}**. ` +
							('contact' in entry.flags ? "Makes contact. " : '') +
							(entry.zMovePower ? `Z-Power: ${entry.zMovePower}` : `Z-effect: ${entry.zMoveEffect}`) +
							`Contest Type: ${entry.contestType}. Priority: ${entry.priority}.`
						)
					);
				} else if (entry.fullname.startsWith('item')) {
					channel.send(
						`**${entry.name}**, ${entry.isBerry ? 'a berry' : 'an item'} from Generation ${entry.gen}. ` +
						`Description: _${entry.desc}_ ` +
						(entry.naturalGift ? `Natural Gift: ${entry.naturalGift.basePower}BP ${entry.naturalGift.type}. ` : '') +
						(entry.fling ? `Fling BP: ${entry.fling.basePower}${entry.fling.status ? ` ${entry.fling.status}` : ''}${entry.fling.volatileStatus ? ` ${entry.fling.volatileStatus}` : ''}. ` : '')
					);
				} else {
					channel.send("Error: Unrecognized data type.");
				}
			}
		});
	},
};
