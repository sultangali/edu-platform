import Course from '../models/Course.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import { asyncHandler, AppError } from '../middleware/error.js';
import { sendCourseEnrollmentEmail } from '../services/emailService.js';

// @desc    Get all courses (with filters)
// @route   GET /api/courses
// @access  Public
export const getCourses = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 12,
    category,
    level,
    courseLanguage,
    search,
    teacher,
    featured,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = { isPublished: true };

  if (category) query.category = category;
  if (level) query.level = level;
  if (courseLanguage) query.courseLanguage = courseLanguage;
  if (teacher) query.instructor = teacher;
  if (featured === 'true') query.isFeatured = true;

  if (search) {
    // Use regex search instead of text index (MongoDB doesn't support kaz language)
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { shortDescription: { $regex: search, $options: 'i' } },
    ];
  }

  // Execute query
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('instructor', 'firstName lastName avatar')
      .select('-topics.lessons.content -topics.tests -topics.assignments')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Course.countDocuments(query),
  ]);

  // Map courseLanguage to language for frontend compatibility
  const coursesWithLanguage = courses.map(course => {
    const courseObj = course.toObject();
    if (courseObj.courseLanguage) {
      courseObj.language = courseObj.courseLanguage;
    }
    return courseObj;
  });

  res.status(200).json({
    success: true,
    data: coursesWithLanguage,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
export const getCourse = asyncHandler(async (req, res, next) => {
  // Check if param is ObjectId or slug
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
  const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id };
  
  const course = await Course.findOne(query)
    .populate('instructor', 'firstName lastName avatar bio');

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // If not published and user is not the teacher/admin
  if (!course.isPublished) {
    if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== course.instructor._id.toString())) {
      return next(new AppError('Course not found', 404));
    }
  }

  // Get enrollment status if user is logged in
  let isEnrolled = false;
  let progress = null;

  if (req.user) {
    // Check enrollment by querying user's enrolledCourses directly
    const user = await User.findById(req.user._id);
    if (user && user.enrolledCourses && user.enrolledCourses.length > 0) {
      const userEnrollment = user.enrolledCourses.find(
        (e) => e.course && e.course.toString() === course._id.toString()
      );
      isEnrolled = !!userEnrollment;
    }

    if (isEnrolled) {
      progress = await Progress.findOne({
        student: req.user._id,
        course: course._id,
      });
    }
  }

  // Filter out unpublished lessons for non-teachers
  let courseData = course.toObject();
  if (!req.user || (req.user.role !== 'admin' && req.user._id.toString() !== course.instructor._id.toString())) {
    // Filter topics if needed
    courseData.topics = courseData.topics || [];
  }

  // Ensure content arrays include URL data from direct fields
  if (courseData.topics) {
    courseData.topics = courseData.topics.map((topic) => {
      if (topic.lessons) {
        topic.lessons = topic.lessons.map((lesson) => {
          // If content is array and missing URL data, try to get from direct fields
          if (Array.isArray(lesson.content) && lesson.content.length > 0) {
            const contentType = lesson.content[0];
            if (contentType && contentType.type) {
              // For video: add videoUrl/iframe if missing
              if (contentType.type === 'video') {
                if (lesson.videoUrl && !contentType.videoUrl) {
                  console.log(`[getCourse] Adding videoUrl to content from direct field:`, lesson.videoUrl);
                  contentType.videoUrl = lesson.videoUrl;
                }
              }
              // For audio: add audioUrl if missing
              if (contentType.type === 'audio') {
                if (lesson.audioUrl && !contentType.audioUrl) {
                  console.log(`[getCourse] Adding audioUrl to content from direct field:`, lesson.audioUrl);
                  contentType.audioUrl = lesson.audioUrl;
                }
              }
              // For image: add imageUrl if missing
              if (contentType.type === 'image') {
                if (lesson.imageUrl && !contentType.imageUrl) {
                  console.log(`[getCourse] Adding imageUrl to content from direct field:`, lesson.imageUrl);
                  contentType.imageUrl = lesson.imageUrl;
                }
              }
            }
          } else if (!lesson.content && (lesson.videoUrl || lesson.audioUrl || lesson.imageUrl)) {
            // If content is missing but direct URL fields exist, create content array
            console.log(`[getCourse] Creating content array from direct fields for lesson ${lesson._id}:`, {
              type: lesson.type,
              videoUrl: lesson.videoUrl,
              audioUrl: lesson.audioUrl,
              imageUrl: lesson.imageUrl
            });
            
            if (lesson.type === 'video' && lesson.videoUrl) {
              lesson.content = [{ type: 'video', videoUrl: lesson.videoUrl }];
            } else if (lesson.type === 'audio' && lesson.audioUrl) {
              lesson.content = [{ type: 'audio', audioUrl: lesson.audioUrl }];
            } else if (lesson.type === 'image' && lesson.imageUrl) {
              lesson.content = [{ type: 'image', imageUrl: lesson.imageUrl }];
            }
          }
          
          // Log final content state for debugging
          if (lesson.type === 'video' || lesson.type === 'audio' || lesson.type === 'image') {
            console.log(`[getCourse] Final lesson state for ${lesson.type} (${lesson._id}):`, {
              hasDirectUrl: !!(lesson.videoUrl || lesson.audioUrl || lesson.imageUrl),
              hasContentArray: Array.isArray(lesson.content),
              contentHasUrl: Array.isArray(lesson.content) && lesson.content[0] && 
                !!(lesson.content[0].videoUrl || lesson.content[0].audioUrl || lesson.content[0].imageUrl)
            });
          }
          
          return lesson;
        });
      }
      return topic;
    });
  }

  // Hide content blocks for non-enrolled users (show only structure)
  if (!isEnrolled && req.user?.role !== 'admin' && req.user?._id?.toString() !== course.instructor._id.toString()) {
    courseData.topics = courseData.topics.map((topic) => ({
      ...topic,
      lessons: topic.lessons.map((lesson) => {
        if (!lesson.isFree) {
          return { ...lesson, content: null };
        }
        return lesson;
      }),
    }));
  }

  // Map courseLanguage to language for frontend compatibility
  if (courseData.courseLanguage) {
    courseData.language = courseData.courseLanguage;
  }

  res.status(200).json({
    success: true,
    data: courseData,
    isEnrolled,
    progress: progress?.toObject() || null,
  });
});

