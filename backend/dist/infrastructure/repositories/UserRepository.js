"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const User_1 = require("../../domain/entities/User");
const database_1 = __importDefault(require("../database"));
class UserRepository {
    async findByEmail(email) {
        const user = await database_1.default.user.findUnique({
            where: { email },
        });
        return user ? User_1.User.fromPrisma(user) : null;
    }
    async findById(id) {
        const user = await database_1.default.user.findUnique({
            where: { id },
        });
        return user ? User_1.User.fromPrisma(user) : null;
    }
    async create(data) {
        const createdUser = await database_1.default.user.create({
            data,
        });
        return User_1.User.fromPrisma(createdUser);
    }
    async existsByEmail(email) {
        const count = await database_1.default.user.count({
            where: { email },
        });
        return count > 0;
    }
    async updateLastLogin(id) {
        await database_1.default.user.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
    }
    async deactivate(id) {
        const deactivatedUser = await database_1.default.user.update({
            where: { id },
            data: { isActive: false },
        });
        return User_1.User.fromPrisma(deactivatedUser);
    }
}
exports.UserRepository = UserRepository;
