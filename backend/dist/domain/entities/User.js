"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
class User {
    constructor(id, name, email, passwordHash, role = 'operador', isActive = true, createdAt = new Date(), updatedAt = new Date()) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromPrisma(prismaUser) {
        return new User(prismaUser.id, prismaUser.name, prismaUser.email, prismaUser.passwordHash, prismaUser.role, prismaUser.isActive, prismaUser.createdAt, prismaUser.updatedAt);
    }
    toPublicData() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
            createdAt: this.createdAt,
        };
    }
}
exports.User = User;
