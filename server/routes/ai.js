import express from 'express';
import {
  generateContentWithAI,
  checkAnswersWithAI,
  gradeAssignmentWithAI,
} from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('instructor', 'admin'));

router.post('/generate', generateContentWithAI);
router.post('/check-answers', checkAnswersWithAI);
router.post('/grade', gradeAssignmentWithAI);

export default router;

