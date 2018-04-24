const path = require("path");
const fs = require("fs-extra");
const {promisify} = require("util");

main();

async function walkDirectories(name, parentPath, cb) {
    if(name && !await cb(name, parentPath)) {
        return;
    }

    const items = await fs.readdir(parentPath);

    for(const item of items) {
        const itemPath = path.join(parentPath, item);
        const info = await fs.stat(itemPath);
        if(info.isDirectory()) {
            await walkDirectories(item, itemPath, cb);
        }
    }
}

function getProcessDir(dirNameToDelete) {
    return async function processDir(dirName, dirPath) {
        if (dirName[0] == ".") {
            return false;
        }

        if (dirName == dirNameToDelete) {
            console.log("Removing", dirPath);
            await fs.remove(dirPath);
            return false;
        }
        
        return true;
    }
}

async function main() {
    try {
        if(process.argv.length < 3) {
            console.log("Missing directory name to delete");
            return;
        }

        const dirNameToDelete = process.argv[2];

        await walkDirectories(null, process.cwd(), getProcessDir(dirNameToDelete));
    }
    catch(err){
        console.log(err);
    }
}
