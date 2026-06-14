import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout       from './components/layout/Layout';
import Login        from './pages/Login';
import Splash       from './pages/Splash';
import Unauthorized from './pages/Unauthorized';
import RDJForm      from './pages/agent/RDJForm';
import MyHistory    from './pages/agent/MyHistory';
import Dashboard    from './pages/dg/Dashboard';
import Analyses     from './pages/dg/Analyses';
import Alertes      from './pages/dg/Alertes';
import AdminPanel   from './pages/admin/AdminPanel';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cnssap-bg">
      <div className="text-center">
        <img src="/logo.jpeg" alt="CNSSAP" className="w-14 h-14 rounded-xl object-cover mx-auto mb-3" />
        <p className="text-cnssap-dim text-sm">Chargement…</p>
      </div>
    </div>
  );
}

// Si non connecté → /login  (pas /splash — la splash est l'entrée volontaire)
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { userProfile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!userProfile || !roles.includes(userProfile.role))
    return <Navigate to="/non-autorise" replace />;
  return children;
}

// Redirige vers la bonne page selon le rôle
function HomeRedirect() {
  const { userProfile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!userProfile) return <Navigate to="/login" replace />;
  if (userProfile.role === 'dg' || userProfile.role === 'drh')
    return <Navigate to="/dashboard" replace />;
  return <Navigate to="/rdj" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Entrée de l'app — toujours la splash, sans vérification d'auth */}
      <Route path="/"       element={<Splash />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/login"  element={<Login />} />

      {/* Pages protégées dans le Layout */}
      <Route
        path="/app"
        element={<ProtectedRoute><Layout /></ProtectedRoute>}
      >
        <Route index element={<HomeRedirect />} />
        <Route path="rdj"          element={<RDJForm />} />
        <Route path="historique"   element={<MyHistory />} />
        <Route path="dashboard"
          element={<RoleRoute roles={['dg','drh']}><Dashboard /></RoleRoute>} />
        <Route path="analyses"
          element={<RoleRoute roles={['dg','drh']}><Analyses /></RoleRoute>} />
        <Route path="alertes"
          element={<RoleRoute roles={['dg','drh']}><Alertes /></RoleRoute>} />
        <Route path="admin"
          element={<RoleRoute roles={['drh']}><AdminPanel /></RoleRoute>} />
        <Route path="non-autorise" element={<Unauthorized />} />
        <Route path="*"            element={<Navigate to="/app" replace />} />
      </Route>

      {/* Toute URL inconnue → splash */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
