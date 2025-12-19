import { useTranslation } from 'react-i18next';

const AdminAnalytics = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            {t('admin.analytics')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.analyticsComingSoon')}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
