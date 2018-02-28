const readline = require('readline');
const {httpRequest, clean, gitConfig, readPassword, readLine} = require("./helpers");

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

        const res = await httpRequest(options, {
            name: repoName,
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

