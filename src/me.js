const path = require("path");
const {loadApps, getApp, uninstallApp, installApp, folders} = require("./core");
const {clean, readJSONFile, readdir, getStat} = require("./helpers");

const entries = [
    {command: ["install", "i"], handler: install},
    {command: ["uninstall", "u"], handler: uninstall},
    {command: ["version", "v"], handler: version},
    {command: ["list"], handler: list},
    {command: ["available"], handler: available},
];

main();

async function main() {
    try {
        const command = process.argv[2];
        if(!command) {
            throw new Error("Please specify a command. For example \"me version\"");
        }

        let found = false;
        for(const entry of entries) {
            if(Array.isArray(entry.command) && entry.command.includes(command)) {
                entry.handler();
                found = true;
                break;
            }

            if(entry.command == command) {
                await entry.handler();
                found = true;
                break;
            }
        }

        if(!found) {
            throw new Error("Unsupported command " + command);
        }
    }
    catch(err) {
        console.error(err);
    }
    finally {
        clean();
    }
}

async function available() {
    const apps = await loadApps();
    for(const app of apps) {
        console.log(app.name);
    }
}

async function list() {
    const files = await readdir(folders.packages);
    for(const file of files) {
        const stat = await getStat(path.resolve(folders.packages, file));
        if(stat.isDirectory()) {
            console.log(file);
        }
    }
}

async function version() {
    const package = await readJSONFile(path.resolve(__dirname, "package.json"));
    console.log(package.version);
}

async function install() {
    const appName = process.argv[3];
    if(!appName) {
        throw new Error("App name parameter is missing");
    }

    const apps = await loadApps();
    const app = getApp(apps, appName);

    await installApp(app);
}

async function uninstall() {
    const appName = process.argv[3];
    if(!appName) {
        throw new Error("App name parameter is missing");
    }

    const apps = await loadApps();
    const app = getApp(apps, appName);

    await uninstall(app);
}
