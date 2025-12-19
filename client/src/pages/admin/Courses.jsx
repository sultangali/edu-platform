import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiBook,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiTrendingUp,
  FiStar,
} from 'react-icons/fi';
import api from '../../services/api';
import LoadingScreen from '../../components/common/LoadingScreen';

const AdminCourses = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    isPublished: searchParams.get('isPublished') || '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const categories = [
    { value: 'programming', label: t('categories.programming') },
    { value: 'design', label: t('categories.design') },
    { value: 'business', label: t('categories.business') },
    { value: 'marketing', label: t('categories.marketing') },
    { value: 'language', label: t('categories.language') },
    { value: 'music', label: t('categories.music') },
    { value: 'photography', label: t('categories.photography') },
    { value: 'other', label: t('categories.other') },
  ];

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line
  }, [pagination.page, filters]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.isPublished && { isPublished: filters.isPublished }),
      });

      const response = await api.get(`/admin/courses?${params}`);
      setCourses(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchCourses();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));

    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleTogglePublish = async (course) => {
    try {
      await api.put(`/admin/courses/${course._id}`, {
        isPublished: !course.isPublished,
      });
      setCourses((prev) =>
        prev.map((c) => (c._id === course._id ? { ...c, isPublished: !c.isPublished } : c))
      );
    } catch (error) {
      console.error('Error toggling course status:', error);
      alert(error.response?.data?.message || t('common.errorOccurred'));
    }
  };

  const handleDeleteCourse = async (courseId) => {
    setSaving(true);
    try {
      await api.delete(`/admin/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      setDeleteConfirm(null);
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(error.response?.data?.message || t('common.errorOccurred'));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return t('common.unknown');
    const date = new Date(dateStr);
    return date.toLocaleDateString('kk-KZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getThumbnailUrl = (path) => {
    if (!path) return null;
    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return path.startsWith('http') ? path : `${apiUrl}${path}`;
  };

  const getCategoryLabel = (category) => {
    return (
      categories.find((c) => c.value === category)?.label ||
      t(`categories.${category}`, category)
    );
  };

  const getLevelBadge = (level) => {
    const badges = {
      beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = {
      beginner: t('courseLevels.beginner'),
      intermediate: t('courseLevels.intermediate'),
      advanced: t('courseLevels.advanced'),
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[level] || badges.beginner}`}>
        {labels[level] || level}
      </span>
    );
  };

  if (loading && courses.length === 0) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t('adminCourses.heading')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('adminCourses.totalCourses', { count: pagination.total })}
            </p>
          </div>
          <Link
            to="/teacher/courses/create"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <FiBook className="w-5 h-5" />
            <span>{t('adminCourses.newCourse')}</span>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder={t('adminCourses.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </form>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                showFilters || filters.category || filters.isPublished
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FiFilter className="w-5 h-5" />
              <span>{t('adminCourses.filters')}</span>
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('adminCourses.category')}
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('common.all')}</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('adminCourses.status')}
                </label>
                <select
                  value={filters.isPublished}
                  onChange={(e) => handleFilterChange('isPublished', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('common.all')}</option>
                  <option value="true">{t('adminCourses.statusPublished')}</option>
                  <option value="false">{t('adminCourses.statusDraft')}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ search: '', category: '', isPublished: '' });
                    setSearchParams({});
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {t('common.clear')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {courses.map((course) => (
            <div
              key={course._id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
                {course.thumbnail ? (
                  <img
                    src={getThumbnailUrl(course.thumbnail)}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiBook className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.isPublished
                        ? 'bg-green-500/90 text-white'
                        : 'bg-yellow-500/90 text-white'
                    }`}
                  >
                    {course.isPublished
                      ? t('adminCourses.statusPublished')
                      : t('adminCourses.statusDraft')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {course.title}
                  </h3>
                  {getLevelBadge(course.level)}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {getCategoryLabel(course.category)}
                </p>

                {/* Instructor */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                    {course.instructor?.firstName?.[0]}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {course.instructor?.firstName} {course.instructor?.lastName}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <FiUsers className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {course.stats?.enrolled || 0}
                    </p>
                    <p className="text-xs text-gray-500">{t('adminCourses.students')}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <FiCheck className="w-4 h-4 mx-auto text-green-500 mb-1" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {course.stats?.completed || 0}
                    </p>
                    <p className="text-xs text-gray-500">{t('adminCourses.completed')}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <FiTrendingUp className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(course.stats?.averageProgress || 0).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">{t('adminCourses.progress')}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePublish(course)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      course.isPublished
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {course.isPublished ? (
                      <>
                        <FiEyeOff className="w-4 h-4" />
                        {t('adminCourses.hide')}
                      </>
                    ) : (
                      <>
                        <FiEye className="w-4 h-4" />
                        {t('adminCourses.publish')}
                      </>
                    )}
                  </button>
                  <Link
                    to={`/teacher/courses/${course._id}/edit`}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    title={t('adminCourses.edit')}
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/courses/${course._id}`}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                    title={t('adminCourses.view')}
                  >
                    <FiExternalLink className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(course)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title={t('adminCourses.delete')}
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Date */}
                <p className="text-xs text-gray-400 mt-3 text-center">
                  {t('adminCourses.createdAt', { date: formatDate(course.createdAt) })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && !loading && (
          <div className="text-center py-12">
            <FiBook className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('adminCourses.noCourses')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('adminCourses.noCoursesHelp')}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <FiChevronLeft className="w-5 h-5" />
              <span>{t('common.prev')}</span>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span>{t('common.next')}</span>
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <FiTrash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('adminCourses.deleteCourseTitle')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  <strong>«{deleteConfirm.title}»</strong> {t('adminCourses.deleteConfirm')}
                </p>
                <p className="text-sm text-red-500 mb-6">
                  {t('adminCourses.deleteWarning')}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(deleteConfirm._id)}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? t('adminCourses.deleting') : t('adminCourses.delete')}
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

export default AdminCourses;
