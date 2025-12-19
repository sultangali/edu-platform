import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import LoadingScreen from '../../components/common/LoadingScreen';
import ReactMarkdown from 'react-markdown';
import TestComponent from '../../components/courses/TestComponent';
import AssignmentComponent from '../../components/courses/AssignmentComponent';

const CourseLearn = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0); // Index of current lesson (topic)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [completingContent, setCompletingContent] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    fetchCourseAndProgress();
    // eslint-disable-next-line
  }, [id]);

  const fetchCourseAndProgress = async () => {
    try {
      const courseRes = await api.get(`/courses/${id}`);
      const courseData = courseRes.data.data || courseRes.data;
      setCourse(courseData);

      // Check if user is enrolled
      if (!courseRes.data.isEnrolled) {
        setIsEnrolled(false);
        navigate(`/courses/${id}`);
        return;
      }
      
      setIsEnrolled(true);

      // Get progress if enrolled
      if (courseRes.data.progress) {
        setProgress(courseRes.data.progress);
      } else {
        // Try to fetch progress separately
        try {
          const progressRes = await api.get(`/progress/${id}`);
          setProgress(progressRes.data.data);
        } catch (e) {
          // Progress not found - create empty progress
          setProgress({ completedLessons: [], progressPercentage: 0 });
        }
      }

      // Find first incomplete lesson to start from
      if (courseRes.data.progress && courseData.topics) {
        const { completedLessons = [] } = courseRes.data.progress;
        let found = false;
        
        for (let li = 0; li < courseData.topics.length && !found; li++) {
          const lesson = courseData.topics[li];
          // Check if any content in this lesson is incomplete
          if (lesson.lessons) {
            for (const content of lesson.lessons) {
              if (!completedLessons.some(cl => cl.toString() === content._id?.toString())) {
                setCurrentLessonIndex(li);
                found = true;
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      if (error.response?.status === 404 || error.response?.status === 401) {
        navigate('/courses');
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLesson = () => {
    if (!course || !course.topics || !course.topics[currentLessonIndex]) {
      return null;
    }
    return course.topics[currentLessonIndex];
  };

  const isContentCompleted = (contentId) => {
    if (!progress || !progress.completedLessons || !contentId) return false;
    return progress.completedLessons.some(id => id?.toString() === contentId?.toString());
  };

  const isLessonFullyCompleted = (lessonIndex) => {
    if (!course || !course.topics || !course.topics[lessonIndex]) return false;
    const lesson = course.topics[lessonIndex];
    if (!lesson.lessons || lesson.lessons.length === 0) return false;
    return lesson.lessons.every(content => isContentCompleted(content._id));
  };

  const handleContentComplete = async (contentId) => {
    if (!contentId) return;

    setCompletingContent(true);
    try {
      const response = await api.post(`/progress/${id}/lessons/${contentId}/complete`);
      setProgress(response.data.data);
    } catch (error) {
      console.error('Error marking content complete:', error);
    } finally {
      setCompletingContent(false);
    }
  };

  const handleContentIncomplete = async (contentId) => {
    if (!contentId) return;

    setCompletingContent(true);
    try {
      const response = await api.delete(`/progress/${id}/lessons/${contentId}/complete`);
      setProgress(response.data.data);
    } catch (error) {
      console.error('Error marking content incomplete:', error);
    } finally {
      setCompletingContent(false);
    }
  };

  const markLessonComplete = async () => {
    const currentLesson = getCurrentLesson();
    if (!currentLesson || !currentLesson.lessons) return;

    setCompletingContent(true);
    try {
      // Mark all contents in this lesson as complete
      for (const content of currentLesson.lessons) {
        if (content._id && !isContentCompleted(content._id)) {
          await api.post(`/progress/${id}/lessons/${content._id}/complete`);
        }
      }
      // Refresh progress
      const progressRes = await api.get(`/progress/${id}`);
      setProgress(progressRes.data.data);
      
      // Move to next lesson
      goToNextLesson();
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    } finally {
      setCompletingContent(false);
    }
  };

  const goToNextLesson = () => {
    if (!course || !course.topics) return;
    if (currentLessonIndex < course.topics.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const selectLesson = (lessonIndex) => {
    setCurrentLessonIndex(lessonIndex);
    window.scrollTo(0, 0);
  };

  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Render content based on type
  const renderContent = (content, index) => {
    if (!content) return null;

    const contentCompleted = isContentCompleted(content._id);
    const contentTypeName = {
      'video': t('courseLearn.contentTypes.video'),
      'audio': t('courseLearn.contentTypes.audio'),
      'article': t('courseLearn.contentTypes.article'),
      'image': t('courseLearn.contentTypes.image'),
      'test': t('courseLearn.contentTypes.test'),
      'assignment': t('courseLearn.contentTypes.assignment')
    };

    return (
      <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Content Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Content type icon */}
            {/* ... SVGs, unchanged ... */}
            {content.type === 'video' ? (
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            ) : content.type === 'audio' ? (
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            ) : content.type === 'image' ? (
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            ) : content.type === 'test' ? (
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            ) : content.type === 'assignment' ? (
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {content.title || contentTypeName[content.type] || t('courseLearn.contentTypes.content')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contentTypeName[content.type] || content.type}
                {content.duration && ` • ${content.duration}`}
              </p>
            </div>
          </div>
          
          {/* Complete checkbox */}
          {content._id && (
            <button
              onClick={() => contentCompleted ? handleContentIncomplete(content._id) : handleContentComplete(content._id)}
              disabled={completingContent}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                contentCompleted
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {contentCompleted ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('courseLearn.contentCompleted')}
                </>
              ) : (
                <>
                  <div className="w-4 h-4 border-2 border-current rounded" />
                  {t('courseLearn.contentMark')}
                </>
              )}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Video content */}
          {content.type === 'video' && (
            <div className="video-container bg-black rounded-lg overflow-hidden w-full">
              {(() => {
                // Extract video data - handle both array and object formats
                let videoData = null;
                if (Array.isArray(content.content) && content.content.length > 0) {
                  videoData = content.content.find(c => c.type === 'video') || content.content[0];
                } else if (content.content && typeof content.content === 'object') {
                  videoData = content.content;
                }
                
                const iframe = videoData?.iframe || content.content?.iframe;
                const videoUrl = content.videoUrl || videoData?.videoUrl || videoData?.url || content.content?.url || '';
                
                if (iframe) {
                  return (
                    <div className="w-full aspect-video relative">
                      <div
                        className="absolute inset-0 w-full h-full"
                        dangerouslySetInnerHTML={{ 
                          __html: (typeof iframe === 'string' ? iframe : '')
                            .replace(/style="[^"]*"/gi, '')
                            .replace(/width="[^"]*"/gi, '')
                            .replace(/height="[^"]*"/gi, '')
                            .replace(/<iframe/gi, '<iframe style="width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0;" class="w-full h-full"')
                        }} 
                      />
                    </div>
                  );
                }
                
                if (videoUrl) {
                  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                    let videoId = '';
                    if (videoUrl.includes('youtu.be/')) {
                      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || '';
                    } else if (videoUrl.includes('youtube.com/embed/')) {
                      videoId = videoUrl.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0] || '';
                    } else if (videoUrl.includes('youtube.com/watch?v=')) {
                      videoId = videoUrl.split('v=')[1]?.split('&')[0] || '';
                    }
                    
                    if (videoId) {
                      return (
                        <div className="w-full aspect-video relative">
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={content.title || t('courseLearn.contentTypes.video')}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                  }
                  return (
                    <div className="w-full aspect-video">
                      <video
                        className="w-full h-full object-contain"
                        controls
                        src={videoUrl.startsWith('http') ? videoUrl : `${apiUrl}${videoUrl}`}
                      >
                        {t('courseLearn.videoNotSupported')}
                      </video>
                    </div>
                  );
                }
                
                // No video data found
                return (
                  <div className="w-full aspect-video flex items-center justify-center text-gray-400">
                    {t('courseLearn.noVideo')}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Audio content */}
          {content.type === 'audio' && (
            <div className="audio-container">
              {(() => {
                // Extract audio data - handle both array and object formats
                let audioData = null;
                if (Array.isArray(content.content) && content.content.length > 0) {
                  audioData = content.content.find(c => c.type === 'audio') || content.content[0];
                } else if (content.content && typeof content.content === 'object') {
                  audioData = content.content;
                }
                
                const audioUrl = content.audioUrl || audioData?.audioUrl || audioData?.url || content.content?.url || '';
                
                if (audioUrl) {
                  return (
                    <audio
                      className="w-full"
                      controls
                      src={audioUrl.startsWith('http') ? audioUrl : `${apiUrl}${audioUrl}`}
                    >
                      {t('courseLearn.audioNotSupported')}
                    </audio>
                  );
                }
                
                return (
                  <div className="w-full py-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-400">{t('courseLearn.noAudio')}</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Image content */}
          {content.type === 'image' && (
            <div className="image-container">
              {(() => {
                // Extract image data - handle both array and object formats
                let imageUrl = '';
                
                // Check direct properties first
                if (content.imageUrl) {
                  imageUrl = content.imageUrl;
                } else if (content.content) {
                  // Check if content is an array
                  if (Array.isArray(content.content)) {
                    const imageContent = content.content.find(c => c.type === 'image' || c.imageUrl || c.url);
                    imageUrl = imageContent?.imageUrl || imageContent?.url || '';
                  } 
                  // Check if content is an object
                  else if (typeof content.content === 'object') {
                    imageUrl = content.content.url || content.content.imageUrl || '';
                  }
                  // Check if content is a string (direct URL)
                  else if (typeof content.content === 'string') {
                    imageUrl = content.content;
                  }
                }
                
                if (!imageUrl) {
                  return (
                    <div className="w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-400">{t('courseLearn.noImage')}</p>
                    </div>
                  );
                }
                
                const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${apiUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
                
                return (
                  <div className="relative w-full">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
                      <img
                        src={fullImageUrl}
                        alt={content.title || t('courseLearn.contentTypes.image')}
                        className="max-w-full max-h-[600px] w-auto h-auto object-contain rounded-lg"
                        onError={(e) => {
                          const errorDiv = e.target.parentElement?.parentElement?.querySelector('.image-error');
                          if (errorDiv) {
                            errorDiv.classList.remove('hidden');
                          }
                          if (e.target.parentElement) {
                            e.target.parentElement.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                    <div className="hidden image-error w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <p className="text-gray-400">{t('courseLearn.imageLoadError')}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Test content */}
          {content.type === 'test' && (
            <div className="test-container">
              {(() => {
                // Extract test data from content.content or use content directly
                let testData;
                
                // Check if content.content is an array (from course structure)
                if (Array.isArray(content.content)) {
                  const testContent = content.content.find(c => c.questions || c.type === 'test');
                  if (testContent?.questions) {
                    testData = {
                      _id: content._id,
                      title: content.title || testContent.title,
                      description: content.description || testContent.description,
                      questions: testContent.questions.map(q => ({
                        question: q.question || q.questionText || q.text || '',
                        options: q.options?.map(opt => {
                          if (typeof opt === 'string') return opt;
                          return opt.text || opt.label || '';
                        }).filter(opt => opt) || [],
                      })),
                      passingScore: testContent.passingScore || content.content?.passingScore,
                      duration: testContent.timeLimit || content.content?.timeLimit,
                    };
                  }
                } else if (content.content?.questions) {
                  // Data is in content.content format
                  testData = {
                    _id: content._id || content.content?.testId,
                    title: content.title || content.content?.title,
                    description: content.description || content.content?.description,
                    questions: content.content.questions.map(q => ({
                      question: q.question || q.questionText || q.text || '',
                      options: q.options?.map(opt => {
                        if (typeof opt === 'string') return opt;
                        return opt.text || opt.label || '';
                      }).filter(opt => opt) || [],
                    })),
                    passingScore: content.content?.passingScore,
                    duration: content.content?.timeLimit,
                  };
                } else if (content.questions) {
                  // Data is in content directly
                  testData = {
                    _id: content._id,
                    title: content.title,
                    description: content.description,
                    questions: content.questions.map(q => ({
                      question: q.question || q.questionText || q.text || '',
                      options: q.options?.map(opt => {
                        if (typeof opt === 'string') return opt;
                        return opt.text || opt.label || '';
                      }).filter(opt => opt) || [],
                    })),
                    passingScore: content.passingScore,
                    duration: content.duration,
                  };
                } else {
                  testData = content;
                }

                if (!testData || !testData.questions || testData.questions.length === 0) {
                  return (
                    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-yellow-700 dark:text-yellow-400">{t('courseLearn.noTestData')}</p>
                    </div>
                  );
                }

                return (
                  <TestComponent
                    test={testData}
                    courseId={id}
                    contentId={content._id}
                    onComplete={(result, progressData) => {
                      // Update progress state immediately
                      if (progressData) {
                        setProgress(progressData);
                      }
                      // Also refresh to ensure consistency
                      fetchCourseAndProgress();
                    }}
                  />
                );
              })()}
            </div>
          )}

          {/* Assignment content */}
          {content.type === 'assignment' && (
            <div className="assignment-container">
              {(() => {
                // Extract assignment data from content.content or use content directly
                let assignmentData;
                
                if (content.content?.instructions || content.content?.title) {
                  // Data is in content.content format
                  assignmentData = {
                    _id: content._id || content.content?.assignmentId,
                    title: content.title || content.content?.title,
                    description: content.description || content.content?.description || content.content?.instructions,
                    instructions: content.content?.instructions || content.content?.description || content.description,
                    maxScore: content.content?.maxScore || 100,
                    dueDate: content.content?.dueDate,
                    allowFileUpload: content.content?.allowFileUpload !== false,
                    allowTextSubmission: content.content?.allowTextSubmission !== false,
                  };
                } else if (content.title || content.instructions) {
                  // Data is in content directly
                  assignmentData = {
                    _id: content._id,
                    title: content.title,
                    description: content.description || content.instructions,
                    instructions: content.instructions || content.description,
                    maxScore: content.maxScore || 100,
                    dueDate: content.dueDate,
                    allowFileUpload: content.allowFileUpload !== false,
                    allowTextSubmission: content.allowTextSubmission !== false,
                  };
                } else {
                  assignmentData = content;
                }

                if (!assignmentData || !assignmentData.title) {
                  return (
                    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-yellow-700 dark:text-yellow-400">{t('courseLearn.noAssignmentData')}</p>
                    </div>
                  );
                }

                return (
                  <AssignmentComponent
                    assignment={assignmentData}
                    courseId={id}
                    contentId={content._id}
                    progress={progress}
                    onComplete={(submission, progressData) => {
                      // Update progress state immediately
                      if (progressData) {
                        setProgress(progressData);
                      }
                      // Also refresh to ensure consistency
                      fetchCourseAndProgress();
                    }}
                  />
                );
              })()}
            </div>
          )}

          {/* Article/Text content */}
          {(content.type === 'article' || content.type === 'text' || content.content?.text || content.content?.type === 'text' || content.content?.content) && (
            <div className="prose-content text-gray-700 dark:text-gray-300">
              <ReactMarkdown>
                {(() => {
                  // Try to extract text from various content structures
                  if (content.content?.text) return content.content.text;
                  if (content.content?.content) return content.content.content;
                  if (typeof content.content === 'string') return content.content;
                  if (Array.isArray(content.content) && content.content[0]?.text) return content.content[0].text;
                  return '';
                })()}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <LoadingScreen />;
  
  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('courseLearn.courseNotFound')}
          </h2>
          <Link
            to="/courses"
            className="inline-block px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('courseLearn.backToCourses')}
          </Link>
        </div>
      </div>
    );
  }

  const currentLesson = getCurrentLesson();
  const isCurrentLessonComplete = isLessonFullyCompleted(currentLessonIndex);
  const hasPreviousLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex < (course.topics?.length || 0) - 1;

  // Calculate progress
  const totalContents = course.topics?.reduce((sum, lesson) => sum + (lesson.lessons?.length || 0), 0) || 0;
  const completedContents = progress?.completedLessons?.length || 0;
  const progressPercent = progress?.progressPercentage || (totalContents > 0 ? Math.round((completedContents / totalContents) * 100) : 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col`}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 min-w-[320px]">
          <Link to={`/courses/${id}`} className="flex items-center gap-2 text-french-blue-600 dark:text-french-blue-400 hover:underline mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{t('courseLearn.backToCourse')}</span>
          </Link>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">{course.title}</h2>
          
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{t('courseLearn.progress')}</span>
              <span className="font-semibold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  background: progressPercent === 100 ? '#22c55e' : 'linear-gradient(to right, #046ffb, #00d4ff)',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('courseLearn.completedContent', { completed: completedContents, total: totalContents })}
            </p>
          </div>
        </div>

        {/* Lessons List */}
        <div className="flex-1 overflow-y-auto p-4 min-w-[320px]">
          {course.topics && course.topics.map((lesson, lessonIdx) => {
            const lessonComplete = isLessonFullyCompleted(lessonIdx);
            const isCurrent = lessonIdx === currentLessonIndex;
            const lessonContents = lesson.lessons || [];
            const completedInLesson = lessonContents.filter(c => isContentCompleted(c._id)).length;
            
            return (
              <button
                key={lessonIdx}
                onClick={() => selectLesson(lessonIdx)}
                className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                  isCurrent
                    ? 'bg-french-blue-100 dark:bg-french-blue-900/30 border-2 border-french-blue-500'
                    : lessonComplete
                    ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm flex-shrink-0 ${
                    lessonComplete
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-french-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {lessonComplete ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      lessonIdx + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm ${
                      lessonComplete ? 'text-green-700 dark:text-green-400' : 
                      isCurrent ? 'text-french-blue-700 dark:text-french-blue-300' : 
                      'text-gray-900 dark:text-white'
                    }`}>
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('courseLearn.lessonContentShort', { completed: completedInLesson, total: lessonContents.length })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={sidebarOpen ? t('courseLearn.hideMenu') : t('courseLearn.showMenu')}
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('courseLearn.lessonNumber', { number: currentLessonIndex + 1 })}: {currentLesson?.title || t('courseLearn.lesson')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('courseLearn.contentCount', { count: currentLesson?.lessons?.length || 0 })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentLesson && (
              isCurrentLessonComplete ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('courseLearn.lessonCompleted')}
                </span>
              ) : (
                <button
                  onClick={markLessonComplete}
                  disabled={completingContent}
                  className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {completingContent ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('courseLearn.saving')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('courseLearn.completeAll')}
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Lesson Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto space-y-6">
            {currentLesson ? (
              <>
                {/* Lesson description */}
                {currentLesson.description && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <p className="text-gray-600 dark:text-gray-400">{currentLesson.description}</p>
                  </div>
                )}

                {/* Lesson contents */}
                {currentLesson.lessons && currentLesson.lessons.length > 0 ? (
                  currentLesson.lessons.map((content, index) => renderContent(content, index))
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      {t('courseLearn.noContentInLesson')}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {t('courseLearn.lessonNotFound')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={goToPreviousLesson}
            disabled={!hasPreviousLesson}
            className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('courseLearn.prevLesson')}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('courseLearn.lessonPagination', {
                number: currentLessonIndex + 1,
                total: course.topics?.length || 0
              })}
            </span>
          </div>

          <button
            onClick={goToNextLesson}
            disabled={!hasNextLesson}
            className="px-5 py-2.5 bg-french-blue-600 hover:bg-french-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {t('courseLearn.nextLesson')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseLearn;
