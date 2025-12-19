import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

const dropTextIndexes = async () => {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      
      try {
        const indexes = await collection.indexes();
        console.log(`\nChecking indexes for collection: ${collectionName}`);
        
        for (const index of indexes) {
          // Check if this is a text index
          if (index.textIndexVersion !== undefined || index.key && index.key._fts) {
            console.log(`Found text index: ${index.name}`);
            console.log(`Index keys:`, index.key);
            
            // Drop the text index
            await collection.dropIndex(index.name);
            console.log(`✓ Dropped text index: ${index.name}`);
          }
        }
      } catch (err) {
        console.error(`Error processing collection ${collectionName}:`, err.message);
      }
    }
    
    console.log('\n✓ Finished dropping text indexes');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropTextIndexes();

