import Course from '../models/Course.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import Chat from '../models/Chat.js';
import { asyncHandler, AppError } from '../middleware/error.js';

// @desc    Get teacher dashboard statistics
// @route   GET /api/teacher/dashboard
// @access  Private (Teacher/Admin)
export const getTeacherDashboard = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;

  // Get all courses created by this teacher (including unpublished)
  const courses = await Course.find({ instructor: teacherId })
    .populate('students', 'firstName lastName avatar')
    .select('title thumbnail isPublished students createdAt topics')
    .sort({ createdAt: -1 });

  // Calculate statistics
  const totalCourses = courses.length;
  
  // Get unique students across all courses
  const allStudents = new Set();
  courses.forEach(course => {
    if (course.students && Array.isArray(course.students)) {
      course.students.forEach(student => {
        if (student && student._id) {
          allStudents.add(student._id.toString());
        }
      });
    }
  });
  const totalStudents = allStudents.size;

  // Get all progress records for these courses
  const allProgress = await Progress.find({ 
    course: { $in: courses.map(c => c._id) }
  })
    .populate({
      path: 'student',
      select: 'firstName lastName avatar'
    })
    .populate({
      path: 'course',
      select: 'title topics'
    });

  // Create a map of assignment IDs to assignment titles
  // Assignments are stored as lessons with type 'assignment' in topics
  const assignmentMap = new Map();
  courses.forEach(course => {
    if (course.topics && Array.isArray(course.topics)) {
      course.topics.forEach(topic => {
        if (topic.lessons && Array.isArray(topic.lessons)) {
          topic.lessons.forEach(lesson => {
            if (lesson.type === 'assignment' && lesson._id) {
              // Extract maxScore from lesson.content
              let maxScore = 100; // default
              if (lesson.content) {
                if (Array.isArray(lesson.content)) {
                  const assignmentData = lesson.content.find(c => c.maxScore || c.instructions);
                  maxScore = assignmentData?.maxScore || 100;
                } else if (typeof lesson.content === 'object' && lesson.content.maxScore) {
                  maxScore = lesson.content.maxScore;
                }
              }
              
              assignmentMap.set(lesson._id.toString(), {
                title: lesson.title || 'Тапсырма',
                courseTitle: course.title,
                maxScore: maxScore
              });
            }
          });
        }
      });
    }
  });

  // Count pending submissions (assignments without grade)
  let pendingSubmissions = 0;
  const recentSubmissions = [];
  
  allProgress.forEach(progress => {
    if (progress.assignmentSubmissions && progress.assignmentSubmissions.length > 0) {
      progress.assignmentSubmissions.forEach(submission => {
        const assignmentInfo = assignmentMap.get(submission.assignmentId?.toString());
        
        if (submission.submittedAt) {
          if (!submission.grade) {
            pendingSubmissions++;
          }
          
          // Add to recent submissions (limit to 5 most recent)
          if (assignmentInfo) {
            recentSubmissions.push({
              _id: submission._id?.toString() || progress._id.toString() + '-' + submission.assignmentId.toString(),
              studentId: progress.student._id,
              studentName: `${progress.student.firstName} ${progress.student.lastName}`,
              studentAvatar: progress.student.avatar,
              courseId: progress.course._id,
              courseName: assignmentInfo.courseTitle,
              assignmentId: submission.assignmentId,
              assignmentTitle: assignmentInfo.title,
              assignmentMaxScore: assignmentInfo.maxScore || 100,
              submittedAt: submission.submittedAt,
              status: submission.grade !== undefined && submission.grade !== null ? 'graded' : 'pending',
              grade: submission.grade,
              score: submission.grade, // For backward compatibility
              feedback: submission.feedback
            });
          }
        }
      });
    }
  });

  // Sort by submittedAt descending and take first 5
  recentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const recentSubmissionsList = recentSubmissions.slice(0, 5);

  // Get active chats (chats where teacher is a participant)
  const chats = await Chat.find({
    'participants.user': teacherId
  })
    .populate('participants.user', 'firstName lastName avatar')
    .populate('course', 'title')
    .sort({ updatedAt: -1 })
    .limit(10);

  // Count active chats (chats with messages in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Get last message for each chat to determine if active
  let activeChats = 0;
  const recentMessages = [];
  
  for (const chat of chats) {
    if (chat.messages && chat.messages.length > 0) {
      // Sort messages by createdAt descending to get latest
      const sortedMessages = [...chat.messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const lastMessage = sortedMessages[0];
      
      // Check if chat is active (has message in last 7 days)
      if (new Date(lastMessage.createdAt) > sevenDaysAgo) {
        activeChats++;
      }
      
      // Find student (participant who is not the teacher)
      const studentParticipant = chat.participants.find(p => p.user && p.user._id.toString() !== teacherId.toString());
      
      if (studentParticipant && studentParticipant.user) {
        const student = studentParticipant.user;
        const messageText = lastMessage.content || '';
        
        // Check if message is unread (check readBy array)
        const participant = chat.participants.find(p => p.user && p.user._id.toString() === teacherId.toString());
        const lastReadTime = participant?.lastRead ? new Date(participant.lastRead) : null;
        const isUnread = lastMessage.sender.toString() !== teacherId.toString() && 
                        (!lastReadTime || new Date(lastMessage.createdAt) > lastReadTime);
        
        recentMessages.push({
          _id: chat._id,
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentAvatar: student.avatar,
          message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
          time: lastMessage.createdAt,
          unread: isUnread
        });
      }
    } else if (chat.lastMessage && chat.lastMessage.content) {
      // If no messages array but has lastMessage, use that
      const studentParticipant = chat.participants.find(p => p.user && p.user._id.toString() !== teacherId.toString());
      
      if (studentParticipant && studentParticipant.user) {
        const student = studentParticipant.user;
        const messageText = chat.lastMessage.content || '';
        
        // Check if chat is active (has lastMessage in last 7 days)
        if (chat.lastMessage.sentAt && new Date(chat.lastMessage.sentAt) > sevenDaysAgo) {
          activeChats++;
        }
        
        const participant = chat.participants.find(p => p.user && p.user._id.toString() === teacherId.toString());
        const lastReadTime = participant?.lastRead ? new Date(participant.lastRead) : null;
        const isUnread = chat.lastMessage.sender && 
                        chat.lastMessage.sender.toString() !== teacherId.toString() && 
                        (!lastReadTime || (chat.lastMessage.sentAt && new Date(chat.lastMessage.sentAt) > lastReadTime));
        
        recentMessages.push({
          _id: chat._id,
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentAvatar: student.avatar,
          message: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
          time: chat.lastMessage.sentAt || chat.updatedAt,
          unread: isUnread
        });
      }
    }
  }
  
  // Sort and limit recent messages
  recentMessages.sort((a, b) => new Date(b.time) - new Date(a.time));
  const recentMessagesList = recentMessages.slice(0, 5);

  // Calculate average progress for each course
  const coursesWithStats = await Promise.all(
    courses.map(async (course) => {
      const progresses = await Progress.find({ course: course._id });
      
      let totalProgress = 0;
      let progressCount = 0;
      
      progresses.forEach(progress => {
        if (progress.progressPercentage !== undefined && progress.progressPercentage !== null) {
          totalProgress += progress.progressPercentage;
          progressCount++;
        }
      });
      
      const avgProgress = progressCount > 0 ? Math.round(totalProgress / progressCount) : 0;
      const studentsCount = course.students ? course.students.length : 0;

      const apiUrl = process.env.API_URL || 'http://localhost:5000';
      let thumbnailUrl = null;
      if (course.thumbnail) {
        thumbnailUrl = course.thumbnail.startsWith('http') 
          ? course.thumbnail 
          : `${apiUrl}${course.thumbnail}`;
      }

      return {
        _id: course._id,
        title: course.title,
        thumbnail: thumbnailUrl,
        status: course.isPublished ? 'published' : 'draft',
        studentsCount: studentsCount,
        progress: avgProgress
      };
    })
  );

  // Get weekly statistics
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // New students this week (students who enrolled in any course this week)
  const usersWithEnrollments = await User.find({
    'enrolledCourses.course': { $in: courses.map(c => c._id) },
    'enrolledCourses.enrolledAt': { $gte: weekAgo }
  }).select('enrolledCourses');

  const newStudentsThisWeek = new Set();
  usersWithEnrollments.forEach(user => {
    if (user.enrolledCourses) {
      user.enrolledCourses.forEach(enrollment => {
        if (enrollment.enrolledAt >= weekAgo) {
          newStudentsThisWeek.add(user._id.toString());
        }
      });
    }
  });

  // Completed lessons this week (count unique lesson completions in the last week)
  const weekProgresses = await Progress.find({
    course: { $in: courses.map(c => c._id) },
    updatedAt: { $gte: weekAgo }
  });

  let completedLessonsThisWeek = 0;
  weekProgresses.forEach(progress => {
    if (progress.completedLessons && progress.completedLessons.length > 0) {
      completedLessonsThisWeek += progress.completedLessons.length;
    }
  });

  // Calculate average grade from test scores
  const allTestScores = await Progress.find({
    course: { $in: courses.map(c => c._id) },
    'testScores': { $exists: true, $ne: [] }
  }).select('testScores');

  let totalScore = 0;
  let scoreCount = 0;
  allTestScores.forEach(progress => {
    if (progress.testScores && progress.testScores.length > 0) {
      progress.testScores.forEach(score => {
        if (score.score !== undefined && score.score !== null) {
          totalScore += score.score;
          scoreCount++;
        }
      });
    }
  });
  // Convert percentage to 5-point scale
  const averageGrade = scoreCount > 0 ? (totalScore / scoreCount / 20).toFixed(1) : 0;

  // Certificates issued (count users with certificateIssued for these courses)
  const usersWithCertificates = await User.find({
    'enrolledCourses.certificateIssued': true,
    'enrolledCourses.course': { $in: courses.map(c => c._id) }
  });

  let certificatesIssued = 0;
  usersWithCertificates.forEach(user => {
    if (user.enrolledCourses) {
      user.enrolledCourses.forEach(enrollment => {
        if (enrollment.certificateIssued && courses.some(c => c._id.toString() === enrollment.course.toString())) {
          certificatesIssued++;
        }
      });
    }
  });

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalCourses,
        totalStudents,
        pendingSubmissions,
        activeChats
      },
      courses: coursesWithStats.slice(0, 5), // Limit to 5 for dashboard
      recentSubmissions: recentSubmissionsList,
      recentMessages: recentMessagesList,
      weeklyStats: {
        newStudents: newStudentsThisWeek.size,
        completedLessons: completedLessonsThisWeek,
        averageGrade: parseFloat(averageGrade),
        certificatesIssued
      }
    }
  });
});

