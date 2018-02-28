const path = require("path");
const {loadRegistry, getApp, uninstallApp, installApp, folders} = require("./core");
const {clean, readJSONFile, readdir, getStat, spawn, exec} = require("./helpers");

const entries = [
    {command: ["install", "i"], handler: install},
    {command: ["uninstall", "u"], handler: uninstall},
    {command: ["version", "v"], handler: version},
    {command: ["list"], handler: list},
    {command: ["available"], handler: available},
    {command: ["update"], handler: update},
    {command: ["push"], handler: push},
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
    const registry = await loadRegistry();
    for(const app of registry.apps) {
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

    const registry = await loadRegistry();
    const app = getApp(registry, appName);

    await installApp(app);
}

async function uninstall() {
    const appName = process.argv[3];
    if(!appName) {
        throw new Error("App name parameter is missing");
    }

    const registry = await loadRegistry();
    const app = getApp(registry, appName);

    await uninstallApp(app);
}

async function update() {
    spawn("git", ["pull"], {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
    });
}

async function push() {
    const res = await exec("git status");
    if(res.includes("nothing to commit")) {
        console.log("Nothing to push");
        return;
    }

    const version = await exec("npm version patch", {
        shell: true,
        cwd: __dirname,
    });

    await spawn("git", ["add", "."], {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        validateExitCode: true,
    });

    await spawn("git", ["commit", "-m", `Version ${version}`], {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        validateExitCode: true,
    });

    await spawn("git", ["push"], {
        cwd: path.resolve(__dirname, ".."),
        stdio: "inherit",
        validateExitCode: true,
    });
}
