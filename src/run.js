const {loadApps, getApp, installAndRun} = require("./core");
const {clean} = require("./helpers");

main();

async function main() {
    try {
        const appName = process.argv[2];
        if(!appName) {
            throw new Error("App name parameter is missin");
        }

        const apps = await loadApps();
        const app = getApp(apps, appName);

        await installAndRun(app);
    }
    catch(err) {
        console.error(err);
    }
    finally {
        clean();
    }
}