// @desc    Create course
// @route   POST /api/courses
// @access  Private (Teacher/Admin)
export const createCourse = asyncHandler(async (req, res, next) => {
  // Validate title
  if (!req.body.title || !req.body.title.trim()) {
    return next(new AppError('Course title is required', 400));
  }

  // Handle FormData
  const courseData = {
    title: req.body.title.trim(),
    description: req.body.description || req.body.shortDescription || '',
    shortDescription: req.body.shortDescription || req.body.description || '',
    longDescription: req.body.longDescription || req.body.description || '',
    instructor: req.user._id,
    level: req.body.level || 'beginner',
    courseLanguage: req.body.language || req.body.courseLanguage || 'kaz',
    duration: req.body.duration || '',
    isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
    category: req.body.category || 'other',
  };

  // Handle files - extract thumbnail and content files
  const files = req.files || (req.file ? [req.file] : []);
  const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
  const contentFiles = files.filter(f => f.fieldname && f.fieldname.startsWith('content_file_'));
  
  // Create map of file field names to uploaded file paths
  const fileMap = new Map();
  contentFiles.forEach(file => {
    const filePath = file.path.replace(/\\/g, '/');
    const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    fileMap.set(file.fieldname, normalizedPath);
  });
  
  // Handle thumbnail if uploaded
  if (thumbnailFile) {
    let thumbnailPath = thumbnailFile.path.replace(/\\/g, '/');
    if (!thumbnailPath.startsWith('/')) {
      thumbnailPath = '/' + thumbnailPath;
    }
    courseData.thumbnail = thumbnailPath;
  }

  // Parse JSON fields - requirements and whatYouLearn
  if (req.body.requirements) {
    try {
      courseData.requirements = typeof req.body.requirements === 'string' 
        ? JSON.parse(req.body.requirements) 
        : req.body.requirements;
    } catch (err) {
      console.error('Error parsing requirements:', err);
    }
  }

  if (req.body.whatYouLearn) {
    try {
      courseData.whatYouLearn = typeof req.body.whatYouLearn === 'string' 
        ? JSON.parse(req.body.whatYouLearn) 
        : req.body.whatYouLearn;
    } catch (err) {
      console.error('Error parsing whatYouLearn:', err);
    }
  }

  // Handle topics if provided (comes as JSON string from FormData)
  if (req.body.topics) {
    try {
      const topics = typeof req.body.topics === 'string' 
        ? JSON.parse(req.body.topics) 
        : req.body.topics;
      
      // fileMap already created above
      
      // Map topics to match schema
      courseData.topics = topics.map((topic, index) => {
        // Convert content blocks to lessons format
        const lessons = (topic.content || []).map((block, blockIndex) => {
          // Map content block type to lesson type
          let lessonType = block.type;
          if (block.type === 'text') {
            lessonType = 'article';
          }
          
          // Ensure title is not empty - use a default if missing
          let lessonTitle = block.title || '';
          if (!lessonTitle) {
            // Generate default title based on type
            const typeNames = {
              'article': 'Текст',
              'video': 'Видео',
              'audio': 'Аудио',
              'image': 'Сурет',
              'test': 'Тест',
              'assignment': 'Тапсырма'
            };
            lessonTitle = typeNames[lessonType] || 'Контент';
          }
          
          const lesson = {
            type: lessonType,
            title: lessonTitle,
            order: blockIndex + 1,
          };
          
          // Handle content based on type
          if (block.type === 'text' || lessonType === 'article') {
            // For text/article, save content directly
            if (block.text) {
              lesson.content = block.text;
            } else if (block.content && typeof block.content === 'string') {
              lesson.content = block.content;
            } else if (block.content) {
              lesson.content = block.content;
            }
          } else if (block.type === 'video') {
            // Check if there's an uploaded file for this block
            const fileFieldName = block._fileFieldName;
            let videoUrl = '';
            
            if (fileFieldName && fileMap.has(fileFieldName)) {
              // Use uploaded file path
              videoUrl = fileMap.get(fileFieldName);
            } else {
              // Extract video data - block comes from ContentEditor with url/iframe directly
              videoUrl = block.url || block.videoUrl || (block.content && (block.content.url || block.content.videoUrl)) || '';
            }
            
            const iframe = block.iframe || (block.content && block.content.iframe) || '';
            
            // Save to direct field for easy access
            if (videoUrl) {
              lesson.videoUrl = videoUrl;
            }
            
            // Also save in content array with all data
            const videoContent = {
              type: 'video',
            };
            if (videoUrl) videoContent.videoUrl = videoUrl;
            if (iframe) videoContent.iframe = iframe;
            
            lesson.content = [videoContent];
          } else if (block.type === 'audio') {
            // Check if there's an uploaded file for this block
            const fileFieldName = block._fileFieldName;
            let audioUrl = '';
            
            if (fileFieldName && fileMap.has(fileFieldName)) {
              // Use uploaded file path
              audioUrl = fileMap.get(fileFieldName);
            } else {
              // Extract audio data - block comes from ContentEditor with url directly
              audioUrl = block.url || block.audioUrl || (block.content && (block.content.url || block.content.audioUrl)) || '';
            }
            
            // Save to direct field for easy access
            if (audioUrl) {
              lesson.audioUrl = audioUrl;
            }
            
            // Also save in content array with all data
            const audioContent = {
              type: 'audio',
            };
            if (audioUrl) audioContent.audioUrl = audioUrl;
            
            lesson.content = [audioContent];
          } else if (block.type === 'image') {
            // Check if there's an uploaded file for this block
            const fileFieldName = block._fileFieldName;
            let imageUrl = '';
            
            if (fileFieldName && fileMap.has(fileFieldName)) {
              // Use uploaded file path
              imageUrl = fileMap.get(fileFieldName);
            } else {
              // Extract image data - block comes from ContentEditor with url directly
              imageUrl = block.url || block.imageUrl || (block.content && (block.content.url || block.content.imageUrl)) || '';
            }
            
            // Save to direct field for easy access
            if (imageUrl) {
              lesson.imageUrl = imageUrl;
            }
            
            // Also save in content array with all data
            const imageContent = {
              type: 'image',
            };
            if (imageUrl) imageContent.imageUrl = imageUrl;
            
            lesson.content = [imageContent];
          } else {
            // For other types (test, assignment), save block content or entire block
            lesson.content = block.content || block;
          }
          if (block.duration) {
            lesson.duration = block.duration;
          }
          
          return lesson;
        });

        return {
          title: topic.title || '',
          description: topic.description || '',
          order: topic.order || index + 1,
          lessons: lessons,
          duration: topic.duration || '',
        };
      });
    } catch (err) {
      console.error('Error parsing topics:', err);
    }
  }

  const course = await Course.create(courseData);

  // Add to teacher's created courses
  await User.findByIdAndUpdate(req.user._id, {
    $push: { createdCourses: course._id },
  });

  // Map courseLanguage to language for frontend compatibility
  const courseObj = course.toObject();
  if (courseObj.courseLanguage) {
    courseObj.language = courseObj.courseLanguage;
  }

  res.status(201).json({
    success: true,
    data: courseObj,
  });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Teacher/Admin)
export const updateCourse = asyncHandler(async (req, res, next) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to update this course', 403));
  }

  // Prevent changing instructor
  delete req.body.instructor;
  delete req.body.teacher;

  // Handle FormData
  const courseData = {
    title: req.body.title,
    shortDescription: req.body.shortDescription,
    longDescription: req.body.longDescription,
    category: req.body.category,
    level: req.body.level,
    courseLanguage: req.body.language || req.body.courseLanguage,
    duration: req.body.duration,
    isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
  };

  // Handle files - extract thumbnail and content files
  const files = req.files || (req.file ? [req.file] : []);
  const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
  const contentFiles = files.filter(f => f.fieldname && f.fieldname.startsWith('content_file_'));
  
  // Create map of file field names to uploaded file paths
  const fileMap = new Map();
  contentFiles.forEach(file => {
    const filePath = file.path.replace(/\\/g, '/');
    const normalizedPath = filePath.startsWith('/') ? filePath : '/' + filePath;
    fileMap.set(file.fieldname, normalizedPath);
  });
  
  // Handle thumbnail upload
  if (thumbnailFile) {
    let thumbnailPath = thumbnailFile.path.replace(/\\/g, '/');
    if (!thumbnailPath.startsWith('/')) {
      thumbnailPath = '/' + thumbnailPath;
    }
    courseData.thumbnail = thumbnailPath;
  }

  // Parse JSON fields
  if (req.body.requirements) {
    try {
      courseData.requirements = JSON.parse(req.body.requirements);
    } catch (err) {
      console.error('Error parsing requirements:', err);
    }
  }

  if (req.body.whatYouLearn) {
    try {
      courseData.whatYouLearn = JSON.parse(req.body.whatYouLearn);
    } catch (err) {
      console.error('Error parsing whatYouLearn:', err);
    }
  }

  // Parse topics
  if (req.body.topics) {
    try {
      const parsedTopics = JSON.parse(req.body.topics);
      
      // Get existing course data to preserve URLs if they exist
      const existingCourse = await Course.findById(req.params.id);
      const existingLessonsMap = new Map();
      if (existingCourse && existingCourse.topics) {
        existingCourse.topics.forEach((topic) => {
          if (topic.lessons) {
            topic.lessons.forEach((existingLesson) => {
              // Use lesson._id or a combination of type+order as key
              const key = existingLesson._id?.toString() || `${existingLesson.type}-${existingLesson.order}`;
              existingLessonsMap.set(key, existingLesson);
            });
          }
        });
      }
      
      // fileMap already created above for updateCourse
      courseData.topics = parsedTopics.map((topic, index) => {
        const lessons = (topic.lessons || []).map((block, blockIndex) => {
          // Map content block type to lesson type - convert 'text' to 'article'
          let lessonType = block.type || 'article';
          if (lessonType === 'text') {
            lessonType = 'article';
          }
          
          const lesson = {
            type: lessonType,
            order: block.order || blockIndex + 1,
          };
          
          // Try to find existing lesson data to preserve URLs
          const existingLessonKey = block._id?.toString() || `${lessonType}-${lesson.order}`;
          const existingLesson = existingLessonsMap.get(existingLessonKey);

          // Set title
          if (block.title) {
            lesson.title = block.title;
          } else {
            lesson.title = `Контент ${blockIndex + 1}`;
          }

          // Handle content based on type
          // Note: block.type might be 'text', but lesson.type is now 'article'
          if ((block.type === 'text' || lessonType === 'article') && (block.text || block.content)) {
            // Handle markdown/text content
            if (block.content && typeof block.content === 'string') {
              lesson.content = block.content;
            } else if (block.text) {
              lesson.content = block.text;
            } else if (block.content) {
              lesson.content = block.content;
            }
          } else if (block.type === 'video') {
            // Extract video data - check block.url first (comes from ContentEditor)
            const videoUrl = block.url || block.videoUrl || 
              (block.content && (block.content.url || block.content.videoUrl)) || 
              (Array.isArray(block.content) && block.content[0]?.videoUrl) ||
              existingLesson?.videoUrl || '';
            const iframe = block.iframe || 
              (block.content && block.content.iframe) || 
              (Array.isArray(block.content) && block.content[0]?.iframe) ||
              (Array.isArray(existingLesson?.content) && existingLesson?.content[0]?.iframe) ||
              '';
            
            console.log(`[updateCourse] Video block data:`, { 
              blockUrl: block.url, 
              blockVideoUrl: block.videoUrl, 
              blockIframe: block.iframe ? 'exists' : 'none',
              existingUrl: existingLesson?.videoUrl || 'none',
              extractedUrl: videoUrl,
              extractedIframe: iframe ? 'exists' : 'none'
            });
            
            // Save to direct field for easy access
            if (videoUrl) {
              lesson.videoUrl = videoUrl;
            }
            
            // Also save in content array with all data
            const videoContent = {
              type: 'video',
            };
            if (videoUrl) videoContent.videoUrl = videoUrl;
            if (iframe) videoContent.iframe = iframe;
            
            lesson.content = [videoContent];
          } else if (block.type === 'audio') {
            // Extract audio data - check block.url first (comes from ContentEditor)
            const audioUrl = block.url || block.audioUrl || 
              (block.content && (block.content.url || block.content.audioUrl)) || 
              (Array.isArray(block.content) && block.content[0]?.audioUrl) ||
              existingLesson?.audioUrl || '';
            
            console.log(`[updateCourse] Audio block data:`, { 
              blockUrl: block.url, 
              blockAudioUrl: block.audioUrl,
              existingUrl: existingLesson?.audioUrl || 'none',
              extractedUrl: audioUrl
            });
            
            // Save to direct field for easy access
            if (audioUrl) {
              lesson.audioUrl = audioUrl;
            }
            
            // Also save in content array with all data
            const audioContent = {
              type: 'audio',
            };
            if (audioUrl) audioContent.audioUrl = audioUrl;
            
            lesson.content = [audioContent];
          } else if (block.type === 'image') {
            // Extract image data - check block.url first (comes from ContentEditor)
            const imageUrl = block.url || block.imageUrl || 
              (block.content && (block.content.url || block.content.imageUrl)) || 
              (Array.isArray(block.content) && block.content[0]?.imageUrl) ||
              existingLesson?.imageUrl || '';
            
            console.log(`[updateCourse] Image block data:`, { 
              blockUrl: block.url, 
              blockImageUrl: block.imageUrl,
              existingUrl: existingLesson?.imageUrl || 'none',
              extractedUrl: imageUrl
            });
            
            // Save to direct field for easy access
            if (imageUrl) {
              lesson.imageUrl = imageUrl;
            }
            
            // Also save in content array with all data
            const imageContent = {
              type: 'image',
            };
            if (imageUrl) imageContent.imageUrl = imageUrl;
            
            lesson.content = [imageContent];
          } else if (block.content) {
            lesson.content = block.content;
          }

          if (block.duration) {
            lesson.duration = block.duration;
          }
          
          return lesson;
        });

        return {
          title: topic.title || '',
          description: topic.description || '',
          order: topic.order || index + 1,
          lessons: lessons,
          duration: topic.duration || '',
        };
      });
    } catch (err) {
      console.error('Error parsing topics:', err);
    }
  }

  course = await Course.findByIdAndUpdate(req.params.id, courseData, {
    new: true,
    runValidators: true,
  });

  // Map courseLanguage to language for frontend compatibility
  const courseObj = course.toObject();
  if (courseObj.courseLanguage) {
    courseObj.language = courseObj.courseLanguage;
  }

  res.status(200).json({
    success: true,
    data: courseObj,
  });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Teacher/Admin)
