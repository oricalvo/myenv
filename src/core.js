const uuid = require("uuid/v1");
const path = require("path");
const nativeGlob = require("glob");
const {glob} = require("./helpers");
const {ValidationError} = require("./errors");

const {
    downloadTo,
    directoryExists,
    spawn,
    unzipTo,
    readJSONFile,
    deleteFile,
    deleteDirectory,
    fileExists,
    readLine,
} = require("./helpers");

const folders = {
    packages: path.resolve(__dirname, "../packages"),
    bin: path.resolve(__dirname, "../bin"),
};

async function init(){
    const configFilePath = path.resolve(__dirname, "..");
    if(await fileExists(configFilePath)) {
       return;
    }
}

function loadRegistry(){
    const filePath = path.resolve(__dirname, "../apps.json");
    return readJSONFile(filePath);
}

function getApp(registry, appName){
    const app = registry.apps.find(app => app.name == appName);
    if(!app){
        throw new ValidationError("App \"" + appName + "\" was not found");
    }

    const dir = app.package ? path.resolve(folders.packages, app.package) : path.resolve(folders.packages, app.name);
    let url = app.package ? getPackage(registry, app.package).url : app.url;
    if(!url) {
        url = getUrl(app.name);
    }

    return {
        ...app,
        url,
        dir,
        exe: app.exe ? path.resolve(dir, app.exe) : null,
        noPackage: app.noPackage,
    };
}

function getPackage(registry, packageName){
    const package = registry.packages.find(app => app.name == packageName);
    if(!package){
        throw new Error("Package with name " + packageName + " was not found");
    }

    if(!package.url) {
        package.url = getUrl(package.name);
    }

    return package;
}

function getUrl(name) {
    return `https://raw.githubusercontent.com/oricalvo/myenv-packages/master/${name}.7z`;
}

async function installAndRun(app){
    if (!await isInstalled(app)) {
        if (await confirm(app)) {
            await installApp(app);
        }
        else {
            return;
        }
    }

    await runApp(app);
}

async function isInstalled(app) {
    return await directoryExists(app.dir);
}

async function confirm(app) {
    const answer = (await readLine(`${app.name} is not installed. Install it? `)).toLowerCase();
    return answer == "yes" || answer == "y";
}

async function installApp(app) {
    if(await directoryExists(app.dir)) {
        console.log(`${app.name} is already installed`);
        return;
    }

    const index = app.url.lastIndexOf(".");
    const ext = index==-1 ? "zip" : app.url.substring(index+1);
    const temp = path.resolve(__dirname, `../temp/${uuid()}.${ext}`);

    await downloadTo(app.url, temp, "Downloading " + app.name);

    console.log("Extracting package to " + app.dir);
    await unzipTo(temp, app.dir);

    //await deleteFile(temp);
}

async function uninstallApp(app){
    console.log("Uninstalling " + app.name + " from " + app.dir);
    await deleteDirectory(app.dir);
}

async function runApp(app, overrideExe) {
    let exe = !!overrideExe ? overrideExe : app.exe;

    if(nativeGlob.hasMagic(exe)){
        const matches = await glob(exe);
        if(!matches.length){
            throw new ValidationError("Glob pattern \"" + exe + "\" does not match file");
        }

        exe = matches[0];
    }

    const args = app.appendCurrentDirectory ? [process.cwd()] : process.argv.slice(4);

    console.log(`Running ${exe} ${args}`);

    if(app.guiApp) {
        const child = await spawn(exe, args, {
            stdio: "ignore",
            detached: true,
        });

        child.unref();
    }
    else {
        const child = await spawn(exe, args, {
            stdio: "inherit",
        });
    }


    // const child = await spawn(exe, args, {
    //     stdio: app.validateExitCode ? "inherit" : "ignore",
    //     detached: !app.validateExitCode,
    // });

    //child.unref();
}

module.exports = {
    loadRegistry,
    getApp,
    installAndRun,
    installApp,
    uninstallApp,
    folders,
    runApp,
};
