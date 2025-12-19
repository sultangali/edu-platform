import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiUsers,
  FiBook,
  FiAward,
  FiTrendingUp,
  FiUserCheck,
  FiBookOpen,
  FiFileText,
  FiActivity,
  FiChevronRight,
  FiRefreshCw,
  FiFlag,
  FiStar,
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import api from '../../services/api';
import LoadingScreen from '../../components/common/LoadingScreen';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, []);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('kk-KZ', { month: 'short', day: 'numeric' });
  };

  const getThumbnailUrl = (path) => {
    if (!path) return null;
    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return path.startsWith('http') ? path : `${apiUrl}${path}`;
  };

  if (loading) return <LoadingScreen />;

  const overview = stats?.overview || {};
  const growth = stats?.growth || {};
  const categoryData = (stats?.categoryDistribution || []).map((item) => ({
    name: getCategoryLabel(item._id),
    value: item.count,
  }));

  function getCategoryLabel(category) {
    const labels = {
      programming: t('categories.programming'),
      design: t('categories.design'),
      business: t('categories.business'),
      marketing: t('categories.marketing'),
      language: t('categories.language'),
      music: t('categories.music'),
      photography: t('categories.photography'),
      other: t('categories.other'),
    };
    return labels[category] || category;
  }

  // Prepare growth chart data
  const growthChartData = [];
  const days = new Set([
    ...(growth.users || []).map((d) => d._id),
    ...(growth.courses || []).map((d) => d._id),
    ...(growth.enrollments || []).map((d) => d._id),
  ]);

  Array.from(days)
    .sort()
    .forEach((day) => {
      growthChartData.push({
        date: formatDate(day),
        users: (growth.users || []).find((d) => d._id === day)?.count || 0,
        courses: (growth.courses || []).find((d) => d._id === day)?.count || 0,
        enrollments: (growth.enrollments || []).find((d) => d._id === day)?.count || 0,
      });
    });

  const getStudentWord = () => t('admin.student'); // for future plural if needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t('admin.dashboardTitle')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('admin.dashboardSubtitle')}
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('admin.refresh')}</span>
          </button>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            to="/admin/users"
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all group"
          >
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/40 transition-colors">
              <FiUsers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{t('admin.users')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.allUsers')}</p>
            </div>
            <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          </Link>

          <Link
            to="/admin/courses"
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg transition-all group"
          >
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
              <FiBook className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{t('admin.courses')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.allCourses')}</p>
            </div>
            <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </Link>

          <Link
            to="/teacher/dashboard"
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg transition-all group"
          >
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40 transition-colors">
              <FiFileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{t('admin.teacherPanel')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.manageCourses')}</p>
            </div>
            <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
          </Link>

          <Link
            to="/analytics"
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-lg transition-all group"
          >
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl group-hover:bg-orange-200 dark:group-hover:bg-orange-800/40 transition-colors">
              <FiActivity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{t('admin.analytics')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.fullStats')}</p>
            </div>
            <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <FiUsers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.users')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalUsers || 0}</p>
            <p className="text-xs text-green-500 mt-1">+{growth.users?.length || 0} {t('admin.thisWeek')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FiBook className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.courses')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalCourses || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{overview.publishedCourses || 0} {t('admin.published')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <FiUserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.students')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalStudents || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{overview.activeUsers || 0} {t('admin.active')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <FiBookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.instructors')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalInstructors || 0}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <FiTrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.enrollments')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalEnrollments || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{overview.completedEnrollments || 0} {t('admin.completed')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <FiAward className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.certificates')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalCertificates || 0}</p>
            <p className="text-xs text-emerald-500 mt-1">{overview.completionRate || 0}% {t('admin.completionRate')}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Growth Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('admin.weeklyGrowth')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name={t('admin.users')}
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    name={t('admin.enrollments')}
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorEnroll)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('admin.courseCategories')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Courses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.topCourses')}
              </h3>
              <Link to="/admin/courses" className="text-sm text-indigo-600 hover:text-indigo-700">
                {t('admin.viewAll')} &rarr;
              </Link>
            </div>
            <div className="space-y-4">
              {(stats?.topCourses || []).map((course, index) => {
                const courseId = course._id?.toString() || `course-${index}`;
                const courseTitle = course.title || t('admin.noTitle');
                const courseThumbnail = course.thumbnail;
                const enrollments = course.enrollments || 0;
                const avgProgress = course.avgProgress || 0;
                
                return (
                  <div key={courseId} className="flex items-center gap-3">
                    <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden relative">
                      {courseThumbnail ? (
                        <>
                          <img
                            src={getThumbnailUrl(courseThumbnail)}
                            alt={courseTitle}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = e.target.parentElement.querySelector('.image-fallback');
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="image-fallback hidden absolute inset-0 items-center justify-center bg-gray-100 dark:bg-gray-700">
                            <FiBook className="w-6 h-6 text-gray-400" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiBook className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {courseTitle}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {enrollments} {t('admin.student')} • {avgProgress.toFixed(0)}% {t('admin.averageProgress')}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!stats?.topCourses || stats.topCourses.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  {t('admin.noData')}
                </p>
              )}
            </div>
          </div>

          {/* Top Instructors */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.topInstructors')}
              </h3>
              <Link to="/admin/users?role=instructor" className="text-sm text-indigo-600 hover:text-indigo-700">
                {t('admin.viewAll')} &rarr;
              </Link>
            </div>
            <div className="space-y-4">
              {(stats?.topInstructors || []).map((instructor, index) => (
                <div key={instructor._id} className="flex items-center gap-4">
                  <span className="w-6 h-6 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                    {index + 1}
                  </span>
                  {instructor.avatar ? (
                    <img
                      src={getThumbnailUrl(instructor.avatar)}
                      alt={`${instructor.firstName} ${instructor.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                      {instructor.firstName?.[0]}
                      {instructor.lastName?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {instructor.firstName} {instructor.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {instructor.coursesCount} {t('admin.course')} • {instructor.totalStudents} {t('admin.student')}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.topInstructors || stats.topInstructors.length === 0) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('admin.noData')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.recentUsers')}
              </h3>
              <Link to="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-700">
                {t('admin.viewAll')} &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {(stats?.recent?.users || []).map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  {user.avatar ? (
                    <img
                      src={getThumbnailUrl(user.avatar)}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : user.role === 'instructor'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}
                  >
                    {user.role === 'admin' ? t('roles.admin') : user.role === 'instructor' ? t('roles.instructor') : t('roles.student')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Courses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.recentCourses')}
              </h3>
              <Link to="/admin/courses" className="text-sm text-indigo-600 hover:text-indigo-700">
                {t('admin.viewAll')} &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {(stats?.recent?.courses || []).map((course) => (
                <div
                  key={course._id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  {course.thumbnail ? (
                    <img
                      src={getThumbnailUrl(course.thumbnail)}
                      alt={course.title}
                      className="w-12 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                      <FiBook className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {course.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {course.instructor?.firstName} {course.instructor?.lastName}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.isPublished
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}
                  >
                    {course.isPublished ? t('admin.published') : t('admin.draft')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Complaints and Suggestions */}
        <ComplaintsAndSuggestionsSection />
      </div>
    </div>
  );
};

const ComplaintsAndSuggestionsSection = () => {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', category: '' });

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.category) params.category = filter.category;
      
      const response = await api.get('/admin/support-chats', { params });
      setComplaints(response.data.data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'closed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getCategoryIcon = (category) => {
    return category === 'complaint' ? <FiFlag className="w-4 h-4" /> : <FiStar className="w-4 h-4" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('admin.complaintsAndSuggestions')}
        </h3>
        <Link to="/chat" className="text-sm text-indigo-600 hover:text-indigo-700">
          {t('admin.viewAll')} &rarr;
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">{t('admin.allStatuses')}</option>
          <option value="open">{t('chat.status.open')}</option>
          <option value="in_progress">{t('chat.status.inProgress')}</option>
          <option value="closed">{t('chat.status.closed')}</option>
        </select>
        <select
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">{t('admin.allCategories')}</option>
          <option value="complaint">{t('chat.categories.complaint')}</option>
          <option value="suggestion">{t('chat.categories.suggestion')}</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : complaints.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          {t('admin.noComplaints')}
        </p>
      ) : (
        <div className="space-y-3">
          {complaints.slice(0, 5).map((chat) => (
            <Link
              key={chat._id}
              to={`/chat/${chat._id}`}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                chat.category === 'complaint' 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
              }`}>
                {getCategoryIcon(chat.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {chat.createdBy?.firstName} {chat.createdBy?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {chat.lastMessage?.content || t('chat.list.noMessage')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(chat.adminReview?.status || 'open')}`}>
                  {t(`chat.status.${chat.adminReview?.status || 'open'}`)}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(chat.updatedAt).toLocaleDateString('kk-KZ', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