export const deleteCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to delete this course', 403));
  }

  await course.deleteOne();

  // Remove from teacher's created courses
  await User.findByIdAndUpdate(course.instructor, {
    $pull: { createdCourses: course._id },
  });

  res.status(200).json({
    success: true,
    message: 'Course deleted',
  });
});

// @desc    Add lesson to course
// @route   POST /api/courses/:id/lessons
// @access  Private (Teacher/Admin)
export const addLesson = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  // Set order
  const maxOrder = course.lessons.reduce((max, l) => Math.max(max, l.order || 0), 0);
  req.body.order = req.body.order || maxOrder + 1;

  course.lessons.push(req.body);
  await course.save();

  res.status(201).json({
    success: true,
    data: course.lessons[course.lessons.length - 1],
  });
});

// @desc    Update lesson
// @route   PUT /api/courses/:id/lessons/:lessonId
// @access  Private (Teacher/Admin)
export const updateLesson = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  const lesson = course.lessons.id(req.params.lessonId);
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  Object.assign(lesson, req.body);
  await course.save();

  res.status(200).json({
    success: true,
    data: lesson,
  });
});

// @desc    Delete lesson
// @route   DELETE /api/courses/:id/lessons/:lessonId
// @access  Private (Teacher/Admin)
export const deleteLesson = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  course.lessons = course.lessons.filter(
    (l) => l._id.toString() !== req.params.lessonId
  );
  await course.save();

  res.status(200).json({
    success: true,
    message: 'Lesson deleted',
  });
});

