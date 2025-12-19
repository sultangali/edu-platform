import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import ContentEditor from '../../components/teacher/ContentEditor';
import LoadingScreen from '../../components/common/LoadingScreen';

const EditCourse = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    longDescription: '',
    category: 'other',
    level: 'beginner',
    language: 'kaz',
    duration: '',
    thumbnail: null,
    requirements: [],
    whatYouLearn: [],
    isPublished: false,
  });
  const [topics, setTopics] = useState([]);
  const [newRequirement, setNewRequirement] = useState('');
  const [newWhatYouLearn, setNewWhatYouLearn] = useState('');

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await api.get(`/courses/${id}`);
      const courseData = response.data.data || response.data;
      
      setCourse(courseData);
      setFormData({
        title: courseData.title || '',
        shortDescription: courseData.shortDescription || '',
        longDescription: courseData.longDescription || '',
        category: courseData.category || 'other',
        level: courseData.level || 'beginner',
        language: courseData.language || courseData.courseLanguage || 'kaz',
        duration: courseData.duration || '',
        thumbnail: null,
        requirements: courseData.requirements || [],
        whatYouLearn: courseData.whatYouLearn || [],
        isPublished: courseData.isPublished || false,
      });
      // Transform topics to match ContentEditor format
      const transformedTopics = (courseData.topics || []).map((topic) => {
        // Transform lessons to content blocks format
        const content = (topic.lessons || []).map((lesson) => {
          const block = {
            id: lesson._id || Date.now(),
            type: lesson.type,
            title: lesson.title || '',
            order: lesson.order || 0,
            description: lesson.description || '',
            duration: lesson.duration || '',
          };

          if (lesson.type === 'image') {
            block.url = lesson.imageUrl || 
              (Array.isArray(lesson.content) && lesson.content[0]?.imageUrl) ||
              (lesson.content && typeof lesson.content === 'object' && lesson.content.imageUrl) ||
              '';
          } else if (lesson.type === 'video') {
            block.url = lesson.videoUrl || 
              (Array.isArray(lesson.content) && lesson.content[0]?.videoUrl) ||
              (lesson.content && typeof lesson.content === 'object' && lesson.content.videoUrl) ||
              '';
            block.iframe = (Array.isArray(lesson.content) && lesson.content[0]?.iframe) ||
              (lesson.content && typeof lesson.content === 'object' && lesson.content.iframe) ||
              '';
          } else if (lesson.type === 'audio') {
            block.url = lesson.audioUrl || 
              (Array.isArray(lesson.content) && lesson.content[0]?.audioUrl) ||
              (lesson.content && typeof lesson.content === 'object' && lesson.content.audioUrl) ||
              '';
          } else if (lesson.type === 'article') {
            block.content = lesson.content || '';
          } else {
            block.content = lesson.content;
          }

          return block;
        });

        return {
          ...topic,
          lessons: content,
          content: content,
        };
      });
      
      setTopics(transformedTopics);
    } catch (error) {
      console.error('Error fetching course:', error);
      alert(t('teacherEditCourse.fetchError'));
      navigate('/teacher/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        thumbnail: e.target.files[0],
      });
    }
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData({
        ...formData,
        requirements: [...formData.requirements, newRequirement.trim()],
      });
      setNewRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setFormData({
      ...formData,
      requirements: formData.requirements.filter((_, i) => i !== index),
    });
  };

  const addWhatYouLearn = () => {
    if (newWhatYouLearn.trim()) {
      setFormData({
        ...formData,
        whatYouLearn: [...formData.whatYouLearn, newWhatYouLearn.trim()],
      });
      setNewWhatYouLearn('');
    }
  };

  const removeWhatYouLearn = (index) => {
    setFormData({
      ...formData,
      whatYouLearn: formData.whatYouLearn.filter((_, i) => i !== index),
    });
  };

  const addTopic = () => {
    setTopics([
      ...topics,
      {
        title: '',
        description: '',
        duration: '',
        lessons: [],
      },
    ]);
  };

  const updateTopic = (index, field, value) => {
    const updatedTopics = [...topics];
    updatedTopics[index] = {
      ...updatedTopics[index],
      [field]: value,
    };
    setTopics(updatedTopics);
  };

  const removeTopic = (index) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const updateTopicLessons = (index, lessons) => {
    const updatedTopics = [...topics];
    updatedTopics[index] = {
      ...updatedTopics[index],
      lessons: lessons,
    };
    setTopics(updatedTopics);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert(t('teacherEditCourse.validation.titleRequired'));
      return;
    }

    if (topics.length === 0) {
      alert(t('teacherEditCourse.validation.minTopic'));
      return;
    }

    setSaving(true);
    try {
      const submitData = new FormData();
      
      // Add basic fields
      submitData.append('title', formData.title);
      submitData.append('shortDescription', formData.shortDescription);
      submitData.append('longDescription', formData.longDescription);
      submitData.append('category', formData.category);
      submitData.append('level', formData.level);
      submitData.append('language', formData.language);
      submitData.append('duration', formData.duration);
      submitData.append('isPublished', formData.isPublished);
      
      // Add arrays
      submitData.append('requirements', JSON.stringify(formData.requirements));
      submitData.append('whatYouLearn', JSON.stringify(formData.whatYouLearn));
      
      // Process topics and extract files
      const processedTopics = topics.map((topic, topicIndex) => {
        const processedContent = (topic.lessons || topic.content || []).map((block, blockIndex) => {
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
          ...topic,
          content: processedContent,
          lessons: processedContent  // Ensure both fields are present
        };
      });
      
      submitData.append('topics', JSON.stringify(processedTopics));
      
      // Add thumbnail if changed
      if (formData.thumbnail) {
        submitData.append('thumbnail', formData.thumbnail);
      }

      await api.put(`/courses/${id}`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert(t('teacherEditCourse.successUpdate'));
      navigate('/teacher/dashboard');
    } catch (error) {
      console.error('Error updating course:', error);
      alert(error.response?.data?.message || t('teacherEditCourse.updateError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!course) return <div className="text-center py-12">{t('teacherEditCourse.courseNotFound')}</div>;

  const categories = [
    { value: 'programming', label: t('teacherEditCourse.category.programming') },
    { value: 'web', label: t('teacherEditCourse.category.web') },
    { value: 'mobile', label: t('teacherEditCourse.category.mobile') },
    { value: 'data', label: t('teacherEditCourse.category.data') },
    { value: 'design', label: t('teacherEditCourse.category.design') },
    { value: 'business', label: t('teacherEditCourse.category.business') },
    { value: 'marketing', label: t('teacherEditCourse.category.marketing') },
    { value: 'languages', label: t('teacherEditCourse.category.languages') },
    { value: 'science', label: t('teacherEditCourse.category.science') },
    { value: 'other', label: t('teacherEditCourse.category.other') },
  ];

  const levels = [
    { value: 'beginner', label: t('courses.beginner') },
    { value: 'intermediate', label: t('courses.intermediate') },
    { value: 'advanced', label: t('courses.advanced') },
  ];

  const languages = [
    { value: 'kaz', label: t('teacherEditCourse.languages.kaz') },
    { value: 'rus', label: t('teacherEditCourse.languages.rus') },
    { value: 'eng', label: t('teacherEditCourse.languages.eng') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('teacherEditCourse.pageTitle')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('teacherEditCourse.pageDescription')}
            </p>
          </div>
          <Link
            to="/teacher/dashboard"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            {t('teacherEditCourse.cancel')}
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {t('teacherEditCourse.basicInfo')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('teacherEditCourse.titleLabel')}
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('teacherEditCourse.shortDescriptionLabel')}
                </label>
                <input
                  type="text"
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('teacherEditCourse.longDescriptionLabel')}
                </label>
                <textarea
                  name="longDescription"
                  value={formData.longDescription}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.categoryLabel')}
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.levelLabel')}
                  </label>
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {levels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.languageLabel')}
                  </label>
                  <select
                    name="language"
                    value={formData.language}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.durationLabel')}
                  </label>
                  <input
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('teacherEditCourse.thumbnailLabel')}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {course.thumbnail && !formData.thumbnail && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {t('teacherEditCourse.currentImage')}: {course.thumbnail}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-french-blue-600 focus:ring-french-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('teacherEditCourse.isPublished')}
                </label>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {t('teacherEditCourse.requirements')}
            </h2>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  placeholder={t('teacherEditCourse.requirementPlaceholder')}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {t('teacherEditCourse.add')}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {t('teacherEditCourse.whatYouLearn')}
            </h2>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWhatYouLearn}
                  onChange={(e) => setNewWhatYouLearn(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWhatYouLearn())}
                  placeholder={t('teacherEditCourse.whatYouLearnPlaceholder')}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addWhatYouLearn}
                  className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {t('teacherEditCourse.add')}
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

          {/* Topics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('teacherEditCourse.topics')}
              </h2>
              <button
                type="button"
                onClick={addTopic}
                className="px-4 py-2 bg-french-blue-600 hover:bg-french-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('teacherEditCourse.addTopic')}
              </button>
            </div>

            {topics.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                {t('teacherEditCourse.noTopics')}
              </p>
            ) : (
              <div className="space-y-6">
                {topics.map((topic, index) => (
                  <div key={index} className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('teacherEditCourse.topicNumber', { number: index + 1 })}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeTopic(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('teacherEditCourse.topicTitleLabel')}
                        </label>
                        <input
                          type="text"
                          value={topic.title}
                          onChange={(e) => updateTopic(index, 'title', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
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
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                          placeholder={t('teacherEditCourse.topicDurationPlaceholder')}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-french-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('teacherEditCourse.topicContentLabel')}
                        </label>
                        <ContentEditor
                          content={topic.lessons || []}
                          onChange={(lessons) => updateTopicLessons(index, lessons)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              to="/teacher/dashboard"
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-colors"
            >
              {t('teacherEditCourse.cancel')}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-french-blue-600 hover:bg-french-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              {saving ? t('teacherEditCourse.saving') : t('teacherEditCourse.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCourse;
