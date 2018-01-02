'use strict';

global.toId = function(text) {
	if (text && text.id) {
		text = text.id;
	} else if (text && text.userid) {
		text = text.userid;
	}
	if (typeof text !== 'string' && typeof text !== 'number') return '';
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
};

const childProcess = require('child_process');

let Dex;

// Code for downloading PS data files taken from TIBot (and by extension The Immortal)
const dataFiles = [
	'config/formats.js',
	'data/abilities.js',
	'data/formats-data.js',
	'data/items.js',
	'data/learnsets.js',
	'data/moves.js',
	'data/pokedex.js',
	'data/typechart.js',
	'sim/dex-data.js',
	'sim/dex.js',
];

let loaded = new Promise(resolve => {
	let command = dataFiles.map(file => `wget -O ${file} https://raw.githubusercontent.com/Zarel/Pokemon-Showdown/master/${file}`).join(' && ');
	command = `cd lib && mkdir -p data && mkdir -p sim && mkdir -p mods && mkdir -p config && ${command} && grep -Ev mod: config/formats.js > config/temp && mv config/temp config/formats.js`;

	childProcess.exec(command).on('exit', () => {
		Dex = require('./sim/dex.js');
		resolve(true);
	}).on('error', err => {
		print(`ERROR while loading sim data: ${err.stack}`);
		resolve(false);
	});
});

async function getData(target) {
	if (!Dex) await loaded;
	let targetId = toId(target);
	if (!targetId) return [];
	let targetNum = parseInt(targetId);
	if (!isNaN(targetNum) && '' + targetNum === target) {
		for (let p in Dex.data.Pokedex) {
			let pokemon = Dex.getTemplate(p);
			if (pokemon.num === targetNum) {
				target = pokemon.species;
				targetId = pokemon.id;
				break;
			}
		}
	}

	let newTargets = Dex.dataSearch(target);
	if (newTargets && newTargets.length) {
		let output = [];
		newTargets.forEach(t => {
			let data;
			switch (t.searchType) {
			case 'nature':
				data = Dex.getNature(t.name);
				break;
			case 'pokemon':
				data = Dex.getTemplate(t.name);
				break;
			case 'item':
				data = Dex.getItem(t.name);
				break;
			case 'move':
				data = Dex.getMove(t.name);
				break;
			case 'ability':
				data = Dex.getAbility(t.name);
				break;
			default:
				break;
			}
			output.push({type: t.searchType, data: data});
		});

		return output;
	}

	return [];
}

async function dataSearch(type, query) {
	if (!Dex) await loaded;

	switch (type) {
	case 'randpoke':
		query = `random 1${query ? `, ${query}` : ''}`;
	case 'pokemon':
		return runDexsearch(query);
	case 'move':
		return runMovesearch(query);
	case 'item':
		return runItemsearch(query);
	default:
		return {reply: "Invalid query type."};
	}
}

