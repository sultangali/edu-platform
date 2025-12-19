import User from '../models/User.js';
import Course from '../models/Course.js';
import Progress from '../models/Progress.js';
import Certificate from '../models/Certificate.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// @desc    Get user profile with statistics
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
      .select('-password -passwordResetToken -emailVerificationToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get statistics based on role
    let stats = {};

    if (user.role === 'student') {
      const [enrolledCourses, completedCourses, certificates, progress] = await Promise.all([
        Progress.countDocuments({ student: user._id }),
        Progress.countDocuments({ student: user._id, isCompleted: true }),
        Certificate.countDocuments({ student: user._id }),
        Progress.find({ student: user._id })
          .populate('course', 'title thumbnail')
          .sort('-updatedAt')
          .limit(5),
      ]);

      const avgProgress = await Progress.aggregate([
        { $match: { student: user._id } },
        { $group: { _id: null, avg: { $avg: '$progressPercentage' } } },
      ]);

      stats = {
        enrolledCourses,
        completedCourses,
        certificates,
        averageProgress: avgProgress[0]?.avg || 0,
        recentProgress: progress,
      };
    } else if (user.role === 'instructor') {
      const [totalCourses, publishedCourses, totalStudents, totalRatings] = await Promise.all([
        Course.countDocuments({ instructor: user._id }),
        Course.countDocuments({ instructor: user._id, isPublished: true }),
        Progress.distinct('student', {
          course: { $in: await Course.find({ instructor: user._id }).distinct('_id') },
        }).then((students) => students.length),
        Course.aggregate([
          { $match: { instructor: user._id } },
          { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: '$reviewsCount' } } },
        ]),
      ]);

      const recentCourses = await Course.find({ instructor: user._id })
        .select('title thumbnail isPublished students createdAt')
        .sort('-createdAt')
        .limit(5);

      stats = {
        totalCourses,
        publishedCourses,
        totalStudents,
        averageRating: totalRatings[0]?.avgRating || 0,
        totalReviews: totalRatings[0]?.totalReviews || 0,
        recentCourses,
      };
    } else if (user.role === 'admin') {
      const [totalUsers, totalCourses, totalCertificates] = await Promise.all([
        User.countDocuments(),
        Course.countDocuments(),
        Certificate.countDocuments(),
      ]);

      stats = {
        totalUsers,
        totalCourses,
        totalCertificates,
      };
    }

    res.status(200).json({
      success: true,
      data: {
        ...user,
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, bio } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;

    const user = await User.findByIdAndUpdate(req.user._id || req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

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

// @desc    Upload avatar
// @route   POST /api/profile/avatar
// @access  Private
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      { avatar: avatarPath },
      { new: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/profile/password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    const user = await User.findById(req.user._id || req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user has password (not OAuth user)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change password for OAuth users',
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete account
// @route   DELETE /api/profile
// @access  Private
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;

    // Delete related data based on role
    const user = await User.findById(userId);
    
    if (user.role === 'instructor') {
      // Delete courses created by instructor
      await Course.deleteMany({ instructor: userId });
    }

    // Delete progress and certificates
    await Promise.all([
      Progress.deleteMany({ student: userId }),
      Certificate.deleteMany({ student: userId }),
    ]);

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};












