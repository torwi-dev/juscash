import { PublicationRepository } from './repositories/PublicationRepository';
import { UserRepository } from './repositories/UserRepository';
import { ScraperRepository } from './repositories/ScraperRepository';

import { PublicationService } from '../services/PublicationService';
import { AuthService } from '../services/AuthService';
import { ScraperService } from '../services/ScraperService';

import { IPublicationRepository } from '../domain/interfaces/IPublicationRepository';
import { IUserRepository } from '../domain/interfaces/IUserRepository';
import { IScraperRepository } from '../domain/interfaces/IScraperRepository';

type Constructor<T = {}> = new (...args: any[]) => T;
type ServiceFactory<T> = () => T;

interface ServiceRegistration<T> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<string, ServiceRegistration<any>>();

  private constructor() {
    this.registerServices();
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private registerServices() {
    // Repositories (Singletons)
    this.registerSingleton('PublicationRepository', () => new PublicationRepository());
    this.registerSingleton('UserRepository', () => new UserRepository());
    this.registerSingleton('ScraperRepository', () => new ScraperRepository());

    // Services (Singletons with dependencies)
    this.registerSingleton('PublicationService', () => 
      new PublicationService(this.resolve<IPublicationRepository>('PublicationRepository'))
    );
    
    this.registerSingleton('AuthService', () => 
      new AuthService(this.resolve<IUserRepository>('UserRepository'))
    );
    
    this.registerSingleton('ScraperService', () => 
      new ScraperService(this.resolve<IScraperRepository>('ScraperRepository'))
    );
  }

  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, { factory, singleton: true });
  }

  registerTransient<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, { factory, singleton: false });
  }

  resolve<T>(name: string): T {
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
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  // Method to clear instances (useful for testing)
  clearInstances(): void {
    this.services.forEach(registration => {
      if (registration.singleton) {
        delete registration.instance;
      }
    });
  }

  // Get all registered service names
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }
}

// Singleton instance getter
export const container = ServiceRegistry.getInstance();

// Helper functions for backward compatibility and easier use
export const getPublicationService = (): PublicationService => {
  return container.resolve<PublicationService>('PublicationService');
};

export const getAuthService = (): AuthService => {
  return container.resolve<AuthService>('AuthService');
};

export const getScraperService = (): ScraperService => {
  return container.resolve<ScraperService>('ScraperService');
};

export const getPublicationRepository = (): IPublicationRepository => {
  return container.resolve<IPublicationRepository>('PublicationRepository');
};

export const getUserRepository = (): IUserRepository => {
  return container.resolve<IUserRepository>('UserRepository');
};

export const getScraperRepository = (): IScraperRepository => {
  return container.resolve<IScraperRepository>('ScraperRepository');
};

// Advanced resolution with type safety
export const resolve = <T>(serviceName: string): T => {
  return container.resolve<T>(serviceName);
};

// Decorator for automatic service injection (future enhancement)
export const Injectable = (serviceName: string) => {
  return function <T extends Constructor>(constructor: T) {
    container.registerSingleton(serviceName, () => new constructor());
    return constructor;
  };
};