// @desc    Reorder lessons
// @route   PUT /api/courses/:id/lessons/reorder
// @access  Private (Teacher/Admin)
export const reorderLessons = asyncHandler(async (req, res, next) => {
  const { lessonOrder } = req.body; // Array of { lessonId, order }

  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  // Update orders
  lessonOrder.forEach(({ lessonId, order }) => {
    const lesson = course.lessons.id(lessonId);
    if (lesson) {
      lesson.order = order;
    }
  });

  await course.save();

  res.status(200).json({
    success: true,
    data: course.lessons,
  });
});

// @desc    Add test to course
// @route   POST /api/courses/:id/tests
// @access  Private (Teacher/Admin)
export const addTest = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  course.tests.push(req.body);
  await course.save();

  res.status(201).json({
    success: true,
    data: course.tests[course.tests.length - 1],
  });
});

// @desc    Update test
// @route   PUT /api/courses/:id/tests/:testId
// @access  Private (Teacher/Admin)
export const updateTest = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  const test = course.tests.id(req.params.testId);
  if (!test) {
    return next(new AppError('Test not found', 404));
  }

  Object.assign(test, req.body);
  await course.save();

  res.status(200).json({
    success: true,
    data: test,
  });
});

// @desc    Delete test
// @route   DELETE /api/courses/:id/tests/:testId
// @access  Private (Teacher/Admin)
export const deleteTest = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  course.tests = course.tests.filter(
    (t) => t._id.toString() !== req.params.testId
  );
  await course.save();

  res.status(200).json({
    success: true,
    message: 'Test deleted',
  });
});

