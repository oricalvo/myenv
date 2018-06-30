const colors = require("colors/safe");

function error(message){
    if(typeof message == "string") {
        console.log(colors.red(message));
        return;
    }

    console.log(message);
}

function log(message){
    console.log(message);
}

function important(message){
    if(typeof message == "string") {
        console.log(colors.cyan(message));
        return;
    }

    console.log(message);
}

module.exports = {
    error,
    log,
    important,
};
