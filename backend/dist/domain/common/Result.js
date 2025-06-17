"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFailure = exports.isSuccess = exports.failure = exports.success = exports.Failure = exports.Success = void 0;
class Success {
    constructor(value) {
        this.value = value;
        this.isSuccess = true;
        this.isFailure = false;
    }
    static create(value) {
        return new Success(value);
    }
}
exports.Success = Success;
class Failure {
    constructor(error) {
        this.error = error;
        this.isSuccess = false;
        this.isFailure = true;
    }
    static create(error) {
        return new Failure(error);
    }
}
exports.Failure = Failure;
// Helper functions
const success = (value) => Success.create(value);
exports.success = success;
const failure = (error) => Failure.create(error);
exports.failure = failure;
// Result utilities
const isSuccess = (result) => {
    return result.isSuccess;
};
exports.isSuccess = isSuccess;
const isFailure = (result) => {
    return result.isFailure;
};
exports.isFailure = isFailure;