// @desc    Get submission details for teacher
// @route   GET /api/teacher/submissions/:courseId/:assignmentId/:studentId
// @access  Private (Teacher/Admin)
export const getSubmission = asyncHandler(async (req, res, next) => {
  const { courseId, assignmentId, studentId } = req.params;
  const teacherId = req.user._id;

  // Verify course ownership
  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  if (course.instructor.toString() !== teacherId.toString() && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 403));
  }

  // Get student progress
  const progress = await Progress.findOne({
    course: courseId,
    student: studentId,
  })
    .populate('student', 'firstName lastName email avatar')
    .populate('course', 'title');

  if (!progress) {
    return next(new AppError('Progress not found', 404));
  }

  // Find assignment submission
  const assignmentSubmission = progress.assignmentSubmissions?.find(
    (sub) => sub.assignmentId.toString() === assignmentId
  );

  if (!assignmentSubmission) {
    return next(new AppError('Submission not found', 404));
  }

  // Find assignment details in course
  let assignment = null;
  for (const topic of course.topics || []) {
    for (const lesson of topic.lessons || []) {
      if (lesson._id.toString() === assignmentId && lesson.type === 'assignment') {
        let assignmentContentData = null;
        if (Array.isArray(lesson.content)) {
          assignmentContentData = lesson.content.find(c => c.instructions || c.type === 'assignment') || lesson.content[0];
        } else if (lesson.content && typeof lesson.content === 'object') {
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

  res.status(200).json({
    success: true,
    data: {
      ...assignmentSubmission.toObject(),
      assignment: assignment || { title: 'Тапсырма', maxScore: 100 },
      student: progress.student,
      course: progress.course,
      progressId: progress._id,
    },
  });
});
