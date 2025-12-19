import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();

  // Локализованные значения для статистики
  const statsConfig = [
    {
      value: t('home.statStudentsValue', { defaultValue: "1,200+" }),
      label: t('home.statStudents')
    },
    {
      value: t('home.statCoursesValue', { defaultValue: "50+" }),
      label: t('home.statCourses')
    },
    {
      value: t('home.statCompletionValue', { defaultValue: "95%" }),
      label: t('home.statCompletion')
    },
    {
      value: t('home.statRatingValue', { defaultValue: "4.8" }),
      label: t('home.statRating')
    }
  ];

  // Локализованные шаги (How it works)
  const steps = [
    { num: t('home.step1Num', { defaultValue: "1" }), title: 'step1Title', desc: 'step1Desc' },
    { num: t('home.step2Num', { defaultValue: "2" }), title: 'step2Title', desc: 'step2Desc' },
    { num: t('home.step3Num', { defaultValue: "3" }), title: 'step3Title', desc: 'step3Desc' },
    { num: t('home.step4Num', { defaultValue: "4" }), title: 'step4Title', desc: 'step4Desc' }
  ];

  // Локализованные features (иконки те же, ключи те же)
  const features = [
    {
      title: 'feature1Title',
      desc: 'feature1Desc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: 'feature2Title',
      desc: 'feature2Desc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'feature3Title',
      desc: 'feature3Desc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: 'feature4Title',
      desc: 'feature4Desc',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="relative bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-french-blue-50 dark:bg-french-blue-900/20 rounded-md text-sm font-medium text-french-blue-700 dark:text-french-blue-400 mb-8 border border-french-blue-100 dark:border-french-blue-900/30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{t('home.badge')}</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="px-8 py-4 bg-french-blue-600 hover:bg-french-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                {t('home.getStarted')}
              </Link>
              <Link
                to="/courses"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
              >
                {t('home.viewCourses')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {statsConfig.map((stat, idx) => (
              <div className="text-center" key={idx}>
                <div className="text-5xl font-bold text-gray-900 dark:text-white mb-3">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5">
              {t('home.featuresTitle')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('home.featuresSubtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-french-blue-300 dark:hover:border-french-blue-700 hover:shadow-lg transition-all duration-200"
              >
                <div className="text-french-blue-600 dark:text-french-blue-400 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {t(`home.${feature.title}`)}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t(`home.${feature.desc}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5">
              {t('home.howItWorksTitle')}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('home.howItWorksSubtitle')}
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-14 h-14 bg-french-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold mx-auto mb-6 shadow-sm">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {t(`home.${step.title}`)}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t(`home.${step.desc}`)}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-7 left-full w-full h-0.5 bg-gray-300 dark:bg-gray-700 transform translate-x-6"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-french-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-5">{t('home.ctaTitle')}</h2>
          <p className="text-xl mb-10 text-french-blue-100">{t('home.ctaSubtitle')}</p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-french-blue-600 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50"
          >
            {t('home.joinNow')}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
