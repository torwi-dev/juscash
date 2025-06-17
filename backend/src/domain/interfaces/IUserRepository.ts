 
import { User } from '../entities/User';
import { UserRole } from '@prisma/client';

export interface CreateUserDto {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  existsByEmail(email: string): Promise<boolean>;
  updateLastLogin(id: number): Promise<void>;
  deactivate(id: number): Promise<User>;
}