const path = require("path");
const {downloadTo, directoryExists, spawn, unzipTo} = require("./helpers");
const readline = require('readline');

const appName = "conemu";
const appExeFileName = "ConEmu64.exe"
const url = "https://raw.githubusercontent.com/oricalvo/myenv-packages/master/conemu.zip";

const binDir = path.resolve(__dirname, "../bin");
const appDir = path.resolve(__dirname, `../bin/${appName}`);
const appExeFilePath = path.resolve(appDir, appExeFileName);

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
        rl.question(`Install ${appName}? `, (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install() {
    const temp = path.resolve(__dirname, "../temp/temp.zip");

    await downloadTo(url, temp);

    unzipTo(temp, binDir);
}

async function run() {
    console.log(`Running ${appName} from ${appExeFilePath}`);

    const args = process.argv.slice(2);
    const p = await spawn(appExeFilePath, args, {
        detached: true,
    });
	
	p.unref();
}
