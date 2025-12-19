import Progress from '../models/Progress.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/error.js';

// @desc    Get user progress for a course
// @route   GET /api/progress/:courseId
// @access  Private
export const getCourseProgress = asyncHandler(async (req, res, next) => {
  const progress = await Progress.findOne({
    student: req.user._id,
    course: req.params.courseId,
  }).populate('course', 'title topics');

  if (!progress) {
    return next(new AppError('Progress not found', 404));
  }

  res.status(200).json({
    success: true,
    data: progress,
  });
});

// @desc    Mark lesson as completed
// @route   POST /api/progress/:courseId/lessons/:lessonId/complete
// @access  Private
export const markLessonComplete = asyncHandler(async (req, res, next) => {
  const { courseId, lessonId } = req.params;

  // Find or create progress
  let progress = await Progress.findOne({
    student: req.user._id,
    course: courseId,
  });

  if (!progress) {
    progress = await Progress.create({
      student: req.user._id,
      course: courseId,
      completedLessons: [],
      progressPercentage: 0,
    });
  }

  // Check if lesson already completed
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);

    // Calculate progress percentage
    const course = await Course.findById(courseId);
    if (course) {
      const totalLessons = course.topics.reduce((sum, topic) => {
        return sum + (topic.lessons ? topic.lessons.length : 0);
      }, 0);

      progress.progressPercentage = totalLessons > 0
        ? Math.min(100, Math.round((progress.completedLessons.length / totalLessons) * 100))
        : 0;

      // Check if course is completed
      if (progress.progressPercentage >= 100) {
        progress.isCompleted = true;
        progress.completedAt = new Date();

        // Update user's enrolled courses
        await User.findByIdAndUpdate(req.user._id, {
          $set: {
            'enrolledCourses.$[elem].completedAt': new Date(),
            'enrolledCourses.$[elem].progress': 100,
            'enrolledCourses.$[elem].certificateIssued': true,
          },
        }, {
          arrayFilters: [{ 'elem.course': courseId }],
        });

        // Auto-generate certificate if not exists
        try {
          const existingCertificate = await Certificate.findOne({
            student: req.user._id,
            course: courseId,
          });

          if (!existingCertificate) {
            await Certificate.create({
              student: req.user._id,
              course: courseId,
              certificateId: `CERT-${uuidv4().split('-')[0].toUpperCase()}`,
              issuedAt: new Date(),
            });
            console.log(`Certificate auto-generated for user ${req.user._id} and course ${courseId}`);
          }
        } catch (certError) {
          console.error('Error auto-generating certificate:', certError);
          // Don't fail the progress update if certificate generation fails
        }
      } else {
        // Update progress in user's enrolled courses
        await User.findByIdAndUpdate(req.user._id, {
          $set: {
            'enrolledCourses.$[elem].progress': progress.progressPercentage,
          },
        }, {
          arrayFilters: [{ 'elem.course': courseId }],
        });
      }
    }

    await progress.save();
  }

  res.status(200).json({
    success: true,
    data: progress,
  });
});

// @desc    Mark lesson as incomplete
// @route   DELETE /api/progress/:courseId/lessons/:lessonId/complete
// @access  Private
export const markLessonIncomplete = asyncHandler(async (req, res, next) => {
  const { courseId, lessonId } = req.params;

  const progress = await Progress.findOne({
    student: req.user._id,
    course: courseId,
  });

  if (!progress) {
    return next(new AppError('Progress not found', 404));
  }

  // Remove lesson from completed list
  progress.completedLessons = progress.completedLessons.filter(
    (id) => id.toString() !== lessonId
  );

  // Recalculate progress percentage
  const course = await Course.findById(courseId);
  if (course) {
    const totalLessons = course.topics.reduce((sum, topic) => {
      return sum + (topic.lessons ? topic.lessons.length : 0);
    }, 0);

    progress.progressPercentage = totalLessons > 0
      ? Math.min(100, Math.round((progress.completedLessons.length / totalLessons) * 100))
      : 0;

    // Update completion status
    progress.isCompleted = false;
    progress.completedAt = null;

    // Update user's enrolled courses
    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'enrolledCourses.$[elem].progress': progress.progressPercentage,
        'enrolledCourses.$[elem].completedAt': null,
      },
    }, {
      arrayFilters: [{ 'elem.course': courseId }],
    });
  }

  await progress.save();

  res.status(200).json({
    success: true,
    data: progress,
  });
});

