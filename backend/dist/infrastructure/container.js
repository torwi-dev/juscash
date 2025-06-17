"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Injectable = exports.resolve = exports.getScraperRepository = exports.getUserRepository = exports.getPublicationRepository = exports.getScraperService = exports.getAuthService = exports.getPublicationService = exports.container = exports.ServiceRegistry = void 0;
const PublicationRepository_1 = require("./repositories/PublicationRepository");
const UserRepository_1 = require("./repositories/UserRepository");
const ScraperRepository_1 = require("./repositories/ScraperRepository");
const PublicationService_1 = require("../services/PublicationService");
const AuthService_1 = require("../services/AuthService");
const ScraperService_1 = require("../services/ScraperService");
class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.registerServices();
    }
    static getInstance() {
        if (!ServiceRegistry.instance) {
            ServiceRegistry.instance = new ServiceRegistry();
        }
        return ServiceRegistry.instance;
    }
    registerServices() {
        // Repositories (Singletons)
        this.registerSingleton('PublicationRepository', () => new PublicationRepository_1.PublicationRepository());
        this.registerSingleton('UserRepository', () => new UserRepository_1.UserRepository());
        this.registerSingleton('ScraperRepository', () => new ScraperRepository_1.ScraperRepository());
        // Services (Singletons with dependencies)
        this.registerSingleton('PublicationService', () => new PublicationService_1.PublicationService(this.resolve('PublicationRepository')));
        this.registerSingleton('AuthService', () => new AuthService_1.AuthService(this.resolve('UserRepository')));
        this.registerSingleton('ScraperService', () => new ScraperService_1.ScraperService(this.resolve('ScraperRepository')));
    }
    registerSingleton(name, factory) {
        this.services.set(name, { factory, singleton: true });
    }
    registerTransient(name, factory) {
        this.services.set(name, { factory, singleton: false });
    }
    resolve(name) {
        const registration = this.services.get(name);
        if (!registration) {
            throw new Error(`Service '${name}' not registered`);
        }
        if (registration.singleton) {
            if (!registration.instance) {
                registration.instance = registration.factory();
            }
            return registration.instance;
        }
        return registration.factory();
    }
    // Utility method for checking if service exists
    isRegistered(name) {
        return this.services.has(name);
    }
    // Method to clear instances (useful for testing)
    clearInstances() {
        this.services.forEach(registration => {
            if (registration.singleton) {
                delete registration.instance;
            }
        });
    }
    // Get all registered service names
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }
}
exports.ServiceRegistry = ServiceRegistry;
// Singleton instance getter
exports.container = ServiceRegistry.getInstance();
// Helper functions for backward compatibility and easier use
const getPublicationService = () => {
    return exports.container.resolve('PublicationService');
};
exports.getPublicationService = getPublicationService;
const getAuthService = () => {
    return exports.container.resolve('AuthService');
};
exports.getAuthService = getAuthService;
const getScraperService = () => {
    return exports.container.resolve('ScraperService');
};
exports.getScraperService = getScraperService;
const getPublicationRepository = () => {
    return exports.container.resolve('PublicationRepository');
};
exports.getPublicationRepository = getPublicationRepository;
const getUserRepository = () => {
    return exports.container.resolve('UserRepository');
};
exports.getUserRepository = getUserRepository;
const getScraperRepository = () => {
    return exports.container.resolve('ScraperRepository');
};
exports.getScraperRepository = getScraperRepository;
// Advanced resolution with type safety
const resolve = (serviceName) => {
    return exports.container.resolve(serviceName);
};
exports.resolve = resolve;
// Decorator for automatic service injection (future enhancement)
const Injectable = (serviceName) => {
    return function (constructor) {
        exports.container.registerSingleton(serviceName, () => new constructor());
        return constructor;
    };
};
exports.Injectable = Injectable;
