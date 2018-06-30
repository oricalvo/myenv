const readline = require('readline');
const {clean, gitConfig, spawn, CLIError, reportError} = require("./helpers");
const {error} = require("./logger");

main();

async function main() {
    try {
        const repoName = process.argv[2];
        if(!repoName){
            throw new CLIError("Missing repo parameter");
        }

        const userName = await gitConfig("user.name");
        if(!userName){
            throw new CLIError("Unable to determine git user name. Please ensure \"git config user.name\" returns your user name");
        }

        const url = `https://github.com/${userName}/${repoName}`;
        console.log("Repo: " + url);

        const args = ["clone", url, ...process.argv.slice(3)];
        await spawn("git", args, {
            stdio: "inherit",
            validateExitCode: true,
        });

        console.log("Done");
    }
    catch(err){
        reportError(err);
    }
    finally {
        clean();
    }
}

