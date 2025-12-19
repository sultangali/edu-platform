import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  // Text formatting preserved in content with markdown
  formatting: {
    isBold: { type: Boolean, default: false },
    isItalic: { type: Boolean, default: false },
    isCode: { type: Boolean, default: false },
  },
  // Reply to another message (ObjectId of another message in the same chat)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
  },
  // Attachments (files, images)
  attachments: [{
    type: { type: String, enum: ['image', 'file', 'link'] },
    url: String,
    name: String,
    size: Number,
  }],
  // Context linking - reference to course/lesson/content
  context: {
    type: { type: String, enum: ['course', 'topic', 'lesson', 'content'] },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    topicId: { type: mongoose.Schema.Types.ObjectId },
    lessonId: { type: mongoose.Schema.Types.ObjectId },
    contentId: { type: mongoose.Schema.Types.ObjectId },
    title: String, // Display title for the linked item
  },
  // Emoji reactions
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  // Message status
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  // Read by users
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  // Chat name (for group chats or custom naming)
  name: {
    type: String,
    maxlength: 100,
  },
  // Chat type
  type: {
    type: String,
    enum: ['direct', 'group', 'course', 'support'],
    default: 'direct',
  },
  // Category for organization
  category: {
    type: String,
    enum: ['general', 'question', 'homework', 'announcement', 'complaint', 'suggestion', 'other'],
    default: 'general',
  },
  // Color coding
  color: {
    type: String,
    enum: ['blue', 'green', 'purple', 'orange', 'red', 'pink', 'teal', 'yellow'],
    default: 'blue',
  },
  // Participants
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastRead: { type: Date },
    isMuted: { type: Boolean, default: false },
    customColor: String, // User's custom color for this chat
  }],
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Associated course (for course-specific discussions)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
  },
  // Messages
  messages: [messageSchema],
  // Last message for preview
  lastMessage: {
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: Date,
  },
  // Chat settings
  settings: {
    allowReactions: { type: Boolean, default: true },
    allowReplies: { type: Boolean, default: true },
    allowAttachments: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
  },
  // For complaints/suggestions - admin review status
  adminReview: {
    status: { 
      type: String, 
      enum: ['open', 'in_progress', 'closed'], 
      default: 'open',
      set: function(value) {
        // Migrate old status values to new ones
        const statusMap = {
          'pending': 'open',
          'in_review': 'in_progress',
          'resolved': 'closed',
        };
        return statusMap[value] || value;
      }
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    notes: String,
  },
  // Pinned messages
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId }],
  // Unread count per user (virtual)
}, { timestamps: true });

// Index for efficient queries
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ createdAt: -1 });
chatSchema.index({ type: 1 });
chatSchema.index({ category: 1 });

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages ? this.messages.length : 0;
});

// Method to get unread count for a user
chatSchema.methods.getUnreadCount = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!participant || !participant.lastRead) {
    return this.messages.length;
  }
  return this.messages.filter(m => 
    new Date(m.createdAt) > new Date(participant.lastRead) && 
    m.sender.toString() !== userId.toString()
  ).length;
};

// Pre-save hook to migrate old status values
chatSchema.pre('save', function(next) {
  if (this.adminReview && this.adminReview.status) {
    const statusMap = {
      'pending': 'open',
      'in_review': 'in_progress',
      'resolved': 'closed',
    };
    if (statusMap[this.adminReview.status]) {
      this.adminReview.status = statusMap[this.adminReview.status];
    }
  }
  next();
});

// Pre-validate hook to migrate old status values
chatSchema.pre('validate', function(next) {
  if (this.adminReview && this.adminReview.status) {
    const statusMap = {
      'pending': 'open',
      'in_review': 'in_progress',
      'resolved': 'closed',
    };
    if (statusMap[this.adminReview.status]) {
      this.adminReview.status = statusMap[this.adminReview.status];
    }
  }
  next();
});

// Static method to find chats for a user
chatSchema.statics.findForUser = function(userId) {
  return this.find({
    'participants.user': userId,
    'settings.isArchived': false,
  })
  .populate('participants.user', 'firstName lastName avatar role')
  .populate('course', 'title thumbnail')
  .populate('lastMessage.sender', 'firstName lastName')
  .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 });
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
