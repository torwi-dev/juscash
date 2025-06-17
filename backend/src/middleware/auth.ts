import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import prisma from '../infrastructure/database';

// Extender o tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Token de acesso requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Buscar usuário no banco para garantir que ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Token inválido ou usuário inativo' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
    return;
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Permissão insuficiente' });
      return;
    }

    next();
  };
};