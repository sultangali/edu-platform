const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-french-blue-500 to-turquoise-surf-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-french-blue-500/30 animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          
          {/* Rotating ring */}
          <div className="absolute inset-0 -m-2">
            <svg className="w-24 h-24 animate-spin" viewBox="0 0 100 100">
              <circle
                className="text-gray-200 dark:text-gray-700"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
              />
              <circle
                className="text-french-blue-500"
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="42"
                cx="50"
                cy="50"
                strokeDasharray="264"
                strokeDashoffset="200"
              />
            </svg>
          </div>
        </div>

        {/* Loading text */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-gray-600 dark:text-gray-400">Жүктелуде</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-french-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-french-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-french-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

