"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNotFoundError = exports.isValidationError = exports.isDomainError = void 0;
const DomainErrors_1 = require("./DomainErrors");
// Error type guards
const isDomainError = (error) => {
    return error instanceof DomainErrors_1.DomainError;
};
exports.isDomainError = isDomainError;
const isValidationError = (error) => {
    return error instanceof DomainErrors_1.ValidationError;
};
exports.isValidationError = isValidationError;
const isNotFoundError = (error) => {
    return error instanceof DomainErrors_1.NotFoundError;
};
exports.isNotFoundError = isNotFoundError;
