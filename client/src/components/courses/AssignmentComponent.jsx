import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const AssignmentComponent = ({ assignment, courseId, contentId, progress, onComplete }) => {
  const { t } = useTranslation();
  const [submission, setSubmission] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);

  useEffect(() => {
    // Check if assignment was already submitted
    if (progress && progress.assignmentSubmissions) {
      const existing = progress.assignmentSubmissions.find(
        (sub) => sub.assignmentId.toString() === assignment._id.toString()
      );
      setExistingSubmission(existing);
      if (existing && existing.submission) {
        if (typeof existing.submission === 'string') {
          setSubmission(existing.submission);
        } else if (existing.submission.text) {
          setSubmission(existing.submission.text);
        }
      }
    }
  }, [progress, assignment]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!submission.trim() && !file) {
      alert('Тапсырманы толтырыңыз немесе файл жүктеңіз');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
        formData.append('submission', JSON.stringify({
          text: submission,
          fileName: file.name,
        }));
      } else {
        formData.append('submission', JSON.stringify({ text: submission }));
      }

      const response = await api.post(
        `/progress/${courseId}/assignments/${assignment._id}/submit`,
        { 
          submission: file ? { text: submission, fileName: file.name } : { text: submission },
          contentId: contentId || assignment._id,
        }
      );

      setExistingSubmission(response.data.data);
      
      // Automatically call onComplete to mark content as completed
      if (onComplete) {
        onComplete(response.data.data, response.data.progress);
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(error.response?.data?.message || 'Тапсырманы жіберу кезінде қате болды');
    } finally {
      setSubmitting(false);
    }
  };

  const getGradeColor = (grade) => {
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {assignment.title}
        </h2>
        {assignment.description && (
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {assignment.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
          {assignment.dueDate && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Мерзімі: {new Date(assignment.dueDate).toLocaleDateString('kk-KZ')}
            </span>
          )}
          {assignment.maxScore && (
            <span>Максималды балл: {assignment.maxScore}</span>
          )}
        </div>
      </div>

      {existingSubmission ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">Тапсырма жіберілді</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Жіберілген уақыты: {new Date(existingSubmission.submittedAt).toLocaleString('kk-KZ')}
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Сіздің жауабыңыз:</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {typeof existingSubmission.submission === 'string' 
                ? existingSubmission.submission 
                : existingSubmission.submission?.text || 'Файл жүктелді'}
            </p>
            {existingSubmission.submission?.fileName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Файл: {existingSubmission.submission.fileName}
              </p>
            )}
          </div>

          {existingSubmission.grade !== undefined && existingSubmission.grade !== null ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Бағалау:</h3>
              <p className={`text-2xl font-bold ${getGradeColor(existingSubmission.grade)}`}>
                {existingSubmission.grade} / {assignment.maxScore || 100}
              </p>
              {existingSubmission.feedback && (
                <div className="mt-3">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Кері байланыс:</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {existingSubmission.feedback}
                  </p>
                </div>
              )}
              {existingSubmission.gradedAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Бағаланған уақыты: {new Date(existingSubmission.gradedAt).toLocaleString('kk-KZ')}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-700 dark:text-yellow-400">
                Тапсырма бағалануда...
              </p>
            </div>
          )}

          <button
            onClick={() => setExistingSubmission(null)}
            className="text-french-blue-600 dark:text-french-blue-400 hover:underline text-sm"
          >
            Қайта жіберу
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Жауабыңыз
            </label>
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Тапсырманың жауабын жазыңыз..."
              required={!file}
            />
          </div>

          {assignment.allowFileUpload && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Файл жүктеу (міндетті емес)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                accept={assignment.acceptedFileTypes || '*'}
              />
              {file && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Таңдалған файл: {file.name}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {submitting ? 'Жіберілуде...' : 'Тапсырманы жіберу'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AssignmentComponent;

