import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/authStore';
import api from '../../services/api';
import LoadingScreen from '../../components/common/LoadingScreen';

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Helper function to get full thumbnail URL
  const getThumbnailUrl = (thumbnail) => {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return `${apiUrl}${thumbnail}`;
  };
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    pendingSubmissions: 0,
    activeChats: 0
  });
  const [courses, setCourses] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({
    newStudents: 0,
    completedLessons: 0,
    averageGrade: 0,
    certificatesIssued: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/teacher/dashboard');
      const data = response.data.data;

      setStats(data.stats);
      setCourses(data.courses || []);
      setRecentSubmissions(data.recentSubmissions || []);
      setRecentMessages(data.recentMessages || []);
      setWeeklyStats(data.weeklyStats || {
        newStudents: 0,
        completedLessons: 0,
        averageGrade: 0,
        certificatesIssued: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty data on error
      setStats({
        totalCourses: 0,
        totalStudents: 0,
        pendingSubmissions: 0,
        activeChats: 0
      });
      setCourses([]);
      setRecentSubmissions([]);
      setRecentMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((new Date() - dateObj) / 1000);
    if (seconds < 60) return t('common.justNow') || 'Жаңа ғана';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('teacher.timeAgo.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('teacher.timeAgo.hours', { count: hours });
    const days = Math.floor(hours / 24);
    return t('teacher.timeAgo.days', { count: days });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('teacher.dashboard')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('teacher.welcomeMessage', { name: user?.firstName })} 
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('teacher.myCourses')}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCourses}
                </p>
              </div>
              <div className="p-3 bg-french-blue-50 dark:bg-french-blue-900/20 rounded-lg">
                <svg className="w-6 h-6 text-french-blue-600 dark:text-french-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/teacher/courses" className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline">
                {t('teacher.viewAll')}
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('teacher.students')}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            {weeklyStats.newStudents > 0 && (
              <div className="mt-4">
                <span className="text-sm text-green-600 dark:text-green-400">{t('teacher.thisWeekStudents', { count: weeklyStats.newStudents })}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('teacher.submissions')}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingSubmissions}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/teacher/submissions" className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline">
                {t('teacher.check')}
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('teacher.activeChats')}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.activeChats}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/chat" className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline">
                {t('teacher.goToChat')}
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <Link
              to="/teacher/courses/create"
              className="inline-flex items-center gap-2 px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('teacher.createCourse')}
            </Link>
            <Link
              to="/teacher/submissions"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {t('teacher.checkAssignments')}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Courses */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('teacher.myCourses')}
                </h2>
                <Link to="/teacher/courses" className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline">
                  {t('teacher.all')}
                </Link>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <div key={course._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {getThumbnailUrl(course.thumbnail) ? (
                            <img src={getThumbnailUrl(course.thumbnail)} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                              {course.title}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                              course.status === 'published' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {course.status === 'published' 
                                ? t('teacher.published') 
                                : t('teacher.draft')
                              }
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {t('teacher.studentsEnrolled', { count: course.studentsCount || 0 })}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                <span>{t('teacher.avgProgress')}</span>
                                <span>{course.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div 
                                  className="bg-french-blue-600 h-1.5 rounded-full transition-all" 
                                  style={{ width: `${course.progress || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            <Link
                              to={`/teacher/courses/${course._id}/edit`}
                              className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline"
                            >
                              {t('common.edit')}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      {t('teacher.noCourses')}
                    </p>
                    <Link
                      to="/teacher/courses/create"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {t('teacher.createCourse')}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('teacher.recentSubmissions')}
                </h2>
                <Link to="/teacher/submissions" className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline">
                  {t('teacher.all')}
                </Link>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission) => (
                    <div key={submission._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-french-blue-100 dark:bg-french-blue-900/30 rounded-full flex items-center justify-center">
                            {submission.studentAvatar ? (
                              <img src={submission.studentAvatar} alt={submission.studentName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span className="text-french-blue-600 dark:text-french-blue-400 font-medium">
                                {submission.studentName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {submission.studentName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {submission.assignmentTitle} • {submission.courseName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(submission.submittedAt)}
                          </span>
                          {submission.status === 'pending' ? (
                            <Link
                              to={`/teacher/submissions/${submission.courseId}/${submission.assignmentId}/${submission.studentId}`}
                              className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              {t('teacher.check')}
                            </Link>
                          ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium rounded-lg">
                              {t('teacher.graded')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('teacher.noSubmissions')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Recent Messages */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('teacher.recentMessages')}
                </h2>
                <Link to="/chat" className="text-sm text-french-blue-600 dark:text-french-blue-400 hover:underline">
                  {t('teacher.all')}
                </Link>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentMessages.length > 0 ? (
                  recentMessages.map((message) => (
                    <Link
                      key={message._id}
                      to={`/chat/${message._id}`}
                      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                            {message.studentAvatar ? (
                              <img src={message.studentAvatar} alt={message.studentName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-600 dark:text-gray-300 font-medium">
                                {message.studentName.charAt(0)}
                              </span>
                            )}
                          </div>
                          {message.unread && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-french-blue-600 rounded-full border-2 border-white dark:border-gray-800"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-medium ${message.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                              {message.studentName}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(message.time)}
                            </span>
                          </div>
                          <p className={`text-sm truncate ${message.unread ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {message.message}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('teacher.noMessages')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Assistant Card */}
            <div className="bg-gradient-to-br from-french-blue-600 to-french-blue-700 rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">
                  {t('teacher.aiAssistantTitle')}
                </h3>
              </div>
              <p className="text-french-blue-100 text-sm mb-4">
                {t('teacher.aiAssistantDescription')}
              </p>
              <button className="w-full py-2 bg-white text-french-blue-600 rounded-lg font-medium hover:bg-french-blue-50 transition-colors">
                {t('teacher.aiAssistant')}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('teacher.thisWeek')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('teacher.newStudents')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">+{weeklyStats.newStudents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('teacher.completedLessons')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{weeklyStats.completedLessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('teacher.avgGrade')}</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{weeklyStats.averageGrade || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('teacher.certificatesIssued')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{weeklyStats.certificatesIssued}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
