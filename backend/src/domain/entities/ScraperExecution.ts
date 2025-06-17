import { ScrapingStatus } from '@prisma/client';

export class ScraperExecution {
  constructor(
    public id: number,
    public executionDate: Date,
    public startTime?: Date,
    public endTime?: Date,
    public status: ScrapingStatus = 'running',
    public publicationsFound: number = 0,
    public publicationsNew: number = 0,
    public publicationsDuplicated: number = 0,
    public errorMessage?: string,
    public djeUrl?: string,
    public hostName?: string,
    public executedBy?: string,
    public environment: string = 'production',
    public createdAt: Date = new Date(),
  ) {}

  static fromPrisma(prismaExecution: any): ScraperExecution {
    return new ScraperExecution(
      prismaExecution.id,
      prismaExecution.executionDate,
      prismaExecution.startTime,
      prismaExecution.endTime,
      prismaExecution.status,
      prismaExecution.publicationsFound,
      prismaExecution.publicationsNew,
      prismaExecution.publicationsDuplicated,
      prismaExecution.errorMessage,
      prismaExecution.djeUrl,
      prismaExecution.hostName,
      prismaExecution.executedBy,
      prismaExecution.environment,
      prismaExecution.createdAt,
    );
  }

  complete(publicationsFound: number, publicationsNew: number): void {
    this.status = 'completed';
    this.endTime = new Date();
    this.publicationsFound = publicationsFound;
    this.publicationsNew = publicationsNew;
    this.publicationsDuplicated = publicationsFound - publicationsNew;
  }

  fail(errorMessage: string): void {
    this.status = 'failed';
    this.endTime = new Date();
    this.errorMessage = errorMessage;
  }
}