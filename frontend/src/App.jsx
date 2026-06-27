import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import SplashScreen from './pages/SplashScreen';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback';
import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import CommunityPage from './pages/CommunityPage';
import BattlePage from './pages/BattlePage';
import ShopPage from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import PacksPage from './pages/PacksPage';
import Navigation from './components/Layout/Navigation';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--color-bg)' }}>
      {children}
      <Navigation />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/home" : "/auth"} replace />} />
      <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/home" element={<ProtectedRoute><AppLayout><HomePage /></AppLayout></ProtectedRoute>} />
      <Route path="/collection" element={<ProtectedRoute><AppLayout><CollectionPage /></AppLayout></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute><AppLayout><CommunityPage /></AppLayout></ProtectedRoute>} />
      <Route path="/battle" element={<ProtectedRoute><AppLayout><BattlePage /></AppLayout></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute><AppLayout><ShopPage /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/packs"   element={<ProtectedRoute><AppLayout><PacksPage /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
