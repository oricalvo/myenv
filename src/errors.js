class ValidationError extends Error {
    constructor(message){
        super(message)
    }
}

exports.ValidationError = ValidationError;
