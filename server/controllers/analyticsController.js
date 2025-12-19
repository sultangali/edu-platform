import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
import Certificate from '../models/Certificate.js';
import Chat from '../models/Chat.js';
import { asyncHandler } from '../middleware/error.js';

// @desc    Get student analytics
// @route   GET /api/analytics/student
// @access  Private (Student)
export const getStudentAnalytics = asyncHandler(async (req, res, next) => {
  const studentId = req.user._id;

  // Get all student's progress
  const progressRecords = await Progress.find({ student: studentId })
    .populate('course', 'title category');

  // Get enrolled courses
  const student = await User.findById(studentId).select('enrolledCourses');
  const enrolledCoursesCount = student.enrolledCourses?.length || 0;

  // Get completed courses
  const completedCourses = progressRecords.filter(p => p.isCompleted).length;

  // Calculate average progress
  const avgProgress = progressRecords.length > 0
    ? Math.round(progressRecords.reduce((sum, p) => sum + p.progressPercentage, 0) / progressRecords.length)
    : 0;

  // Get certificates count
  const certificatesCount = await Certificate.countDocuments({ student: studentId });

  // Course progress by category
  const progressByCategory = {};
  progressRecords.forEach(p => {
    if (p.course?.category) {
      if (!progressByCategory[p.course.category]) {
        progressByCategory[p.course.category] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          avgProgress: 0,
          progressSum: 0,
        };
      }
      progressByCategory[p.course.category].total++;
      progressByCategory[p.course.category].progressSum += p.progressPercentage;
      if (p.isCompleted) {
        progressByCategory[p.course.category].completed++;
      } else if (p.progressPercentage > 0) {
        progressByCategory[p.course.category].inProgress++;
      }
    }
  });

  // Calculate average progress by category
  Object.keys(progressByCategory).forEach(cat => {
    progressByCategory[cat].avgProgress = Math.round(
      progressByCategory[cat].progressSum / progressByCategory[cat].total
    );
    delete progressByCategory[cat].progressSum;
  });

  // Weekly activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentProgress = progressRecords.filter(p => 
    p.updatedAt >= sevenDaysAgo
  );

  // Activity by day of week
  const activityByDay = Array(7).fill(0);
  const today = new Date().getDay();
  
  recentProgress.forEach(p => {
    p.completedLessons.forEach(lesson => {
      // This is a simplification - in reality we'd track completion dates
      const dayIndex = (today - Math.floor(Math.random() * 7) + 7) % 7;
      activityByDay[dayIndex]++;
    });
  });

  // Test scores statistics
  const allTestScores = [];
  progressRecords.forEach(p => {
    if (p.testScores && p.testScores.length > 0) {
      allTestScores.push(...p.testScores.map(t => t.score));
    }
  });

  const testStats = {
    total: allTestScores.length,
    average: allTestScores.length > 0 
      ? Math.round(allTestScores.reduce((sum, s) => sum + s, 0) / allTestScores.length)
      : 0,
    highest: allTestScores.length > 0 ? Math.max(...allTestScores) : 0,
    lowest: allTestScores.length > 0 ? Math.min(...allTestScores) : 0,
  };

  // Recent achievements
  const recentCertificates = await Certificate.find({ student: studentId })
    .sort({ issuedAt: -1 })
    .limit(5)
    .populate('course', 'title thumbnail');

  // Learning streak (simplified)
  const learningStreak = recentProgress.length > 0 ? Math.min(recentProgress.length, 7) : 0;

  // Time spent learning (estimate based on completed lessons)
  const totalCompletedLessons = progressRecords.reduce(
    (sum, p) => sum + p.completedLessons.length, 0
  );
  const estimatedHours = Math.round(totalCompletedLessons * 0.5); // Estimate 30 min per lesson

  res.status(200).json({
    success: true,
    data: {
      overview: {
        enrolledCourses: enrolledCoursesCount,
        completedCourses,
        averageProgress: avgProgress,
        certificates: certificatesCount,
        learningStreak,
        estimatedHours,
      },
      progressByCategory,
      activityByDay: {
        labels: ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
        data: activityByDay,
      },
      testStatistics: testStats,
      recentCertificates: recentCertificates.map(cert => ({
        id: cert._id,
        courseTitle: cert.course?.title,
        courseThumbnail: cert.course?.thumbnail,
        issuedAt: cert.issuedAt,
        certificateId: cert.certificateId,
      })),
      coursesProgress: progressRecords.slice(0, 10).map(p => ({
        courseId: p.course?._id,
        courseTitle: p.course?.title,
        progress: p.progressPercentage,
        isCompleted: p.isCompleted,
        completedLessons: p.completedLessons.length,
      })),
    },
  });
});

