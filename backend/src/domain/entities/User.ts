 
import { UserRole } from '@prisma/client';

export class User {
  constructor(
    public id: number,
    public name: string,
    public email: string,
    public passwordHash: string,
    public role: UserRole = 'operador',
    public isActive: boolean = true,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  static fromPrisma(prismaUser: any): User {
    return new User(
      prismaUser.id,
      prismaUser.name,
      prismaUser.email,
      prismaUser.passwordHash,
      prismaUser.role,
      prismaUser.isActive,
      prismaUser.createdAt,
      prismaUser.updatedAt,
    );
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