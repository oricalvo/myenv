const path = require("path");
const {downloadTo, directoryExists, spawn, unzipTo} = require("./helpers");
const readline = require('readline');

const binDir = path.resolve(__dirname, "../bin");
const nppDir = path.resolve(__dirname, "../bin/npp");
const nppExe = path.resolve(__dirname, "../bin/npp/notepad++.exe");

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
    return await directoryExists(nppDir);
}

function confirm() {
    return new Promise((resolve, reject)=> {
        rl.question('Install Notepad++? ', (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install() {
    const temp = path.resolve(__dirname, "../temp/npp.zip");

    await downloadTo("https://github.com/oricalvo/myenv-packages/raw/master/npp.zip", temp);

    unzipTo(temp, binDir);
}

function run() {
    console.log("Running Notepad++ from " + nppExe);

    const args = process.argv.slice(2);
    return spawn(nppExe, args, {
        detached: true,
    });
}
