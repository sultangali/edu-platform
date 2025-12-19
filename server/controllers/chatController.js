import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import mongoose from 'mongoose';

// @desc    Get all chats for current user
// @route   GET /api/chats
// @access  Private
export const getChats = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { category, type, archived } = req.query;

    const query = {
      'participants.user': userId,
    };

    if (category) query.category = category;
    if (type) query.type = type;
    if (archived === 'true') {
      query['settings.isArchived'] = true;
    } else {
      query['settings.isArchived'] = { $ne: true };
    }

    const chats = await Chat.find(query)
      .populate('participants.user', 'firstName lastName avatar role')
      .populate('course', 'title thumbnail')
      .populate('lastMessage.sender', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 });

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

    // Calculate unread counts
    const chatsWithUnread = chats.map(chat => {
      const chatObj = chat.toObject();
      chatObj.unreadCount = chat.getUnreadCount(userId);
      // Don't send all messages in list view
      delete chatObj.messages;
      return chatObj;
    });

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chatsWithUnread,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single chat with messages
// @route   GET /api/chats/:id
// @access  Private
export const getChat = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    })
    .populate('participants.user', 'firstName lastName avatar role email')
    .populate('course', 'title thumbnail description')
    .populate('createdBy', 'firstName lastName')
    .populate('messages.sender', 'firstName lastName avatar role')
    .populate('messages.readBy.user', 'firstName lastName');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    // Migrate old status values and save if needed
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

    // Mark messages as read
    const participantIndex = chat.participants.findIndex(
      p => p.user._id.toString() === userId.toString()
    );
    if (participantIndex !== -1) {
      chat.participants[participantIndex].lastRead = new Date();
      await chat.save();
    }

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new chat
// @route   POST /api/chats
// @access  Private
export const createChat = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { 
      name, 
      type, 
      category, 
      color, 
      participantIds, 
      courseId,
      initialMessage 
    } = req.body;

    // Validate participants
    if (!participantIds || participantIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Кемінде бір қатысушы қажет',
      });
    }

    // Check if participants exist
    const participants = await User.find({ _id: { $in: participantIds } });
    if (participants.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Кейбір қатысушылар табылмады',
      });
    }

    // For direct chats, check if chat already exists
    if (type === 'direct' && participantIds.length === 1) {
      const existingChat = await Chat.findOne({
        type: 'direct',
        'participants.user': { $all: [userId, participantIds[0]] },
        $expr: { $eq: [{ $size: '$participants' }, 2] },
      });

      if (existingChat) {
        return res.status(200).json({
          success: true,
          data: existingChat,
          message: 'Бұрыннан бар чат',
        });
      }
    }

    // Validate course if provided
    let course = null;
    if (courseId) {
      course = await Course.findById(courseId);
      if (!course) {
        return res.status(400).json({
          success: false,
          message: 'Курс табылмады',
        });
      }
    }

    // Create participants array
    const chatParticipants = [
      { user: userId, role: 'admin', joinedAt: new Date() },
      ...participantIds.map(id => ({
        user: id,
        role: 'member',
        joinedAt: new Date(),
      })),
    ];

    // For complaints and suggestions, automatically add admin as participant
    if (category === 'complaint' || category === 'suggestion') {
      const admin = await User.findOne({ role: 'admin' });
      if (admin && !chatParticipants.some(p => p.user.toString() === admin._id.toString())) {
        chatParticipants.push({
          user: admin._id,
          role: 'admin',
          joinedAt: new Date(),
        });
      }
    }

    // Create chat
    const chatData = {
      name: name || null,
      type: type || 'direct',
      category: category || 'general',
      color: color || 'blue',
      participants: chatParticipants,
      createdBy: userId,
      course: courseId || null,
      messages: [],
    };

    // Set adminReview status for complaints and suggestions
    if (category === 'complaint' || category === 'suggestion') {
      chatData.adminReview = {
        status: 'open',
        assignedTo: null,
        resolvedAt: null,
        notes: null,
      };
    }

    // Add initial message if provided
    if (initialMessage) {
      chatData.messages.push({
        sender: userId,
        content: initialMessage,
        createdAt: new Date(),
      });
      chatData.lastMessage = {
        content: initialMessage.substring(0, 100),
        sender: userId,
        sentAt: new Date(),
      };
    }

    const chat = await Chat.create(chatData);

    // Populate and return
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants.user', 'firstName lastName avatar role')
      .populate('course', 'title thumbnail')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedChat,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message to chat
