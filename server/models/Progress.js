import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    completedLessons: [{
      type: mongoose.Schema.Types.ObjectId,
    }],
    completedTopics: [{
      type: mongoose.Schema.Types.ObjectId,
    }],
    testScores: [{
      testId: mongoose.Schema.Types.ObjectId,
      score: Number,
      maxScore: Number,
      completedAt: Date,
    }],
    assignmentSubmissions: [{
      assignmentId: mongoose.Schema.Types.ObjectId,
      submission: mongoose.Schema.Types.Mixed,
      grade: Number,
      feedback: String,
      submittedAt: Date,
      gradedAt: Date,
    }],
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

progressSchema.index({ student: 1, course: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

export default Progress;