// @desc    Get all user progress
// @route   GET /api/progress
// @access  Private
export const getAllProgress = asyncHandler(async (req, res, next) => {
  const progress = await Progress.find({ student: req.user._id })
    .populate('course', 'title thumbnail slug instructor')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    data: progress,
  });
});

// @desc    Submit test
// @route   POST /api/progress/:courseId/tests/:testId/submit
// @access  Private
export const submitTest = asyncHandler(async (req, res, next) => {
  const { courseId, testId } = req.params;
  const { answers, contentId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Find the test in topics[].lessons[] (as content)
  let test = null;
  let testContent = null;
  
  for (const topic of course.topics || []) {
    for (const lesson of topic.lessons || []) {
      if (lesson._id.toString() === testId && lesson.type === 'test') {
        testContent = lesson;
        
        // Extract test data from content - handle both array and object formats
        let testContentData = null;
        if (Array.isArray(lesson.content)) {
          // If content is an array, find the test data object
          testContentData = lesson.content.find(c => c.questions || c.type === 'test') || lesson.content[0];
        } else if (lesson.content && typeof lesson.content === 'object') {
          // If content is an object
          testContentData = lesson.content;
        }
        
        // Extract test data
        test = {
          _id: lesson._id,
          questions: testContentData?.questions || lesson.content?.questions || [],
          passingScore: testContentData?.passingScore || lesson.content?.passingScore || 70,
        };
        break;
      }
    }
    if (test) break;
  }

  // Also check legacy course.tests for backward compatibility
  if (!test && course.tests) {
    test = course.tests.find(t => t._id.toString() === testId);
  }

  if (!test || !test.questions || test.questions.length === 0) {
    return next(new AppError('Test not found', 404));
  }

  // Calculate score - check correct answers
  let correctAnswers = 0;
  const totalQuestions = test.questions.length;

  test.questions.forEach((question, index) => {
    const userAnswer = answers[index];
    if (userAnswer !== undefined && question.options && Array.isArray(question.options)) {
      // Find the correct answer index (option with isCorrect: true)
      const correctAnswerIndex = question.options.findIndex((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return opt.isCorrect === true;
        }
        return false;
      });
      
      // Check if user's answer matches the correct answer index
      if (correctAnswerIndex >= 0 && userAnswer === correctAnswerIndex) {
        correctAnswers++;
      }
    } else if (userAnswer !== undefined && question.correctAnswer !== undefined) {
      // Fallback: use correctAnswer if provided (for backward compatibility)
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    }
  });

  const score = Math.round((correctAnswers / totalQuestions) * 100);

  // Update progress
  let progress = await Progress.findOne({
    student: req.user._id,
    course: courseId,
  });

  if (!progress) {
    progress = await Progress.create({
      student: req.user._id,
      course: courseId,
      testScores: [],
      completedLessons: [],
      progressPercentage: 0,
    });
  }

  // Check if test already submitted
  const existingTestIndex = progress.testScores.findIndex(
    (t) => t.testId.toString() === testId
  );

  const testScore = {
    testId: testId,
    score: score,
    maxScore: 100,
    completedAt: new Date(),
  };

  if (existingTestIndex >= 0) {
    // Update existing test score
    progress.testScores[existingTestIndex] = testScore;
  } else {
    // Add new test score
    progress.testScores.push(testScore);
  }

  // Automatically mark content as completed if contentId provided
  const lessonIdToMark = contentId || testId;
  if (lessonIdToMark && !progress.completedLessons.includes(lessonIdToMark)) {
    progress.completedLessons.push(lessonIdToMark);
  }

  // Recalculate progress percentage
  const totalContents = course.topics?.reduce((sum, topic) => sum + (topic.lessons?.length || 0), 0) || 0;
  if (totalContents > 0) {
    progress.progressPercentage = Math.min(100, Math.round((progress.completedLessons.length / totalContents) * 100));
  }

  await progress.save();

  res.status(200).json({
    success: true,
    data: {
      score,
      correctAnswers,
      totalQuestions,
      passed: score >= (test.passingScore || 70),
      progress: progress,
    },
  });
});

