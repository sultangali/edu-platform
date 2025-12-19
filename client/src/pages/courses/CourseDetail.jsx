import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/authStore';
import LoadingScreen from '../../components/common/LoadingScreen';

const CourseDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [instructor, setInstructor] = useState(null);
  const [progress, setProgress] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [thumbnailError, setThumbnailError] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Helper function to get full thumbnail URL
  const getThumbnailUrl = (thumbnail) => {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return `${apiUrl}${thumbnail.startsWith('/') ? thumbnail : '/' + thumbnail}`;
  };

  // Helper function to get progress-based background color
  const getProgressBackgroundColor = (percent) => {
    if (percent === 0) {
      return {
        light: 'bg-green-50',
        dark: 'dark:bg-green-900/20',
        borderLight: 'border-green-200',
        borderDark: 'dark:border-green-800',
        textColor: 'text-green-700 dark:text-green-400'
      };
    } else if (percent < 25) {
      return {
        light: 'bg-green-100',
        dark: 'dark:bg-green-900/30',
        borderLight: 'border-green-300',
        borderDark: 'dark:border-green-700',
        textColor: 'text-green-800 dark:text-green-300'
      };
    } else if (percent < 50) {
      return {
        light: 'bg-green-200',
        dark: 'dark:bg-green-800/40',
        borderLight: 'border-green-400',
        borderDark: 'dark:border-green-600',
        textColor: 'text-green-900 dark:text-green-200'
      };
    } else if (percent < 75) {
      return {
        light: 'bg-green-300',
        dark: 'dark:bg-green-700/50',
        borderLight: 'border-green-500',
        borderDark: 'dark:border-green-500',
        textColor: 'text-green-900 dark:text-green-100'
      };
    } else if (percent < 100) {
      return {
        light: 'bg-green-400',
        dark: 'dark:bg-green-600/60',
        borderLight: 'border-green-600',
        borderDark: 'dark:border-green-400',
        textColor: 'text-white dark:text-green-50'
      };
    } else {
      return {
        light: 'bg-green-500',
        dark: 'dark:bg-green-500/70',
        borderLight: 'border-green-700',
        borderDark: 'dark:border-green-300',
        textColor: 'text-white dark:text-white'
      };
    }
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching course
    if (!authLoading) {
      fetchCourse();
    }
  }, [id, authLoading, isAuthenticated]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/courses/${id}`);
      const courseData = response.data.data || response.data;
      setCourse(courseData);

      // Check if user is enrolled from response
      if (response.data.isEnrolled !== undefined) {
        setIsEnrolled(response.data.isEnrolled);
      }

      // Get progress if enrolled
      if (response.data.progress) {
        setProgress(response.data.progress);
      }

      // Get instructor info
      if (courseData.instructor) {
        setInstructor(courseData.instructor);
      }

      // Expand first topic by default for enrolled users
      if (response.data.isEnrolled && courseData.topics && courseData.topics.length > 0) {
        setExpandedTopics({ 0: true });
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError(error.response?.data?.message || t('errors.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${id}` } });
      return;
    }

    // Prevent multiple clicks
    if (enrolling) return;

    setEnrolling(true);
    setError('');

    try {
      const response = await api.post(`/courses/${id}/enroll`);

      if (response.data.success) {
        setIsEnrolled(true);
        // Refresh course data to get full content
        await fetchCourse();
      }
    } catch (error) {
      console.error('Error enrolling:', error);

      // Handle rate limit error specifically
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || 15;
        setError(t('errors.tooManyRequests', { retryAfter }));
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || t('errors.enrollFailed');
        setError(errorMessage);

        // If already enrolled, set enrolled state and refresh
        if (error.response?.status === 400 && typeof errorMessage === 'string' && errorMessage?.toLowerCase().includes('already enrolled')) {
          setIsEnrolled(true);
          await fetchCourse();
        }
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!isAuthenticated || !isEnrolled) return;

    // Prevent multiple clicks
    if (enrolling) return;

    // Localized confirm
    if (!window.confirm(t('courses.confirmUnenroll'))) {
      return;
    }

    setEnrolling(true);
    setError('');

    try {
      const response = await api.delete(`/courses/${id}/enroll`);

      if (response.data.success) {
        setIsEnrolled(false);
        setProgress(null);
        // Refresh course data
        await fetchCourse();
      }
    } catch (error) {
      console.error('Error unenrolling:', error);

      // Handle rate limit error specifically
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || 15;
        setError(t('errors.tooManyRequests', { retryAfter }));
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || t('errors.unenrollFailed');
        setError(errorMessage);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const toggleTopic = (index) => {
    setExpandedTopics(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isLessonCompleted = (lessonId) => {
    if (!progress || !progress.completedLessons) return false;
    return progress.completedLessons.some(id => id.toString() === lessonId?.toString());
  };

  if (loading || authLoading) return <LoadingScreen />;

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || t('errors.notFound')}
          </h2>
          <Link
            to="/courses"
            className="inline-block px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('courses.backToCourses')}
          </Link>
        </div>
      </div>
    );
  }

  // Localized categories
  const categories = {
    programming: t('courses.categories.programming'),
    web: t('courses.categories.web'),
    mobile: t('courses.categories.mobile'),
    data: t('courses.categories.data'),
    design: t('courses.categories.design'),
    business: t('courses.categories.business'),
    marketing: t('courses.categories.marketing'),
    languages: t('courses.categories.languages'),
    science: t('courses.categories.science'),
    other: t('courses.categories.other')
  };

  const levels = {
    beginner: t('courses.beginner'),
    intermediate: t('courses.intermediate'),
    advanced: t('courses.advanced')
  };

  // Количество уроков = количество topics
  const totalLessons = course.topics?.length || 0;
  // Общее количество контентов во всех уроках
  const totalContents = course.topics?.reduce((sum, topic) => sum + (topic.lessons?.length || 0), 0) || 0;
  const completedLessons = progress?.completedLessons?.length || 0;
  const progressPercent = progress?.progressPercentage || (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);

  // Localized content types
  const contentTypeName = {
    video: t('courses.contentTypes.video'),
    audio: t('courses.contentTypes.audio'),
    article: t('courses.contentTypes.article'),
    image: t('courses.contentTypes.image'),
    test: t('courses.contentTypes.test'),
    assignment: t('courses.contentTypes.assignment'),
    default: t('courses.contentTypes.default')
  };

  // Localized languages mapping
  const langMap = {
    kaz: t('misc.languages.kazakh'),
    rus: t('misc.languages.russian'),
    eng: t('misc.languages.english')
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Course Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          {course.thumbnail && !thumbnailError && getThumbnailUrl(course.thumbnail) ? (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
              <img
                src={getThumbnailUrl(course.thumbnail)}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={() => {
                  setThumbnailError(true);
                }}
              />
              {/* Enrolled badge */}
              {isEnrolled && (
                <div className="absolute top-4 right-4 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('courses.enrolledBadge')}
                </div>
              )}
            </div>
          ) : course.thumbnail && thumbnailError ? (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 overflow-hidden relative flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">{t('courses.imageLoadError')}</p>
              </div>
            </div>
          ) : null}

          <div className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  {course.category && (
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium">
                      {categories[course.category] || course.category}
                    </span>
                  )}
                  {course.level && (
                    <span className={`px-3 py-1 rounded-md text-sm font-medium ${
                      course.level === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {levels[course.level] || course.level}
                    </span>
                  )}
                </div>

                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {course.title}
                </h1>

                {(course.shortDescription || course.description) && (
                  <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                    {course.shortDescription || course.description}
                  </p>
                )}

                {/* Instructor Info */}
                {instructor && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-french-blue-100 dark:bg-french-blue-900/30 rounded-full flex items-center justify-center">
                      {instructor.avatar ? (
                        <img src={instructor.avatar} alt={instructor.firstName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-french-blue-600 dark:text-french-blue-400 font-semibold text-lg">
                          {instructor.firstName?.charAt(0) || t('courses.instructorInitial')}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('courses.instructor')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {instructor.firstName} {instructor.lastName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Course Stats */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  {course.duration && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{course.duration}</span>
                    </div>
                  )}
                  {totalLessons > 0 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>{t('courses.stats.lessons', { count: totalLessons })}</span>
                    </div>
                  )}
                  {totalContents > 0 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>{t('courses.stats.contents', { count: totalContents })}</span>
                    </div>
                  )}
                  {course.students && course.students.length > 0 && (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                      </svg>
                      <span>{t('courses.stats.students', { count: course.students.length })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enroll Section */}
              <div className="lg:w-80 flex-shrink-0">
                <div className={`rounded-lg border p-6 transition-all duration-500 ${
                  isEnrolled 
                    ? (() => {
                      const colors = getProgressBackgroundColor(progressPercent);
                      return `${colors.light} ${colors.dark} ${colors.borderLight} ${colors.borderDark}`;
                    })()
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {isEnrolled ? (
                    <div className="space-y-4">
                      <div className={`flex items-center gap-2 mb-2 ${getProgressBackgroundColor(progressPercent).textColor}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-lg">{t('courses.enrolledMessage')}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">{t('courses.progress')}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all duration-300"
                            style={{
                              width: `${progressPercent}%`,
                              background: 'linear-gradient(to right, #046ffb, #00d4ff)',
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('courses.progressStats', { completed: completedLessons, total: totalLessons })}
                        </p>
                      </div>

                      <Link
                        to={`/courses/${id}/learn`}
                        className="block w-full text-center px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        {progressPercent > 0
                          ? t('courses.continueLearning')
                          : t('courses.startLearning')}
                      </Link>

                      <button
                        onClick={handleUnenroll}
                        disabled={enrolling}
                        className="w-full px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors border border-gray-300 dark:border-gray-600"
                      >
                        {enrolling ? t('common.loading') : t('courses.unenroll')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <button
                        onClick={handleEnroll}
                        disabled={enrolling}
                        className="w-full px-6 py-4 bg-french-blue-600 hover:bg-french-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {enrolling ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {t('common.loading')}
                          </>
                        ) : (
                          <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {t('courses.enroll')}
                          </>
                        )}
                      </button>

                      {!isAuthenticated && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          {t('courses.loginToEnroll.prefix')}{' '}
                          <Link to="/login" className="text-french-blue-600 dark:text-french-blue-400 hover:underline font-medium">
                            {t('courses.loginToEnroll.login')}
                          </Link>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('courses.description')}
              </h2>
              <div className="prose-content text-gray-600 dark:text-gray-400">
                {course.longDescription ? (
                  <p className="whitespace-pre-wrap">{course.longDescription}</p>
                ) : course.description ? (
                  <p className="whitespace-pre-wrap">{course.description}</p>
                ) : (
                  <p className="text-gray-400 italic">{t('courses.noDescription')}</p>
                )}
              </div>
            </div>

            {/* Lessons/Program - каждый topic это один урок (сабақ) */}
            {course.topics && course.topics.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {t('courses.syllabus')}
                </h2>
                <div className="space-y-4">
                  {course.topics.map((lesson, lessonIndex) => {
                    // Проверяем, завершен ли урок (topic) - урок завершен если все его контенты завершены
                    const lessonContents = lesson.lessons || [];
                    const completedContents = lessonContents.filter(c => isLessonCompleted(c._id)).length;
                    const isLessonComplete = lessonContents.length > 0 && completedContents === lessonContents.length;

                    return (
                      <div key={lessonIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Lesson Header (бывший Topic) */}
                        <button
                          onClick={() => toggleTopic(lessonIndex)}
                          className="w-full bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm ${
                              isLessonComplete
                                ? 'bg-green-500 text-white'
                                : 'bg-french-blue-600 text-white'
                            }`}>
                              {isLessonComplete ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                lessonIndex + 1
                              )}
                            </div>
                            <div className="text-left">
                              <h3 className={`font-semibold ${isLessonComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                {lesson.title}
                              </h3>
                              {lesson.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{lesson.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {lessonContents.length > 0 && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {completedContents}/{lessonContents.length}
                              </span>
                            )}
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${expandedTopics[lessonIndex] ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Contents List (контенты внутри урока) */}
                        {expandedTopics[lessonIndex] && (
                          <div className="border-t border-gray-200 dark:border-gray-700">
                            {lesson.duration && (
                              <div className="px-6 py-2 bg-gray-25 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm text-purple-500">
                                <svg className="w-4 h-4" fill="none" stroke="purple" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{t('courses.duration', { duration: lesson.duration })}</span>
                              </div>
                            )}
                            {lessonContents.length > 0 ? (
                              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {lessonContents.map((content, contentIndex) => {
                                  const contentCompleted = isLessonCompleted(content._id);
                                  const typeLabel = contentTypeName[content.type] || contentTypeName.default;
                                  return (
                                    <li key={contentIndex} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                      <div className="flex items-center gap-3">
                                        {/* Content type icon */}
                                        {content.type === 'video' ? (
                                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                        ) : content.type === 'audio' ? (
                                          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                          </svg>
                                        ) : content.type === 'image' ? (
                                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                        ) : content.type === 'test' ? (
                                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                        )}
                                        <div>
                                          <span className={`text-sm ${contentCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {content.title || typeLabel}
                                          </span>
                                          <span className="text-xs text-gray-400 ml-2">
                                            ({typeLabel})
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {content.duration && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">{content.duration}</span>
                                        )}
                                        {contentCompleted && (
                                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        )}
                                        {isEnrolled && !contentCompleted && (
                                          <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
                                        )}
                                        {!isEnrolled && (
                                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm italic">
                                {t('courses.noContentsInLesson')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Start Learning CTA for enrolled users */}
                {isEnrolled && (
                  <div className="mt-6 text-center">
                    <Link
                      to={`/courses/${id}/learn`}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {progressPercent > 0
                        ? t('courses.continueLearning')
                        : t('courses.startLearning')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                {t('courses.info')}
              </h3>
              <div className="space-y-3 text-sm">
                {course.level && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('courses.level')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {levels[course.level] || course.level}
                    </span>
                  </div>
                )}
                {(course.courseLanguage || course.language) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('courses.language')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {langMap[course.courseLanguage || course.language] ||
                        course.courseLanguage ||
                        course.language}
                    </span>
                  </div>
                )}
                {course.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('courses.durationLabel')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{course.duration}</span>
                  </div>
                )}
                {totalLessons > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('courses.lessons')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{totalLessons}</span>
                  </div>
                )}
              </div>
            </div>

            {/* What You'll Learn */}
            {course.whatYouLearn && course.whatYouLearn.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t('courses.whatYouLearn')}
                </h3>
                <ul className="space-y-2">
                  {course.whatYouLearn.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t('courses.requirements')}
                </h3>
                <ul className="space-y-2">
                  {course.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
