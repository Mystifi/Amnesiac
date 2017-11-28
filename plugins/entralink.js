const fs = require('fs');

const DATA_FILE = "data/entralink.json";
const ENTRALINK_NAME = "Entralink";
const ENTRALINK = client.guilds.find(val => val.name === ENTRALINK_NAME);
const STAFF_ROLES = ["Room Owner", "Operator", "Half-Operator"];
const AC_ROLE = ENTRALINK.roles.findKey("name", "Autoconfirmed");

if (!ENTRALINK) console.log("[ERROR] Entralink guild not found. Entralink specific commands will not work.");

function isStaff(user) {
    let guildMember = ENTRALINK.members.get(user.id);
    if (!guildMember) return false;
    return !!guildMember.roles.find(val => STAFF_ROLES.includes(val.name));
}

let data = {};
try {
	data = require(`../${DATA_FILE}`);
} catch (e) {
	if (e.code !== 'MODULE_NOT_FOUND' && e.code !== 'ENOENT') throw e;
}
if (!data || typeof data !== 'object') data = {};


exports.commands = {
    autoconfirm: function (channel, user, message) {
        if (!ENTRALINK.channels.has(channel.id)) return channel.send("This command can only be used in the Entralink.");
        if (!isStaff(user)) return channel.send("This command can only be used by staff.");

        let [id, psName] = message.split(',').map(param => param.trim());
        if (!id || !message) return channel.send("Invalid parameters. Syntax: ``/autoconfirm @user, ps username``");
        id = id.replace(/[^0-9]/g, '');
        let guildMember = ENTRALINK.members.get(id);
        if (!guildMember) return channel.send("Invalid User.");

        data[id] = psName;
        fs.writeFile(DATA_FILE, JSON.stringify(data), () => {});

        guildMember.addRole(AC_ROLE, `Autoconfirmed as ${psName}`);

        channel.send(`${this.nameFromId(id)} is now autoconfirmed as ${psName}.`);
    },
    whois: function (channel, user, message) {
        if (!ENTRALINK.channels.has(channel.id)) return channel.send("This command can only be used in the Entralink.");

        let id = message.replace(/[^0-9]/g, '');
        if (!id) return channel.send("Invalid user. Syntax: ``/whois @user``");

        if (!data[id]) return channel.send("This user isn't autoconfirmed.");
        return channel.send(`${this.nameFromId(id)} is autoconfirmed as ${data[id]}.`);
    }
}