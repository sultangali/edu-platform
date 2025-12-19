import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuth } from './context/authStore';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));

const Courses = lazy(() => import('./pages/courses/Courses'));
const CourseDetail = lazy(() => import('./pages/courses/CourseDetail'));
const CourseLearn = lazy(() => import('./pages/courses/CourseLearn'));
const MyCourses = lazy(() => import('./pages/courses/MyCourses'));

const Profile = lazy(() => import('./pages/profile/Profile'));
const Settings = lazy(() => import('./pages/profile/Settings'));
const Analytics = lazy(() => import('./pages/profile/Analytics'));

const Chat = lazy(() => import('./pages/chat/Chat'));

const Certificates = lazy(() => import('./pages/certificates/Certificates'));
const CertificateView = lazy(() => import('./pages/certificates/CertificateView'));
const CertificateVerify = lazy(() => import('./pages/certificates/CertificateVerify'));

const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherCourses = lazy(() => import('./pages/teacher/TeacherCourses'));
const CreateCourse = lazy(() => import('./pages/teacher/CreateCourse'));
const EditCourse = lazy(() => import('./pages/teacher/EditCourse'));
const CourseEditor = lazy(() => import('./pages/teacher/CourseEditor'));
const Submissions = lazy(() => import('./pages/teacher/Submissions'));

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminCourses = lazy(() => import('./pages/admin/Courses'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));

const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="certificates/verify/:id" element={<CertificateVerify />} />

          {/* Protected routes for authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="my-courses" element={<MyCourses />} />
            <Route path="courses/:id/learn" element={<CourseLearn />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:id" element={<Chat />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="certificates/:id" element={<CertificateView />} />
          </Route>

          {/* Teacher routes */}
          <Route element={<ProtectedRoute allowedRoles={['instructor', 'admin']} />}>
            <Route path="teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="teacher/courses" element={<TeacherCourses />} />
            <Route path="teacher/courses/create" element={<CreateCourse />} />
            <Route path="teacher/courses/:id/edit" element={<EditCourse />} />
            <Route path="teacher/courses/:id/editor" element={<CourseEditor />} />
            <Route path="teacher/submissions" element={<Submissions />} />
            <Route path="teacher/submissions/:courseId/:assignmentId/:studentId" element={<Submissions />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/courses" element={<AdminCourses />} />
            <Route path="admin/analytics" element={<AdminAnalytics />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Auth routes without layout */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="auth/callback" element={<AuthCallback />} />
      </Routes>
    </Suspense>
  );
}

export default App;

