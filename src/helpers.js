const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");
const readline = require("readline");
const child_process = require("child_process");
const rimraf = require("rimraf");
const {Writable} = require("stream");
const nativeGlob = require("glob");
const {error, log} = require("./logger");

const mutableStdout = new Writable({
    write: function(chunk, encoding, callback) {
        if (!this.muted) {
            process.stdout.write(chunk, encoding);
        }

        callback();
    }
});

mutableStdout.muted = false;

const rl = readline.createInterface({
    input: process.stdin,
    //output: process.stdout,
    output: mutableStdout,
    terminal: true,
});

function httpRequest(options, body){
    return new Promise((resolve,reject)=>{
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
                resolve(body);
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

function downloadTo(url, dest, message) {
    message = message || "Downloading";
    message += " ";

    return new Promise((resolve,reject)=> {
        const filePath = path.resolve(path.isAbsolute(dest) ? dest : path.join(process.cwd(), dest));
        const writeStream = fs.createWriteStream(filePath);

        let contentLength = 0;
        let read = 0;

        const h = url.startsWith("https") ? https : http;

        h.get(url, function (res) {
            if(res.statusCode == 302){
                downloadTo(res.headers["location"], dest, message).then(resolve).catch(reject);
                return;
            }
            else if(res.statusCode == 404){
                reject(new Error("Server responded with 404"));
                return;
            }

            contentLength = res.headers['content-length'];

            res.on("data", function (buffer) {
                if (read == 0) {
                    process.stdout.write(message);
                }

                read += buffer.length;

                readline.cursorTo(process.stdout, message.length, null);
                if(contentLength) {
                    process.stdout.write(Math.round(read * 100 / contentLength) + "%");
                }
                else {
                    process.stdout.write(read + " bytes");
                }
            }).on("error", function(err){
                reject(err);
            }).pipe(writeStream)
                .on("error", function (err) {
                    res.abort();
                    reject(err);
                })
                .on("finish", function () {
                    resolve();
                    console.log();
                });
        });
    });
}

function directoryExists(dir) {
    return isDirectory(dir);
}

function fileExists(path) {
    return isFile(path);
}

async function isFile(path) {
    try {
        const stat = await getStat(path);
        return stat.isFile();
    }

    catch (err) {
        if (err.code == "ENOENT") {
            return false;
        }

        throw err;
    }
}

async function isDirectory(path) {
    try {
        const stat = await getStat(path);
        return stat.isDirectory();
    }
    catch (err) {
        if (err.code == "ENOENT") {
            return false;
        }

        throw err;
    }
}

const deleteDirectory = promisifyNodeFn1(rimraf);

async function copyFile(from, to, ignoreDir = false) {
    const stats = await getStat(from);
    if (stats.isDirectory()) {
        if (!ignoreDir) {
            throw new Error("Specified path is a directory");
        }
    }

    await fsExtraCopy(from, to);
}

function copyFiles(files, base, dest) {
    return Promise.all(files.map(file => {
        const relativeName = file.substring(base.length);
    return copyFile(file, path.posix.join(dest, relativeName), true)
}));
}

async function deleteFile(path) {
    try {
        const isDir = await isFile(path);
        if (!isDir) {
            throw new Error("Specified path \"" + path + "\" is not a file");
        }

        await unlink(path);
    }
    catch(err) {
        if(err.code == "ENOENT") {
            return;
        }

        throw err;
    }
}

const readFile = promisifyNodeFn1(fs.readFile);
const unlink = promisifyNodeFn1(fs.unlink);
const readdir = promisifyNodeFn1(fs.readdir);
const getStat = promisifyNodeFn1(fs.stat);
const glob = promisifyNodeFn1(nativeGlob);

function writeFile(path, data, enc) {
    return fs["writeFileAsync"](path, data, enc);
}

async function readJSONFile(path) {
    const text = await readFile(path, "utf8");
    const obj = JSON.parse(text);
    return obj;
}

async function writeJSONFile(path, obj, ident) {
    const text = JSON.stringify(obj, null, ident);
    await writeFile(path, text, "utf8");
}

function excludeFiles(files, pattern) {
    const m = minimatch; // to prevent rollup error

    return files.filter(file => {
        return !m(file, pattern);
    });
}

function appendFile(path, text) {
    return fs["appendFileAsync"](path, text);
}

function replaceExt(filePath, ext) {
    const info  = path.parse(filePath);
    const res = path.join(info.dir, info.name + "." + ext);
    return res;
}

function promisify(func) {
    return function(arg) {
        const me = this;
        const args = Array.from(arguments);

        return new Promise((resolve, reject)=> {
            function callback(err, res) {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(res);
            }

            args.push(callback);

            func.apply(me, args);
        });
    }
}

function promisifyNodeFn1(func) {
    return function(arg) {
        return new Promise((resolve, reject)=> {
            func(arg, function(err, res) {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(res);
            });
        });
    }
}

function promisifyNodeFn2(func) {
    return function(arg1, arg2) {
        return new Promise((resolve, reject)=> {
            func(arg1, arg2, function(err, res) {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(res);
            });
        });
    }
}

function spawn(command, args, overrideOptions) {
    const options = {
        stdio: "ignore",
    };

    if (!args) {
        args = [];
    }

    if (overrideOptions) {
        Object.assign(options, overrideOptions);
    }

    return new Promise((resolve, reject) => {
        try {
            const child = child_process.spawn(command, args, options);

            if (options.validateExitCode) {
                child.on("close", function (code) {
                    if (code != 0) {
                        reject(new Error("spawn return error code " + code));
                    }
                    else {
                        resolve(child);
                    }
                });
            }
            else {
                resolve(child);
            }
        }
        catch (err) {
            reject(err);
        }
    });
}

function unzipTo(source, dest){
    return spawn("7z", ["x", source, `-o${dest}`], {
        stdio: "ignore",
        validateExitCode: true,
        shell: true,
    });
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function readLine(question) {
    return new Promise((resolve, reject) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function readPassword(question){
    try {
        process.stdout.write(question);
        mutableStdout.muted = true;
        const answer = await readLine("");
        console.log();
        return answer;
    }
    finally {
        mutableStdout.muted = false;
    }
}

function clean(){
    rl.close();
}

function gitConfig(key){
    return exec("git config " + key);
}

function exec(command, options) {
    return new Promise((resolve, reject) => {
        child_process.exec(command, options, (error, stdout, stderr) => {
            if(error) {
                reject("Command \"" + command + "\" failed with error code " + error.code);
            }

            resolve(stdout.trim());
        });
    });
}

class CLIError extends Error {
    constructor(message) {
        super(message);
    }
}

function reportError(err) {
    if(err instanceof CLIError) {
        error(err.message);
        return;
    }

    log(err);
}

module.exports = {
    downloadTo,
    spawn,
    fileExists,
    directoryExists,
    unzipTo,
    promisifyNodeFn1,
    promisifyNodeFn2,
    pad,
    readJSONFile,
    deleteFile,
    deleteDirectory,
    httpRequest,
    fileExists,
    readLine,
    clean,
    gitConfig,
    readPassword,
    readdir,
    getStat,
    exec,
    glob,
    promisify,
    CLIError,
    reportError,
};
