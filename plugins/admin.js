const config = require('../config.json');

const STARTING_TIME = Date.now();

// Taken from the PS code and simplified.
function toDurationString(number) {
	// TODO: replace by Intl.DurationFormat or equivalent when it becomes available (ECMA-402)
	// https://github.com/tc39/ecma402/issues/47
	const date = new Date(+number);
	const parts = [date.getUTCFullYear() - 1970, date.getUTCMonth(), date.getUTCDate() - 1, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
	const unitNames = ["second", "minute", "hour", "day", "month", "year"];
	const positiveIndex = parts.findIndex(elem => elem > 0);
	return parts.slice(positiveIndex).reverse().map((value, index) => value ? value + " " + unitNames[index] + (value > 1 ? "s" : "") : "").reverse().join(" ").trim();
}


exports.commands = {
	restart: function (channel, user) {
		if (!config.admins.includes(user.id)) return channel.send("Permission denied.");
		if (!process.send) return channel.send("This command can only be used in multiprocess mode.");

		channel.send("Restarting!").then(() => process.send('cmd|kill'));
	},
	uptime: function (channel) {
		return channel.send(`Uptime: ${toDurationString(Date.now() - STARTING_TIME)}`);
	},
};
