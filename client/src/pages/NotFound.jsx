import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-french-blue-500 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('errors.notFound')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            {t('errors.notFoundDesc')}
          </p>
        </div>

        <Link
          to="/"
          className="inline-block px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all"
        >
          {t('errors.goHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

