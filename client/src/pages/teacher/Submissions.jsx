import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const Submissions = () => {
  const { t } = useTranslation();
  const { courseId, assignmentId, studentId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeModal, setGradeModal] = useState(false);
  const [gradeData, setGradeData] = useState({ score: '', feedback: '' });
  const [singleSubmission, setSingleSubmission] = useState(null);
  const [singleSubmissionLoading, setSingleSubmissionLoading] = useState(false);

  useEffect(() => {
    if (courseId && assignmentId && studentId) {
      fetchSingleSubmission();
    } else {
      fetchSubmissions();
    }
    // eslint-disable-next-line
  }, [filter, courseId, assignmentId, studentId]);

  const fetchSingleSubmission = async () => {
    setSingleSubmissionLoading(true);
    try {
      const response = await api.get(`/teacher/submissions/${courseId}/${assignmentId}/${studentId}`);
      const submissionData = response.data.data;

      setSingleSubmission(submissionData);

      if (submissionData.grade === undefined || submissionData.grade === null) {
        setSelectedSubmission(submissionData);
        setGradeModal(true);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      alert(error?.response?.data?.message || t('teacher.submissions_load_error'));
      navigate('/teacher/submissions');
    } finally {
      setSingleSubmissionLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/teacher/dashboard');
      const data = response.data.data;

      const allSubmissions = (data.recentSubmissions || []).map(sub => {
        const studentNameParts = (sub.studentName || t('teacher.student')).split(' ');
        return {
          _id: sub._id,
          student: { 
            firstName: studentNameParts[0] || t('teacher.student'), 
            lastName: studentNameParts.slice(1).join(' ') || '',
            _id: sub.studentId 
          },
          course: { title: sub.courseName || t('teacher.course'), _id: sub.courseId },
          assignment: { title: sub.assignmentTitle || t('teacher.assignment'), _id: sub.assignmentId, maxScore: sub.assignmentMaxScore || 100 },
          submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : new Date(),
          status: sub.status || 'pending',
          grade: sub.grade !== undefined ? sub.grade : null,
          score: sub.score !== undefined ? sub.score : (sub.grade !== undefined ? sub.grade : null),
          feedback: sub.feedback || null,
          content: null,
          attachments: [],
        };
      });

      const filtered = filter === 'all' 
        ? allSubmissions 
        : allSubmissions.filter(s => s.status === filter);

      setSubmissions(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setLoading(false);
      setSubmissions([]);
    }
  };

  const formatDate = (date) => {
    if (!date) return t('teacher.no_date');
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return t('teacher.invalid_date');
    }
    return new Intl.DateTimeFormat('kk-KZ', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const handleGrade = async () => {
    try {
      if (!selectedSubmission || !gradeData.score) {
        alert(t('teacher.enter_grade'));
        return;
      }

      const progressId = selectedSubmission.progressId;
      const submissionId = selectedSubmission._id;

      if (!progressId || !submissionId) {
        alert(t('teacher.error_progress_submission_id'));
        return;
      }

      await api.put(`/progress/${progressId}/assignments/${submissionId}/grade`, {
        grade: parseInt(gradeData.score),
        feedback: gradeData.feedback || '',
      });
      
      if (courseId && assignmentId && studentId && singleSubmission) {
        await fetchSingleSubmission();
      } else {
        setSubmissions(prev => prev.map(s => 
          s._id === selectedSubmission._id 
            ? { ...s, status: 'graded', grade: parseInt(gradeData.score), score: parseInt(gradeData.score), feedback: gradeData.feedback }
            : s
        ));
        fetchSubmissions();
      }
      
      setGradeModal(false);
      setSelectedSubmission(null);
      setGradeData({ score: '', feedback: '' });
      
      alert(t('teacher.grade_success'));
    } catch (error) {
      console.error('Error grading submission:', error);
      alert(error.response?.data?.message || t('teacher.grade_error'));
    }
  };

  const handleAIGrade = async () => {
    setGradeData({
      score: '88',
      feedback: t('teacher.ai_feedback')
    });
  };

  if (singleSubmissionLoading || (loading && !courseId)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-french-blue-600"></div>
      </div>
    );
  }

  if (singleSubmission && courseId && assignmentId && studentId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link
              to="/teacher/submissions"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('teacher.back_to_submissions')}
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {singleSubmission.assignment.title || t('teacher.assignment')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('teacher.course')}: {singleSubmission.course.title || t('teacher.course')}
              </p>
            </div>

            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-french-blue-100 dark:bg-french-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-french-blue-600 dark:text-french-blue-400 font-semibold text-lg">
                    {singleSubmission.student?.firstName?.charAt(0) || t('teacher.student_placeholder_initial')}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {singleSubmission.student?.firstName || t('teacher.student')} {singleSubmission.student?.lastName || ''}
                  </h3>
                  {singleSubmission.student?.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {singleSubmission.student.email}
                    </p>
                  )}
                  {singleSubmission.submittedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('teacher.submitted_at')}: {formatDate(singleSubmission.submittedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Assignment Description */}
            {singleSubmission.assignment.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {t('teacher.assignment_description')}
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {singleSubmission.assignment.description}
                  </p>
                  {singleSubmission.assignment.maxScore && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      {t('teacher.assignment_max_score')}: {singleSubmission.assignment.maxScore}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Student Response */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('teacher.student_answer')}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                {typeof singleSubmission.submission === 'string' ? (
                  <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {singleSubmission.submission || t('teacher.no_answer')}
                  </p>
                ) : (
                  <>
                    {singleSubmission.submission?.text && (
                      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 mb-4">
                        {singleSubmission.submission.text}
                      </p>
                    )}
                    {!singleSubmission.submission?.text && (
                      <p className="text-gray-500 dark:text-gray-400 italic">{t('teacher.no_text_answer')}</p>
                    )}
                  </>
                )}
                {singleSubmission.submission?.fileName && (
                  <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('teacher.attached_file')}:</p>
                    <a
                      href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${singleSubmission.submission.fileUrl || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-french-blue-100 dark:bg-french-blue-900/30 text-french-blue-700 dark:text-french-blue-400 rounded-lg hover:bg-french-blue-200 dark:hover:bg-french-blue-900/50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {singleSubmission.submission.fileName}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {(singleSubmission.grade !== undefined && singleSubmission.grade !== null) || singleSubmission.gradedAt ? (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('teacher.grading')}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedSubmission(singleSubmission);
                      setGradeData({ 
                        score: singleSubmission.grade.toString(), 
                        feedback: singleSubmission.feedback || '' 
                      });
                      setGradeModal(true);
                    }}
                    className="px-4 py-2 text-sm bg-french-blue-600 hover:bg-french-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {t('teacher.edit_grade')}
                  </button>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {singleSubmission.grade} / {singleSubmission.assignment.maxScore}
                </p>
                {singleSubmission.feedback && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{t('teacher.feedback')}:</h4>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {singleSubmission.feedback}
                    </p>
                  </div>
                )}
                {singleSubmission.gradedAt && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                    {t('teacher.graded_at')}: {formatDate(singleSubmission.gradedAt)}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setSelectedSubmission(singleSubmission);
                  setGradeModal(true);
                }}
                className="w-full px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('teacher.grading')}
              </button>
            )}
          </div>
        </div>

        {/* Grade Modal */}
        {gradeModal && selectedSubmission && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setGradeModal(false)}></div>
              
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('teacher.grade_assignment')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSubmission.student.firstName} {selectedSubmission.student.lastName} - {selectedSubmission.assignment.title}
                  </p>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('teacher.score_input_label', { maxScore: selectedSubmission.assignment.maxScore })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedSubmission.assignment.maxScore}
                      value={gradeData.score}
                      onChange={(e) => setGradeData(prev => ({ ...prev, score: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent"
                      placeholder={t('teacher.score_input_placeholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('teacher.feedback')}
                    </label>
                    <textarea
                      value={gradeData.feedback}
                      onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent resize-none"
                      placeholder={t('teacher.feedback_placeholder')}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAIGrade}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {t('teacher.ai_grade')}
                  </button>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGradeModal(false);
                      setSelectedSubmission(null);
                      setGradeData({ score: '', feedback: '' });
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleGrade}
                    disabled={!gradeData.score}
                    className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/teacher/dashboard"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('common.back')}
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('teacher.submissions')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('teacher.submissions_desc')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { value: 'all', label: t('teacher.filter_all') },
            { value: 'pending', label: t('teacher.filter_pending') },
            { value: 'graded', label: t('teacher.filter_graded') }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-french-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Submissions List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('teacher.no_submissions')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('teacher.no_submissions_category')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {submissions.map((submission) => (
                <div key={submission._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-french-blue-100 dark:bg-french-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-french-blue-600 dark:text-french-blue-400 font-semibold text-lg">
                          {submission.student.firstName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {submission.student?.firstName || t('teacher.student')} {submission.student?.lastName || ''}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {submission.assignment?.title || t('teacher.assignment')} • {submission.course?.title || t('teacher.course')}
                        </p>
                        {submission.content && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                            {submission.content}
                          </p>
                        )}
                        {submission.attachments && submission.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {submission.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(submission.submittedAt)}
                      </span>
                      <div className="flex flex-col gap-2 items-end">
                        {(submission.status === 'pending' || !submission.grade) ? (
                          <Link
                            to={`/teacher/submissions/${submission.course._id}/${submission.assignment._id}/${submission.student._id}`}
                            className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            {t('teacher.check')}
                          </Link>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                              <span className="font-semibold">{submission.grade || submission.score || 0}</span>
                              <span className="text-sm">/ {submission.assignment?.maxScore || 100}</span>
                            </div>
                            {submission.feedback && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs text-right line-clamp-2">
                                {submission.feedback}
                              </p>
                            )}
                            <Link
                              to={`/teacher/submissions/${submission.course._id}/${submission.assignment._id}/${submission.student._id}`}
                              className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline"
                            >
                              {t('teacher.more')}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Modal */}
        {gradeModal && selectedSubmission && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setGradeModal(false)}></div>
              
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('teacher.grade_assignment')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSubmission.student.firstName} {selectedSubmission.student.lastName} - {selectedSubmission.assignment.title}
                  </p>
                </div>

                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('teacher.score_input_label', { maxScore: selectedSubmission.assignment.maxScore })}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedSubmission.assignment.maxScore}
                      value={gradeData.score}
                      onChange={(e) => setGradeData(prev => ({ ...prev, score: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent"
                      placeholder={t('teacher.score_input_placeholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('teacher.feedback')}
                    </label>
                    <textarea
                      value={gradeData.feedback}
                      onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent resize-none"
                      placeholder={t('teacher.feedback_placeholder')}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAIGrade}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {t('teacher.ai_grade')}
                  </button>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGradeModal(false);
                      setSelectedSubmission(null);
                      setGradeData({ score: '', feedback: '' });
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleGrade}
                    disabled={!gradeData.score}
                    className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Submissions;
