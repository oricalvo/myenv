const path = require("path");
const request = require("request");
const fs = require("fs");
const readline = require("readline");
const {downloadTo} = require("./helpers");

main();

async function main() {
    const args = process.argv;

    if (args.length < 4) {
        console.log("USAGE: download url dest");
		process.exit(1);
        return;
    }

    const [, , url, dest] = args;
    await downloadTo(url, dest);
}
