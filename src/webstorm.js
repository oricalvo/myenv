const path = require("path");
const fs = require("fs");
const {pad, downloadTo, directoryExists, fileExists, spawn, unzipTo, promisifyNodeFn1} = require("./helpers");
const readline = require('readline');

const readdir = promisifyNodeFn1(fs.readdir)
const stat = promisifyNodeFn1(fs.stat);

const jetbrainsDir = path.resolve(process.env.ProgramFiles, `JetBrains`);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

main();

async function main() {
    try {
        let exeFilePath = await findWebStormExeFilePath();
        if (!exeFilePath) {
            if (await confirm()) {
                await install();
            }
			else {
				return;
			}
        }

        exeFilePath = await findWebStormExeFilePath();
        if(!exeFilePath) {
            throw new Error("Failed to find WebStorm exe after installation");
        }

        run(exeFilePath);
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

async function findWebStormExeFilePath() {
    if(await directoryExists(jetbrainsDir)){
        const files = await readdir(jetbrainsDir);
        for(const file of files){
            const filePath = path.resolve(jetbrainsDir, file);
            const s = await stat(filePath);
            if(s.isDirectory()) {
                if(file.startsWith("WebStorm")){
                    const exeFilePath = path.resolve(filePath, "bin/webstorm64.exe");
                    if(await fileExists(exeFilePath)) {
                        return exeFilePath;
                    }
                }
            }
        }
    }

    return null;
}

async function installed() {
    return await directoryExists(appDir);
}

function confirm() {
    return new Promise((resolve, reject)=> {
        rl.question(`WebStorm is not installed. Install it? `, (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install() {
    const all = [];

    console.log("Downloading WebStorm ... ");

    for(let i=1; i<=19; i++){
        const fileName = `WebStorm.zip.${pad(i, 3)}`;
        const dest = path.resolve(__dirname, "../temp", fileName);
        const url = `https://raw.githubusercontent.com/oricalvo/myenv-packages/master/webstorm/${fileName}`;
        all.push(downloadTo(url, dest, true));
    }

    await Promise.all(all);

    console.log("Done");

    await spawn("7z", ["x", "WebStorm.zip.001"], {
        shell: true,
        validateExitCode: true,
        cwd: path.resolve(__dirname, "../temp"),
    });


    await spawn("WebStorm.exe", [], {
        validateExitCode: true,
        cwd: path.resolve(__dirname, "../temp"),
    });
}

async function run(appExeFilePath) {
    const appExeFileName = path.parse(appExeFilePath).base;
    console.log(`Running ${appExeFileName} from ${appExeFilePath}`);

    const args = process.argv.slice(3);
    const p = await spawn(appExeFilePath, [process.cwd()], {
        detached: true
    });

    p.unref();
}
