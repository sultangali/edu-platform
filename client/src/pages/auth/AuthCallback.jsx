import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/authStore';
import { useTranslation } from 'react-i18next';
import AuthNavbar from '../../components/layout/AuthNavbar';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (token) {
      // Store token and redirect
      localStorage.setItem('token', token);
      // Fetch user data and login
      // For now, just redirect
      navigate('/');
    } else {
      navigate('/login');
    }
  }, [token, navigate, login]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AuthNavbar />
      <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-french-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">{t('auth.completingAuthentication')}</p>
      </div>
      </div>
    </div>
  );
};

export default AuthCallback;

