import { useState, useEffect } from 'react';
import { useAuth } from '../../context/authStore';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  FiTrendingUp,
  FiAward,
  FiBook,
  FiUsers,
  FiTarget,
  FiClock,
  FiCheckCircle,
  FiActivity,
  FiBarChart2,
  FiPieChart,
} from 'react-icons/fi';

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
];

const Analytics = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let endpoint = '/analytics/student';

      if (user?.role === 'instructor') {
        endpoint = '/analytics/teacher';
      } else if (user?.role === 'admin') {
        endpoint = '/analytics/admin';
      }

      const response = await api.get(endpoint);
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500">{t('analytics.dataNotLoaded')}</p>
      </div>
    );
  }

  if (user?.role === 'student') {
    return <StudentAnalytics data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
  } else if (user?.role === 'instructor') {
    return <TeacherAnalytics data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
  } else if (user?.role === 'admin') {
    return <AdminAnalytics data={data} activeTab={activeTab} setActiveTab={setActiveTab} />;
  }

  return null;
};

const StudentAnalytics = ({ data, activeTab, setActiveTab }) => {
  const { t, i18n } = useTranslation();
  
  // Get locale for date formatting
  const getDateLocale = () => {
    const lang = i18n.language || 'kaz';
    const localeMap = {
      'kaz': 'kk-KZ',
      'rus': 'ru-RU',
      'eng': 'en-US',
    };
    return localeMap[lang] || 'kk-KZ';
  };
  const { overview, progressByCategory, activityByDay, testStatistics, recentCertificates, coursesProgress } = data;

  // Категория локализация
  const categoryData = Object.keys(progressByCategory).map((cat) => ({
    name: t(`categories.${cat}`, cat), // если нет, покажет cat как fallback
    completed: progressByCategory[cat].completed,
    inProgress: progressByCategory[cat].inProgress,
    avgProgress: progressByCategory[cat].avgProgress,
  }));

  const activityData = activityByDay.labels.map((label, idx) => ({
    day: t(`analytics.student.activityDays.${label}`, label),
    activity: activityByDay.data[idx],
  }));

  const progressData = coursesProgress.map((cp) => ({
    name: cp.courseTitle ? cp.courseTitle.substring(0, 20) + '...' : '',
    progress: cp.progress,
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('analytics.student.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.student.subtitle')}
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FiBook className="w-6 h-6" />}
            title={t('analytics.student.cards.enrolledCourses')}
            value={overview.enrolledCourses}
            color="bg-blue-500"
          />
          <StatCard
            icon={<FiCheckCircle className="w-6 h-6" />}
            title={t('analytics.student.cards.completedCourses')}
            value={overview.completedCourses}
            color="bg-green-500"
          />
          <StatCard
            icon={<FiTrendingUp className="w-6 h-6" />}
            title={t('analytics.student.cards.avgProgress')}
            value={`${overview.averageProgress}%`}
            color="bg-purple-500"
          />
          <StatCard
            icon={<FiAward className="w-6 h-6" />}
            title={t('analytics.student.cards.certificates')}
            value={overview.certificates}
            color="bg-orange-500"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <FiActivity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.student.streak.title')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.learningStreak} {t('analytics.student.streak.day')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <FiClock className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('analytics.student.spentTime.title')}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overview.estimatedHours} {t('analytics.student.spentTime.hour')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <FiTarget className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('analytics.student.avgTestScore.title')}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {testStatistics.average}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiActivity className="w-5 h-5 text-indigo-600" />
              {t('analytics.student.charts.weeklyActivity')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="day" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="activity" stroke="#6366f1" fillOpacity={1} fill="url(#colorActivity)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Course Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiBarChart2 className="w-5 h-5 text-purple-600" />
              {t('analytics.student.charts.courseProgress')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="progress" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiPieChart className="w-5 h-5 text-green-600" />
              {t('analytics.student.charts.byCategory')}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="avgProgress"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Test Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.student.charts.testStats')}
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('analytics.student.testStats.totalTaken')}
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {testStatistics.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('analytics.student.testStats.average')}
                </span>
                <span className="text-xl font-bold text-green-600">
                  {testStatistics.average}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('analytics.student.testStats.highest')}
                </span>
                <span className="text-xl font-bold text-blue-600">
                  {testStatistics.highest}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('analytics.student.testStats.lowest')}
                </span>
                <span className="text-xl font-bold text-orange-600">
                  {testStatistics.lowest}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Certificates */}
        {recentCertificates.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiAward className="w-5 h-5 text-yellow-600" />
              {t('analytics.student.certificates.recent')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-gray-900 dark:text-white mb-2">
                    {cert.courseTitle}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(cert.issuedAt).toLocaleDateString(getDateLocale(), {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                    {cert.certificateId}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TeacherAnalytics = ({ data }) => {
  const { t, i18n } = useTranslation();
  
  // Get locale for date formatting
  const getDateLocale = () => {
    const lang = i18n.language || 'kaz';
    const localeMap = {
      'kaz': 'kk-KZ',
      'rus': 'ru-RU',
      'eng': 'en-US',
    };
    return localeMap[lang] || 'kk-KZ';
  };
  const {
    overview,
    coursesByCategory,
    enrollmentTrends,
    performanceDistribution,
    topCourses,
    recentActivity,
  } = data;

  // Локализация категорий курсов
  const categoryChartData = coursesByCategory.labels.map((label, idx) => ({
    name: t(`categories.${label}`, label),
    value: coursesByCategory.data[idx],
  }));

  const enrollmentData = enrollmentTrends.labels.map((label, idx) => ({
    week: t(`analytics.teacher.weeks.${label}`, label),
    enrollments: enrollmentTrends.data[idx],
  }));

  // Локализация категорий производительности (Performance)
  const performanceData = performanceDistribution.labels.map((label, idx) => ({
    category: t(`analytics.teacher.performanceCategories.${label.split(' ')[0]}`, label.split(' ')[0]),
    students: performanceDistribution.data[idx],
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('analytics.teacher.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.teacher.subtitle')}
          </p>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FiBook />}
            title={t('analytics.teacher.cards.totalCourses')}
            value={overview.totalCourses}
            color="bg-blue-500"
          />
          <StatCard
            icon={<FiUsers />}
            title={t('analytics.teacher.cards.students')}
            value={overview.totalStudents}
            color="bg-green-500"
          />
          <StatCard
            icon={<FiTrendingUp />}
            title={t('analytics.teacher.cards.avgProgress')}
            value={`${overview.avgCourseProgress}%`}
            color="bg-purple-500"
          />
          <StatCard
            icon={<FiCheckCircle />}
            title={t('analytics.teacher.cards.completionRate')}
            value={`${overview.completionRate}%`}
            color="bg-orange-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Enrollment Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.teacher.charts.enrollmentTrends')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="week" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="enrollments" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.teacher.charts.studentPerformance')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="category" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="students" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.teacher.charts.courseCategories')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Courses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.teacher.charts.topCourses')}
            </h3>
            <div className="space-y-3">
              {topCourses.map((course, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {course.courseTitle}
                    </p>
                    <p className="text-xs text-gray-500">
                      {course.totalStudents} {t('analytics.teacher.charts.studentLabel')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">{course.avgProgress}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('analytics.teacher.recentActivity')}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.teacher.tableHeaders.student')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.teacher.tableHeaders.course')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.teacher.tableHeaders.progress')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('analytics.teacher.tableHeaders.lastActivity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivity.map((activity, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {activity.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {activity.courseTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${activity.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">{activity.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(activity.lastActivity).toLocaleDateString(getDateLocale(), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Analytics Component  
const AdminAnalytics = ({ data }) => {
  const { t } = useTranslation();
  const { overview, userGrowth, coursesByCategory, enrollmentTrends, popularCourses, topInstructors } = data;

  const userGrowthData = userGrowth.labels.map((label, idx) => ({
    month: t(`analytics.admin.months.${label}`, label),
    users: userGrowth.data[idx],
  }));

  // Локализация категорий курсов
  const categoryData = coursesByCategory.labels.map((label, idx) => ({
    name: t(`categories.${label}`, label),
    value: coursesByCategory.data[idx],
  }));

  const enrollmentData = enrollmentTrends.labels.map((label, idx) => ({
    month: t(`analytics.admin.months.${label}`, label),
    enrollments: enrollmentTrends.data[idx],
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('analytics.admin.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.admin.subtitle')}
          </p>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FiUsers />}
            title={t('analytics.admin.cards.totalUsers')}
            value={overview.totalUsers}
            color="bg-blue-500"
          />
          <StatCard
            icon={<FiBook />}
            title={t('analytics.admin.cards.totalCourses')}
            value={overview.totalCourses}
            color="bg-green-500"
          />
          <StatCard
            icon={<FiActivity />}
            title={t('analytics.admin.cards.activeUsers')}
            value={overview.activeUsersCount}
            color="bg-purple-500"
          />
          <StatCard
            icon={<FiAward />}
            title={t('analytics.admin.cards.certificates')}
            value={overview.totalCertificates}
            color="bg-orange-500"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('analytics.admin.students')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalStudents}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('analytics.admin.teachers')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalTeachers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('analytics.admin.publishedCourses')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.publishedCourses}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('analytics.admin.completionRate')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.platformCompletionRate}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Growth */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.admin.charts.userGrowth')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="users" stroke="#6366f1" fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Enrollment Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.admin.charts.enrollmentTrends')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={enrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="enrollments" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Courses by Category */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.admin.charts.coursesByCategory')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Popular Courses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('analytics.admin.charts.popularCourses')}
            </h3>
            <div className="space-y-3">
              {popularCourses.slice(0, 5).map((course, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <p className="text-sm text-gray-900 dark:text-white truncate flex-1">{course.title}</p>
                  <span className="text-sm font-bold text-indigo-600 ml-2">{course.enrollments}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Instructors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('analytics.admin.charts.topInstructors')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topInstructors.map((instructor, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="font-medium text-gray-900 dark:text-white">{instructor.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {instructor.courseCount} {t('analytics.admin.courses')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className={`${color} p-3 rounded-lg text-white`}>
        {icon}
      </div>
    </div>
  </div>
);

export default Analytics;
