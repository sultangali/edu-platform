import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import ContentEditor from '../../components/teacher/ContentEditor';

const CreateCourse = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [newRequirement, setNewRequirement] = useState('');
  const [newWhatYouLearn, setNewWhatYouLearn] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    level: 'beginner',
    category: '',
    language: 'kaz',
    duration: '',
    thumbnail: null,
    topics: [],
    requirements: [],
    whatYouLearn: [],
    isPublished: false
  });

  // Categories localized
  const categories = [
    { value: 'programming', label: t('categories.programming'), icon: '💻' },
    { value: 'web', label: t('categories.web'), icon: '🌐' },
    { value: 'mobile', label: t('categories.mobile'), icon: '📱' },
    { value: 'data', label: t('categories.data'), icon: '📊' },
    { value: 'design', label: t('categories.design'), icon: '🎨' },
    { value: 'business', label: t('categories.business'), icon: '💼' },
    { value: 'marketing', label: t('categories.marketing'), icon: '📈' },
    { value: 'languages', label: t('categories.languages'), icon: '🗣️' },
    { value: 'science', label: t('categories.science'), icon: '🔬' },
    { value: 'other', label: t('categories.other'), icon: '📚' }
  ];

  // Levels localized
  const levels = [
    {
      value: 'beginner',
      label: t('courses.beginner'),
      description: t('levels.beginnerDesc'),
    },
    {
      value: 'intermediate',
      label: t('courses.intermediate'),
      description: t('levels.intermediateDesc'),
    },
    {
      value: 'advanced',
      label: t('courses.advanced'),
      description: t('levels.advancedDesc'),
    },
  ];

  // Languages localized
  const languages = [
    { value: 'kaz', label: t('misc.languages.kazakh'), flag: '🇰🇿' },
    { value: 'rus', label: t('misc.languages.russian'), flag: '🇷🇺' },
    { value: 'eng', label: t('misc.languages.english'), flag: '🇬🇧' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('teacher.thumbnailFileSizeError'));
        return;
      }
      setFormData(prev => ({ ...prev, thumbnail: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setFormData(prev => ({ ...prev, thumbnail: null }));
    setThumbnailPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const addWhatYouLearn = () => {
    if (newWhatYouLearn.trim()) {
      setFormData(prev => ({
        ...prev,
        whatYouLearn: [...prev.whatYouLearn, newWhatYouLearn.trim()],
      }));
      setNewWhatYouLearn('');
    }
  };

  const removeWhatYouLearn = (index) => {
    setFormData(prev => ({
      ...prev,
      whatYouLearn: prev.whatYouLearn.filter((_, i) => i !== index),
    }));
  };

  const addTopic = () => {
    setFormData(prev => ({
      ...prev,
      topics: [
        ...prev.topics,
        {
          id: Date.now(),
          title: '',
          description: '',
          order: prev.topics.length + 1,
          duration: '',
          content: [],
          isExpanded: true
        }
      ]
    }));
  };

  const updateTopic = (index, field, value) => {
    const newTopics = [...formData.topics];
    newTopics[index][field] = value;
    setFormData(prev => ({ ...prev, topics: newTopics }));
  };

  const removeTopic = (index) => {
    const newTopics = formData.topics.filter((_, i) => i !== index);
    // Update order numbers
    newTopics.forEach((topic, i) => {
      topic.order = i + 1;
    });
    setFormData(prev => ({ ...prev, topics: newTopics }));
  };

  const moveTopic = (index, direction) => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === formData.topics.length - 1)) {
      return;
    }
    const newTopics = [...formData.topics];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newTopics[index], newTopics[swapIndex]] = [newTopics[swapIndex], newTopics[index]];
    // Update order numbers
    newTopics.forEach((topic, i) => {
      topic.order = i + 1;
    });
    setFormData(prev => ({ ...prev, topics: newTopics }));
  };

  const toggleTopicExpanded = (index) => {
    const newTopics = [...formData.topics];
    newTopics[index].isExpanded = !newTopics[index].isExpanded;
    setFormData(prev => ({ ...prev, topics: newTopics }));
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setAiLoading(true);
    try {
      // Simulate AI response - in real app this would call the API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock AI generated topics using localization
      const generatedTopics = [
        { id: Date.now(), title: t('teacher.aiTopic.intro'), description: t('teacher.aiTopic.introDesc'), order: 1, duration: t('teacher.aiTopic.duration1'), content: [], isExpanded: false },
        { id: Date.now() + 1, title: t('teacher.aiTopic.basic'), description: t('teacher.aiTopic.basicDesc'), order: 2, duration: t('teacher.aiTopic.duration2'), content: [], isExpanded: false },
        { id: Date.now() + 2, title: t('teacher.aiTopic.practice'), description: t('teacher.aiTopic.practiceDesc'), order: 3, duration: t('teacher.aiTopic.duration3'), content: [], isExpanded: false },
        { id: Date.now() + 3, title: t('teacher.aiTopic.finalTest'), description: t('teacher.aiTopic.finalTestDesc'), order: 4, duration: t('teacher.aiTopic.duration4'), content: [], isExpanded: false }
      ];
      
      setFormData(prev => ({
        ...prev,
        topics: [...prev.topics, ...generatedTopics]
      }));
      
      setShowAiModal(false);
      setAiPrompt('');
      setSuccess(t('teacher.aiSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(t('teacher.aiError'));
    } finally {
      setAiLoading(false);
    }
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        if (!formData.title.trim()) {
          setError(t('teacher.validation.title'));
          return false;
        }
        if (!formData.description.trim()) {
          setError(t('teacher.validation.description'));
          return false;
        }
        if (!formData.category) {
          setError(t('teacher.validation.category'));
          return false;
        }
        return true;
      case 2:
        if (formData.topics.length === 0) {
          setError(t('teacher.validation.topicCount'));
          return false;
        }
        for (const topic of formData.topics) {
          if (!topic.title.trim()) {
            setError(t('teacher.validation.allTopicTitles'));
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError('');
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !validateStep(2)) return;
    
    setLoading(true);
    setError('');
    
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('shortDescription', formData.shortDescription);
      submitData.append('level', formData.level);
      submitData.append('category', formData.category);
      submitData.append('language', formData.language);
      submitData.append('duration', formData.duration);
      submitData.append('isPublished', !isDraft);
      submitData.append('requirements', JSON.stringify(formData.requirements || []));
      submitData.append('whatYouLearn', JSON.stringify(formData.whatYouLearn || []));
      
      // Process topics and extract files
      const processedTopics = formData.topics.map((topic, topicIndex) => {
        const processedContent = (topic.content || []).map((block, blockIndex) => {
          const processedBlock = { ...block };
          
          // If block has a file, remove it from block (will be uploaded separately)
          if (block.file instanceof File) {
            // Add file to FormData with unique name
            const fileFieldName = `content_file_${topicIndex}_${blockIndex}_${block.type}`;
            submitData.append(fileFieldName, block.file);
            // Store reference to file field name instead of file object
            processedBlock._fileFieldName = fileFieldName;
            // Remove file object (cannot be serialized)
            delete processedBlock.file;
          }
          
          return processedBlock;
        });
        
        return {
          title: topic.title,
          description: topic.description,
          order: topic.order,
          duration: topic.duration,
          content: processedContent
        };
      });
      
      submitData.append('topics', JSON.stringify(processedTopics));
      
      if (formData.thumbnail) {
        submitData.append('thumbnail', formData.thumbnail);
      }
      
      // API call
      const response = await api.post('/courses', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setSuccess(isDraft ? t('teacher.draftSaved') : t('teacher.createdSuccess'));
        setTimeout(() => {
          navigate('/teacher/dashboard');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('teacher.createError'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('teacher.courseTitle')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent transition-colors"
          placeholder={t('teacher.placeholders.courseTitle')}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('teacher.placeholders.courseTitleHint')}
        </p>
      </div>

      {/* Short Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('teacher.shortDescription')}
        </label>
        <input
          type="text"
          name="shortDescription"
          value={formData.shortDescription}
          onChange={handleChange}
          maxLength={160}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent transition-colors"
          placeholder={t('teacher.placeholders.courseShortDesc')}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('teacher.symbolsUsed', { count: formData.shortDescription.length, max: 160 })}
        </p>
      </div>

      {/* Full Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('teacher.courseDescription')} <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent transition-colors resize-none"
          placeholder={t('teacher.placeholders.courseDescription')}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('teacher.category')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                formData.category === cat.value
                  ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-2 block">{cat.icon}</span>
              <span className={`text-sm font-medium ${
                formData.category === cat.value
                  ? 'text-french-blue-600 dark:text-french-blue-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Level & Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('courses.level')} <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {levels.map(level => (
              <label
                key={level.value}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.level === level.value
                    ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="level"
                  value={level.value}
                  checked={formData.level === level.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                  formData.level === level.value
                    ? 'border-french-blue-500 bg-french-blue-500'
                    : 'border-gray-400'
                }`}>
                  {formData.level === level.value && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{level.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{level.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('teacher.language')}
          </label>
          <div className="space-y-2">
            {languages.map(lang => (
              <label
                key={lang.value}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.language === lang.value
                    ? 'border-french-blue-500 bg-french-blue-50 dark:bg-french-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={lang.value}
                  checked={formData.language === lang.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-xl mr-3">{lang.flag}</span>
                <span className="font-medium text-gray-900 dark:text-white">{lang.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('teacher.duration')}
        </label>
        <div className="flex items-center gap-4">
          <input
            type="text"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className="w-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent transition-colors"
            placeholder={t('teacher.placeholders.duration')}
          />
          <span className="text-gray-600 dark:text-gray-400">{t('teacher.hours')}</span>
        </div>
      </div>

      {/* Requirements */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('teacher.requirements')}
        </h2>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              placeholder={t('teacher.placeholders.addRequirement')}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={addRequirement}
              className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('common.add')}
            </button>
          </div>

          {formData.requirements.length > 0 && (
            <ul className="space-y-2">
              {formData.requirements.map((req, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">{req}</span>
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* What You'll Learn */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('teacher.whatYouLearn')}
        </h2>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newWhatYouLearn}
              onChange={(e) => setNewWhatYouLearn(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWhatYouLearn())}
              placeholder={t('teacher.placeholders.addWhatYouLearn')}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={addWhatYouLearn}
              className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('common.add')}
            </button>
          </div>

          {formData.whatYouLearn.length > 0 && (
            <ul className="space-y-2">
              {formData.whatYouLearn.map((item, index) => (
                <li key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeWhatYouLearn(index)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Thumbnail */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('teacher.courseThumbnail')}
        </label>
        <div 
          className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
            thumbnailPreview 
              ? 'border-french-blue-300 dark:border-french-blue-700' 
              : 'border-gray-300 dark:border-gray-600 hover:border-french-blue-400 dark:hover:border-french-blue-600'
          }`}
        >
          <div className="space-y-2 text-center">
            {thumbnailPreview ? (
              <div className="relative inline-block">
                <img
                  src={thumbnailPreview}
                  alt="Preview"
                  className="max-h-48 rounded-lg shadow-md"
                />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                  <label className="relative cursor-pointer rounded-md font-medium text-french-blue-600 hover:text-french-blue-500">
                    <span>{t('teacher.selectFile')}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                    />
                  </label>
                  <p className="pl-1">{t('teacher.orDrag')}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('teacher.thumbnailHint')}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('teacher.addTopic')}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            {t('teacher.aiAssistant')}
          </button>
          <button
            type="button"
            onClick={addTopic}
            className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('teacher.addTopic')}
          </button>
        </div>
      </div>

      {formData.topics.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('teacherEditCourse.noTopics')}
          </p>
          <button
            type="button"
            onClick={addTopic}
            className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('teacher.addTopic')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.topics.map((topic, index) => (
            <div key={topic.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('teacherEditCourse.topicNumber', { number: index + 1 })}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveTopic(index, 'up')}
                    disabled={index === 0}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTopic(index, 'down')}
                    disabled={index === formData.topics.length - 1}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTopic(index)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.topicTitleLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={topic.title}
                    onChange={(e) => updateTopic(index, 'title', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent"
                    placeholder={t('teacher.lessonTitle')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.topicDescriptionLabel')}
                  </label>
                  <textarea
                    value={topic.description}
                    onChange={(e) => updateTopic(index, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent resize-none"
                    placeholder={t('teacher.lessonDescription')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.topicDurationLabel')}
                  </label>
                  <input
                    type="text"
                    value={topic.duration}
                    onChange={(e) => updateTopic(index, 'duration', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent"
                    placeholder={t('teacherEditCourse.topicDurationPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.topicContentLabel')}
                  </label>
                  <ContentEditor
                    content={topic.content || []}
                    onChange={(content) => updateTopic(index, 'content', content)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('teacher.createCourse')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('teacher.courseDescription')}
              </p>
            </div>
            <Link
              to="/teacher/dashboard"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </Link>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center ${step >= 1 ? 'text-french-blue-600 dark:text-french-blue-400' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? 'border-french-blue-600 bg-french-blue-50 dark:bg-french-blue-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {step > 1 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="font-semibold">1</span>
                )}
              </div>
              <span className="ml-2 font-medium">{t('teacher.courseTitle')}</span>
            </div>
            <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-french-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-french-blue-600 dark:text-french-blue-400' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'border-french-blue-600 bg-french-blue-50 dark:bg-french-blue-900/20' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {step > 2 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="font-semibold">2</span>
                )}
              </div>
              <span className="ml-2 font-medium">{t('teacher.addTopic')}</span>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            {t('common.prev')}
          </button>
          <div className="flex gap-4">
            {step === 2 && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                {loading ? t('common.loading') : t('teacher.saveDraft')}
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {t('common.next')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {loading ? t('common.loading') : t('teacher.publishCourse')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity" onClick={() => setShowAiModal(false)}></div>
            
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('teacher.aiAssistant')}
                </h3>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacher.generateContent')}
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-french-blue-500 focus:border-transparent resize-none"
                    placeholder={t('teacher.courseDescription')}
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAiModal(false);
                    setAiPrompt('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={generateWithAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {aiLoading ? t('common.loading') : t('teacher.generateContent')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCourse;