// @desc    Add assignment to course
// @route   POST /api/courses/:id/assignments
// @access  Private (Teacher/Admin)
export const addAssignment = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  course.assignments.push(req.body);
  await course.save();

  res.status(201).json({
    success: true,
    data: course.assignments[course.assignments.length - 1],
  });
});

// @desc    Update assignment
// @route   PUT /api/courses/:id/assignments/:assignmentId
// @access  Private (Teacher/Admin)
export const updateAssignment = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  const assignment = course.assignments.id(req.params.assignmentId);
  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  Object.assign(assignment, req.body);
  await course.save();

  res.status(200).json({
    success: true,
    data: assignment,
  });
});

// @desc    Delete assignment
// @route   DELETE /api/courses/:id/assignments/:assignmentId
// @access  Private (Teacher/Admin)
export const deleteAssignment = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  course.assignments = course.assignments.filter(
    (a) => a._id.toString() !== req.params.assignmentId
  );
  await course.save();

  res.status(200).json({
    success: true,
    message: 'Assignment deleted',
  });
});

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private
export const enrollCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  if (!course.isPublished) {
    return next(new AppError('Course is not available', 400));
  }

  // Check if already enrolled
  const user = await User.findById(req.user._id);
  const alreadyEnrolled = user.enrolledCourses && user.enrolledCourses.some(
    (e) => e.course && e.course.toString() === course._id.toString()
  );

  if (alreadyEnrolled) {
    return next(new AppError('Already enrolled in this course', 400));
  }

  // Add enrollment
  if (!user.enrolledCourses) {
    user.enrolledCourses = [];
  }
  user.enrolledCourses.push({
    course: course._id,
    enrolledAt: new Date(),
    progress: 0,
    completedLessons: [],
  });
  await user.save();

  // Update course students list
  if (!course.students) {
    course.students = [];
  }
  if (!course.students.some(s => s.toString() === req.user._id.toString())) {
    course.students.push(req.user._id);
    await course.save();
  }

  // Create progress tracker
  await Progress.create({
    student: req.user._id,
    course: course._id,
    progressPercentage: 0,
  });

  // Send enrollment email
  try {
    const language = req.language || 'kaz';
    await sendCourseEnrollmentEmail(user, course, language);
  } catch (error) {
    console.error('Failed to send enrollment email:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Enrolled successfully',
  });
});

