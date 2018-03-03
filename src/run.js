const path = require("path");
const {loadRegistry, getApp, installAndRun, runApp} = require("./core");
const {clean, exec, glob} = require("./helpers");

main();

async function main() {
    try {
        const appName = process.argv[2];
        if(!appName) {
            throw new Error("App name parameter is missing");
        }

        const regsitry = await loadRegistry();
        const app = getApp(regsitry, appName);

        if(app.locals) {
            const exePath = await resolveAppLocals(app.locals);
            if(exePath) {
                runApp(app, exePath);
                return;
            }
        }

        await installAndRun(app);
    }
    catch(err) {
        console.error(err);
    }
    finally {
        clean();
    }
}

async function resolveAppLocals(locals) {
    let cwdChanged = false;
    const cwd = process.cwd();

    try {
        const res = await exec("wmic logicaldisk get caption,drivetype", {shell: true});
        const lines = res.split("\r\r\n").slice(1);
        for (const line of lines) {
            let [drive, type] = line.split(":");
            drive = drive.trim();
            type = type.trim();
            if (type == 3) {
                process.chdir(drive + ":");
                cwdChanged = true;

                for (const local of locals) {
                    const matches = await glob(local);
                    if (matches.length) {
                        return matches[0];
                    }
                }
            }
        }
    }
    finally {
        if(cwdChanged) {
            process.chdir(cwd.substring(0,2));
        }
    }
}

async function fileExists(pattern) {
    const matches = await glob(pattern);
    return matches.length > 0;
}
