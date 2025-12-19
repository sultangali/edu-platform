import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import CourseCard from '../../components/courses/CourseCard';
import LoadingScreen from '../../components/common/LoadingScreen';

const Courses = () => {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  // Helper to localize title/description fields if available
  const getLocalizedField = (course, field) => {
    const lang = i18n.language || 'en';
    // course[field] can be:
    //  - object like { en: '...', ru: '...' }
    //  - string
    if (course[field] && typeof course[field] === 'object') {
      return course[field][lang] || course[field]['en'] || '';
    }
    return course[field] || '';
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      setCourses(response.data.data || response.data);
    } catch (error) {
      console.error(t('courses.errors.fetch', { error: error?.message || '' }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const filteredCourses = courses.filter(course =>
    getLocalizedField(course, 'title').toLowerCase().includes(search.toLowerCase()) ||
    getLocalizedField(course, 'description').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('courses.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('courses.subtitle')}
          </p>
        </div>

        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('courses.search')}
            className="w-full max-w-md input-primary"
            aria-label={t('courses.searchLabel')}
          />
        </div>

        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">{t('courses.noCourses')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course._id || course.id}
                course={{
                  ...course,
                  // Pass only localized fields to card
                  title: getLocalizedField(course, 'title'),
                  description: getLocalizedField(course, 'description')
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;

