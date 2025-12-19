import mongoose from 'mongoose';
import Course from '../models/Course.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/edu-platform';

const generateSlug = (title) => {
  if (!title || !title.trim()) {
    return `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  let slug = title
    .toLowerCase()
    .trim()
    // Transliterate Cyrillic characters
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
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens
  
  if (!slug || slug.length === 0) {
    return `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return slug;
};

const fixEmptySlugs = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find courses with empty or null slug
    const coursesWithEmptySlug = await Course.find({
      $or: [
        { slug: '' },
        { slug: null },
        { slug: { $exists: false } }
      ]
    });

    console.log(`Found ${coursesWithEmptySlug.length} courses with empty slug`);

    for (const course of coursesWithEmptySlug) {
      let baseSlug = generateSlug(course.title);
      let slug = baseSlug;
      let counter = 1;

      // Check if slug already exists
      while (await Course.findOne({ slug, _id: { $ne: course._id } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      console.log(`Updating course "${course.title}" with slug: ${slug}`);
      
      await Course.updateOne(
        { _id: course._id },
        { $set: { slug } }
      );
    }

    console.log('Done fixing empty slugs');
    
    // Also remove any duplicate empty slug entries
    const allCourses = await Course.find({}).select('title slug');
    console.log(`\nAll courses (${allCourses.length}):`);
    allCourses.forEach((c, i) => {
      console.log(`${i + 1}. "${c.title}" - slug: "${c.slug}"`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
};

fixEmptySlugs();

