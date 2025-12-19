import { useState, useMemo } from 'react';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';
import api from '../../services/api';

const ContentEditor = ({ content, onChange, topicIndex }) => {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiType, setAiType] = useState('test'); // 'test' or 'assignment'
  const [aiPrompt, setAiPrompt] = useState('');
  const [mediaType, setMediaType] = useState('video');
  const [mediaSource, setMediaSource] = useState('url');
  const [mediaData, setMediaData] = useState({
    url: '',
    file: null,
    iframe: '',
    title: '',
    description: ''
  });

  // Test data
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    timeLimit: 30,
    passingScore: 60,
    questions: []
  });

  // Assignment data
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    instructions: '',
    maxScore: 100,
    dueDate: '',
    allowFileUpload: true,
    allowTextSubmission: true
  });

  const addContentBlock = (type, data) => {
    const newBlock = {
      id: Date.now(),
      type,
      order: content.length + 1,
      ...data
    };
    onChange([...content, newBlock]);
  };

  const updateContentBlock = (index, data) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], ...data };
    onChange(newContent);
  };

  const removeContentBlock = (index) => {
    const newContent = content.filter((_, i) => i !== index);
    newContent.forEach((block, i) => {
      block.order = i + 1;
    });
    onChange(newContent);
  };

  const moveContentBlock = (index, direction) => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === content.length - 1)) {
      return;
    }
    const newContent = [...content];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newContent[index], newContent[swapIndex]] = [newContent[swapIndex], newContent[index]];
    newContent.forEach((block, i) => {
      block.order = i + 1;
    });
    onChange(newContent);
  };

  const handleMediaSubmit = () => {
    if (mediaSource === 'url' && !mediaData.url && !mediaData.iframe) return;
    if (mediaSource === 'file' && !mediaData.file) return;

    const blockData = {
      title: mediaData.title,
      description: mediaData.description
    };

    if (mediaSource === 'url') {
      blockData.url = mediaData.url;
    } else if (mediaSource === 'iframe') {
      blockData.iframe = mediaData.iframe;
    } else {
      blockData.file = mediaData.file;
      blockData.fileName = mediaData.file.name;
    }

    addContentBlock(mediaType, blockData);
    setShowMediaModal(false);
    setMediaData({ url: '', file: null, iframe: '', title: '', description: '' });
  };

  // Add a new question to test
  const addQuestion = () => {
    setTestData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: Date.now(),
          text: '',
          type: 'single', // single, multiple
          options: [
            { id: Date.now() + 1, text: '', isCorrect: false },
            { id: Date.now() + 2, text: '', isCorrect: false }
          ],
          points: 10
        }
      ]
    }));
  };

  const updateQuestion = (qIndex, field, value) => {
    const newQuestions = [...testData.questions];
    newQuestions[qIndex][field] = value;
    setTestData(prev => ({ ...prev, questions: newQuestions }));
  };

  const removeQuestion = (qIndex) => {
    setTestData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== qIndex)
    }));
  };

  const addOption = (qIndex) => {
    const newQuestions = [...testData.questions];
    newQuestions[qIndex].options.push({
      id: Date.now(),
      text: '',
      isCorrect: false
    });
    setTestData(prev => ({ ...prev, questions: newQuestions }));
  };

  const updateOption = (qIndex, oIndex, field, value) => {
    const newQuestions = [...testData.questions];
    if (field === 'isCorrect' && newQuestions[qIndex].type === 'single') {
      // For single choice, uncheck all others
      newQuestions[qIndex].options.forEach((opt, i) => {
        opt.isCorrect = i === oIndex ? value : false;
      });
    } else {
      newQuestions[qIndex].options[oIndex][field] = value;
    }
    setTestData(prev => ({ ...prev, questions: newQuestions }));
  };

  const removeOption = (qIndex, oIndex) => {
    const newQuestions = [...testData.questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    setTestData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleTestSubmit = () => {
    if (!testData.title || testData.questions.length === 0) return;
    
    addContentBlock('test', {
      title: testData.title,
      description: testData.description,
      timeLimit: testData.timeLimit,
      passingScore: testData.passingScore,
      questions: testData.questions
    });
    
    setShowTestModal(false);
    setTestData({
      title: '',
      description: '',
      timeLimit: 30,
      passingScore: 60,
      questions: []
    });
  };

  const handleAssignmentSubmit = () => {
    if (!assignmentData.title || !assignmentData.instructions) return;
    
    addContentBlock('assignment', {
      title: assignmentData.title,
      description: assignmentData.description,
      instructions: assignmentData.instructions,
      maxScore: assignmentData.maxScore,
      dueDate: assignmentData.dueDate,
      allowFileUpload: assignmentData.allowFileUpload,
      allowTextSubmission: assignmentData.allowTextSubmission
    });
    
    setShowAssignmentModal(false);
    setAssignmentData({
      title: '',
      description: '',
      instructions: '',
      maxScore: 100,
      dueDate: '',
      allowFileUpload: true,
      allowTextSubmission: true
    });
  };

  // AI Generation
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setAiLoading(true);
    try {
      const response = await api.post('/ai/generate', {
        type: aiType,
        prompt: aiPrompt,
        topicIndex
      });
      
      if (response.data.success && response.data.data) {
        if (aiType === 'test') {
          setTestData(prev => ({
            ...prev,
            ...response.data.data,
            questions: response.data.data.questions || prev.questions
          }));
          setShowAIModal(false);
          setShowTestModal(true);
        } else {
          setAssignmentData(prev => ({
            ...prev,
            ...response.data.data
          }));
          setShowAIModal(false);
          setShowAssignmentModal(true);
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback: generate mock data
      if (aiType === 'test') {
        setTestData({
          title: `${aiPrompt} бойынша тест`,
          description: 'AI генерациялаған тест сұрақтары',
          timeLimit: 30,
          passingScore: 60,
          questions: [
            {
              id: Date.now(),
              text: `${aiPrompt} бойынша бірінші сұрақ?`,
              type: 'single',
              options: [
                { id: Date.now() + 1, text: 'A нұсқасы', isCorrect: true },
                { id: Date.now() + 2, text: 'B нұсқасы', isCorrect: false },
                { id: Date.now() + 3, text: 'C нұсқасы', isCorrect: false },
                { id: Date.now() + 4, text: 'D нұсқасы', isCorrect: false }
              ],
              points: 10
            },
            {
              id: Date.now() + 10,
              text: `${aiPrompt} туралы екінші сұрақ?`,
              type: 'single',
              options: [
                { id: Date.now() + 11, text: 'Бірінші жауап', isCorrect: false },
                { id: Date.now() + 12, text: 'Екінші жауап', isCorrect: true },
                { id: Date.now() + 13, text: 'Үшінші жауап', isCorrect: false }
              ],
              points: 10
            }
          ]
        });
        setShowAIModal(false);
        setShowTestModal(true);
      } else {
        setAssignmentData({
          title: `${aiPrompt} бойынша тапсырма`,
          description: 'AI генерациялаған тапсырма',
          instructions: `${aiPrompt} тақырыбы бойынша келесі тапсырманы орындаңыз:\n\n1. Негізгі түсініктерді түсіндіріңіз\n2. Практикалық мысал келтіріңіз\n3. Қорытынды жасаңыз`,
          maxScore: 100,
          dueDate: '',
          allowFileUpload: true,
          allowTextSubmission: true
        });
        setShowAIModal(false);
        setShowAssignmentModal(true);
      }
    } finally {
      setAiLoading(false);
      setAiPrompt('');
    }
  };

  const editorOptions = useMemo(() => ({
    spellChecker: false,
    placeholder: 'Контентті жазыңыз... Markdown форматын қолдануға болады',
    status: false,
    autofocus: false,
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ],
    minHeight: '200px'
  }), []);

  const renderContentBlock = (block, index) => {
    const blockHeader = (icon, iconColor, label) => (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveContentBlock(index, 'up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => moveContentBlock(index, 'down')}
            disabled={index === content.length - 1}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => removeContentBlock(index)}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );

    switch (block.type) {
      case 'text':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {blockHeader(
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>,
              'gray',
              'Мәтін'
            )}
            <SimpleMDE
              key={`editor-${block.id || index}`}
              value={block.content || ''}
              onChange={(value) => {
                // Direct update to avoid losing focus
                const newContent = [...content];
                if (newContent[index]) {
                  newContent[index] = { ...newContent[index], content: value };
                  onChange(newContent);
                }
              }}
              options={editorOptions}
            />
          </div>
        );

      case 'video':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {blockHeader(
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>,
              'red',
              'Бейне'
            )}
            {block.title && <h4 className="font-medium text-gray-900 dark:text-white mb-2">{block.title}</h4>}
            {block.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{block.description}</p>}
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
              {(() => {
                // Check iframe first
                const iframe = block.iframe || 
                  (Array.isArray(block.content) && block.content[0]?.iframe) ||
                  (block.content && typeof block.content === 'object' && block.content.iframe) ||
                  '';
                
                if (iframe) {
                  return (
                    <div 
                      className="w-full h-full relative"
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          let iframeHtml = typeof iframe === 'string' ? iframe : '';
                          // Remove existing width, height, style attributes
                          iframeHtml = iframeHtml.replace(/width="[^"]*"/gi, '');
                          iframeHtml = iframeHtml.replace(/height="[^"]*"/gi, '');
                          iframeHtml = iframeHtml.replace(/style="[^"]*"/gi, '');
                          // Add responsive styles
                          iframeHtml = iframeHtml.replace(
                            /<iframe/gi,
                            '<iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"'
                          );
                          return iframeHtml;
                        })()
                      }} 
                    />
                  );
                }
                
                // Get video URL from multiple possible locations
                const videoUrl = block.url || block.videoUrl || 
                  (Array.isArray(block.content) && block.content[0]?.videoUrl) ||
                  (block.content && typeof block.content === 'object' && block.content.videoUrl) ||
                  '';
                
                if (videoUrl) {
                  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                  const fullVideoUrl = videoUrl && !videoUrl.startsWith('http') && !videoUrl.startsWith('/') ? `${apiUrl}/${videoUrl}` : 
                    (videoUrl && !videoUrl.startsWith('http') ? `${apiUrl}${videoUrl}` : videoUrl);
                  
                  // Parse YouTube URL properly
                  let videoId = null;
                  const url = fullVideoUrl.trim();
                  
                  if (url.includes('youtube.com/watch?v=')) {
                    videoId = url.split('v=')[1]?.split('&')[0];
                  } else if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1]?.split('?')[0];
                  } else if (url.includes('youtube.com/embed/')) {
                    videoId = url.split('embed/')[1]?.split('?')[0];
                  }
                  
                  if (videoId) {
                    return (
                      <iframe
                        className="w-full h-full absolute inset-0"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={block.title || 'Video'}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  
                  // Regular video URL
                  return (
                    <video controls className="w-full h-full absolute inset-0 object-contain">
                      <source src={fullVideoUrl} />
                    </video>
                  );
                }
                
                // Fallback to file preview
                if (block.file) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{block.fileName}</p>
                      </div>
                    </div>
                  );
                }
                
                return null;
              })()}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {blockHeader(
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>,
              'purple',
              'Аудио'
            )}
            {block.title && <h4 className="font-medium text-gray-900 dark:text-white mb-2">{block.title}</h4>}
            {block.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{block.description}</p>}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              {(() => {
                // Get audio URL from multiple possible locations
                const audioUrl = block.url || block.audioUrl || 
                  (Array.isArray(block.content) && block.content[0]?.audioUrl) ||
                  (block.content && typeof block.content === 'object' && block.content.audioUrl) ||
                  '';
                
                if (audioUrl) {
                  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                  const fullAudioUrl = audioUrl && !audioUrl.startsWith('http') && !audioUrl.startsWith('/') ? `${apiUrl}/${audioUrl}` : 
                    (audioUrl && !audioUrl.startsWith('http') ? `${apiUrl}${audioUrl}` : audioUrl);
                  return (
                    <audio controls className="w-full">
                      <source src={fullAudioUrl} />
                    </audio>
                  );
                }
                return null;
              })() || block.file ? (
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{block.fileName}</span>
                </div>
              ) : null}
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {blockHeader(
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>,
              'green',
              'Сурет'
            )}
            {block.title && <h4 className="font-medium text-gray-900 dark:text-white mb-2">{block.title}</h4>}
            {block.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{block.description}</p>}
            <div className="rounded-lg overflow-hidden">
              {(() => {
                // Get image URL from multiple possible locations
                let imageUrl = block.url || block.imageUrl || 
                  (Array.isArray(block.content) && block.content[0]?.imageUrl) ||
                  (block.content && typeof block.content === 'object' && block.content.imageUrl) ||
                  '';
                
                // If URL is relative, make it absolute
                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
                  imageUrl = '/' + imageUrl;
                }
                const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
                const fullImageUrl = imageUrl && !imageUrl.startsWith('http') ? `${apiUrl}${imageUrl}` : imageUrl;
                
                if (fullImageUrl) {
                  return (
                    <img 
                      src={fullImageUrl} 
                      alt={block.title || 'Image'} 
                      className="w-full h-auto" 
                      onError={(e) => {
                        console.error('Image failed to load:', fullImageUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  );
                } else if (block.file) {
                  return (
                    <img 
                      src={URL.createObjectURL(block.file)} 
                      alt={block.title || 'Image'} 
                      className="w-full h-auto" 
                    />
                  );
                }
                return null;
              })()}
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-6">
            {blockHeader(
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>,
              'orange',
              'Тест'
            )}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{block.title}</h4>
              {block.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{block.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>{block.questions?.length || 0}</strong> сұрақ
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <strong>{block.timeLimit || 30}</strong> мин
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Өту балы: <strong>{block.passingScore || 60}%</strong>
                </span>
              </div>
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
            {blockHeader(
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>,
              'blue',
              'Тапсырма'
            )}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{block.title}</h4>
              {block.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{block.description}</p>}
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Макс. балл: <strong>{block.maxScore || 100}</strong>
                </span>
                {block.allowFileUpload && (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Файл жүктеу
                  </span>
                )}
                {block.allowTextSubmission && (
                  <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Мәтін жазу
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Content Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addContentBlock('text', { content: '' })}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Мәтін
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType('video');
            setShowMediaModal(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Бейне
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType('audio');
            setShowMediaModal(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          Аудио
        </button>
        <button
          type="button"
          onClick={() => {
            setMediaType('image');
            setShowMediaModal(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Сурет
        </button>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => setShowTestModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg text-sm text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Тест
        </button>
        <button
          type="button"
          onClick={() => setShowAssignmentModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Тапсырма
        </button>
        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1"></div>
        <button
          type="button"
          onClick={() => setShowAIModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 rounded-lg text-sm text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI көмегі
        </button>
      </div>

      {/* Content Blocks */}
      {content.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Контент жоқ</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Сабаққа контент қосу үшін жоғарыдағы батырмаларды пайдаланыңыз
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {content.map((block, index) => (
            <div key={block.id}>
              {renderContentBlock(block, index)}
            </div>
          ))}
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80" onClick={() => setShowMediaModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {mediaType === 'video' && 'Бейне қосу'}
                  {mediaType === 'audio' && 'Аудио қосу'}
                  {mediaType === 'image' && 'Сурет қосу'}
                </h3>
                <button onClick={() => setShowMediaModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Source Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Көзі</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMediaSource('url')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        mediaSource === 'url'
                          ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20 text-french-blue-700 dark:text-french-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      URL ссылка
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSource('file')}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                        mediaSource === 'file'
                          ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20 text-french-blue-700 dark:text-french-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Файл жүктеу
                    </button>
                    {mediaType === 'video' && (
                      <button
                        type="button"
                        onClick={() => setMediaSource('iframe')}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                          mediaSource === 'iframe'
                            ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20 text-french-blue-700 dark:text-french-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        Iframe код
                      </button>
                    )}
                  </div>
                </div>

                {/* URL Input */}
                {mediaSource === 'url' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL мекенжайы</label>
                    <input
                      type="url"
                      value={mediaData.url}
                      onChange={(e) => setMediaData({ ...mediaData, url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent"
                      placeholder={
                        mediaType === 'video' ? 'https://youtube.com/watch?v=... немесе https://example.com/video.mp4' :
                        mediaType === 'audio' ? 'https://example.com/audio.mp3' :
                        'https://example.com/image.jpg'
                      }
                    />
                  </div>
                )}

                {/* File Upload */}
                {mediaSource === 'file' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Файл таңдау</label>
                    <input
                      type="file"
                      accept={
                        mediaType === 'video' ? 'video/*' :
                        mediaType === 'audio' ? 'audio/*' :
                        'image/*'
                      }
                      onChange={(e) => setMediaData({ ...mediaData, file: e.target.files[0] })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Iframe Input */}
                {mediaSource === 'iframe' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Iframe коды</label>
                    <textarea
                      value={mediaData.iframe}
                      onChange={(e) => setMediaData({ ...mediaData, iframe: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                      placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                    />
                  </div>
                )}

                {/* Title & Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Атауы (қосымша)</label>
                  <input
                    type="text"
                    value={mediaData.title}
                    onChange={(e) => setMediaData({ ...mediaData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Материал атауы"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Сипаттама (қосымша)</label>
                  <textarea
                    value={mediaData.description}
                    onChange={(e) => setMediaData({ ...mediaData, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Материал туралы қысқаша..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowMediaModal(false);
                    setMediaData({ url: '', file: null, iframe: '', title: '', description: '' });
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Болдырмау
                </button>
                <button
                  type="button"
                  onClick={handleMediaSubmit}
                  disabled={
                    (mediaSource === 'url' && !mediaData.url) ||
                    (mediaSource === 'file' && !mediaData.file) ||
                    (mediaSource === 'iframe' && !mediaData.iframe)
                  }
                  className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  Қосу
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80" onClick={() => setShowTestModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Тест құру
                </h3>
                <button onClick={() => setShowTestModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Test Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Тест атауы *</label>
                    <input
                      type="text"
                      value={testData.title}
                      onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Мысалы: JavaScript негіздері тесті"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Сипаттама</label>
                    <input
                      type="text"
                      value={testData.description}
                      onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Тест туралы қысқаша..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Уақыт шектеуі (мин)</label>
                    <input
                      type="number"
                      value={testData.timeLimit}
                      onChange={(e) => setTestData({ ...testData, timeLimit: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Өту балы (%)</label>
                    <input
                      type="number"
                      value={testData.passingScore}
                      onChange={(e) => setTestData({ ...testData, passingScore: parseInt(e.target.value) || 60 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Questions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Сұрақтар</h4>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Сұрақ қосу
                    </button>
                  </div>

                  {testData.questions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <p className="text-gray-500 dark:text-gray-400">Сұрақтар әлі жоқ. "Сұрақ қосу" батырмасын басыңыз.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testData.questions.map((question, qIndex) => (
                        <div key={question.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-start gap-4 mb-4">
                            <span className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg flex items-center justify-center font-medium text-sm">
                              {qIndex + 1}
                            </span>
                            <div className="flex-1">
                              <textarea
                                value={question.text}
                                onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                placeholder="Сұрақ мәтіні..."
                                rows={2}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={question.type}
                                onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              >
                                <option value="single">Бір жауап</option>
                                <option value="multiple">Көп жауап</option>
                              </select>
                              <input
                                type="number"
                                value={question.points}
                                onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 10)}
                                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="Балл"
                                min="1"
                              />
                              <button
                                type="button"
                                onClick={() => removeQuestion(qIndex)}
                                className="p-2 text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Options */}
                          <div className="ml-12 space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div key={option.id} className="flex items-center gap-3">
                                <input
                                  type={question.type === 'single' ? 'radio' : 'checkbox'}
                                  checked={option.isCorrect}
                                  onChange={(e) => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)}
                                  className="w-4 h-4 text-green-600"
                                  name={`question-${question.id}`}
                                />
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) => updateOption(qIndex, oIndex, 'text', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                  placeholder={`${oIndex + 1}-нұсқа`}
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(qIndex, oIndex)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(qIndex)}
                              className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Нұсқа қосу
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Болдырмау
                </button>
                <button
                  type="button"
                  onClick={handleTestSubmit}
                  disabled={!testData.title || testData.questions.length === 0}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  Тест қосу
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80" onClick={() => setShowAssignmentModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Тапсырма құру
                </h3>
                <button onClick={() => setShowAssignmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Тапсырма атауы *</label>
                  <input
                    type="text"
                    value={assignmentData.title}
                    onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Мысалы: Практикалық тапсырма #1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Сипаттама</label>
                  <input
                    type="text"
                    value={assignmentData.description}
                    onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Тапсырма туралы қысқаша..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Нұсқаулық *</label>
                  <textarea
                    value={assignmentData.instructions}
                    onChange={(e) => setAssignmentData({ ...assignmentData, instructions: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Тапсырманы орындау үшін нұсқаулық..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Максимал балл</label>
                    <input
                      type="number"
                      value={assignmentData.maxScore}
                      onChange={(e) => setAssignmentData({ ...assignmentData, maxScore: parseInt(e.target.value) || 100 })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Мерзімі (қосымша)</label>
                    <input
                      type="date"
                      value={assignmentData.dueDate}
                      onChange={(e) => setAssignmentData({ ...assignmentData, dueDate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignmentData.allowFileUpload}
                      onChange={(e) => setAssignmentData({ ...assignmentData, allowFileUpload: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Файл жүктеуге рұқсат</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignmentData.allowTextSubmission}
                      onChange={(e) => setAssignmentData({ ...assignmentData, allowTextSubmission: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Мәтін жазуға рұқсат</span>
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Болдырмау
                </button>
                <button
                  type="button"
                  onClick={handleAssignmentSubmit}
                  disabled={!assignmentData.title || !assignmentData.instructions}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  Тапсырма қосу
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80" onClick={() => setShowAIModal(false)}></div>
            
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI көмекші</h3>
                </div>
                <button onClick={() => setShowAIModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Не генерациялау керек?</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAiType('test')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                        aiType === 'test'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Тест сұрақтары
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiType('assignment')}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 transition-colors ${
                        aiType === 'assignment'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Тапсырма
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Тақырып сипаттамасы</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder={aiType === 'test' 
                      ? "Мысалы: JavaScript массивтері бойынша 5 сұрақтан тұратын тест құр..."
                      : "Мысалы: React компоненттерін құру бойынша практикалық тапсырма құр..."
                    }
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Болдырмау
                </button>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  {aiLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Генерациялануда...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Генерациялау
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
