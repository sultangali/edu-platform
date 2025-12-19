import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const TestComponent = ({ test, courseId, contentId, onComplete }) => {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAnswerChange = (questionIndex, optionIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: optionIndex,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if all questions are answered
    if (Object.keys(answers).length < test.questions.length) {
      alert('Барлық сұрақтарға жауап беріңіз');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/progress/${courseId}/tests/${test._id}/submit`, {
        answers: answers,
        contentId: contentId || test._id,
      });

      setResult(response.data.data);
      setSubmitted(true);

      // Automatically call onComplete to mark content as completed
      if (onComplete) {
        onComplete(response.data.data, response.data.progress);
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      alert(error.response?.data?.message || 'Тестті жіберу кезінде қате болды');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  };

  if (submitted && result) {
    const passed = result.passed;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className={`text-center mb-6 p-6 rounded-lg ${
          passed 
            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' 
            : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
        }`}>
          <div className="flex justify-center mb-4">
            {passed ? (
              <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h3 className={`text-2xl font-bold mb-2 ${passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {passed ? 'Тест сәтті өтілді!' : 'Тест өтілмеді'}
          </h3>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Сіздің нәтижеңіз: <span className="font-bold">{result.score}%</span>
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Дұрыс жауаптар: {result.correctAnswers} / {result.totalQuestions}
          </p>
          {test.passingScore && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Өту балы: {test.passingScore}%
            </p>
          )}
        </div>

        <div className="flex justify-center gap-4">
          {!passed && (
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Қайта өту
            </button>
          )}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-colors"
          >
            Жалғастыру
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {test.title}
        </h2>
        {test.description && (
          <p className="text-gray-600 dark:text-gray-400">{test.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          {test.duration && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {test.duration} минут
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {test.questions.length} сұрақ
          </span>
          {test.passingScore && (
            <span>Өту балы: {test.passingScore}%</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {test.questions.map((question, qIndex) => (
          <div key={qIndex} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {qIndex + 1}. {question.question}
            </h3>
            <div className="space-y-2">
              {question.options.map((option, oIndex) => (
                <label
                  key={oIndex}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    answers[qIndex] === oIndex
                      ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${qIndex}`}
                    value={oIndex}
                    checked={answers[qIndex] === oIndex}
                    onChange={() => handleAnswerChange(qIndex, oIndex)}
                    className="w-4 h-4 text-french-blue-600 focus:ring-french-blue-500"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || Object.keys(answers).length < test.questions.length}
            className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {submitting ? 'Жіберілуде...' : 'Тестті аяқтау'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestComponent;