// @desc    Get enrolled courses
// @route   GET /api/courses/enrolled
// @access  Private
export const getEnrolledCourses = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate({
    path: 'enrolledCourses.course',
    select: 'title slug thumbnail category level instructor duration courseLanguage topics description',
    populate: {
      path: 'instructor',
      select: 'firstName lastName avatar',
    },
  });

  if (!user || !user.enrolledCourses) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  const enrolledCourses = user.enrolledCourses.map((enrollment) => {
    if (!enrollment.course) return null;
    
    const courseObj = enrollment.course.toObject();
    const totalLessons = courseObj.topics?.reduce((sum, topic) => {
      return sum + (topic.lessons?.length || 0);
    }, 0) || 0;
    
    return {
      ...courseObj,
      // Map courseLanguage to language for frontend compatibility
      language: courseObj.courseLanguage || courseObj.language,
      // Add enrollment info
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress || 0,
      completedAt: enrollment.completedAt,
      certificateIssued: enrollment.certificateIssued || false,
      // Add calculated fields
      topicsCount: courseObj.topics?.length || 0,
      lessonsCount: totalLessons,
      isEnrolled: true,
    };
  }).filter((c) => c !== null); // Filter out null courses

  res.status(200).json({
    success: true,
    data: enrolledCourses,
  });
});

