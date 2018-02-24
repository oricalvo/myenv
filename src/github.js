const path = require("path");
const {downloadTo, fileExists, spawn} = require("./helpers");
const readline = require('readline');

const githubExe = path.resolve(process.env.APPDATA, "../Local/GitHubDesktop/GitHubDesktop.exe");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

main();

async function main() {
    try {
        if (!await installed()) {
            if (await confirm()) {
                await install();
            }
			else {
				return;
			}
        }

        run();
    }
    catch(err) {
        console.error(err);
    }
    finally {
        if(rl) {
            rl.close();
        }
    }
}

async function installed() {
    return await fileExists(githubExe);
}

function confirm() {
    return new Promise((resolve, reject)=> {
        rl.question('Install GitHub Desktop? ', (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install() {
    const temp = path.resolve(__dirname, "../temp/github.exe");

    // await downloadTo("https://central.github.com/deployments/desktop/desktop/latest/win32", temp);

    console.log("Running Github installation at " + temp);

    await spawn(temp, [], {
        validateExitCode: true,
    });
}

function run() {
    console.log("Running Github desktop from " + githubExe);

    return spawn(githubExe, [process.cwd()], {
        detached: true,
    });
}

