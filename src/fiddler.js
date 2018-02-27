const uuid = require("uuid/v1");
const path = require("path");
const {downloadTo, directoryExists, spawn, unzipTo} = require("./helpers");
const readline = require('readline');

const appName = "fiddler";
const appExeName = "Fiddler.exe"

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

    await downloadTo("https://raw.githubusercontent.com/oricalvo/myenv-packages/master/fiddler.zip", temp);

    unzipTo(temp, appDir);
}

function run() {
    console.log(`Running ${appName} from ${appExePath}`);

    const args = process.argv.slice(2);
    return spawn(appExePath, args, {
        stdio: detached ? "ignore" : "inherit",
        detached: detached,
    });
}
