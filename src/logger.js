function error(message){
    if(typeof message == "string") {
        console.log(message.red);
        return;
    }

    console.log(message);
}

function log(message){
    console.log(message);
}

function important(message){
    if(typeof message == "string") {
        console.log(message.cyan);
        return;
    }

    console.log(message);
}

module.exports = {
    error,
    log,
    important,
};
