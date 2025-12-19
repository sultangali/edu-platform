import { useTranslation } from 'react-i18next';

const CertificateVerify = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            {t('certificates.verifyTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('certificates.verifyComingSoon')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerify;
