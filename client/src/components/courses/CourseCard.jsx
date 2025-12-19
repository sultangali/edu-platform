import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CourseCard = ({ course, showProgress = false }) => {
  const { t } = useTranslation();
  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Handle thumbnail URL
  const getThumbnailUrl = () => {
    if (!course.thumbnail) return null;
    if (course.thumbnail.startsWith('http')) return course.thumbnail;
    return `${apiUrl}${course.thumbnail}`;
  };

  const thumbnailUrl = getThumbnailUrl();
  const progress = course.progress || 0;
  const isEnrolled = course.isEnrolled || progress > 0;

  return (
    <Link to={`/courses/${course._id || course.id}`} className="group">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-french-blue-300 dark:hover:border-french-blue-700 hover:shadow-lg transition-all duration-200 overflow-hidden h-full flex flex-col">
        {/* Thumbnail */}
        <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={course.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
                const placeholder = e.target.parentElement.querySelector('.thumbnail-placeholder');
                if (placeholder) {
                  placeholder.style.display = 'flex';
                }
              }}
            />
          ) : null}
          {!thumbnailUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-french-blue-500 to-turquoise-surf-500">
              <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          ) : (
            <div className="thumbnail-placeholder hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-french-blue-500 to-turquoise-surf-500">
              <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {isEnrolled && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-500 text-white flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Тіркелген
              </span>
            )}
            {course.level && (
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                course.level === 'beginner' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                  : course.level === 'intermediate' 
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
              }`}>
                {t(`courses.${course.level}`) || course.level}
              </span>
            )}
          </div>

          {/* Category badge */}
          {course.category && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                {course.category}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-french-blue-600 dark:group-hover:text-french-blue-400 transition-colors line-clamp-2">
            {course.title}
          </h3>
          
          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
            {course.description || course.shortDescription || 'Сипаттама жоқ'}
          </p>

          {/* Progress bar for enrolled courses */}
          {isEnrolled && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Прогресс</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: progress === 100 ? '#22c55e' : 'linear-gradient(to right, #046ffb, #00d4ff)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {course.instructor && (
                <>
                  <div className="w-6 h-6 bg-french-blue-100 dark:bg-french-blue-900/30 rounded-full flex items-center justify-center">
                    {course.instructor.avatar ? (
                      <img 
                        src={course.instructor.avatar} 
                        alt="" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      <span className="text-french-blue-600 dark:text-french-blue-400 text-xs font-medium">
                        {course.instructor.firstName?.charAt(0) || 'I'}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-[100px]">
                    {course.instructor.firstName} {course.instructor.lastName?.charAt(0)}.
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              {course.duration && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{course.duration}</span>
                </div>
              )}
              {(course.topicsCount || course.topics?.length > 0) && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{course.topicsCount || course.topics?.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
