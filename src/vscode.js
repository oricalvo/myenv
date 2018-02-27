const uuid = require("uuid/v1");
const path = require("path");
const {downloadTo, directoryExists, spawn, unzipTo} = require("./helpers");
const readline = require('readline');

const appName = "vscode";
const appExeName = "Code.exe"

const binDir = path.resolve(__dirname, "../bin");
const appDir = path.resolve(binDir, appName);
const appExePath = path.resolve(appDir, appExeName);
const detached = true;

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
    return await directoryExists(appDir);
}

function confirm() {
    return new Promise((resolve, reject)=> {
        rl.question(`${appName} is not installed. Install it? `, (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install() {
    const temp = path.resolve(__dirname, `../temp/${uuid()}.zip`);

    await downloadTo(`https://raw.githubusercontent.com/oricalvo/myenv-packages/master/${appName}.zip`, temp);

    unzipTo(temp, appDir);
}

async function run() {
    console.log(`Running ${appName} from ${appExePath}`);

    const args = process.argv.slice(2);
    const p = await spawn(appExePath, args, {
        stdio: detached ? "ignore" : "inherit",
        detached: detached,
    });

    p.unref();
}
