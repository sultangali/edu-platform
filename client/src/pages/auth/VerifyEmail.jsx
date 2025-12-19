import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import AuthNavbar from '../../components/layout/AuthNavbar';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (token) => {
    try {
      await api.get(`/auth/verify-email/${token}`);
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.message || t('verifyEmail.verificationFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-french-blue-50 via-white to-turquoise-surf-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col">
      <AuthNavbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 border-4 border-french-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('verifyEmail.verifying')}
              </h1>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('verifyEmail.successTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('verifyEmail.successMessage')}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('verifyEmail.errorTitle')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error || t('verifyEmail.invalidOrExpired')}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-gradient px-6 py-3 rounded-xl text-white font-semibold"
              >
                {t('verifyEmail.goToLogin')}
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

