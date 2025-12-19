import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllCourses,
  updateCourseStatus,
  deleteCourse,
  getStats,
  getSupportChats,
  respondToSupportChat,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Dashboard stats
router.get('/stats', getStats);

// Users management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Courses management
router.get('/courses', getAllCourses);
router.put('/courses/:id', updateCourseStatus);
router.delete('/courses/:id', deleteCourse);

// Support chats
router.get('/support-chats', getSupportChats);
router.post('/support-chats/:id/respond', respondToSupportChat);

export default router;