// @route   POST /api/chats/:id/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;
    const { content, replyToId, context, attachments } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Хабарлама мәтіні қажет',
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    // Create message object
    const message = {
      _id: new mongoose.Types.ObjectId(),
      sender: userId,
      content: content.trim(),
      createdAt: new Date(),
      reactions: [],
      readBy: [{ user: userId, readAt: new Date() }],
    };

    // Add reply reference
    if (replyToId) {
      const replyMessage = chat.messages.id(replyToId);
      if (replyMessage) {
        message.replyTo = replyToId;
      }
    }

    // Add context (course/lesson link)
    if (context && context.type) {
      message.context = {
        type: context.type,
        courseId: context.courseId,
        topicId: context.topicId,
        lessonId: context.lessonId,
        contentId: context.contentId,
        title: context.title,
      };
    }

    // Add attachments
    if (attachments && attachments.length > 0) {
      message.attachments = attachments;
    }

    // Add message to chat
    chat.messages.push(message);

    // Update last message
    chat.lastMessage = {
      content: content.substring(0, 100),
      sender: userId,
      sentAt: new Date(),
    };

    await chat.save();

    // Get the saved message with populated sender
    const savedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'firstName lastName avatar role');
    
    const savedMessage = savedChat.messages.id(message._id);

    res.status(201).json({
      success: true,
      data: savedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add reaction to message
// @route   POST /api/chats/:id/messages/:messageId/reactions
// @access  Private
export const addReaction = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id: chatId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Эмодзи қажет',
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Хабарлама табылмады',
      });
    }

    // Find existing reaction with this emoji
    const existingReaction = message.reactions.find(r => r.emoji === emoji);

    if (existingReaction) {
      // Toggle user in the reaction
      const userIndex = existingReaction.users.findIndex(
        u => u.toString() === userId.toString()
      );

      if (userIndex > -1) {
        existingReaction.users.splice(userIndex, 1);
        // Remove reaction if no users left
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existingReaction.users.push(userId);
      }
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        users: [userId],
      });
    }

    await chat.save();

    res.status(200).json({
      success: true,
      data: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit message
// @route   PUT /api/chats/:id/messages/:messageId
// @access  Private
export const editMessage = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id: chatId, messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Хабарлама мәтіні қажет',
      });
    }

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Хабарлама табылмады',
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Тек өз хабарламаңызды өзгерте аласыз',
      });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();

    await chat.save();

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/chats/:id/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id: chatId, messageId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Хабарлама табылмады',
      });
    }

    // Check if user is the sender or chat admin
    const participant = chat.participants.find(
      p => p.user.toString() === userId.toString()
    );
    const isAdmin = participant?.role === 'admin';

    if (message.sender.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Бұл хабарламаны жою мүмкін емес',
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'Бұл хабарлама жойылды';

    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Хабарлама жойылды',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update chat settings
// @route   PUT /api/chats/:id
// @access  Private
export const updateChat = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;
    const { name, category, color, settings } = req.body;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    // Check if user is admin
    const participant = chat.participants.find(
      p => p.user.toString() === userId.toString()
    );
    
    if (participant?.role !== 'admin' && chat.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Тек админ чатты өзгерте алады',
      });
    }

    if (name !== undefined) chat.name = name;
    if (category) chat.category = category;
    if (color) chat.color = color;
    if (settings) {
      chat.settings = { ...chat.settings, ...settings };
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

// @desc    Archive/Unarchive chat
// @route   PUT /api/chats/:id/archive
// @access  Private
export const toggleArchiveChat = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    chat.settings.isArchived = !chat.settings.isArchived;
    await chat.save();

    res.status(200).json({
      success: true,
      data: chat,
      message: chat.settings.isArchived ? 'Чат мұрағатталды' : 'Чат мұрағаттан шығарылды',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:id
// @access  Private
export const deleteChat = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;

    const chat = await Chat.findOne({
      _id: chatId,
      createdBy: userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады немесе сізде жою құқығы жоқ',
      });
    }

    await Chat.findByIdAndDelete(chatId);

    res.status(200).json({
      success: true,
      message: 'Чат жойылды',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available users to chat with
// @route   GET /api/chats/users
// @access  Private
export const getChatUsers = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;
    const { search, role } = req.query;

    const query = { _id: { $ne: userId } };

    // Students can chat with instructors, instructors can chat with students
    if (userRole === 'student') {
      query.role = { $in: ['instructor', 'admin'] };
    } else if (userRole === 'instructor') {
      query.role = { $in: ['student', 'admin'] };
    }
    // Admins can chat with anyone

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('firstName lastName email avatar role')
      .limit(50)
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get courses for context linking
// @route   GET /api/chats/courses
// @access  Private
export const getChatCourses = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    let courses;

    if (userRole === 'student') {
      // Get enrolled courses
      const user = await User.findById(userId).select('enrolledCourses');
      const courseIds = user.enrolledCourses?.map(ec => ec.course) || [];
      courses = await Course.find({ _id: { $in: courseIds } })
        .select('title thumbnail topics')
        .populate({
          path: 'topics',
          select: 'title lessons',
        });
    } else if (userRole === 'instructor') {
      // Get teaching courses
      courses = await Course.find({ instructor: userId })
        .select('title thumbnail topics');
    } else {
      // Admin - get all courses
      courses = await Course.find()
        .select('title thumbnail topics')
        .limit(100);
    }

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pin/Unpin message
// @route   PUT /api/chats/:id/messages/:messageId/pin
// @access  Private
export const togglePinMessage = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id: chatId, messageId } = req.params;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    const messageObjectId = new mongoose.Types.ObjectId(messageId);
    const isPinned = chat.pinnedMessages.some(
      id => id.toString() === messageId
    );

    if (isPinned) {
      chat.pinnedMessages = chat.pinnedMessages.filter(
        id => id.toString() !== messageId
      );
    } else {
      chat.pinnedMessages.push(messageObjectId);
    }

    await chat.save();

    res.status(200).json({
      success: true,
      isPinned: !isPinned,
      message: isPinned ? 'Хабарлама босатылды' : 'Хабарлама бекітілді',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chats/:id/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;

    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': userId,
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат табылмады',
      });
    }

    const participantIndex = chat.participants.findIndex(
      p => p.user.toString() === userId.toString()
    );

    if (participantIndex !== -1) {
      chat.participants[participantIndex].lastRead = new Date();
      await chat.save();
    }

    res.status(200).json({
      success: true,
      message: 'Хабарламалар оқылды деп белгіленді',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit complaint or suggestion
// @route   POST /api/chats/support
// @access  Private
export const createSupportChat = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { category, subject, message } = req.body;

    if (!['complaint', 'suggestion'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Категория шағым немесе ұсыныс болуы керек',
      });
    }

    // Find admin users
    const admins = await User.find({ role: 'admin' }).select('_id');
    
    if (admins.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Әкімші табылмады',
      });
    }

    const participants = [
      { user: userId, role: 'member', joinedAt: new Date() },
      ...admins.map(admin => ({
        user: admin._id,
        role: 'admin',
        joinedAt: new Date(),
      })),
    ];

    const chat = await Chat.create({
      name: subject || (category === 'complaint' ? 'Шағым' : 'Ұсыныс'),
      type: 'support',
      category,
      color: category === 'complaint' ? 'red' : 'green',
      participants,
      createdBy: userId,
      messages: [{
        sender: userId,
        content: message,
        createdAt: new Date(),
      }],
      lastMessage: {
        content: message.substring(0, 100),
        sender: userId,
        sentAt: new Date(),
      },
      adminReview: {
        status: 'pending',
      },
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants.user', 'firstName lastName avatar role')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedChat,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update support ticket status (admin only)
// @route   PUT /api/chats/:id/support-status
// @access  Private (Admin)
export const updateSupportStatus = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const chatId = req.params.id;
    const { status, notes, assignedTo } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Тек әкімші өзгерте алады',
      });
    }

    const chat = await Chat.findById(chatId)
      .populate('participants.user', 'firstName lastName avatar role')
      .populate('adminReview.assignedTo', 'firstName lastName');

    if (!chat || (chat.category !== 'complaint' && chat.category !== 'suggestion')) {
      return res.status(404).json({
        success: false,
        message: 'Жалоба немесе ұсыныс табылмады',
      });
    }

    // Validate status
    if (status && !['open', 'in_progress', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Жарамсыз статус',
      });
    }

    if (status) {
      chat.adminReview.status = status;
    }
    if (assignedTo) {
      chat.adminReview.assignedTo = assignedTo;
    } else if (status && status !== 'open') {
      chat.adminReview.assignedTo = userId;
    }
    if (notes !== undefined) chat.adminReview.notes = notes;
    if (status === 'closed') {
      chat.adminReview.resolvedAt = new Date();
    } else if (status === 'open') {
      chat.adminReview.resolvedAt = null;
    }

    await chat.save();

    // Populate assignedTo for response
    await chat.populate('adminReview.assignedTo', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    next(error);
  }
};
