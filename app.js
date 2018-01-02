const fs = require('fs');
const child = require('child_process');

let proc;

const appendErr = err => {
	console.log(err);
	fs.appendFile('./err.log', err + '\n', () => {});
};
const appendOut = msg => {
	console.log(msg);
	fs.appendFile('./out.log', msg + '\n', () => {});
};

const start = function() {
	proc = child.fork('./main.js');
	proc.on('error', appendErr);
	proc.on('message', msg => {
		let [type, ...content] = msg.split('|');
		if (!type || !content.length) appendErr(`Invalid message received from child process: ${msg}`);
		content = content.join('|');
		if (type === 'cmd') {
			if (content === 'kill') {
				return proc.kill();
			}
		} else {
			appendOut(content);
		}
	});
	proc.on('close', () => child.exec('git stash && git pull --rebase && git stash apply').on('exit', () => setTimeout(start, 2000)));
};

start();