// @desc    Unenroll from course
// @route   DELETE /api/courses/:id/enroll
// @access  Private
export const unenrollCourse = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Remove enrollment from user
  const user = await User.findById(req.user._id);
  if (user.enrolledCourses && user.enrolledCourses.length > 0) {
    const initialLength = user.enrolledCourses.length;
    user.enrolledCourses = user.enrolledCourses.filter(
      (e) => e.course && e.course.toString() !== course._id.toString()
    );
    
    // Only save if something was removed
    if (user.enrolledCourses.length < initialLength) {
      await user.save();
    }
  }

  // Remove user from course students list
  if (course.students && course.students.length > 0) {
    course.students = course.students.filter(
      (s) => s.toString() !== req.user._id.toString()
    );
    await course.save();
  }

  // Delete progress tracker
  await Progress.deleteOne({
    student: req.user._id,
    course: course._id,
  }).catch(err => {
    // Ignore if progress doesn't exist
    console.log('Progress not found for deletion:', err.message);
  });

  res.status(200).json({
    success: true,
    message: 'Unenrolled successfully',
  });
});

// @desc    Get teacher's courses
// @route   GET /api/courses/teaching
// @access  Private (Teacher/Admin)
export const getTeachingCourses = asyncHandler(async (req, res, next) => {
  const courses = await Course.find({ instructor: req.user._id })
    .select('-topics.lessons.content')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: courses,
  });
});

