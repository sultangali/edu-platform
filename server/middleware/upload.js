import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'avatar') {
      uploadPath = 'uploads/avatars/';
    } else if (file.fieldname === 'thumbnail') {
      uploadPath = 'uploads/courses/thumbnails/';
    } else if (file.fieldname === 'video' || file.fieldname.startsWith('content_file_') && file.fieldname.includes('_video')) {
      uploadPath = 'uploads/courses/videos/';
    } else if (file.fieldname === 'audio' || file.fieldname.startsWith('content_file_') && file.fieldname.includes('_audio')) {
      uploadPath = 'uploads/courses/audio/';
    } else if (file.fieldname === 'file' || (file.fieldname.startsWith('content_file_') && file.fieldname.includes('_image'))) {
      // Check if it's an image file
      if (file.mimetype.startsWith('image/')) {
        uploadPath = 'uploads/courses/images/';
      } else {
        uploadPath = 'uploads/courses/files/';
      }
    } else if (file.fieldname === 'assignment') {
      uploadPath = 'uploads/assignments/';
    } else if (file.fieldname === 'chat') {
      uploadPath = 'uploads/chat/';
    } else if (file.fieldname.startsWith('content_file_')) {
      // Default for content files
      if (file.mimetype.startsWith('video/')) {
        uploadPath = 'uploads/courses/videos/';
      } else if (file.mimetype.startsWith('audio/')) {
        uploadPath = 'uploads/courses/audio/';
      } else if (file.mimetype.startsWith('image/')) {
        uploadPath = 'uploads/courses/images/';
      } else {
        uploadPath = 'uploads/courses/files/';
      }
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  
  // Allow videos
  if (file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  
  // Allow audio
  if (file.mimetype.startsWith('audio/')) {
    return cb(null, true);
  }
  
  // Allow documents
  const allowedDocs = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (allowedDocs.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new Error('Invalid file type'), false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  },
  fileFilter,
});

export default upload;

