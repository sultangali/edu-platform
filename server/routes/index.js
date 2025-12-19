import express from 'express';
import authRoutes from './auth.js';
import courseRoutes from './courses.js';
import progressRoutes from './progress.js';
import chatRoutes from './chats.js';
import certificateRoutes from './certificates.js';
import adminRoutes from './admin.js';
import aiRoutes from './ai.js';
import teacherRoutes from './teacher.js';
import analyticsRoutes from './analytics.js';
import profileRoutes from './profile.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/progress', progressRoutes);
router.use('/chats', chatRoutes);
router.use('/certificates', certificateRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/teacher', teacherRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/profile', profileRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

export default router;

