import { generateContent, checkAnswers, gradeAssignment } from '../services/aiService.js';

// @desc    Generate content with AI
// @route   POST /api/ai/generate
// @access  Private/Instructor
export const generateContentWithAI = async (req, res, next) => {
  try {
    const { prompt, type } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required',
      });
    }

    const language = req.language || 'kaz';
    const content = await generateContent(prompt, language);

    res.status(200).json({
      success: true,
      data: { content },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check answers with AI
// @route   POST /api/ai/check-answers
// @access  Private/Instructor
export const checkAnswersWithAI = async (req, res, next) => {
  try {
    const { question, answer, correctAnswer } = req.body;

    if (!question || !answer || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Question, answer, and correct answer are required',
      });
    }

    const language = req.language || 'kaz';
    const result = await checkAnswers(question, answer, correctAnswer, language);

    res.status(200).json({
      success: true,
      data: { result },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grade assignment with AI
// @route   POST /api/ai/grade
// @access  Private/Instructor
export const gradeAssignmentWithAI = async (req, res, next) => {
  try {
    const { assignment, submission } = req.body;

    if (!assignment || !submission) {
      return res.status(400).json({
        success: false,
        message: 'Assignment and submission are required',
      });
    }

    const language = req.language || 'kaz';
    const result = await gradeAssignment(assignment, submission, language);

    res.status(200).json({
      success: true,
      data: { result },
    });
  } catch (error) {
    next(error);
  }
};

