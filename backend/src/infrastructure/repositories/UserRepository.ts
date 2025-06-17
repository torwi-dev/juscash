 
import { IUserRepository, CreateUserDto } from '../../domain/interfaces/IUserRepository';
import { User } from '../../domain/entities/User';
import prisma from '../database';

export class UserRepository implements IUserRepository {
  
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user ? User.fromPrisma(user) : null;
  }

  async findById(id: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? User.fromPrisma(user) : null;
  }

  async create(data: CreateUserDto): Promise<User> {
    const createdUser = await prisma.user.create({
      data,
    });

    return User.fromPrisma(createdUser);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
    });

    return count > 0;
  }

  async updateLastLogin(id: number): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  async deactivate(id: number): Promise<User> {
    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return User.fromPrisma(deactivatedUser);
  }
}