// @desc    Submit assignment
// @route   POST /api/progress/:courseId/assignments/:assignmentId/submit
// @access  Private
export const submitAssignment = asyncHandler(async (req, res, next) => {
  const { courseId, assignmentId } = req.params;
  const { submission, contentId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  // Find the assignment in topics[].lessons[] (as content)
  let assignment = null;
  let assignmentContent = null;
  
  for (const topic of course.topics || []) {
    for (const lesson of topic.lessons || []) {
      if (lesson._id.toString() === assignmentId && lesson.type === 'assignment') {
        assignmentContent = lesson;
        
        // Extract assignment data from content - handle both array and object formats
        let assignmentContentData = null;
        if (Array.isArray(lesson.content)) {
          // If content is an array, find the assignment data object
          assignmentContentData = lesson.content.find(c => c.instructions || c.type === 'assignment') || lesson.content[0];
        } else if (lesson.content && typeof lesson.content === 'object') {
          // If content is an object
          assignmentContentData = lesson.content;
        }
        
        assignment = {
          _id: lesson._id,
          title: lesson.title || assignmentContentData?.title || lesson.content?.title,
          description: lesson.description || assignmentContentData?.description || assignmentContentData?.instructions || lesson.content?.description,
          maxScore: assignmentContentData?.maxScore || lesson.content?.maxScore || 100,
        };
        break;
      }
    }
    if (assignment) break;
  }

  // Also check legacy course.assignments for backward compatibility
  if (!assignment && course.assignments) {
    assignment = course.assignments.find(a => a._id.toString() === assignmentId);
  }

  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  // Update progress
  let progress = await Progress.findOne({
    student: req.user._id,
    course: courseId,
  });

  if (!progress) {
    progress = await Progress.create({
      student: req.user._id,
      course: courseId,
      assignmentSubmissions: [],
      completedLessons: [],
      progressPercentage: 0,
    });
  }

  // Check if assignment already submitted
  const existingSubmissionIndex = progress.assignmentSubmissions.findIndex(
    (a) => a.assignmentId.toString() === assignmentId
  );

  const submissionData = {
    assignmentId: assignmentId,
    submission: submission,
    submittedAt: new Date(),
  };

  if (existingSubmissionIndex >= 0) {
    // Update existing submission
    progress.assignmentSubmissions[existingSubmissionIndex] = {
      ...progress.assignmentSubmissions[existingSubmissionIndex].toObject(),
      ...submissionData,
    };
  } else {
    // Add new submission
    progress.assignmentSubmissions.push(submissionData);
  }

  // Automatically mark content as completed if contentId provided
  const lessonIdToMark = contentId || assignmentId;
  if (lessonIdToMark && !progress.completedLessons.includes(lessonIdToMark)) {
    progress.completedLessons.push(lessonIdToMark);
  }

  // Recalculate progress percentage
  const totalContents = course.topics?.reduce((sum, topic) => sum + (topic.lessons?.length || 0), 0) || 0;
  if (totalContents > 0) {
    progress.progressPercentage = Math.min(100, Math.round((progress.completedLessons.length / totalContents) * 100));
  }

  await progress.save();

  res.status(200).json({
    success: true,
    data: progress.assignmentSubmissions[progress.assignmentSubmissions.length - 1],
    progress: progress,
    message: 'Assignment submitted successfully',
  });
});

// @desc    Grade assignment (Teacher/Admin only)
// @route   PUT /api/progress/:progressId/assignments/:submissionId/grade
// @access  Private (Teacher/Admin)
export const gradeAssignment = asyncHandler(async (req, res, next) => {
  const { progressId, submissionId } = req.params;
  const { grade, feedback } = req.body;

  const progress = await Progress.findById(progressId).populate('course');
  
  if (!progress) {
    return next(new AppError('Progress not found', 404));
  }

  // Check if user is the course instructor or admin
  if (
    req.user.role !== 'admin' &&
    progress.course.instructor.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Not authorized to grade this assignment', 403));
  }

  // Find submission
  const submission = progress.assignmentSubmissions.id(submissionId);
  if (!submission) {
    return next(new AppError('Submission not found', 404));
  }

  submission.grade = grade;
  submission.feedback = feedback;
  submission.gradedAt = new Date();

  await progress.save();

  res.status(200).json({
    success: true,
    data: submission,
  });
});

export default {
  getCourseProgress,
  markLessonComplete,
  markLessonIncomplete,
  getAllProgress,
  submitTest,
  submitAssignment,
  gradeAssignment,
};
