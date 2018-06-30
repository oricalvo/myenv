const readline = require('readline');
const {httpRequest, clean, gitConfig, readPassword, reportError} = require("./helpers");
const path = require("path");

main();

async function main() {
    try {
        const repoName = process.argv[2] || path.basename(process.cwd());
        console.log("Repo name: " + repoName);

        const userName = await gitConfig("user.name");
        if(!userName){
            throw new CLIError("Unable to determine git user name. Please ensure \"git config user.name\" returns your user name");
        }
        console.log("User name: " + userName);

        const password = await readPassword("Password: ");
        const token = new Buffer(userName + ":" + password).toString("base64");

        var options = {
            host: 'api.github.com',
            port: '443',
            path: '/user/repos',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${token}`,
                "Content-Type": "application/json",
                "user-agent": "node", // for some reason this is a must
            },
        };

        process.stdout.write(`Creating repo ${repoName} ... `);
        const res = await httpRequest(options, {
            name: repoName,
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

