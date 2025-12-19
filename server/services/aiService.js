import { GoogleGenerativeAI } from '@google/generative-ai';
import { t } from '../utils/i18n.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to create a mock request object for translation
const createMockReq = (language) => ({
  headers: { 'accept-language': language },
  query: { lang: language },
  body: { language }
});

export const generateContent = async (prompt, language = 'kaz') => {
  try {
    const req = createMockReq(language);
    const systemPrompt = t(req, 'ai.generateContent.systemPrompt', { prompt });
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(systemPrompt || prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error('Failed to generate content');
  }
};

export const checkAnswers = async (question, answer, correctAnswer, language = 'kaz') => {
  try {
    const req = createMockReq(language);
    const promptText = t(req, 'ai.checkAnswers.prompt', { 
      question, 
      answer, 
      correctAnswer 
    }) || `Question: ${question}\nStudent Answer: ${answer}\nCorrect Answer: ${correctAnswer}\n\nPlease evaluate the student's answer and provide a score (0-100) and brief feedback.`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error('Failed to check answers');
  }
};

export const gradeAssignment = async (assignment, submission, language = 'kaz') => {
  try {
    const req = createMockReq(language);
    const promptText = t(req, 'ai.gradeAssignment.prompt', { 
      assignment: typeof assignment === 'string' ? assignment : JSON.stringify(assignment),
      submission: typeof submission === 'string' ? submission : JSON.stringify(submission)
    }) || `Grade this assignment submission:\n\nAssignment: ${typeof assignment === 'string' ? assignment : JSON.stringify(assignment)}\n\nSubmission: ${typeof submission === 'string' ? submission : JSON.stringify(submission)}\n\nProvide a grade (0-100) and feedback.`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error('Failed to grade assignment');
  }
};

