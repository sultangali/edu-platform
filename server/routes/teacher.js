import express from 'express';
import { getTeacherDashboard, getSubmission } from '../controllers/teacherController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and teacher/admin role
router.use(protect);
router.use(authorize('instructor', 'admin'));

router.get('/dashboard', getTeacherDashboard);
router.get('/submissions/:courseId/:assignmentId/:studentId', getSubmission);

export default router;

