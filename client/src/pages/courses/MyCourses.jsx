import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import CourseCard from '../../components/courses/CourseCard';
import LoadingScreen from '../../components/common/LoadingScreen';

const MyCourses = () => {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyCourses();
  }, []);

  // Helper function to get localized field
  const getLocalizedField = (course, field) => {
    const lang = i18n.language || 'en';
    if (course[field] && typeof course[field] === 'object') {
      return course[field][lang] || course[field]['en'] || '';
    }
    return course[field] || '';
  };

  const fetchMyCourses = async () => {
    try {
      const response = await api.get('/courses/enrolled');
      const coursesData = response.data.data || response.data || [];
      setCourses(coursesData);
    } catch (error) {
      console.error(t('courses.errors.fetchMyCourses', { error: error?.message || '' }));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('courses.myCourses')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('courses.myCoursesSubtitle')}
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('courses.noCourses')}</p>
            <Link to="/courses" className="btn-gradient inline-block px-6 py-3 rounded-xl text-white font-semibold">
              {t('courses.title')}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              // Pass in getLocalizedField for title/description to CourseCard
              <CourseCard
                key={course._id || course.id}
                course={{
                  ...course,
                  title: getLocalizedField(course, 'title'),
                  description: getLocalizedField(course, 'description'),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
