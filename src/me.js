const path = require("path");
const {loadRegistry, getApp, uninstallApp, installApp, folders, installAndRun, runApp} = require("./core");
const {
    clean,
    readJSONFile,
    readdir,
    getStat,
    spawn,
    exec,
    gitConfig,
    readPassword,
    readLine,
    httpRequest,
    glob
} = require("./helpers");
const url = require('url');
const https = require("https");
const {ValidationError} = require("./errors");
const colors = require('colors');
const {error, log} = require("./logger");

const entries = [
    {command: ["install", "i"], handler: install},
    {command: ["uninstall", "u"], handler: uninstall},
    {command: ["version", "v"], handler: version},
    {command: ["list"], handler: list},
    {command: ["available"], handler: available},
    {command: ["update"], handler: update},
    {command: ["push"], handler: push},
    {command: ["repos"], handler: repos},
    {command: ["run"], handler: run},
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
                await entry.handler();
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
        if(err instanceof ValidationError){
            error(err.message);
        }
        else {
            error(err);
        }
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
    const repoRootFolder = path.join(__dirname, "..");

    const res = await exec("git status", {
        cwd: repoRootFolder,
    });
    if(res.includes("nothing to commit")) {
        console.log("Nothing to push");
        return;
    }

    const version = await exec("npm version patch", {
        shell: true,
        cwd: __dirname,
    });

    await spawn("git", ["add", "."], {
        cwd: repoRootFolder,
        stdio: "inherit",
        validateExitCode: true,
    });

    await spawn("git", ["commit", "-m", `Version ${version}`], {
        cwd: repoRootFolder,
        stdio: "inherit",
        validateExitCode: true,
    });

    await spawn("git", ["push"], {
        cwd: repoRootFolder,
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

async function run() {
    const appName = process.argv[3];
    if(!appName) {
        throw new Error("App name parameter is missing");
    }

    const regsitry = await loadRegistry();
    const app = getApp(regsitry, appName);

    if(app.locals) {
        const exePath = await resolveAppLocals(app.locals);
        if(exePath) {
            await runApp(app, exePath);
            return;
        }

        if(app.noPackage) {
            error(`Application "${appName}" was not found locally and is not associated with a remote package`);
            return;
        }
    }

    await installAndRun(app);
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
