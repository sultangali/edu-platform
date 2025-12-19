import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/authStore';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiEdit2,
  FiSave,
  FiX,
  FiCamera,
  FiBook,
  FiAward,
  FiTrendingUp,
  FiUsers,
  FiStar,
  FiLock,
  FiTrash2,
  FiShield,
  FiCheckCircle,
} from 'react-icons/fi';
import api from '../../services/api';
import LoadingScreen from '../../components/common/LoadingScreen';

const Profile = () => {
  const { t } = useTranslation();
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      setProfile(response.data.data);
      setFormData({
        firstName: response.data.data.firstName || '',
        lastName: response.data.data.lastName || '',
        phone: response.data.data.phone || '',
        bio: response.data.data.bio || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.put('/profile', formData);
      setProfile(response.data.data);
      updateUser(response.data.data);
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.message || t('error.common'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('profile.avatarOnlyImage'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('profile.avatarMaxSize'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(response.data.data);
      updateUser(response.data.data);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(error.response?.data?.message || t('profile.avatarUploadError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(t('profile.passwordNotMatch'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert(t('profile.passwordMinLength'));
      return;
    }

    setSaving(true);
    try {
      await api.put('/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      alert(t('profile.passwordSuccess'));
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.message || t('profile.passwordChangeError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      await api.delete('/profile');
      alert(t('profile.accountDeleted'));
      window.location.href = '/login';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(error.response?.data?.message || t('profile.accountDeleteError'));
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUrl = (path) => {
    if (!path) return null;
    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return path.startsWith('http') ? path : `${apiUrl}${path}`;
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: t('profile.role.admin') },
      instructor: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: t('profile.role.instructor') },
      student: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: t('profile.role.student') },
    };
    const badge = badges[role] || badges.student;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) return <LoadingScreen />;
  if (!profile) return <div className="text-center py-12">{t('profile.notFound')}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-6">
          <div  className="h-32  bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="px-8 pb-8 bg-white dark:bg-gray-800" >
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 overflow-hidden shadow-xl">
                  {profile.avatar ? (
                    <img
                      src={getAvatarUrl(profile.avatar)}
                      alt={`${profile.firstName || ''} ${profile.lastName || ''}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                      {(profile.firstName?.[0] || '').toUpperCase()}{(profile.lastName?.[0] || '').toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-colors disabled:opacity-50"
                  title={t('profile.avatarChange')}
                >
                  {uploadingAvatar ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FiCamera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left bg-white dark:bg-gray-800">
                <h1 style={{
            paddingTop: '28px'
          }} className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  {profile.firstName || ''} {profile.lastName || ''}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                  {getRoleBadge(profile.role)}
                  {profile.isEmailVerified ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                      <FiCheckCircle className="w-4 h-4" />
                      {t('profile.verified')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
                      {t('profile.notVerified')}
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{profile.email}</p>
                {profile.bio && (
                  <p className="text-gray-700 dark:text-gray-300 max-w-2xl">{profile.bio}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    <span>{t('common.edit')}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <FiSave className="w-4 h-4" />
                      <span>{saving ? t('common.saving') : t('common.save')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          firstName: profile.firstName || '',
                          lastName: profile.lastName || '',
                          phone: profile.phone || '',
                          bio: profile.bio || '',
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      <FiX className="w-4 h-4" />
                      <span>{t('common.cancel')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('profile.personalInfo')}
              </h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('profile.firstName')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                        {profile.firstName}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('profile.lastName')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                        {profile.lastName}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.email')}
                  </label>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <FiMail className="w-4 h-4 text-gray-400" />
                    {profile.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.phone')}
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={t('profile.phonePlaceholder')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                      <FiPhone className="w-4 h-4 text-gray-400" />
                      {profile.phone || t('profile.noPhone')}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.bio')}
                  </label>
                  {editing ? (
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder={t('profile.bioPlaceholder')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white min-h-[100px]">
                      {profile.bio || t('profile.noBio')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics based on role */}
            {profile.role === 'student' && profile.stats && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('profile.statistics')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <FiBook className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.enrolledCourses}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.courses')}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <FiCheckCircle className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.completedCourses}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.completed')}</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <FiAward className="w-8 h-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.certificates}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.certificate')}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <FiTrendingUp className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.averageProgress.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.avgProgress')}</p>
                  </div>
                </div>

                {/* Recent Progress */}
                {profile.stats.recentProgress && profile.stats.recentProgress.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      {t('profile.stats.lastCourses')}
                    </h3>
                    <div className="space-y-3">
                      {profile.stats.recentProgress.map((progress) => (
                        <Link
                          key={progress._id}
                          to={`/courses/${progress.course._id}/learn`}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 overflow-hidden">
                            {progress.course.thumbnail ? (
                              <img
                                src={getAvatarUrl(progress.course.thumbnail)}
                                alt={progress.course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiBook className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {progress.course.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{ width: `${progress.progressPercentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {progress.progressPercentage}%
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile.role === 'instructor' && profile.stats && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('profile.instructorStats')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <FiBook className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.totalCourses}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.allCourses')}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <FiCheckCircle className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.publishedCourses}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.published')}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <FiUsers className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.totalStudents}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.students')}</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <FiStar className="w-8 h-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.averageRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.avgRating')}</p>
                  </div>
                </div>

                {/* Recent Courses */}
                {profile.stats.recentCourses && profile.stats.recentCourses.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('profile.stats.lastCourses')}
                      </h3>
                      <Link
                        to="/teacher/courses"
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        {t('profile.stats.allView')} &rarr;
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {profile.stats.recentCourses.map((course) => (
                        <Link
                          key={course._id}
                          to={`/teacher/courses/${course._id}/edit`}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 overflow-hidden">
                            {course.thumbnail ? (
                              <img
                                src={getAvatarUrl(course.thumbnail)}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FiBook className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {course.title}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <span className={course.isPublished ? 'text-green-600' : 'text-yellow-600'}>
                                {course.isPublished ? t('profile.stats.published') : t('profile.stats.draft')}
                              </span>
                              <span>•</span>
                              <span>{course.students?.length || 0} {t('profile.stats.student')}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {profile.role === 'admin' && profile.stats && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('profile.adminStats')}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <FiUsers className="w-8 h-8 mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.totalUsers}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.users')}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <FiBook className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.totalCourses}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.courses')}</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <FiAward className="w-8 h-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile.stats.totalCertificates}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.stats.certificates')}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to="/admin/dashboard"
                    className="block w-full text-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    {t('profile.adminPanel')}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('profile.settings')}
              </h2>
              <div className="space-y-3">
                {!profile.googleId && (
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
                  >
                    <FiLock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{t('profile.changePassword')}</span>
                  </button>
                )}
                <Link
                  to="/settings"
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <FiUser className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{t('profile.settings')}</span>
                </Link>
                {profile.role === 'instructor' && (
                  <Link
                    to="/teacher/dashboard"
                    className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    <FiBook className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-indigo-900 dark:text-indigo-300">{t('profile.instructorPanel')}</span>
                  </Link>
                )}
                {profile.role === 'admin' && (
                  <Link
                    to="/admin/dashboard"
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <FiShield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-red-900 dark:text-red-300">{t('profile.adminPanel')}</span>
                  </Link>
                )}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-left"
                >
                  <FiTrash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-900 dark:text-red-300">{t('profile.deleteAccount')}</span>
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('profile.accountInfo')}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('profile.roleText')}</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {getRoleBadge(profile.role)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('profile.registered')}</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(profile.createdAt).toLocaleDateString('kk-KZ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('profile.emailVerifiedText')}</span>
                  <span className={profile.isEmailVerified ? 'text-green-600' : 'text-yellow-600'}>
                    {profile.isEmailVerified ? t('common.yes') : t('common.no')}
                  </span>
                </div>
                {profile.googleId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('profile.loginMethod')}</span>
                    <span className="text-gray-900 dark:text-white">{t('profile.googleOAuth')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('profile.changePassword')}
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('profile.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? t('common.saving') : t('common.change')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <FiTrash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('profile.deleteAccount')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {t('profile.deleteAccountWarning')}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {saving ? t('common.deleting') : t('common.delete')}
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

export default Profile;
