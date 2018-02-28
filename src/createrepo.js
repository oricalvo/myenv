const readline = require('readline');
const {httpPost} = require("./helpers");
const {Writable} = require("stream");

var mutableStdout = new Writable({
    write: function(chunk, encoding, callback) {
        if (!this.muted) {
            process.stdout.write(chunk, encoding);
        }

        callback();
    }
});

mutableStdout.muted = false;

const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
});

async function passwordQuestion(question){
    try {
        process.stdout.write(question);
        mutableStdout.muted = true;
        const answer = await readLine("");
        console.log();
        return answer;
    }
    finally {
        mutableStdout.muted = false;
    }
}

main();

async function main() {
    try {
        const userName = await readLine("User name: ");
        const password = await passwordQuestion("Password: ");
        const repo = await readLine("Repo name: ");
        const token = new Buffer(userName + ":" + password).toString("base64");

        var options = {
            host: 'api.github.com',
            port: '443',
            path: '/user/repos',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${token}`,
                "Content-Type": "application/json",
                "user-agent": "node", // for some reason this is a must
            },
        };

        const res = await httpPost(options, JSON.stringify({
            name: repo,
        }));

        console.log("Done");
    }
    catch(err){
        console.log(err);
    }
    finally {
        rl.close();
    }
}

function readLine(question) {
    return new Promise((resolve, reject) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

