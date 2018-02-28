const readline = require('readline');
const {httpRequest, clean, gitConfig, readPassword, readLine, spawn} = require("./helpers");

main();

async function main() {
    try {
        const repoName = process.argv[2];
        if(!repoName){
            throw new Error("Missing repo parameter");
        }

        const userName = await gitConfig("user.name");
        if(!userName){
            throw new Error("Unable to determine git user name. Please ensure \"git config user.name\" returns your user name");
        }
        console.log("User name: " + userName);

        await spawn("git", ["clone", `https://github.com/${userName}/${repoName}`], {
            stdio: "inherit",
            validateExitCode: true,
        });

        console.log("Done");
    }
    catch(err){
        console.log(err);
    }
    finally {
        clean();
    }
}

