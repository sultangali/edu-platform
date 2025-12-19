import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getChats,
  getChat,
  createChat,
  sendMessage,
  addReaction,
  editMessage,
  deleteMessage,
  updateChat,
  toggleArchiveChat,
  deleteChat,
  getChatUsers,
  getChatCourses,
  togglePinMessage,
  markAsRead,
  createSupportChat,
  updateSupportStatus,
} from '../controllers/chatController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get available users and courses for chat creation
router.get('/users', getChatUsers);
router.get('/courses', getChatCourses);

// Support/complaint routes
router.post('/support', createSupportChat);
router.put('/:id/support-status', authorize('admin'), updateSupportStatus);

// Chat CRUD
router.route('/')
  .get(getChats)
  .post(createChat);

router.route('/:id')
  .get(getChat)
  .put(updateChat)
  .delete(deleteChat);

// Archive chat
router.put('/:id/archive', toggleArchiveChat);

// Mark as read
router.put('/:id/read', markAsRead);

// Messages
router.post('/:id/messages', sendMessage);
router.put('/:id/messages/:messageId', editMessage);
router.delete('/:id/messages/:messageId', deleteMessage);

// Reactions
router.post('/:id/messages/:messageId/reactions', addReaction);

// Pin message
router.put('/:id/messages/:messageId/pin', togglePinMessage);

export default router;












