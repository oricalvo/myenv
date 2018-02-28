const uuid = require("uuid/v1");
const path = require("path");
const readline = require('readline');
const {
    downloadTo,
    directoryExists,
    spawn,
    unzipTo,
    readJSONFile,
    deleteFile,
    deleteDirectory
} = require("./helpers");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const binDir = path.resolve(__dirname, "../bin");

function loadApps(){
    const filePath = path.resolve(__dirname, "../apps.json");
    return readJSONFile(filePath);
}

function getApp(apps, appName){
    const app = apps.find(app => app.name == appName);
    if(!app){
        throw new Error("App with name " + appName + " was not found");
    }

    return {
        ...app,
        dir: path.resolve(binDir, app.name),
        exe: path.resolve(binDir, app.name, app.exe),
    };
}

async function installAndRun(app){
    if (!await isInstalled(app)) {
        if (await confirm(app)) {
            await install(app);
        }
        else {
            return;
        }
    }

    await run(app);
}

async function isInstalled(app) {
    return await directoryExists(app.dir);
}

function confirm(app) {
    return new Promise((resolve, reject)=> {
        rl.question(`${app.name} is not installed. Install it? `, (answer) => {
            answer = answer.toLowerCase();
            resolve(answer == "yes" || answer == "y");
        });
    });
}

async function install(app) {
    const index = app.url.lastIndexOf(".");
    const ext = index==-1 ? "zip" : app.url.substring(index+1);
    const temp = path.resolve(__dirname, `../temp/${uuid()}.${ext}`);

    await downloadTo(app.url, temp, "Downloading " + app.name);

    await unzipTo(temp, app.dir);

    await deleteFile(temp);
}

async function uninstall(app){
    console.log("Uninstalling " + app.name + " from " + app.dir);
    await deleteDirectory(app.dir);
}

async function run(app) {
    console.log(`Running ${app.name} from ${app.exe}`);

    const args = process.argv.slice(3);
    const child = await spawn(app.exe, args, {
        stdio: app.validateExitCode ? "inherit" : "ignore",
        detached: !app.validateExitCode,
    });

    child.unref();
}

module.exports = {
    loadApps,
    getApp,
    installAndRun,
    rl,
    uninstall,
};
