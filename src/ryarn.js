const path = require("path");
const {promisify, spawn} = require("./helpers");
const glob = promisify(require("glob"));

main();

async function main() {
    try {
        console.log("Searching ...");
        const files = await glob(["**/package.json","!**/node_modules/package.json"]);

        const cwd = process.cwd();

        for(const file of files){
            if(!file.includes("node_modules")) {
                const dir = path.dirname(path.resolve(cwd, file));
                console.log(dir);

                await spawn("yarn", [], {
                    shell: true,
                    stdio: "inherit",
                    validateExitCode: true,
                    cwd: dir,
                });
            }
        }
    }
    catch(err){
        console.log(err);
    }
}


