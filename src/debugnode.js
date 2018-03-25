main();

function main() {
    const pid = process.argv[2];
    if(!pid) {
        console.log("USAGE: debugnode PID");
        return;
    }

    process._debugProcess(pid)
}
