import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getStudentAnalytics,
  getTeacherAnalytics,
  getAdminAnalytics,
} from '../controllers/analyticsController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student analytics
router.get('/student', authorize('student'), getStudentAnalytics);

// Teacher analytics
router.get('/teacher', authorize('instructor', 'admin'), getTeacherAnalytics);

// Admin analytics
router.get('/admin', authorize('admin'), getAdminAnalytics);

export default router;












