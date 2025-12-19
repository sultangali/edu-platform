import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  const location = useLocation();
  
  // Pages where we don't want to show footer
  const noFooterPaths = ['/chat', '/courses/:id/learn'];
  const hideFooter = noFooterPaths.some(path => {
    if (path.includes(':')) {
      const regex = new RegExp('^' + path.replace(/:[^/]+/g, '[^/]+') + '$');
      return regex.test(location.pathname);
    }
    return location.pathname === path;
  });

  // Pages where we don't want to show navbar
  const noNavbarPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const hideNavbar = noNavbarPaths.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && !hideNavbar && <Footer />}
    </div>
  );
};

export default Layout;

