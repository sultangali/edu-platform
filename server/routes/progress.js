import express from 'express';
import {
  getCourseProgress,
  markLessonComplete,
  markLessonIncomplete,
  getAllProgress,
  submitTest,
  submitAssignment,
  gradeAssignment,
} from '../controllers/progressController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/', getAllProgress);
router.get('/:courseId', getCourseProgress);
router.post('/:courseId/lessons/:lessonId/complete', markLessonComplete);
router.delete('/:courseId/lessons/:lessonId/complete', markLessonIncomplete);
router.post('/:courseId/tests/:testId/submit', submitTest);
router.post('/:courseId/assignments/:assignmentId/submit', submitAssignment);
router.put('/:progressId/assignments/:submissionId/grade', authorize('instructor', 'admin'), gradeAssignment);

export default router;
