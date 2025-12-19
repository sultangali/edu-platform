import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  unenrollCourse,
  getEnrolledCourses,
  getTeachingCourses,
} from '../controllers/courseController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/', optionalAuth, getCourses);
router.get('/enrolled', protect, getEnrolledCourses);
router.get('/teaching', protect, authorize('instructor', 'admin'), getTeachingCourses);
router.get('/:id', optionalAuth, getCourse);
router.post('/', protect, authorize('instructor', 'admin'), upload.any(), createCourse);
router.put('/:id', protect, authorize('instructor', 'admin'), upload.any(), updateCourse);
router.delete('/:id', protect, authorize('instructor', 'admin'), deleteCourse);
router.post('/:id/enroll', protect, enrollCourse);
router.delete('/:id/enroll', protect, unenrollCourse);

export default router;

