const {rl, loadApps, getApp, uninstall} = require("./core");

main();

async function main() {
    try {
        const command = process.argv[2];
        if(!command) {
            throw new Error("Command parameter is missing");
        }

        if(command == "uninstall" || command == "u"){
            const appName = process.argv[3];
            if(!appName) {
                throw new Error("App name parameter is missing");
            }

            const apps = await loadApps();
            const app = getApp(apps, appName);

            await uninstall(app);
        }
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
