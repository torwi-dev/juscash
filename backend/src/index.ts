import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { setupSwagger } from './docs/swagger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup Swagger Documentation
setupSwagger(app);

// API Routes
app.use('/api', apiRoutes);

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'JusCash DJE API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs',
    api: '/api/status'
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handlers (usar os novos)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/status`);
  console.log(`📚 Docs: http://localhost:${PORT}/api-docs`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
});