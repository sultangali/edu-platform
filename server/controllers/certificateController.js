import Certificate from '../models/Certificate.js';
import Progress from '../models/Progress.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get user certificates
// @route   GET /api/certificates
// @access  Private
export const getCertificates = async (req, res, next) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title instructor')
      .sort('-issuedAt');

    res.status(200).json({
      success: true,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get certificate by ID
// @route   GET /api/certificates/:id
// @access  Private
export const getCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user owns this certificate
    let certificate;
    const userId = req.user._id || req.user.id;
    
    // Try to find by MongoDB _id first
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      certificate = await Certificate.findOne({
        _id: id,
        student: userId, // Ensure user owns the certificate
      })
        .populate('student', 'firstName lastName email')
        .populate('course', 'title description thumbnail instructor');
    }
    
    // If not found by _id, try certificateId
    if (!certificate) {
      certificate = await Certificate.findOne({
        certificateId: id,
        student: userId, // Ensure user owns the certificate
      })
        .populate('student', 'firstName lastName email')
        .populate('course', 'title description thumbnail instructor');
    }

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate certificate
// @route   POST /api/certificates
// @access  Private
export const generateCertificate = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    const userId = req.user._id || req.user.id;
    
    // Check if course is completed
    const progress = await Progress.findOne({
      student: userId,
      course: courseId,
      isCompleted: true,
    });

    if (!progress) {
      return res.status(400).json({
        success: false,
        message: 'Course is not completed',
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      student: userId,
      course: courseId,
    });

    if (existingCertificate) {
      return res.status(200).json({
        success: true,
        data: existingCertificate,
      });
    }

    // Generate certificate
    const certificate = await Certificate.create({
      student: userId,
      course: courseId,
      certificateId: `CERT-${uuidv4().split('-')[0].toUpperCase()}`,
    });

    const populatedCertificate = await Certificate.findById(certificate._id)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title instructor');

    res.status(201).json({
      success: true,
      data: populatedCertificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify certificate
// @route   GET /api/certificates/verify/:id
// @access  Public
export const verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      certificateId: req.params.id,
    })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title instructor');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid',
      });
    }

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