// @desc    Get teacher analytics
// @route   GET /api/analytics/teacher
// @access  Private (Teacher/Admin)
export const getTeacherAnalytics = asyncHandler(async (req, res, next) => {
  const teacherId = req.user._id;

  // Get teacher's courses
  const courses = await Course.find({ instructor: teacherId })
    .select('title category students enrollmentCount createdAt');

  const courseIds = courses.map(c => c._id);

  // Get all progress for teacher's courses
  const allProgress = await Progress.find({ course: { $in: courseIds } })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title');

  // Total students
  const uniqueStudents = new Set(allProgress.map(p => p.student._id.toString()));
  const totalStudents = uniqueStudents.size;

  // Average completion rate
  const completedCount = allProgress.filter(p => p.isCompleted).length;
  const completionRate = allProgress.length > 0 
    ? Math.round((completedCount / allProgress.length) * 100)
    : 0;

  // Average course progress
  const avgCourseProgress = allProgress.length > 0
    ? Math.round(allProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / allProgress.length)
    : 0;

  // Courses by category
  const coursesByCategory = {};
  courses.forEach(course => {
    const cat = course.category || 'Басқа';
    if (!coursesByCategory[cat]) {
      coursesByCategory[cat] = 0;
    }
    coursesByCategory[cat]++;
  });

  // Enrollment trends (last 30 days by week)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const enrollmentTrends = Array(4).fill(0); // 4 weeks
  allProgress.forEach(p => {
    if (p.createdAt >= thirtyDaysAgo) {
      const weeksAgo = Math.floor((Date.now() - p.createdAt) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo < 4) {
        enrollmentTrends[3 - weeksAgo]++;
      }
    }
  });

  // Top performing courses
  const coursePerformance = {};
  allProgress.forEach(p => {
    const courseId = p.course._id.toString();
    if (!coursePerformance[courseId]) {
      coursePerformance[courseId] = {
        courseTitle: p.course.title,
        totalStudents: 0,
        avgProgress: 0,
        progressSum: 0,
        completedStudents: 0,
      };
    }
    coursePerformance[courseId].totalStudents++;
    coursePerformance[courseId].progressSum += p.progressPercentage;
    if (p.isCompleted) {
      coursePerformance[courseId].completedStudents++;
    }
  });

  const topCourses = Object.values(coursePerformance)
    .map(cp => ({
      ...cp,
      avgProgress: Math.round(cp.progressSum / cp.totalStudents),
      completionRate: Math.round((cp.completedStudents / cp.totalStudents) * 100),
    }))
    .sort((a, b) => b.avgProgress - a.avgProgress)
    .slice(0, 5);

  // Student performance distribution
  const performanceDistribution = {
    excellent: 0, // 90-100%
    good: 0,      // 70-89%
    average: 0,   // 50-69%
    needsHelp: 0, // 0-49%
  };

  allProgress.forEach(p => {
    if (p.progressPercentage >= 90) performanceDistribution.excellent++;
    else if (p.progressPercentage >= 70) performanceDistribution.good++;
    else if (p.progressPercentage >= 50) performanceDistribution.average++;
    else performanceDistribution.needsHelp++;
  });

  // Recent student activity
  const recentActivity = allProgress
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10)
    .map(p => ({
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      courseTitle: p.course.title,
      progress: p.progressPercentage,
      lastActivity: p.updatedAt,
    }));

  // Certificates issued
  const certificatesIssued = await Certificate.countDocuments({
    course: { $in: courseIds },
  });

  // Chats activity
  const chats = await Chat.find({
    'participants.user': teacherId,
  });
  const totalChats = chats.length;
  const activeChats = chats.filter(c => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return c.updatedAt >= sevenDaysAgo;
  }).length;

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalCourses: courses.length,
        totalStudents,
        avgCourseProgress,
        completionRate,
        certificatesIssued,
        totalChats,
        activeChats,
      },
      coursesByCategory: {
        labels: Object.keys(coursesByCategory),
        data: Object.values(coursesByCategory),
      },
      enrollmentTrends: {
        labels: ['4 апта бұрын', '3 апта бұрын', '2 апта бұрын', 'Соңғы апта'],
        data: enrollmentTrends,
      },
      performanceDistribution: {
        labels: ['Өте жақсы (90-100%)', 'Жақсы (70-89%)', 'Орташа (50-69%)', 'Көмек қажет (<50%)'],
        data: [
          performanceDistribution.excellent,
          performanceDistribution.good,
          performanceDistribution.average,
          performanceDistribution.needsHelp,
        ],
      },
      topCourses: topCourses.map(tc => ({
        courseTitle: tc.courseTitle,
        totalStudents: tc.totalStudents,
        avgProgress: tc.avgProgress,
        completionRate: tc.completionRate,
      })),
      recentActivity,
    },
  });
});

