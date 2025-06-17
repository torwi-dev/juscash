import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import publicationRoutes from './publications';
import scraperRoutes from './scraper';

const router = Router();


router.get('/status', (req: Request, res: Response) => {
  res.json({
    message: 'JusCash DJE API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/scraper', scraperRoutes);
router.use('/publications', publicationRoutes);

export default router;