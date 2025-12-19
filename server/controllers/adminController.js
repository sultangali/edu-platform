import User from '../models/User.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import Certificate from '../models/Certificate.js';
import Chat from '../models/Chat.js';
import mongoose from 'mongoose';

// @desc    Get all users with filtering and pagination
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      role = '', 
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken -emailVerificationToken')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    // Add enrolled courses count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const enrolledCount = await Progress.countDocuments({ student: user._id });
        const completedCount = await Progress.countDocuments({ student: user._id, isCompleted: true });
        const certificatesCount = await Certificate.countDocuments({ student: user._id });
        
        return {
          ...user,
          stats: {
            enrolledCourses: enrolledCount,
            completedCourses: completedCount,
            certificates: certificatesCount,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -emailVerificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get user statistics
    const [enrolledCourses, completedCourses, certificates, createdCourses] = await Promise.all([
      Progress.find({ student: user._id }).populate('course', 'title thumbnail'),
      Progress.countDocuments({ student: user._id, isCompleted: true }),
      Certificate.find({ student: user._id }).populate('course', 'title'),
      Course.find({ instructor: user._id }).select('title isPublished students createdAt'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        enrolledCourses,
        completedCoursesCount: completedCourses,
        certificates,
        createdCourses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, isActive, isEmailVerified, phone, bio } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isEmailVerified !== undefined) updateData.isEmailVerified = isEmailVerified;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Don't allow deleting other admins
    if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete other admin users',
      });
    }

    // Delete related data
    await Promise.all([
      Progress.deleteMany({ student: user._id }),
      Certificate.deleteMany({ student: user._id }),
      Chat.deleteMany({ 'participants.user': user._id }),
    ]);

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User and related data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all courses with filtering
// @route   GET /api/admin/courses
// @access  Private/Admin
export const getAllCourses = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      isPublished,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('instructor', 'firstName lastName email')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Course.countDocuments(query),
    ]);

    // Add enrollment stats
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrolledCount = await Progress.countDocuments({ course: course._id });
        const completedCount = await Progress.countDocuments({ course: course._id, isCompleted: true });
        const avgProgress = await Progress.aggregate([
          { $match: { course: new mongoose.Types.ObjectId(course._id) } },
          { $group: { _id: null, avg: { $avg: '$progressPercentage' } } },
        ]);

        return {
          ...course,
          stats: {
            enrolled: enrolledCount,
            completed: completedCount,
            averageProgress: avgProgress[0]?.avg || 0,
          },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: coursesWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course status
// @route   PUT /api/admin/courses/:id
// @access  Private/Admin
export const updateCourseStatus = async (req, res, next) => {
  try {
    const { isPublished, isFeatured } = req.body;

    const updateData = {};
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('instructor', 'firstName lastName email');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/admin/courses/:id
// @access  Private/Admin
export const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Delete related data
    await Promise.all([
      Progress.deleteMany({ course: course._id }),
      Certificate.deleteMany({ course: course._id }),
    ]);

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Course and related data deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getStats = async (req, res, next) => {
  try {
    // Basic counts
    const [
      totalUsers,
      totalCourses,
      totalStudents,
      totalInstructors,
      totalAdmins,
      activeUsers,
      publishedCourses,
      draftCourses,
      totalEnrollments,
      completedEnrollments,
      totalCertificates,
    ] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      Course.countDocuments({ isPublished: true }),
      Course.countDocuments({ isPublished: false }),
      Progress.countDocuments(),
      Progress.countDocuments({ isCompleted: true }),
      Certificate.countDocuments(),
    ]);

    // User registration over time (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Course creation over time (last 7 days)
    const courseGrowth = await Course.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Enrollments over time (last 7 days)
    const enrollmentGrowth = await Progress.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top courses by enrollment
    const topCourses = await Progress.aggregate([
      {
        $group: {
          _id: '$course',
          enrollments: { $sum: 1 },
          avgProgress: { $avg: '$progressPercentage' },
        },
      },
      { $sort: { enrollments: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $project: {
          _id: '$course._id',
          title: '$course.title',
          thumbnail: '$course.thumbnail',
          enrollments: 1,
          avgProgress: { $ifNull: ['$avgProgress', 0] },
        },
      },
    ]);

    // Top instructors by students
    const topInstructors = await Course.aggregate([
      {
        $lookup: {
          from: 'progresses',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments',
        },
      },
      {
        $group: {
          _id: '$instructor',
          coursesCount: { $sum: 1 },
          totalStudents: { $sum: { $size: '$enrollments' } },
        },
      },
      { $sort: { totalStudents: -1 } },
      { $limit: 5 },
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
          firstName: '$instructor.firstName',
          lastName: '$instructor.lastName',
          avatar: '$instructor.avatar',
          coursesCount: 1,
          totalStudents: 1,
        },
      },
    ]);

    // Course categories distribution
    const categoryDistribution = await Course.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent activities
    const recentUsers = await User.find()
      .select('firstName lastName email role createdAt avatar')
      .sort('-createdAt')
      .limit(5);

    const recentCourses = await Course.find()
      .select('title instructor isPublished createdAt thumbnail')
      .populate('instructor', 'firstName lastName')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalStudents,
          totalInstructors,
          totalAdmins,
          activeUsers,
          publishedCourses,
          draftCourses,
          totalEnrollments,
          completedEnrollments,
          totalCertificates,
          completionRate: totalEnrollments > 0 
            ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1) 
            : 0,
        },
        growth: {
          users: userGrowth,
          courses: courseGrowth,
          enrollments: enrollmentGrowth,
        },
        topCourses,
        topInstructors,
        categoryDistribution,
        recent: {
          users: recentUsers,
          courses: recentCourses,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get support chats
// @route   GET /api/admin/support-chats
// @access  Private/Admin
export const getSupportChats = async (req, res, next) => {
  try {
    const { status = '', category = '', page = 1, limit = 20 } = req.query;

    const query = {
      category: { $in: ['complaint', 'suggestion'] },
    };
    if (status) query['adminReview.status'] = status;
    if (category && ['complaint', 'suggestion'].includes(category)) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chats = await Chat.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('participants.user', 'firstName lastName email avatar role')
      .populate('adminReview.assignedTo', 'firstName lastName')
      .populate('lastMessage.sender', 'firstName lastName')
      .sort('-updatedAt')
      .skip(skip)
      .limit(parseInt(limit));

    // Migrate old status values and save if needed
    for (const chat of chats) {
      if (chat.adminReview && chat.adminReview.status) {
        const statusMap = {
          'pending': 'open',
          'in_review': 'in_progress',
          'resolved': 'closed',
        };
        if (statusMap[chat.adminReview.status]) {
          chat.adminReview.status = statusMap[chat.adminReview.status];
          await chat.save();
        }
      }
    }

    const total = await Chat.countDocuments(query);

    res.status(200).json({
      success: true,
      data: chats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Respond to support chat
// @route   POST /api/admin/support-chats/:id/respond
// @access  Private/Admin
export const respondToSupportChat = async (req, res, next) => {
  try {
    const { message, status } = req.body;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Add admin message
    const newMessage = {
      sender: req.user._id,
      content: message,
      sentAt: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = {
      content: message,
      sender: req.user._id,
      sentAt: new Date(),
    };

    // Update status if provided
    if (status) {
      chat.adminReview.status = status;
      chat.adminReview.reviewedBy = req.user._id;
      chat.adminReview.reviewedAt = new Date();
    }

    await chat.save();

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    next(error);
  }
};
