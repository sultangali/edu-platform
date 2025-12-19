import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  order: {
    type: Number,
    default: 0,
  },
  lessons: [{
    type: {
      type: String,
      enum: ['video', 'article', 'audio', 'image', 'test', 'assignment'],
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    content: mongoose.Schema.Types.Mixed,
    duration: String,
    order: Number,
    videoUrl: String,
    audioUrl: String,
    imageUrl: String,
    isCompleted: {
      type: Boolean,
      default: false,
    },
  }],
  tests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
  }],
  assignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
  }],
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Course description is required'],
    },
    longDescription: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      default: 'other',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    courseLanguage: {
      type: String,
      default: 'kaz',
    },
    duration: {
      type: String,
    },
    topics: [topicSchema],
    requirements: [String],
    whatYouLearn: [String],
    price: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug before saving
courseSchema.pre('save', async function (next) {
  // Always ensure slug exists and is not empty
  if (!this.slug || this.slug.trim() === '' || this.isModified('title')) {
    let baseSlug = '';
    
    if (this.title && this.title.trim()) {
      // Try to create slug from title
      baseSlug = this.title
        .toLowerCase()
        .trim()
        // Handle Cyrillic and other characters - transliterate to latin where possible
        .replace(/[аәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыьэюя]/g, (char) => {
          const translitMap = {
            'а': 'a', 'ә': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ғ': 'g',
            'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
            'й': 'y', 'к': 'k', 'қ': 'q', 'л': 'l', 'м': 'm', 'н': 'n',
            'ң': 'ng', 'о': 'o', 'ө': 'o', 'п': 'p', 'р': 'r', 'с': 's',
            'т': 't', 'у': 'u', 'ұ': 'u', 'ү': 'u', 'ф': 'f', 'х': 'h',
            'һ': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
            'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
          };
          return translitMap[char] || char;
        })
        .replace(/[^\w\s-]/g, '') // Remove remaining special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
    }
    
    // If slug is empty after processing, use default with timestamp and ID
    if (!baseSlug || baseSlug.length === 0) {
      baseSlug = `course-${Date.now()}`;
    }
    
    // Ensure uniqueness by appending counter if needed
    let slug = baseSlug;
    let counter = 1;
    const CourseModel = this.constructor;
    
    // Check if slug already exists (excluding current document if updating)
    while (true) {
      const existingCourse = await CourseModel.findOne({ slug: slug });
      if (!existingCourse || (!this.isNew && existingCourse._id.toString() === this._id.toString())) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Prevent infinite loop
      if (counter > 1000) {
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }
    
    this.slug = slug;
  }
  next();
});

const Course = mongoose.model('Course', courseSchema);

export default Course;