// @desc    Upload course media
// @route   POST /api/courses/:id/upload/:type
// @access  Private (Teacher/Admin)
export const uploadMedia = asyncHandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Check ownership
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  if (!req.file && !req.files) {
    return next(new AppError('Please upload a file', 400));
  }

  const type = req.params.type;
  let fileUrl;

  if (type === 'thumbnail') {
    fileUrl = `/uploads/courses/thumbnails/${req.files?.thumbnail?.[0]?.filename || req.file?.filename}`;
    course.thumbnail = fileUrl;
  } else if (type === 'cover') {
    fileUrl = `/uploads/courses/thumbnails/${req.files?.coverImage?.[0]?.filename || req.file?.filename}`;
    course.coverImage = fileUrl;
  } else if (type === 'video') {
    fileUrl = `/uploads/courses/videos/${req.file.filename}`;
  } else if (type === 'audio') {
    fileUrl = `/uploads/courses/audio/${req.file.filename}`;
  } else if (type === 'file') {
    fileUrl = `/uploads/courses/files/${req.file.filename}`;
  }

  if (type === 'thumbnail' || type === 'cover') {
    await course.save();
  }

  res.status(200).json({
    success: true,
    url: fileUrl,
    file: req.file || req.files,
  });
});

// @desc    Get course categories
// @route   GET /api/courses/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Course.distinct('category', { isPublished: true });

  res.status(200).json({
    success: true,
    data: categories,
  });
});

