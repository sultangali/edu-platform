# EduPlatform - Онлайн білім беру платформасы

Толық функционалды білім беру платформасы - оқытушылар курстар құра алады, студенттер оқып, сертификат ала алады.

## 🚀 Технологиялар

### Backend
- **Node.js** + **Express.js** - API серверi
- **MongoDB** + **Mongoose** - Деректер қоры
- **JWT** - Аутентификация
- **Passport.js** - Google OAuth
- **Socket.io** - Real-time чат
- **Nodemailer** - Email жіберу
- **Multer** - Файл жүктеу
- **Google Gemini AI** - AI көмекші

### Frontend
- **React 18** + **Vite** - UI framework
- **Tailwind CSS** - Стильдеу
- **React Router v6** - Маршруттау
- **Zustand** - State management
- **i18next** - Мультиязычность (KAZ, RUS, ENG)
- **Framer Motion** - Анимациялар
- **Chart.js** - Графиктер
- **TipTap** - Rich text редактор
- **React Player** - Видео ойнату

## 📋 Функционалдар

### Студент
- ✅ Тіркелу (Email + Google OAuth)
- ✅ Email верификация
- ✅ Профиль редакциялау
- ✅ Курстарды қарау және жазылу
- ✅ Курстарды өту (видео, мәтін, аудио)
- ✅ Тесттерді тапсыру
- ✅ Тапсырмаларды жіберу
- ✅ Прогресс трекері
- ✅ Аналитика және статистика
- ✅ Сертификат алу
- ✅ Оқытушымен чат

### Оқытушы / Админ
- ✅ Курстар құру және редакциялау
- ✅ Markdown редактор
- ✅ Видео/аудио жүктеу
- ✅ Тесттер құру
- ✅ Тапсырмалар құру
- ✅ Студент жауаптарын тексеру
- ✅ AI көмекші (Gemini)
  - Контент генерациялау
  - Жауаптарды бағалау
  - Ұсыныстар беру
- ✅ Студенттермен чат

### Админ
- ✅ Пайдаланушыларды басқару
- ✅ Курстарды басқару
- ✅ Платформа аналитикасы
- ✅ Сертификаттарды басқару

## 🛠️ Орнату

### Талаптар
- Node.js >= 18
- MongoDB >= 6.0
- npm немесе yarn

### 1. Жобаны клондау
```bash
git clone <repository-url>
cd edu-platform
```

### 2. Тәуелділіктерді орнату
```bash
npm run install:all
```

### 3. Environment орнату

Server үшін `.env` файл құру (`server/.env`):

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/edu-platform

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=EduPlatform <noreply@eduplatform.com>

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Frontend URL
CLIENT_URL=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=52428800
UPLOAD_PATH=uploads
```

### 4. Админ пайдаланушы құру
```bash
cd server
npm run seed
```

Бұл команда әдепкі админ құрады:
- **Email:** admin@eduplatform.kz
- **Password:** Admin123!

⚠️ Production-да паролді өзгертіңіз!

### 5. Жобаны іске қосу

Development режимінде (client + server бірге):
```bash
npm run dev
```

Немесе бөлек:
```bash
# Backend
cd server && npm run dev

# Frontend (жаңа терминал)
cd client && npm run dev
```

Қосымшалар мекенжайлары:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- API Health Check: http://localhost:5000/api/health

## 📁 Жоба құрылымы

```
edu-platform/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI компоненттері
│   │   ├── pages/          # Беттер
│   │   ├── context/        # State management (Zustand)
│   │   ├── services/       # API сервистері
│   │   ├── hooks/          # Custom hooks
│   │   ├── i18n/           # Локализация
│   │   └── utils/          # Көмекші функциялар
│   ├── public/
│   └── index.html
│
├── server/                 # Backend (Express.js)
│   ├── config/             # Конфигурация
│   ├── controllers/        # Route handlers
│   ├── models/             # Mongoose модельдері
│   ├── routes/             # API маршруттары
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic
│   ├── utils/              # Көмекші функциялар
│   └── uploads/            # Жүктелген файлдар
│
└── package.json            # Root package.json
```

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` - Тіркелу
- `POST /api/auth/login` - Кіру
- `GET /api/auth/me` - Ағымдағы пайдаланушы
- `PUT /api/auth/profile` - Профиль жаңарту
- `PUT /api/auth/password` - Пароль өзгерту
- `GET /api/auth/google` - Google OAuth

### Courses
- `GET /api/courses` - Курстар тізімі
- `GET /api/courses/:slug` - Курс мәліметтері
- `POST /api/courses` - Курс құру (Teacher)
- `PUT /api/courses/:id` - Курс жаңарту
- `POST /api/courses/:id/enroll` - Курсқа жазылу

### Progress
- `GET /api/progress/:courseId` - Курс прогресі
- `POST /api/progress/:courseId/lessons/:lessonId/complete` - Сабақты аяқтау
- `POST /api/progress/:courseId/tests/:testId/submit` - Тест тапсыру
- `GET /api/progress/analytics` - Студент аналитикасы

### Chat
- `GET /api/chats` - Чаттар тізімі
- `POST /api/chats` - Жаңа чат
- `POST /api/chats/:id/messages` - Хабарлама жіберу

### AI (Teacher only)
- `POST /api/ai/generate-content` - Контент генерациялау
- `POST /api/ai/grade-suggestion` - Бағалау ұсынысы
- `POST /api/ai/chat` - AI көмекшімен сөйлесу

## 🎨 Дизайн жүйесі

Жоба кастом түс палитрасын пайдаланады:

- **Primary (Deep Twilight):** Негізгі түс - қою көк
- **Secondary (French Blue):** Екінші түс - көгілдір
- **Accent (Bright Teal Blue):** Акцент - жарық көгілдір
- **Turquoise/Cyan/Teal:** Қосымша түстер

Tailwind CSS конфигурациясында (`client/tailwind.config.js`) барлық түстер анықталған.

## 🌍 Локализация

Қолдау көрсетілетін тілдер:
- 🇰🇿 Қазақша (kaz) - әдепкі
- 🇷🇺 Русский (rus)
- 🇬🇧 English (eng)

Аудармалар: `client/src/i18n/locales/`

## 🔧 Production Deployment

### Build
```bash
npm run build
```

### Server іске қосу
```bash
npm start
```

### Ұсыныстар
1. MongoDB Atlas қолданыңыз
2. Environment variables қауіпсіз сақтаңыз
3. HTTPS қолданыңыз
4. Rate limiting орнатыңыз
5. Файлдарды S3/Cloud Storage сақтаңыз

## 📝 Лицензия

MIT License

## 👤 Автор

EduPlatform Team
---

**Сұрақтар болса:** info@eduplatform.kz


