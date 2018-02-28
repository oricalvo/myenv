const path = require("path");
const {loadRegistry, getApp, uninstallApp, installApp, folders} = require("./core");
const {clean, readJSONFile, readdir, getStat, spawn, exec, gitConfig, readPassword, readLine, httpRequest} = require("./helpers");
const url = require('url');
const https = require("https");

const entries = [
    {command: ["install", "i"], handler: install},
    {command: ["uninstall", "u"], handler: uninstall},
    {command: ["version", "v"], handler: version},
    {command: ["list"], handler: list},
    {command: ["available"], handler: available},
    {command: ["update"], handler: update},
    {command: ["push"], handler: push},
    {command: ["repos"], handler: repos},
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

async function repos() {
    const userName = await gitConfig("user.name");
    if(!userName){
        throw new Error("Unable to determine git user name. Please ensure \"git config user.name\" returns your user name");
    }
    console.log("User name: " + userName);

    const password = "hello05"; //await readLine("Password: ");
    const token = new Buffer(userName + ":" + password).toString("base64");

    var options = {
        host: 'api.github.com',
        port: '443',
        path: '/user/repos',
        method: 'GET',
        headers: {
            'Authorization': `Basic ${token}`,
            "user-agent": "node", // for some reason this is a must
        },
    };

    const repos = await getRepos(options);

    for(const repo of repos) {
        console.log(repo.name);
    }
    
    console.log(repos.length);
}

function getRepos(options){
    return new Promise((resolve,reject)=>{
        let body = "";

        const request = https.request(options, function(res){
            if(res.statusCode >= 300) {
                reject(new Error("Server returned status code " + res.statusCode + " " + res.statusMessage));
                return;
            };

            res.on("error", function(err){
                reject(err);
            });

            let body = "";
            res.on("data", function(buf){
                body += buf.toString();
            });

            res.on("end", function(){
                const repos = JSON.parse(body);

                const link = res.headers.link;
                if(link) {
                    const next = link.split(",").find(x => x.includes('rel="next"'));
                    if(next) {
                        const y = next.split(";")[0].trim();
                        const x = y.substring(1, y.length - 1);
                        const parsed = url.parse(x);
                        options.path = parsed.path;

                        console.log(options.path);

                        getRepos(options).then(r => {
                            const res = repos.concat(r);
                            resolve(res);
                        }).catch(reject);
                    }
                    else {
                        resolve(repos);
                    }
                }
                else {
                    resolve(repos);
                }
            });
        });

        if(body) {
            if(typeof body == "object") {
                request.write(JSON.stringify(body));
                options.headers = options.headers || {};
                options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
            }
            else {
                request.write(body);
            }
        }

        request.end();
    });
}
