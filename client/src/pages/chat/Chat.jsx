import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authStore';
import api from '../../services/api';
import {
  FiSearch,
  FiPlus,
  FiSend,
  FiPaperclip,
  FiSmile,
  FiMoreVertical,
  FiMessageSquare,
  FiArchive,
  FiTrash2,
  FiEdit3,
  FiCornerUpLeft,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiBook,
  FiHelpCircle,
  FiFlag,
  FiStar,
  FiBold,
  FiItalic,
  FiCode,
  FiLink,
  FiBookmark,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

// Category and color configurations
const CATEGORIES = [
  { value: 'general', labelKey: 'chat.categories.general', icon: FiMessageSquare, color: 'blue' },
  { value: 'question', labelKey: 'chat.categories.question', icon: FiHelpCircle, color: 'purple' },
  { value: 'homework', labelKey: 'chat.categories.homework', icon: FiBook, color: 'green' },
  { value: 'announcement', labelKey: 'chat.categories.announcement', icon: FiAlertCircle, color: 'orange' },
  { value: 'complaint', labelKey: 'chat.categories.complaint', icon: FiFlag, color: 'red' },
  { value: 'suggestion', labelKey: 'chat.categories.suggestion', icon: FiStar, color: 'teal' },
];

const COLORS = [
  { value: 'blue', class: 'bg-blue-500', light: 'bg-blue-100 text-blue-700' },
  { value: 'green', class: 'bg-green-500', light: 'bg-green-100 text-green-700' },
  { value: 'purple', class: 'bg-purple-500', light: 'bg-purple-100 text-purple-700' },
  { value: 'orange', class: 'bg-orange-500', light: 'bg-orange-100 text-orange-700' },
  { value: 'red', class: 'bg-red-500', light: 'bg-red-100 text-red-700' },
  { value: 'pink', class: 'bg-pink-500', light: 'bg-pink-100 text-pink-700' },
  { value: 'teal', class: 'bg-teal-500', light: 'bg-teal-100 text-teal-700' },
  { value: 'yellow', class: 'bg-yellow-500', light: 'bg-yellow-100 text-yellow-700' },
];

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '✅', '❌', '💡'];

// Format date helper, now localizes short units
const formatMessageDate = (date, t) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return t('chat.time.now');
  if (diff < 3600000) return t('chat.time.minutesAgo', { count: Math.floor(diff / 60000) });
  if (diff < 86400000) {
    return d.toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    const days = [
      t('chat.days.sun'),
      t('chat.days.mon'),
      t('chat.days.tue'),
      t('chat.days.wed'),
      t('chat.days.thu'),
      t('chat.days.fri'),
      t('chat.days.sat'),
    ];
    return days[d.getDay()];
  }
  return d.toLocaleDateString('kk-KZ', { day: 'numeric', month: 'short' });
};

const formatFullDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('kk-KZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Parse markdown-like formatting
const parseFormatting = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm">$1</code>')
    .replace(/\n/g, '<br/>');
};

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showContextPicker, setShowContextPicker] = useState(false);
  const [selectedContext, setSelectedContext] = useState(null);
  const [showChatMenu, setShowChatMenu] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;

      const response = await api.get('/chats', { params });
      setChats(response.data.data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  // Fetch single chat with messages
  const fetchChat = useCallback(async (chatId) => {
    setMessagesLoading(true);
    // Reset scroll flag when loading a new chat
    setShouldScrollToBottom(false);
    try {
      const response = await api.get(`/chats/${chatId}`);
      const chatData = response.data.data;
      setActiveChat(chatData);
      setMessages(chatData.messages || []);

      // Mark messages as read when opening chat
      try {
        await api.put(`/chats/${chatId}/read`);
        // Refresh chat list to update unread count
        const chatsResponse = await api.get('/chats');
        setChats(chatsResponse.data.data || []);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Open chat from URL parameter
  useEffect(() => {
    if (id) {
      fetchChat(id);
    }
  }, [id, fetchChat]);

  // Removed automatic polling - user will manually refresh or use real-time updates

  // Scroll to bottom only when shouldScrollToBottom is true (new messages sent)
  useEffect(() => {
    if (shouldScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToBottom(false);
    }
  }, [messages, shouldScrollToBottom]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChat || isTyping) return;

    setIsTyping(true);
    const messageContent = messageText.trim();
    const currentReplyTo = replyTo;
    const currentContext = selectedContext;
    const currentEditingMessage = editingMessage;

    try {
      const messageData = {
        content: messageContent,
      };

      if (currentReplyTo) {
        messageData.replyToId = currentReplyTo._id;
      }

      if (currentContext) {
        messageData.context = currentContext;
      }

      setMessageText('');
      setReplyTo(null);
      setSelectedContext(null);
      setEditingMessage(null);

      if (currentEditingMessage) {
        // Edit existing message
        await api.put(`/chats/${activeChat._id}/messages/${currentEditingMessage._id}`, {
          content: messageContent,
        });
      } else {
        // Send new message
        await api.post(`/chats/${activeChat._id}/messages`, messageData);
        // Set flag to scroll to bottom after new message
        setShouldScrollToBottom(true);
      }

      await Promise.all([
        fetchChat(activeChat._id),
        fetchChats(),
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(messageContent);
      if (currentReplyTo) setReplyTo(currentReplyTo);
      if (currentContext) setSelectedContext(currentContext);
      if (currentEditingMessage) setEditingMessage(currentEditingMessage);
    } finally {
      setIsTyping(false);
    }
  };

  // Add reaction
  const handleReaction = async (messageId, emoji) => {
    if (isTyping) return;
    try {
      await api.post(`/chats/${activeChat._id}/messages/${messageId}/reactions`, { emoji });
      setShowEmojiPicker(null);
      if (!isTyping) {
        fetchChat(activeChat._id);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (isTyping) return;
    try {
      await api.delete(`/chats/${activeChat._id}/messages/${messageId}`);
      setShowMessageMenu(null);
      if (!isTyping) {
        fetchChat(activeChat._id);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Pin message
  const handlePinMessage = async (messageId) => {
    if (isTyping) return;
    try {
      await api.put(`/chats/${activeChat._id}/messages/${messageId}/pin`);
      setShowMessageMenu(null);
      if (!isTyping) {
        fetchChat(activeChat._id);
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  // Archive chat
  const handleArchiveChat = async (chatId) => {
    try {
      await api.put(`/chats/${chatId}/archive`);
      fetchChats();
      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
        navigate('/chat');
      }
      setShowChatMenu(null);
    } catch (error) {
      console.error('Error archiving chat:', error);
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatId) => {
    // Use translation for the confirm dialog
    if (!window.confirm(t('chat.confirm.deleteChat'))) return;
    try {
      await api.delete(`/chats/${chatId}`);
      fetchChats();
      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
        navigate('/chat');
      }
      setShowChatMenu(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  // Insert formatting
  const insertFormatting = (type) => {
    const input = messageInputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = messageText;
    const selected = text.substring(start, end);

    let newText;
    let cursorPos;

    switch (type) {
      case 'bold':
        newText = text.substring(0, start) + `**${selected}**` + text.substring(end);
        cursorPos = selected ? end + 4 : start + 2;
        break;
      case 'italic':
        newText = text.substring(0, start) + `*${selected}*` + text.substring(end);
        cursorPos = selected ? end + 2 : start + 1;
        break;
      case 'code':
        newText = text.substring(0, start) + `\`${selected}\`` + text.substring(end);
        cursorPos = selected ? end + 2 : start + 1;
        break;
      default:
        return;
    }

    setMessageText(newText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  // Get color class
  const getColorClass = (color, light = false) => {
    const colorConfig = COLORS.find(c => c.value === color);
    return light ? colorConfig?.light || 'bg-blue-100 text-blue-700' : colorConfig?.class || 'bg-blue-500';
  };

  // Get other participant in direct chat
  const getOtherParticipant = (chat) => {
    if (!chat?.participants || !user?._id) return null;
    const userId = String(user._id);

    const otherParticipant = chat.participants.find(p => {
      if (!p.user) return false;
      const participantId = String(p.user._id || p.user);
      return participantId !== userId;
    });

    if (!otherParticipant) return null;
    return otherParticipant.user && typeof otherParticipant.user === 'object'
      ? otherParticipant.user
      : null;
  };

  // Filter chats by search
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const chatName = chat.name || getOtherParticipant(chat)?.firstName || '';
    return chatName.toLowerCase().includes(searchLower);
  });

  // Helper for roles translation
  const getUserRoleLabel = (role) => {
    switch (role) {
      case 'instructor':
        return t('chat.userRole.instructor');
      case 'admin':
        return t('chat.userRole.admin');
      default:
        return t('chat.userRole.student');
    }
  };

  // Helper for last message fallback
  const getLastMessageFallback = () => t('chat.list.noMessage');

  // Helper for chat empty
  const getNoChatsText = () => t('chat.sidebar.empty');

  // Helper for no users found
  const getNoUsersText = () => t('chat.new.noUsersFound');

  // Helper for no courses found
  const getNoCoursesText = () => t('chat.context.noCourses');

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('chat.sidebar.title')}</h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('chat.sidebar.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                !categoryFilter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              {t('chat.categories.all')}
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                  categoryFilter === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                }`}
              >
                <cat.icon className="w-3 h-3" />
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FiMessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">{getNoChatsText()}</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-3 text-indigo-600 hover:text-indigo-700 text-sm"
              >
                {t('chat.sidebar.startNew')}
              </button>
            </div>
          ) : (
            filteredChats.map(chat => {
              const otherUser = getOtherParticipant(chat);
              const isActive = activeChat?._id === chat._id;
              
              return (
                <div
                  key={chat._id}
                  onClick={() => {
                    fetchChat(chat._id);
                    navigate(`/chat/${chat._id}`);
                  }}
                  className={`relative flex items-center gap-3 p-4 cursor-pointer transition-colors border-l-4 ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'
                  }`}
                >
                  {/* Color indicator */}
                  <div className={`w-10 h-10 rounded-full ${getColorClass(chat.color)} flex items-center justify-center text-white font-semibold`}>
                    {chat.name?.[0] || otherUser?.firstName?.[0] || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {chat.name || (otherUser ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() : t('chat.sidebar.chat'))}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatMessageDate(chat.lastMessage?.sentAt, t)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1">
                        {chat.lastMessage?.content || getLastMessageFallback()}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full min-w-[20px] text-center shadow-sm">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </span>
                      )}
                    </div>
                    {/* Category badge */}
                    {chat.category && chat.category !== 'general' && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1 ${getColorClass(chat.color, true)}`}>
                        {t(CATEGORIES.find(c => c.value === chat.category)?.labelKey)}
                      </span>
                    )}
                  </div>

                  {/* Chat menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChatMenu(showChatMenu === chat._id ? null : chat._id);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiMoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  {/* Chat menu dropdown */}
                  {showChatMenu === chat._id && (
                    <div className="absolute right-4 top-12 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[150px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveChat(chat._id);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FiArchive className="w-4 h-4" />
                        {t('chat.sidebar.archive')}
                      </button>
                      {chat.createdBy === user?._id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat._id);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          {t('chat.sidebar.delete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getColorClass(activeChat.color)} flex items-center justify-center text-white font-semibold`}>
                    {activeChat.name?.[0] || getOtherParticipant(activeChat)?.firstName?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {activeChat.name || (() => {
                        const other = getOtherParticipant(activeChat);
                        return other ? `${other.firstName || ''} ${other.lastName || ''}`.trim() || t('chat.sidebar.chat') : t('chat.sidebar.chat');
                      })()}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {activeChat.participants?.length} {t('chat.header.participants')}
                      {activeChat.course && ` • ${activeChat.course.title}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getColorClass(activeChat.color, true)}`}>
                    {t(CATEGORIES.find(c => c.value === activeChat.category)?.labelKey) || t('chat.categories.general')}
                  </span>
                </div>
              </div>
              {/* Status for complaints and suggestions */}
              {(activeChat.category === 'complaint' || activeChat.category === 'suggestion') && activeChat.adminReview && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{t('chat.status.label')}:</span>
                  {user?.role === 'admin' ? (
                    <select
                      value={activeChat.adminReview.status || 'open'}
                      onChange={async (e) => {
                        try {
                          await api.put(`/chats/${activeChat._id}/admin-review`, {
                            status: e.target.value,
                          });
                          await fetchChat(activeChat._id);
                        } catch (error) {
                          console.error('Error updating status:', error);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="open">{t('chat.status.open')}</option>
                      <option value="in_progress">{t('chat.status.inProgress')}</option>
                      <option value="closed">{t('chat.status.closed')}</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activeChat.adminReview.status === 'open' 
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : activeChat.adminReview.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {t(`chat.status.${activeChat.adminReview.status || 'open'}`)}
                    </span>
                  )}
                  {activeChat.adminReview.assignedTo && (
                    <span className="text-xs text-gray-500">
                      • {t('chat.status.assignedTo')}: {activeChat.adminReview.assignedTo.firstName} {activeChat.adminReview.assignedTo.lastName}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 bg-gray-50 dark:bg-gray-900">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FiMessageSquare className="w-16 h-16 mb-4 text-gray-300" />
                  <p>{t('chat.messages.empty')}</p>
                  <p className="text-sm">{t('chat.messages.sendFirst')}</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender?._id && user?._id && String(message.sender._id) === String(user._id);
                  const isPinned = activeChat.pinnedMessages?.includes(message._id);
                  const showDate = index === 0 || 
                    new Date(message.createdAt).toDateString() !== new Date(messages[index - 1]?.createdAt).toDateString();

                  return (
                    <div key={message._id}>
                      {/* Date separator */}
                      {showDate && (
                        <div className="flex items-center justify-center my-6">
                          <span className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-4 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                            {new Date(message.createdAt).toLocaleDateString('kk-KZ', {
                              day: 'numeric',
                              month: 'long',
                            })}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 mb-1 px-2`}>
                        <div className={`max-w-[75%] sm:max-w-[65%] ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                          {/* Reply preview */}
                          {message.replyTo && (() => {
                            const replyMessage = messages.find(m => 
                              String(m._id) === String(message.replyTo)
                            );
                            return replyMessage ? (
                              <div className={`mb-1.5 p-2.5 rounded-lg ${
                                isOwn 
                                  ? 'bg-indigo-500/30 border-l-3 border-indigo-300' 
                                  : 'bg-gray-100 dark:bg-gray-700/50 border-l-3 border-gray-300 dark:border-gray-600'
                              } text-xs w-full`}>
                                <span className={`font-medium ${isOwn ? 'text-indigo-100' : 'text-gray-600 dark:text-gray-300'}`}>
                                  {replyMessage.sender?.firstName || t('chat.messages.reply')}
                                </span>
                                <p className={`truncate mt-0.5 ${isOwn ? 'text-indigo-50' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {replyMessage.content?.substring(0, 50)}
                                </p>
                              </div>
                            ) : null;
                          })()}

                          {/* Context link */}
                          {message.context?.title && (
                            <div className={`mb-1.5 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                              isOwn 
                                ? 'bg-indigo-500/30' 
                                : 'bg-indigo-50 dark:bg-indigo-900/30'
                            }`}>
                              <FiLink className={`w-3 h-3 ${isOwn ? 'text-indigo-200' : 'text-indigo-600'}`} />
                              <span className={isOwn ? 'text-indigo-50' : 'text-indigo-700 dark:text-indigo-400'}>
                                {message.context.title}
                              </span>
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`relative group ${
                              isOwn
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-br-sm shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
                            } px-4 py-2.5 ${isPinned ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''} transition-all hover:shadow-lg`}
                          >
                            {/* Pinned indicator */}
                            {isPinned && (
                              <div className="absolute -top-2 -right-2">
                                <FiBookmark className="w-4 h-4 text-yellow-500" />
                              </div>
                            )}

                            {/* Sender name for group chats */}
                            {!isOwn && activeChat.type !== 'direct' && (
                              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                                {message.sender?.firstName} {message.sender?.lastName}
                              </p>
                            )}

                            {/* Message content */}
                            {message.isDeleted ? (
                              <p className="italic text-gray-400">{t('chat.messages.deleted')}</p>
                            ) : (
                              <div
                                className="break-words"
                                dangerouslySetInnerHTML={{ __html: parseFormatting(message.content) }}
                              />
                            )}

                            {/* Time and edited */}
                            <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${isOwn ? 'text-indigo-100 justify-end' : 'text-gray-500 dark:text-gray-400 justify-start'}`}>
                              {message.isEdited && (
                                <span className="opacity-75">{t('chat.messages.edited')}</span>
                              )}
                              <span className="font-medium">
                                {formatFullDate(message.createdAt).split(',')[1]?.trim() || formatMessageDate(message.createdAt, t)}
                              </span>
                            </div>

                            {/* Message actions */}
                            {!message.isDeleted && (
                              <div className={`absolute ${isOwn ? '-right-8' : '-left-8'} top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <button
                                  onClick={() => setShowMessageMenu(showMessageMenu === message._id ? null : message._id)}
                                  className="p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                  <FiMoreVertical className="w-4 h-4 text-gray-500" />
                                </button>

                                {/* Message menu */}
                                {showMessageMenu === message._id && (
                                  <div className={`absolute ${isOwn ? 'left-0' : 'right-0'} mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[150px] z-10`}>
                                    <button
                                      onClick={() => {
                                        setReplyTo(message);
                                        setShowMessageMenu(null);
                                        messageInputRef.current?.focus();
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <FiCornerUpLeft className="w-4 h-4" />
                                      {t('chat.messages.replyAction')}
                                    </button>
                                    <button
                                      onClick={() => setShowEmojiPicker(message._id)}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <FiSmile className="w-4 h-4" />
                                      {t('chat.messages.reaction')}
                                    </button>
                                    <button
                                      onClick={() => handlePinMessage(message._id)}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <FiBookmark className="w-4 h-4" />
                                      {isPinned ? t('chat.messages.unpin') : t('chat.messages.pin')}
                                    </button>
                                    {isOwn && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingMessage(message);
                                            setMessageText(message.content);
                                            setShowMessageMenu(null);
                                            messageInputRef.current?.focus();
                                          }}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <FiEdit3 className="w-4 h-4" />
                                          {t('chat.messages.edit')}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMessage(message._id)}
                                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <FiTrash2 className="w-4 h-4" />
                                          {t('chat.messages.delete')}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Reactions */}
                          {message.reactions?.length > 0 && (
                            <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              {message.reactions.map((reaction, idx) => {
                                const userReacted = reaction.users?.some(u => 
                                  String(u) === String(user?._id) || String(u._id) === String(user?._id)
                                );
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleReaction(message._id, reaction.emoji)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all ${
                                      userReacted
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                                    } hover:scale-105 hover:shadow-md active:scale-95`}
                                  >
                                    <span className="text-sm">{reaction.emoji}</span>
                                    {reaction.users?.length > 0 && (
                                      <span className="font-medium text-xs">{reaction.users.length}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Emoji picker */}
                          {showEmojiPicker === message._id && (
                            <div className={`absolute ${isOwn ? 'left-0' : 'right-0'} mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-20`}>
                              <div className="flex flex-wrap gap-1">
                                {EMOJIS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(message._id, emoji)}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply/Edit preview */}
            {(replyTo || editingMessage) && (
              <div className="px-6 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {replyTo ? (
                    <>
                      <FiCornerUpLeft className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-indigo-600">{replyTo.sender?.firstName}</span>
                        {' '}: {replyTo.content?.substring(0, 50)}...
                      </span>
                    </>
                  ) : (
                    <>
                      <FiEdit3 className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('chat.messages.editing')}
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setReplyTo(null);
                    setEditingMessage(null);
                    setMessageText('');
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <FiX className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Context link preview */}
            {selectedContext && (
              <div className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiLink className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-indigo-700 dark:text-indigo-400">
                    {selectedContext.title}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedContext(null)}
                  className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded"
                >
                  <FiX className="w-4 h-4 text-indigo-500" />
                </button>
              </div>
            )}

            {/* Message Input */}
            <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {/* Formatting toolbar */}
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => insertFormatting('bold')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                  title={t('chat.input.boldTooltip')}
                >
                  <FiBold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('italic')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                  title={t('chat.input.italicTooltip')}
                >
                  <FiItalic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('code')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                  title={t('chat.input.codeTooltip')}
                >
                  <FiCode className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <button
                  onClick={() => setShowContextPicker(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                  title={t('chat.input.linkTooltip')}
                >
                  <FiLink className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setIsTyping(e.target.value.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onBlur={() => {
                      // Reset typing flag after a short delay to allow message send
                      setTimeout(() => setIsTyping(false), 500);
                    }}
                    placeholder={t('chat.input.placeholder')}
                    rows={1}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{ minHeight: '48px', maxHeight: '150px' }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <FiMessageSquare className="w-24 h-24 mb-6 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">{t('chat.empty.selectChat')}</h3>
            <p className="text-sm mb-4">{t('chat.empty.tip')}</p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              {t('chat.sidebar.startNew')}
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={(chat) => {
            fetchChats();
            fetchChat(chat._id);
            setShowNewChatModal(false);
          }}
          user={user}
        />
      )}

      {/* Context Picker Modal */}
      {showContextPicker && (
        <ContextPickerModal
          onClose={() => setShowContextPicker(false)}
          onSelect={(context) => {
            setSelectedContext(context);
            setShowContextPicker(false);
          }}
        />
      )}

      {/* Click outside to close menus */}
      {(showChatMenu || showMessageMenu || showEmojiPicker) && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => {
            setShowChatMenu(null);
            setShowMessageMenu(null);
            setShowEmojiPicker(null);
          }}
        />
      )}
    </div>
  );
}

// New Chat Modal Component
function NewChatModal({ onClose, onChatCreated, user }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatConfig, setChatConfig] = useState({
    name: '',
    type: 'direct',
    category: 'general',
    color: 'blue',
    courseId: null,
    initialMessage: '',
  });

  // Helper for roles translation
  const getUserRoleLabel = (role) => {
    switch (role) {
      case 'instructor':
        return t('chat.userRole.instructor');
      case 'admin':
        return t('chat.userRole.admin');
      default:
        return t('chat.userRole.student');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, coursesRes] = await Promise.all([
          api.get('/chats/users'),
          api.get('/chats/courses'),
        ]);
        setUsers(usersRes.data.data || []);
        setCourses(coursesRes.data.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      const response = await api.post('/chats', {
        ...chatConfig,
        participantIds: selectedUsers.map(u => u._id),
      });
      onChatCreated(response.data.data);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert(t('chat.new.errorCreatingChat'));
    }
  };

  const handleSupportSubmit = async () => {
    try {
      const response = await api.post('/chats/support', {
        category: chatConfig.category,
        subject: chatConfig.name,
        message: chatConfig.initialMessage,
      });
      onChatCreated(response.data.data);
    } catch (error) {
      console.error('Error creating support chat:', error);
      alert(t('chat.new.errorSupport'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 1
              ? t('chat.new.header')
              : step === 2
              ? t('chat.new.selectParticipants')
              : t('chat.new.settings')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('chat.new.typePrompt')}</p>
              
              <button
                onClick={() => {
                  setChatConfig({ ...chatConfig, type: 'direct' });
                  setStep(2);
                }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <FiMessageSquare className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('chat.new.direct')}</h3>
                    <p className="text-sm text-gray-500">{t('chat.new.directDesc')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setChatConfig({ ...chatConfig, type: 'group' });
                  setStep(2);
                }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <FiMessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('chat.new.group')}</h3>
                    <p className="text-sm text-gray-500">{t('chat.new.groupDesc')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setChatConfig({ ...chatConfig, category: 'complaint' });
                  setStep(4);
                }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                    <FiFlag className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('chat.new.sendComplaint')}</h3>
                    <p className="text-sm text-gray-500">{t('chat.new.complaintDesc')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setChatConfig({ ...chatConfig, category: 'suggestion' });
                  setStep(4);
                }}
                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <FiStar className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{t('chat.new.sendSuggestion')}</h3>
                    <p className="text-sm text-gray-500">{t('chat.new.suggestionDesc')}</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('chat.new.userSearchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <span
                      key={u._id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                    >
                      {u.firstName} {u.lastName}
                      <button
                        onClick={() => setSelectedUsers(selectedUsers.filter(su => su._id !== u._id))}
                        className="hover:text-red-500"
                        title={t('chat.new.removeUser')}
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Users list */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">{t('chat.new.noUsersFound')}</p>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = selectedUsers.some(su => su._id === u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => {
                          if (chatConfig.type === 'direct') {
                            setSelectedUsers([u]);
                          } else {
                            if (isSelected) {
                              setSelectedUsers(selectedUsers.filter(su => su._id !== u._id));
                            } else {
                              setSelectedUsers([...selectedUsers, u]);
                            }
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                          {u.firstName?.[0]}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {getUserRoleLabel(u.role)}
                          </p>
                        </div>
                        {isSelected && <FiCheck className="w-5 h-5 text-indigo-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Chat name (for group) */}
              {chatConfig.type === 'group' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('chat.new.chatName')}
                  </label>
                  <input
                    type="text"
                    value={chatConfig.name}
                    onChange={(e) => setChatConfig({ ...chatConfig, name: e.target.value })}
                    placeholder={t('chat.new.groupPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('chat.new.category')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.filter(c => !['complaint', 'suggestion'].includes(c.value)).map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setChatConfig({ ...chatConfig, category: cat.value })}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                        chatConfig.category === cat.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <cat.icon className="w-4 h-4" />
                      <span className="text-sm">{t(cat.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('chat.new.color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setChatConfig({ ...chatConfig, color: color.value })}
                      className={`w-8 h-8 rounded-full ${color.class} ${
                        chatConfig.color === color.value ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Course selection */}
              {courses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('chat.new.courseOptional')}
                  </label>
                  <select
                    value={chatConfig.courseId || ''}
                    onChange={(e) => setChatConfig({ ...chatConfig, courseId: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{t('chat.new.noCourse')}</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>{course.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Initial message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('chat.new.firstMessage')}
                </label>
                <textarea
                  value={chatConfig.initialMessage}
                  onChange={(e) => setChatConfig({ ...chatConfig, initialMessage: e.target.value })}
                  placeholder={t('chat.new.helloPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                {chatConfig.category === 'complaint' ? t('chat.new.writeYourComplaint') : t('chat.new.writeYourSuggestion')}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('chat.new.subject')}
                </label>
                <input
                  type="text"
                  value={chatConfig.name}
                  onChange={(e) => setChatConfig({ ...chatConfig, name: e.target.value })}
                  placeholder={chatConfig.category === 'complaint' ? t('chat.new.complaintSubjectPlaceholder') : t('chat.new.suggestionSubjectPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('chat.new.details')}
                </label>
                <textarea
                  value={chatConfig.initialMessage}
                  onChange={(e) => setChatConfig({ ...chatConfig, initialMessage: e.target.value })}
                  placeholder={t('chat.new.writeAllPlaceholder')}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          {step > 1 && step !== 4 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {t('chat.new.back')}
            </button>
          ) : (
            <div />
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={selectedUsers.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('chat.new.next')}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {t('chat.new.create')}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={handleSupportSubmit}
              disabled={!chatConfig.name || !chatConfig.initialMessage}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('chat.new.send')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Context Picker Modal
function ContextPickerModal({ onClose, onSelect }) {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/chats/courses');
        setCourses(response.data.data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('chat.context.header')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : courses.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t('chat.context.noCourses')}</p>
          ) : (
            <div className="space-y-2">
              {courses.map(course => (
                <div key={course._id}>
                  <button
                    onClick={() => setExpandedCourse(expandedCourse === course._id ? null : course._id)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <FiBook className="w-5 h-5 text-indigo-600" />
                      <span className="font-medium text-gray-900 dark:text-white">{course.title}</span>
                    </div>
                    <FiMoreVertical className={`w-4 h-4 text-gray-400 transition-transform ${expandedCourse === course._id ? 'rotate-90' : ''}`} />
                  </button>

                  {expandedCourse === course._id && (
                    <div className="ml-8 mt-2 space-y-1">
                      {/* Select whole course */}
                      <button
                        onClick={() => onSelect({
                          type: 'course',
                          courseId: course._id,
                          title: course.title,
                        })}
                        className="w-full text-left p-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                      >
                        📚 {t('chat.context.wholeCourse')}
                      </button>

                      {/* Topics and lessons */}
                      {course.topics?.map((topic, topicIndex) => (
                        <div key={topic._id || topicIndex}>
                          <button
                            onClick={() => onSelect({
                              type: 'topic',
                              courseId: course._id,
                              topicId: topic._id,
                              title: `${course.title} > ${topic.title}`,
                            })}
                            className="w-full text-left p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            📁 {topic.title}
                          </button>
                          {topic.lessons?.map((lesson, lessonIndex) => (
                            <button
                              key={lesson._id || lessonIndex}
                              onClick={() => onSelect({
                                type: 'lesson',
                                courseId: course._id,
                                topicId: topic._id,
                                lessonId: lesson._id,
                                title: `${course.title} > ${topic.title} > ${lesson.title}`,
                              })}
                              className="w-full text-left p-2 pl-6 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              📄 {lesson.title}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
