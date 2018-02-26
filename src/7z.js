const path = require("path");
const {downloadTo, directoryExists, spawn, unzipTo} = require("./helpers");
const readline = require('readline');

const binDir = path.resolve(__dirname, "../bin");
const nppDir = path.resolve(__dirname, "../bin/7z");
const nppExe = path.resolve(__dirname, "../bin/7z/7z.exe");

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
        rl.question('7z is not installed. Install it? ', (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install() {
    const temp = path.resolve(__dirname, "../temp/7z.zip");

    await downloadTo("https://raw.githubusercontent.com/oricalvo/myenv-packages/master/7z.zip", temp);

    unzipTo(temp, nppDir);
}

function run() {
    console.log("Running 7z from " + nppExe);

    const args = process.argv.slice(2);
    return spawn(nppExe, args, {
        stdio: "inherit",
    });
}