function runDexsearch(target) {
	let searches = [];
	let allTiers = {'uber': 'Uber', 'ubers': 'Uber', 'ou': 'OU', 'bl': 'BL', 'uu': 'UU', 'bl2': 'BL2', 'ru': 'RU', 'bl3': 'BL3', 'nu': 'NU', 'bl4': 'BL4', 'pu': 'PU', 'nfe': 'NFE', 'lcuber': 'LC Uber', 'lcubers': 'LC Uber', 'lc': 'LC', 'cap': 'CAP', 'caplc': 'CAP LC', 'capnfe': 'CAP NFE', __proto__: null};
	let allTypes = Object.create(null);
	for (let i in Dex.data.TypeChart) {
		allTypes[toId(i)] = i;
	}
	let allColours = {'green': 1, 'red': 1, 'blue': 1, 'white': 1, 'brown': 1, 'yellow': 1, 'purple': 1, 'pink': 1, 'gray': 1, 'black': 1, __proto__: null};
	let allEggGroups = {'amorphous': 'Amorphous', 'bug': 'Bug', 'ditto': 'Ditto', 'dragon': 'Dragon', 'fairy': 'Fairy', 'field': 'Field', 'flying': 'Flying', 'grass': 'Grass', 'humanlike': 'Human-Like', 'mineral': 'Mineral', 'monster': 'Monster', 'undiscovered': 'Undiscovered', 'water1': 'Water 1', 'water2': 'Water 2', 'water3': 'Water 3', __proto__: null};
	let allStats = {'hp': 1, 'atk': 1, 'def': 1, 'spa': 1, 'spd': 1, 'spe': 1, 'bst': 1, 'weight': 1, 'height': 1, 'gen': 1, __proto__: null};
	let megaSearch = null;
	let capSearch = null;
	let randomOutput = 0;
	let maxGen = 0;
	let validParameter = (cat, param, isNotSearch, input) => {
		let uniqueTraits = {'colors': 1, 'gens': 1};
		for (let h = 0; h < searches.length; h++) {
			let group = searches[h];
			if (group[cat] === undefined) continue;
			if (group[cat][param] === undefined) {
				if (cat in uniqueTraits) {
					for (let currentParam in group[cat]) {
						if (group[cat][currentParam] !== isNotSearch) return `A Pokémon cannot have multiple ${cat}.`;
					}
				}
				continue;
			}
			if (group[cat][param] === isNotSearch) {
				return `A search cannot both include and exclude '${input}'.`;
			}
			return `The search included '${(isNotSearch ? "!" : "") + input}' more than once.`;
		}
		return false;
	};

	let andGroups = target.split(',');
	for (let i = 0; i < andGroups.length; i++) {
		let orGroup = {abilities: {}, tiers: {}, colors: {}, 'egg groups': {}, gens: {}, moves: {}, types: {}, resists: {}, stats: {}, skip: false};
		let parameters = andGroups[i].split("|");
		if (parameters.length > 3) return {reply: "No more than 3 alternatives for each parameter may be used."};
		for (let j = 0; j < parameters.length; j++) {
			let isNotSearch = false;
			target = parameters[j].trim().toLowerCase();
			if (target.charAt(0) === '!') {
				isNotSearch = true;
				target = target.substr(1);
			}

			let targetAbility = Dex.getAbility(target);
			if (targetAbility.exists) {
				let invalid = validParameter("abilities", targetAbility, isNotSearch, targetAbility);
				if (invalid) return {reply: invalid};
				orGroup.abilities[targetAbility] = !isNotSearch;
				continue;
			}

			if (toId(target) in allTiers) {
				target = allTiers[toId(target)];
				if (target.startsWith("CAP")) {
					if (capSearch === isNotSearch) return {reply: "A search cannot both include and exclude CAP tiers."};
					capSearch = !isNotSearch;
				}
				let invalid = validParameter("tiers", target, isNotSearch, target);
				if (invalid) return {reply: invalid};
				orGroup.tiers[target] = !isNotSearch;
				continue;
			}

			if (target in allColours) {
				target = target.charAt(0).toUpperCase() + target.slice(1);
				let invalid = validParameter("colors", target, isNotSearch, target);
				if (invalid) return {reply: invalid};
				orGroup.colors[target] = !isNotSearch;
				continue;
			}

			let targetMove = Dex.getMove(target);
			if (targetMove.exists) {
				let invalid = validParameter("moves", targetMove.id, isNotSearch, target);
				if (invalid) return {reply: invalid};
				orGroup.moves[targetMove.id] = !isNotSearch;
				continue;
			}

			let targetType;
			if (target.endsWith('type')) {
				targetType = toId(target.substring(0, target.indexOf('type')));
			} else {
				targetType = toId(target);
			}
			if (targetType in allTypes) {
				target = allTypes[targetType];
				if ((orGroup.types[target] && isNotSearch) || (orGroup.types[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a type.'};
				orGroup.types[target] = !isNotSearch;
				continue;
			}

			if (target.substr(0, 6) === 'maxgen') {
				maxGen = parseInt(target[6]);
				if (!maxGen || maxGen < 1 || maxGen > 7) return {reply: "The generation must be between 1 and 7"};
				orGroup.skip = true;
				continue;
			}

			let groupIndex = target.indexOf('group');
			if (groupIndex === -1) groupIndex = target.length;
			if (groupIndex !== target.length || toId(target) in allEggGroups) {
				target = toId(target.substring(0, groupIndex));
				if (target in allEggGroups) {
					target = allEggGroups[toId(target)];
					let invalid = validParameter("egg groups", target, isNotSearch, target);
					if (invalid) return {reply: invalid};
					orGroup['egg groups'][target] = !isNotSearch;
					continue;
				} else {
					return {reply: `'${target}' is not a recognized egg group.`};
				}
			}
			if (toId(target) in allEggGroups) {
				target = allEggGroups[toId(target)];
				let invalid = validParameter("egg groups", target, isNotSearch, target);
				if (invalid) return {reply: invalid};
				orGroup['egg groups'][target] = !isNotSearch;
				continue;
			}

			let targetInt = 0;
			if (target.substr(0, 1) === 'g' && Number.isInteger(parseFloat(target.substr(1)))) {
				targetInt = parseInt(target.substr(1).trim());
			} else if (target.substr(0, 3) === 'gen' && Number.isInteger(parseFloat(target.substr(3)))) {
				targetInt = parseInt(target.substr(3).trim());
			}
			if (targetInt > 0 && targetInt < 8) {
				let invalid = validParameter("gens", targetInt, isNotSearch, target);
				if (invalid) return {reply: invalid};
				orGroup.gens[targetInt] = !isNotSearch;
				continue;
			}

			if (target.substr(0, 6) === 'random') {
				randomOutput = parseInt(target.substr(6));
				orGroup.skip = true;
				continue;
			}

			if (target === 'megas' || target === 'mega') {
				if (megaSearch === isNotSearch) return {reply: "A search cannot include and exclude 'mega'."};
				if (parameters.length > 1) return {reply: "The parameter 'mega' cannot have alternative parameters"};
				megaSearch = !isNotSearch;
				orGroup.skip = true;
				break;
			}

			if (target === 'recovery') {
				if (parameters.length > 1) return {reply: "The parameter 'recovery' cannot have alternative parameters"};
				let recoveryMoves = ["recover", "roost", "moonlight", "morningsun", "synthesis", "milkdrink", "slackoff", "softboiled", "wish", "healorder", "shoreup"];
				for (let k = 0; k < recoveryMoves.length; k++) {
					let invalid = validParameter("moves", recoveryMoves[k], isNotSearch, target);
					if (invalid) return {reply: invalid};
					if (isNotSearch) {
						let bufferObj = {moves: {}};
						bufferObj.moves[recoveryMoves[k]] = false;
						searches.push(bufferObj);
					} else {
						orGroup.moves[recoveryMoves[k]] = true;
					}
				}
				if (isNotSearch) orGroup.skip = true;
				break;
			}

			if (target === 'zrecovery') {
				if (parameters.length > 1) return {reply: "The parameter 'zrecovery' cannot have alternative parameters"};
				let recoveryMoves = ["aromatherapy", "bellydrum", "conversion2", "haze", "healbell", "mist", "psychup", "refresh", "spite", "stockpile", "teleport", "transform"];
				for (let k = 0; k < recoveryMoves.length; k++) {
					let invalid = validParameter("moves", recoveryMoves[k], isNotSearch, target);
					if (invalid) return {reply: invalid};
					if (isNotSearch) {
						let bufferObj = {moves: {}};
						bufferObj.moves[recoveryMoves[k]] = false;
						searches.push(bufferObj);
					} else {
						orGroup.moves[recoveryMoves[k]] = true;
					}
				}
				if (isNotSearch) orGroup.skip = true;
				break;
			}

			if (target === 'priority') {
				if (parameters.length > 1) return {reply: "The parameter 'priority' cannot have alternative parameters"};
				for (let move in Dex.data.Movedex) {
					let moveData = Dex.getMove(move);
					if (moveData.category === "Status" || moveData.id === "bide") continue;
					if (moveData.priority > 0) {
						let invalid = validParameter("moves", move, isNotSearch, target);
						if (invalid) return {reply: invalid};
						if (isNotSearch) {
							let bufferObj = {moves: {}};
							bufferObj.moves[move] = false;
							searches.push(bufferObj);
						} else {
							orGroup.moves[move] = true;
						}
					}
				}
				if (isNotSearch) orGroup.skip = true;
				break;
			}

			if (target.substr(0, 8) === 'resists ') {
				let targetResist = target.substr(8, 1).toUpperCase() + target.substr(9);
				if (targetResist in Dex.data.TypeChart) {
					let invalid = validParameter("resists", targetResist, isNotSearch, target);
					if (invalid) return {reply: invalid};
					orGroup.resists[targetResist] = !isNotSearch;
					continue;
				} else {
					return {reply: `'${targetResist}' is not a recognized type.`};
				}
			}

			let inequality = target.search(/>|<|=/);
			if (inequality >= 0) {
				if (isNotSearch) return {reply: "You cannot use the negation symbol '!' in stat ranges."};
				if (target.charAt(inequality + 1) === '=') {
					inequality = target.substr(inequality, 2);
				} else {
					inequality = target.charAt(inequality);
				}
				let targetParts = target.replace(/\s/g, '').split(inequality);
				let num, stat;
				let directions = [];
				if (!isNaN(targetParts[0])) {
					// e.g. 100 < spe
					num = parseFloat(targetParts[0]);
					stat = targetParts[1];
					if (inequality[0] === '>') directions.push('less');
					if (inequality[0] === '<') directions.push('greater');
				} else if (!isNaN(targetParts[1])) {
					// e.g. spe > 100
					num = parseFloat(targetParts[1]);
					stat = targetParts[0];
					if (inequality[0] === '<') directions.push('less');
					if (inequality[0] === '>') directions.push('greater');
				} else {
					return {reply: `No value given to compare with '${target}'.`};
				}
				if (inequality.slice(-1) === '=') directions.push('equal');
				switch (toId(stat)) {
				case 'attack': stat = 'atk'; break;
				case 'defense': stat = 'def'; break;
				case 'specialattack': stat = 'spa'; break;
				case 'spc': stat = 'spa'; break;
				case 'special': stat = 'spa'; break;
				case 'spatk': stat = 'spa'; break;
				case 'specialdefense': stat = 'spd'; break;
				case 'spdef': stat = 'spd'; break;
				case 'speed': stat = 'spe'; break;
				case 'wt': stat = 'weight'; break;
				case 'ht': stat = 'height'; break;
				case 'generation': stat = 'gen'; break;
				}
				if (!(stat in allStats)) return {reply: `'${target}' did not contain a valid stat.`};
				if (!orGroup.stats[stat]) orGroup.stats[stat] = {};
				for (let direction of directions) {
					if (orGroup.stats[stat][direction]) return {reply: `Invalid stat range for ${stat}.`};
					orGroup.stats[stat][direction] = num;
				}
				continue;
			}
			return {reply: `'${target}' could not be found in any of the search categories.`};
		}
		if (!orGroup.skip) {
			searches.push(orGroup);
		}
	}
	if (!maxGen) maxGen = 7;
	let dex = {};
	for (let pokemon in Dex.data.Pokedex) {
		let template = Dex.getTemplate(pokemon);
		let megaSearchResult = (megaSearch === null || (megaSearch === true && template.isMega) || (megaSearch === false && !template.isMega));
		if (template.gen <= maxGen && template.tier !== 'Unreleased' && template.tier !== 'Illegal' && (!template.tier.startsWith("CAP") || capSearch) && megaSearchResult) {
			dex[pokemon] = template;
		}
	}

	// Prioritize searches with the least alternatives.
	const accumulateKeyCount = (count, searchData) => count + (typeof searchData === 'object' ? Object.keys(searchData).length : 0);
	searches.sort((a, b) => Object.values(a).reduce(accumulateKeyCount, 0) - Object.values(b).reduce(accumulateKeyCount, 0));

	for (let group = 0; group < searches.length; group++) {
		let alts = searches[group];
		if (alts.skip) continue;
		for (let mon in dex) {
			let matched = false;
			if (alts.gens && Object.keys(alts.gens).length) {
				if (alts.gens[dex[mon].gen]) continue;
				if (Object.values(alts.gens).includes(false) && alts.gens[dex[mon].gen] !== false) continue;
			}

			if (alts.colors && Object.keys(alts.colors).length) {
				if (alts.colors[dex[mon].color]) continue;
				if (Object.values(alts.colors).includes(false) && alts.colors[dex[mon].color] !== false) continue;
			}

			for (let eggGroup in alts['egg groups']) {
				if (dex[mon].eggGroups.includes(eggGroup) === alts['egg groups'][eggGroup]) {
					matched = true;
					break;
				}
			}

			if (alts.tiers && Object.keys(alts.tiers).length) {
				if (alts.tiers[dex[mon].tier]) continue;
				if (Object.values(alts.tiers).includes(false) && alts.tiers[dex[mon].tier] !== false) continue;
				// some LC Pokemon are also in other tiers and need to be handled separately
				if (alts.tiers.LC && !dex[mon].prevo && dex[mon].nfe) continue;
			}

			for (let type in alts.types) {
				if (dex[mon].types.includes(type) === alts.types[type]) {
					matched = true;
					break;
				}
			}
			if (matched) continue;

			for (let type in alts.resists) {
				let effectiveness = 0;
				let notImmune = Dex.getImmunity(type, dex[mon]);
				if (notImmune) effectiveness = Dex.getEffectiveness(type, dex[mon]);
				if (!alts.resists[type]) {
					if (notImmune && effectiveness >= 0) matched = true;
				} else if (!notImmune || effectiveness < 0) {matched = true;}
			}
			if (matched) continue;

			for (let ability in alts.abilities) {
				if (Object.values(dex[mon].abilities).includes(ability) === alts.abilities[ability]) {
					matched = true;
					break;
				}
			}
			if (matched) continue;

			for (let stat in alts.stats) {
				let monStat = 0;
				if (stat === 'bst') {
					for (let monStats in dex[mon].baseStats) {
						monStat += dex[mon].baseStats[monStats];
					}
				} else if (stat === 'weight') {
					monStat = dex[mon].weightkg;
				} else if (stat === 'height') {
					monStat = dex[mon].heightm;
				} else if (stat === 'gen') {
					monStat = dex[mon].gen;
				} else {
					monStat = dex[mon].baseStats[stat];
				}
				if (typeof alts.stats[stat].less === 'number') {
					if (monStat < alts.stats[stat].less) {
						matched = true;
						break;
					}
				}
				if (typeof alts.stats[stat].greater === 'number') {
					if (monStat > alts.stats[stat].greater) {
						matched = true;
						break;
					}
				}
				if (typeof alts.stats[stat].equal === 'number') {
					if (monStat === alts.stats[stat].equal) {
						matched = true;
						break;
					}
				}
			}
			if (matched) continue;

			if (alts.moves && Object.keys(alts.moves).length) {
				let failed = false;
				for (let move in alts.moves) {
					if (!dex[mon].learnset) {
						failed = true;
						break;
					}
					if (!dex[mon].learnset[move]) failed = true;
				}
				if (!failed) continue;
			}

			delete dex[mon];
		}
	}
	let results = [];
	for (let mon in dex) {
		if (dex[mon].baseSpecies && results.includes(dex[mon].baseSpecies)) continue;
		results.push(dex[mon]);
	}

	if (randomOutput && randomOutput < results.length) {
		results = Dex.shuffle(results).slice(0, randomOutput);
	}

	return {data: results};
}

function runMovesearch(target) {
	let targets = target.split(',');
	let searches = [];
	let allCategories = {'physical': 1, 'special': 1, 'status': 1};
	let allContestTypes = {'beautiful': 1, 'clever': 1, 'cool': 1, 'cute': 1, 'tough': 1};
	let allProperties = {'basePower': 1, 'accuracy': 1, 'priority': 1, 'pp': 1};
	let allFlags = {'authentic': 1, 'bite': 1, 'bullet': 1, 'contact': 1, 'defrost': 1, 'powder': 1, 'pulse': 1, 'punch': 1, 'secondary': 1, 'snatch': 1, 'sound': 1};
	let allStatus = {'psn': 1, 'tox': 1, 'brn': 1, 'par': 1, 'frz': 1, 'slp': 1};
	let allVolatileStatus = {'flinch': 1, 'confusion': 1, 'partiallytrapped': 1};
	let allBoosts = {'hp': 1, 'atk': 1, 'def': 1, 'spa': 1, 'spd': 1, 'spe': 1, 'accuracy': 1, 'evasion': 1};
	let allTypes = {};
	for (let i in Dex.data.TypeChart) {
		allTypes[toId(i)] = i;
	}
	let lsetData = {};
	let targetMon = '';
	for (let i = 0; i < targets.length; i++) {
		let orGroup = {types: {}, categories: {}, contestTypes: {}, flags: {}, gens: {}, recovery: {}, mon: {}, property: {}, boost: {}, lower: {}, zboost: {}, status: {}, volatileStatus: {}, skip: false};
		let parameters = targets[i].split("|");
		if (parameters.length > 3) return {reply: "No more than 3 alternatives for each parameter may be used."};
		for (let j = 0; j < parameters.length; j++) {
			let isNotSearch = false;
			target = parameters[j].toLowerCase().trim();
			if (target.charAt(0) === '!') {
				isNotSearch = true;
				target = target.substr(1);
			}
			let targetType;
			if (target.endsWith('type')) {
				targetType = toId(target.substring(0, target.indexOf('type')));
			} else {
				targetType = toId(target);
			}
			if (targetType in allTypes) {
				target = allTypes[targetType];
				if ((orGroup.types[target] && isNotSearch) || (orGroup.types[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a type.'};
				orGroup.types[target] = !isNotSearch;
				continue;
			}

			if (target in allCategories) {
				target = target.charAt(0).toUpperCase() + target.substr(1);
				if ((orGroup.categories[target] && isNotSearch) || (orGroup.categories[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a category.'};
				orGroup.categories[target] = !isNotSearch;
				continue;
			}

			if (target in allContestTypes) {
				target = target.charAt(0).toUpperCase() + target.substr(1);
				if ((orGroup.contestTypes[target] && isNotSearch) || (orGroup.contestTypes[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a contest condition.'};
				orGroup.contestTypes[target] = !isNotSearch;
				continue;
			}

			if (target === 'bypassessubstitute') target = 'authentic';
			if (target in allFlags) {
				if ((orGroup.flags[target] && isNotSearch) || (orGroup.flags[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include \'' + target + '\'.'};
				orGroup.flags[target] = !isNotSearch;
				continue;
			}

			let targetInt = 0;
			if (target.substr(0, 1) === 'g' && Number.isInteger(parseFloat(target.substr(1)))) {
				targetInt = parseInt(target.substr(1).trim());
			} else if (target.substr(0, 3) === 'gen' && Number.isInteger(parseFloat(target.substr(3)))) {
				targetInt = parseInt(target.substr(3).trim());
			}

			if (targetInt > 0 && targetInt < 8) {
				if ((orGroup.gens[targetInt] && isNotSearch) || (orGroup.flags[targetInt] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include \'' + target + '\'.'};
				orGroup.gens[targetInt] = !isNotSearch;
				continue;
			}

			if (target === 'recovery') {
				if (!orGroup.recovery['recovery']) {
					orGroup.recovery["recovery"] = true;
				} else if ((orGroup.recovery['recovery'] && isNotSearch) || (orGroup.recovery['recovery'] === false && !isNotSearch)) {
					return {reply: 'A search cannot both exclude and include recovery moves.'};
				}
				continue;
			}

			if (target === 'zrecovery') {
				if (!orGroup.recovery['zrecovery']) {
					orGroup.recovery["zrecovery"] = !isNotSearch;
				} else if ((orGroup.recovery['zrecovery'] && isNotSearch) || (orGroup.recovery['zrecovery'] === false && !isNotSearch)) {
					return {reply: 'A search cannot both exclude and include z-recovery moves.'};
				}
				continue;
			}

			let template = Dex.getTemplate(target);
			if (template.exists) {
				if (Object.keys(lsetData).length) return {reply: "A search can only include one Pok\u00e9mon learnset."};
				if (parameters.length > 1) return {reply: "A Pok\u00e9mon learnset cannot have alternative parameters."};
				if (!template.learnset) template = Dex.getTemplate(template.baseSpecies);
				lsetData = Object.assign({}, template.learnset);
				targetMon = template.name;
				while (template.prevo) {
					template = Dex.getTemplate(template.prevo);
					for (let move in template.learnset) {
						if (!lsetData[move]) lsetData[move] = template.learnset[move];
					}
				}
				orGroup.skip = true;
				continue;
			}

			let inequality = target.search(/>|<|=/);
			if (inequality >= 0) {
				if (isNotSearch) return {reply: "You cannot use the negation symbol '!' in quality ranges."};
				inequality = target.charAt(inequality);
				let targetParts = target.replace(/\s/g, '').split(inequality);
				let numSide, propSide, direction;
				if (!isNaN(targetParts[0])) {
					numSide = 0;
					propSide = 1;
					switch (inequality) {
					case '>': direction = 'less'; break;
					case '<': direction = 'greater'; break;
					case '=': direction = 'equal'; break;
					}
				} else if (!isNaN(targetParts[1])) {
					numSide = 1;
					propSide = 0;
					switch (inequality) {
					case '<': direction = 'less'; break;
					case '>': direction = 'greater'; break;
					case '=': direction = 'equal'; break;
					}
				} else {
					return {reply: `No value given to compare with '${target}'.`};
				}
				let prop = targetParts[propSide];
				switch (toId(targetParts[propSide])) {
				case 'basepower': prop = 'basePower'; break;
				case 'bp': prop = 'basePower'; break;
				case 'acc': prop = 'accuracy'; break;
				}
				if (!(prop in allProperties)) return {reply: `'${target}' did not contain a valid property.`};
				if (direction === 'equal') {
					if (orGroup.property[prop]) return {reply: `Invalid property range for ${prop}.`};
					orGroup.property[prop] = {};
					orGroup.property[prop]['equals'] = parseFloat(targetParts[numSide]);
				} else {
					if (!orGroup.property[prop]) orGroup.property[prop] = {};
					if (orGroup.property[prop][direction]) {
						return {reply: `Invalid property range for ${prop}.`};
					}
					orGroup.property[prop][direction] = parseFloat(targetParts[numSide]);
				}
				continue;
			}

			if (target.substr(0, 8) === 'priority') {
				let sign = '';
				target = target.substr(8).trim();
				if (target === "+") {
					sign = 'greater';
				} else if (target === "-") {
					sign = 'less';
				} else {
					return {reply: `Priority type '${target}' not recognized.`};
				}
				if (orGroup.property['priority']) {
					return {reply: "Priority cannot be set with both shorthand and inequality range."};
				}
				orGroup.property['priority'] = {};
				orGroup.property['priority'][sign] = (sign === 'less' ? -1 : 1);

				continue;
			}
			if (target.substr(0, 7) === 'boosts ' || target.substr(0, 7) === 'lowers ') {
				let isBoost = true;
				if (target.substr(0, 7) === 'lowers ') {
					isBoost = false;
				}
				switch (target.substr(7)) {
				case 'attack': target = 'atk'; break;
				case 'defense': target = 'def'; break;
				case 'specialattack': target = 'spa'; break;
				case 'spatk': target = 'spa'; break;
				case 'specialdefense': target = 'spd'; break;
				case 'spdef': target = 'spd'; break;
				case 'speed': target = 'spe'; break;
				case 'acc': target = 'accuracy'; break;
				case 'evasiveness': target = 'evasion'; break;
				default: target = target.substr(7);
				}
				if (!(target in allBoosts)) return {reply: `'${target.substr(7)}' is not a recognized stat.`};
				if (isBoost) {
					if ((orGroup.boost[target] && isNotSearch) || (orGroup.boost[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a stat boost.'};
					orGroup.boost[target] = !isNotSearch;
				} else {
					if ((orGroup.lower[target] && isNotSearch) || (orGroup.lower[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a stat boost.'};
					orGroup.lower[target] = !isNotSearch;
				}
				continue;
			}

			if (target.substr(0, 8) === 'zboosts ') {
				switch (target.substr(8)) {
				case 'attack': target = 'atk'; break;
				case 'defense': target = 'def'; break;
				case 'specialattack': target = 'spa'; break;
				case 'spatk': target = 'spa'; break;
				case 'specialdefense': target = 'spd'; break;
				case 'spdef': target = 'spd'; break;
				case 'speed': target = 'spe'; break;
				case 'acc': target = 'accuracy'; break;
				case 'evasiveness': target = 'evasion'; break;
				default: target = target.substr(8);
				}
				if (!(target in allBoosts)) return {reply: `'${target.substr(8)}' is not a recognized stat.`};
				if ((orGroup.zboost[target] && isNotSearch) || (orGroup.zboost[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a stat boost.'};
				orGroup.zboost[target] = !isNotSearch;
				continue;
			}

			let oldTarget = target;
			if (target.charAt(target.length - 1) === 's') target = target.substr(0, target.length - 1);
			switch (target) {
			case 'toxic': target = 'tox'; break;
			case 'poison': target = 'psn'; break;
			case 'burn': target = 'brn'; break;
			case 'paralyze': target = 'par'; break;
			case 'freeze': target = 'frz'; break;
			case 'sleep': target = 'slp'; break;
			case 'confuse': target = 'confusion'; break;
			case 'trap': target = 'partiallytrapped'; break;
			case 'flinche': target = 'flinch'; break;
			}

			if (target in allStatus) {
				if ((orGroup.status[target] && isNotSearch) || (orGroup.status[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a status.'};
				orGroup.status[target] = !isNotSearch;
				continue;
			}

			if (target in allVolatileStatus) {
				if ((orGroup.volatileStatus[target] && isNotSearch) || (orGroup.volatileStatus[target] === false && !isNotSearch)) return {reply: 'A search cannot both exclude and include a volitile status.'};
				orGroup.volatileStatus[target] = !isNotSearch;
				continue;
			}

			return {reply: `'${oldTarget}' could not be found in any of the search categories.`};
		}
		if (!orGroup.skip) {
			searches.push(orGroup);
		}
	}

	let dex = {};
	if (targetMon) {
		for (let move in lsetData) {
			dex[move] = Dex.getMove(move);
		}
	} else {
		for (let move in Dex.data.Movedex) {
			dex[move] = Dex.getMove(move);
		}
		delete dex.magikarpsrevenge;
	}
	for (let i = 0; i < searches.length; i++) {
		let alts = searches[i];
		if (alts.skip) continue;
		for (let move in dex) {
			let matched = false;
			if (Object.keys(alts.types).length) {
				if (alts.types[dex[move].type]) continue;
				if (Object.values(alts.types).includes(false) && alts.types[dex[move].type] !== false) continue;
			}

			if (Object.keys(alts.categories).length) {
				if (alts.categories[dex[move].category]) continue;
				if (Object.values(alts.categories).includes(false) && alts.categories[dex[move].category] !== false) continue;
			}

			if (Object.keys(alts.contestTypes).length) {
				if (alts.contestTypes[dex[move].contestType]) continue;
				if (Object.values(alts.contestTypes).includes(false) && alts.contestTypes[dex[move].contestType] !== false) continue;
			}

			for (let flag in alts.flags) {
				if (flag !== 'secondary') {
					if ((flag in dex[move].flags) === alts.flags[flag]) {
						matched = true;
						break;
					}
				} else if ((!dex[move].secondary && !dex[move].secondaries) === !alts.flags[flag]) {
					matched = true;
					break;
				}
			}
			if (matched) continue;
			if (Object.keys(alts.gens).length) {
				if (alts.gens[String(dex[move].gen)]) continue;
				if (Object.values(alts.gens).includes(false) && alts.gens[String(dex[move].gen)] !== false) continue;
			}
			for (let recoveryType in alts.recovery) {
				let hasRecovery = false;
				if (recoveryType === "recovery") {
					hasRecovery = !!dex[move].drain || !!dex[move].flags.heal;
				} else if (recoveryType === "zrecovery") {
					hasRecovery = (dex[move].zMoveEffect === 'heal');
				}
				if (hasRecovery === alts.recovery[recoveryType]) {
					matched = true;
					break;
				}
			}
			if (matched) continue;
			for (let prop in alts.property) {
				if (typeof alts.property[prop].less === "number") {
					if (dex[move][prop] !== true && dex[move][prop] < alts.property[prop].less) {
						matched = true;
						break;
					}
				}
				if (typeof alts.property[prop].greater === "number") {
					if ((dex[move][prop] === true && dex[move].category !== "status") ||
						 dex[move][prop] > alts.property[prop].greater) {
						matched = true;
						break;
					}
				}
				if (typeof alts.property[prop].equals === "number") {
					if (dex[move][prop] === alts.property[prop].equals) {
						matched = true;
						break;
					}
				}
			}
			if (matched) continue;
			for (let boost in alts.boost) {
				if (dex[move].boosts) {
					if ((dex[move].boosts[boost] > 0) === alts.boost[boost]) {
						matched = true;
						break;
					}
				} else if (dex[move].secondary && dex[move].secondary.self && dex[move].secondary.self.boosts) {
					if ((dex[move].secondary.self.boosts[boost] > 0) === alts.boost[boost]) {
						matched = true;
						break;
					}
				}
			}
			if (matched) continue;
			for (let lower in alts.lower) {
				if (dex[move].boosts) {
					if ((dex[move].boosts[lower] < 0) === alts.lower[lower]) {
						matched = true;
						break;
					}
				} else if (dex[move].secondary && dex[move].secondary.self && dex[move].secondary.self.boosts) {
					if ((dex[move].secondary.self.boosts[lower] < 0) === alts.boost[lower]) {
						matched = true;
						break;
					}
				}
			}
			if (matched) continue;
			for (let boost in alts.zboost) {
				if (dex[move].zMoveBoost) {
					if ((dex[move].zMoveBoost[boost] > 0) === alts.zboost[boost]) {
						matched = true;
						break;
					}
				}
			}
			if (matched) continue;

			for (let searchStatus in alts.status) {
				let canStatus = !!(dex[move].status === searchStatus || (dex[move].secondaries && dex[move].secondaries.some(entry => entry.status === searchStatus)));
				if (canStatus === alts.status[searchStatus]) {
					matched = true;
					break;
				}
			}
			if (matched) continue;

			for (let searchStatus in alts.volatileStatus) {
				let canStatus = !!((dex[move].secondary && dex[move].secondary.volatileStatus === searchStatus) ||
								   (dex[move].secondaries && dex[move].secondaries.some(entry => entry.volatileStatus === searchStatus)));
				if (canStatus === alts.volatileStatus[searchStatus]) {
					matched = true;
					break;
				}
			}
			if (matched) continue;

			delete dex[move];
		}
	}

	let results = [];
	for (let move in dex) {
		results.push(dex[move]);
	}

	return {data: results};
}

function runItemsearch(target) {
	target = target.trim();

	target = target.toLowerCase().replace('-', ' ').replace(/[^a-z0-9.\s/]/g, '');
	let rawSearch = target.split(' ');
	let searchedWords = [];
	let foundItems = [];

	//refine searched words
	for (let i = 0; i < rawSearch.length; i++) {
		let newWord = rawSearch[i].trim();
		if (isNaN(newWord)) newWord = newWord.replace('.', '');
		switch (newWord) {
		// words that don't really help identify item removed to speed up search
		case 'a':
		case 'an':
		case 'is':
		case 'it':
		case 'its':
		case 'the':
		case 'that':
		case 'which':
		case 'user':
		case 'holder':
		case 'holders':
			newWord = '';
			break;
		// replace variations of common words with standardized versions
		case 'opponent': newWord = 'attacker'; break;
		case 'flung': newWord = 'fling'; break;
		case 'heal': case 'heals':
		case 'recovers': newWord = 'restores'; break;
		case 'boost':
		case 'boosts': newWord = 'raises'; break;
		case 'weakens': newWord = 'halves'; break;
		case 'more': newWord = 'increases'; break;
		case 'super':
			if (rawSearch[i + 1] === 'effective') {
				newWord = 'supereffective';
			}
			break;
		case 'special': newWord = 'sp'; break;
		case 'spa':
			newWord = 'sp';
			break;
		case 'atk':
		case 'attack':
			if (rawSearch[i - 1] === 'sp') {
				newWord = 'atk';
			} else {
				newWord = 'attack';
			}
			break;
		case 'spd':
			newWord = 'sp';
			break;
		case 'def':
		case 'defense':
			if (rawSearch[i - 1] === 'sp') {
				newWord = 'def';
			} else {
				newWord = 'defense';
			}
			break;
		case 'burns': newWord = 'burn'; break;
		case 'poisons': newWord = 'poison'; break;
		default:
			if (/x[\d.]+/.test(newWord)) {
				newWord = newWord.substr(1) + 'x';
			}
		}
		if (!newWord || searchedWords.includes(newWord)) continue;
		searchedWords.push(newWord);
	}

	if (searchedWords.length === 0) return {reply: "No distinguishing words were used. Try a more specific search."};
	if (searchedWords.includes('fling')) {
		let basePower = 0;
		let effect;

		for (let k = 0; k < searchedWords.length; k++) {
			let wordEff = "";
			switch (searchedWords[k]) {
			case 'burn': case 'burns':
			case 'brn': wordEff = 'brn'; break;
			case 'paralyze': case 'paralyzes':
			case 'par': wordEff = 'par'; break;
			case 'poison': case 'poisons':
			case 'psn': wordEff = 'psn'; break;
			case 'toxic':
			case 'tox': wordEff = 'tox'; break;
			case 'flinches':
			case 'flinch': wordEff = 'flinch'; break;
			case 'badly': wordEff = 'tox'; break;
			}
			if (wordEff && effect) {
				if (!(wordEff === 'psn' && effect === 'tox')) return {reply: "Only specify fling effect once."};
			} else if (wordEff) {
				effect = wordEff;
			} else {
				if (searchedWords[k].substr(searchedWords[k].length - 2) === 'bp' && searchedWords[k].length > 2) searchedWords[k] = searchedWords[k].substr(0, searchedWords[k].length - 2);
				if (Number.isInteger(Number(searchedWords[k]))) {
					if (basePower) return {reply: "Only specify a number for base power once."};
					basePower = parseInt(searchedWords[k]);
				}
			}
		}

		for (let n in Dex.data.Items) {
			let item = Dex.getItem(n);
			if (!item.fling) continue;

			if (basePower && effect) {
				if (item.fling.basePower === basePower &&
				(item.fling.status === effect || item.fling.volatileStatus === effect)) foundItems.push(item.name);
			} else if (basePower) {
				if (item.fling.basePower === basePower) foundItems.push(item.name);
			} else if (item.fling.status === effect || item.fling.volatileStatus === effect) {foundItems.push(item.name);}
		}
		if (foundItems.length === 0) return {reply: 'No items inflict ' + basePower + 'bp damage when used with Fling.'};
	} else if (target.search(/natural ?gift/i) >= 0) {
		let basePower = 0;
		let type = "";

		for (let k = 0; k < searchedWords.length; k++) {
			searchedWords[k] = searchedWords[k].charAt(0).toUpperCase() + searchedWords[k].slice(1);
			if (searchedWords[k] in Dex.data.TypeChart) {
				if (type) return {reply: "Only specify natural gift type once."};
				type = searchedWords[k];
			} else {
				if (searchedWords[k].substr(searchedWords[k].length - 2) === 'bp' && searchedWords[k].length > 2) searchedWords[k] = searchedWords[k].substr(0, searchedWords[k].length - 2);
				if (Number.isInteger(Number(searchedWords[k]))) {
					if (basePower) return {reply: "Only specify a number for base power once."};
					basePower = parseInt(searchedWords[k]);
				}
			}
		}

		for (let n in Dex.data.Items) {
			let item = Dex.getItem(n);
			if (!item.isBerry) continue;

			if (basePower && type) {
				if (item.naturalGift.basePower === basePower && item.naturalGift.type === type) foundItems.push(item.name);
			} else if (basePower) {
				if (item.naturalGift.basePower === basePower) foundItems.push(item.name);
			} else if (item.naturalGift.type === type) {foundItems.push(item.name);}
		}
		if (foundItems.length === 0) return {reply: 'No berries inflict ' + basePower + 'bp damage when used with Natural Gift.'};
	} else {
		let bestMatched = 0;
		for (let n in Dex.data.Items) {
			let item = Dex.getItem(n);
			let matched = 0;
			// splits words in the description into a toId()-esk format except retaining / and . in numbers
			let descWords = item.desc;
			// add more general quantifier words to descriptions
			if (/[1-9.]+x/.test(descWords)) descWords += ' increases';
			if (item.isBerry) descWords += ' berry';
			descWords = descWords.replace(/super[-\s]effective/g, 'supereffective');
			descWords = descWords.toLowerCase().replace('-', ' ').replace(/[^a-z0-9\s/]/g, '').replace(/(\D)\./, (p0, p1) => p1).split(' ');

			for (let k = 0; k < searchedWords.length; k++) {
				if (descWords.includes(searchedWords[k])) matched++;
			}

			if (matched >= bestMatched && matched >= (searchedWords.length * 3 / 5)) foundItems.push(item.name);
			if (matched > bestMatched) bestMatched = matched;
		}

		// iterate over found items again to make sure they all are the best match
		for (let l = 0; l < foundItems.length; l++) {
			let item = Dex.getItem(foundItems[l]);
			let matched = 0;
			let descWords = item.desc;
			if (/[1-9.]+x/.test(descWords)) descWords += ' increases';
			if (item.isBerry) descWords += ' berry';
			descWords = descWords.replace(/super[-\s]effective/g, 'supereffective');
			descWords = descWords.toLowerCase().replace('-', ' ').replace(/[^a-z0-9\s/]/g, '').replace(/(\D)\./, (p0, p1) => p1).split(' ');

			for (let k = 0; k < searchedWords.length; k++) {
				if (descWords.includes(searchedWords[k])) matched++;
			}

			if (matched !== bestMatched) {
				foundItems.splice(l, 1);
				l--;
			}
		}
	}

	return {data: foundItems};
}

// Largely copied from PS as well
async function smogDex(query) {
	if (!Dex) await loaded;
	let targets = query.split(',');
	let pokemon = Dex.getTemplate(targets[0]);
	let item = Dex.getItem(targets[0]);
	let move = Dex.getMove(targets[0]);
	let ability = Dex.getAbility(targets[0]);
	let format = Dex.getFormat(targets[0]);
	let generation = (targets[1] || 'sm').trim().toLowerCase();
	let genNumber = 7;
	let extraFormat = Dex.getFormat(targets[2]);

	if (['7', 'gen7', 'seven', 'sm', 'sumo', 'usm', 'usum'].includes(generation)) {
		generation = 'sm';
	} else if (['6', 'gen6', 'oras', 'six', 'xy'].includes(generation)) {
		generation = 'xy';
		genNumber = 6;
	} else if (['5', 'b2w2', 'bw', 'bw2', 'five', 'gen5'].includes(generation)) {
		generation = 'bw';
		genNumber = 5;
	} else if (['4', 'dp', 'dpp', 'four', 'gen4', 'hgss'].includes(generation)) {
		generation = 'dp';
		genNumber = 4;
	} else if (['3', 'adv', 'frlg', 'gen3', 'rs', 'rse', 'three'].includes(generation)) {
		generation = 'rs';
		genNumber = 3;
	} else if (['2', 'gen2', 'gs', 'gsc', 'two'].includes(generation)) {
		generation = 'gs';
		genNumber = 2;
	} else if (['1', 'gen1', 'one', 'rb', 'rby', 'rgy'].includes(generation)) {
		generation = 'rb';
		genNumber = 1;
	} else {
		generation = 'sm';
	}

	// Pokemon
	if (pokemon.exists) {
		if (genNumber < pokemon.gen) {
			return `${pokemon.name} did not exist in ${generation.toUpperCase()}!`;
		}
		if (pokemon.tier === 'CAP') {
			generation = 'cap';
		}

		if ((pokemon.battleOnly && pokemon.baseSpecies !== 'Greninja') || pokemon.baseSpecies === 'Keldeo' || pokemon.baseSpecies === 'Genesect') {
			pokemon = Dex.getTemplate(pokemon.baseSpecies);
		}

		let formatName = extraFormat.name || pokemon.tier;
		let formatId = extraFormat.id || toId(pokemon.tier);
		if (formatName.startsWith('[Gen ')) {
			formatName = formatName.replace('[Gen ' + formatName[formatName.indexOf('[') + 5] + '] ', '');
			formatId = toId(formatName);
		}
		if (formatId === 'battlespotdoubles') {
			formatId = 'battle_spot_doubles';
		} else if (formatId === 'battlespottriples') {
			formatId = 'battle_spot_triples';
			if (genNumber > 6) {
				return `Triples formats are not an available format in Pokémon generation ${generation.toUpperCase()}.`;
			}
		} else if (formatId === 'doublesou') {
			formatId = 'doubles';
		} else if (formatId === 'balancedhackmons') {
			formatId = 'bh';
		} else if (formatId === 'battlespotsingles') {
			formatId = 'battle_spot_singles';
		} else if (formatId === 'ubers') {
			formatId = 'uber';
		} else if (formatId.includes('vgc')) {
			formatId = 'vgc' + formatId.slice(-2);
			formatName = 'VGC20' + formatId.slice(-2);
		} else if (extraFormat.exists && extraFormat.effectType !== 'Format') {
			formatName = formatId = '';
		}
		let speciesid = pokemon.speciesid;
		// Special case for Meowstic-M
		if (speciesid === 'meowstic') speciesid = 'meowsticm';
		// NFE mons are in PU
		if (formatName === 'NFE') formatName = 'PU';
		if (pokemon.tier === 'CAP') {
			return `${formatName} ${pokemon.name} analysis preview, brought to you by the CAP Project: http://www.smogon.com/cap/pokemon/strategies/${speciesid}`;
		}
		return `${generation.toUpperCase()} ${formatName} ${pokemon.name} analysis: http://www.smogon.com/dex/${generation}/pokemon/${speciesid}${(formatId ? '/' + formatId : '')}`;
	}

	// Item
	if (item.exists && genNumber > 1 && item.gen <= genNumber) {
		return `${generation.toUpperCase()} ${item.name} item analysis: http://www.smogon.com/dex/${generation}/items/${item.id}`;
	}

	// Ability
	if (ability.exists && genNumber > 2 && ability.gen <= genNumber) {
		return `${generation.toUpperCase()} ${ability.name} ability analysis: http://www.smogon.com/dex/${generation}/abilities/${ability.id}`;
	}

	// Move
	if (move.exists && move.gen <= genNumber) {
		return `${generation.toUpperCase()} ${move.name} move analysis: http://www.smogon.com/dex/${generation}/moves/${toId(move.name)}`;
	}

	// Format
	if (format.id) {
		let formatName = format.name;
		let formatId = format.id;
		if (formatId === 'battlespotdoubles') {
			formatId = 'battle_spot_doubles';
		} else if (formatId === 'battlespottriples') {
			formatId = 'battle_spot_triples';
			if (genNumber > 6) {
				return `Triples formats are not an available format in Pokémon generation ${generation.toUpperCase()}.`;
			}
		} else if (formatId === 'doublesou') {
			formatId = 'doubles';
		} else if (formatId === 'balancedhackmons') {
			formatId = 'bh';
		} else if (formatId === 'battlespotsingles') {
			formatId = 'battle_spot_singles';
		} else if (formatId === 'ubers') {
			formatId = 'uber';
		} else if (formatId.includes('vgc')) {
			formatId = 'vgc' + formatId.slice(-2);
			formatName = 'VGC20' + formatId.slice(-2);
		} else if (format.effectType !== 'Format') {
			formatName = formatId = '';
		}
		if (formatName) {
			return `${generation.toUpperCase()} ${formatName} format analysis: http://www.smogon.com/dex/${generation}/formats/${formatId}`;
		}
	}

	return `Pokémon, item, move, ability, or format not found for generation ${generation.toUpperCase()}.`;
}

module.exports = {
	get: getData,
	search: dataSearch,
	smogdex: smogDex,
};