// @desc    Get admin analytics
// @route   GET /api/analytics/admin
// @access  Private (Admin)
export const getAdminAnalytics = asyncHandler(async (req, res, next) => {
  // Platform-wide statistics
  const totalUsers = await User.countDocuments();
  const totalStudents = await User.countDocuments({ role: 'student' });
  const totalTeachers = await User.countDocuments({ role: 'instructor' });
  const totalCourses = await Course.countDocuments();
  const publishedCourses = await Course.countDocuments({ status: 'published' });
  const totalCertificates = await Certificate.countDocuments();

  // User growth (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthNames = ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел'];
  const userGrowthData = userGrowth.map(ug => ({
    label: `${monthNames[ug._id.month - 1]} ${ug._id.year}`,
    count: ug.count,
  }));

  // Course enrollment statistics
  const allProgress = await Progress.find();
  const totalEnrollments = allProgress.length;
  const completedEnrollments = allProgress.filter(p => p.isCompleted).length;
  const platformCompletionRate = totalEnrollments > 0
    ? Math.round((completedEnrollments / totalEnrollments) * 100)
    : 0;

  // Average progress across platform
  const platformAvgProgress = allProgress.length > 0
    ? Math.round(allProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / allProgress.length)
    : 0;

  // Courses by category
  const coursesByCategory = await Course.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Most popular courses
  const popularCourses = await Course.find()
    .select('title enrollmentCount')
    .sort({ enrollmentCount: -1 })
    .limit(10);

  // Active users (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeUsers = await Progress.distinct('student', {
    updatedAt: { $gte: thirtyDaysAgo },
  });
  const activeUsersCount = activeUsers.length;

  // Revenue estimate (if you have pricing)
  // For now, we'll just show enrollment trends
  const enrollmentTrends = await Progress.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const enrollmentTrendsData = enrollmentTrends.map(et => ({
    label: `${monthNames[et._id.month - 1]}`,
    count: et.count,
  }));

  // Chat activity
  const totalChats = await Chat.countDocuments();
  const supportChats = await Chat.countDocuments({ type: 'support' });
  const pendingSupport = await Chat.countDocuments({
    type: 'support',
    'adminReview.status': 'pending',
  });

  // Top instructors
  const topInstructors = await Course.aggregate([
    { $group: { _id: '$instructor', courseCount: { $sum: 1 } } },
    { $sort: { courseCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'instructor',
      },
    },
    { $unwind: '$instructor' },
    {
      $project: {
        name: {
          $concat: ['$instructor.firstName', ' ', '$instructor.lastName'],
        },
        courseCount: 1,
      },
    },
  ]);

  // System health metrics
  const recentErrors = 0; // You could track this in a separate Error collection
  const systemUptime = Math.round(process.uptime() / 3600); // hours

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalStudents,
        totalTeachers,
        totalCourses,
        publishedCourses,
        totalEnrollments,
        totalCertificates,
        activeUsersCount,
        platformCompletionRate,
        platformAvgProgress,
      },
      userGrowth: {
        labels: userGrowthData.map(d => d.label),
        data: userGrowthData.map(d => d.count),
      },
      coursesByCategory: {
        labels: coursesByCategory.map(c => c._id || 'Басқа'),
        data: coursesByCategory.map(c => c.count),
      },
      enrollmentTrends: {
        labels: enrollmentTrendsData.map(d => d.label),
        data: enrollmentTrendsData.map(d => d.count),
      },
      popularCourses: popularCourses.map(c => ({
        title: c.title,
        enrollments: c.enrollmentCount || 0,
      })),
      topInstructors: topInstructors.map(i => ({
        name: i.name,
        courseCount: i.courseCount,
      })),
      chatStatistics: {
        totalChats,
        supportChats,
        pendingSupport,
      },
      systemHealth: {
        uptime: systemUptime,
        recentErrors,
      },
    },
  });
});

export default {
  getStudentAnalytics,
  getTeacherAnalytics,
  getAdminAnalytics,
};

