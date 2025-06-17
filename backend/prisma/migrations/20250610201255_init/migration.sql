-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('nova', 'lida', 'enviada_adv', 'concluida');

-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('running', 'completed', 'failed', 'partial', 'timeout', 'maintenance');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'operador', 'scraper_service', 'readonly');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'operador',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper_executions" (
    "id" SERIAL NOT NULL,
    "execution_date" DATE NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "status" "ScrapingStatus" NOT NULL DEFAULT 'running',
    "publications_found" INTEGER NOT NULL DEFAULT 0,
    "publications_new" INTEGER NOT NULL DEFAULT 0,
    "publications_duplicated" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "dje_url" TEXT,
    "host_name" TEXT,
    "executed_by" TEXT,
    "environment" TEXT DEFAULT 'production',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraper_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" SERIAL NOT NULL,
    "process_number" TEXT NOT NULL,
    "publication_date" DATE,
    "availability_date" DATE,
    "authors" TEXT[],
    "lawyers" TEXT[],
    "defendant" TEXT NOT NULL DEFAULT 'Instituto Nacional do Seguro Social - INSS',
    "main_value" DECIMAL(12,2),
    "interest_value" DECIMAL(12,2),
    "legal_fees" DECIMAL(12,2),
    "full_content" TEXT,
    "status" "PublicationStatus" NOT NULL DEFAULT 'nova',
    "content_hash" TEXT,
    "source_url" TEXT,
    "scraper_execution_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "scraper_executions_execution_date_key" ON "scraper_executions"("execution_date");

-- CreateIndex
CREATE UNIQUE INDEX "publications_process_number_key" ON "publications"("process_number");

-- CreateIndex
CREATE INDEX "publications_process_number_idx" ON "publications"("process_number");

-- CreateIndex
CREATE INDEX "publications_status_idx" ON "publications"("status");

-- CreateIndex
CREATE INDEX "publications_publication_date_idx" ON "publications"("publication_date");

-- CreateIndex
CREATE INDEX "publications_source_url_idx" ON "publications"("source_url");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_scraper_execution_id_fkey" FOREIGN KEY ("scraper_execution_id") REFERENCES "scraper_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
