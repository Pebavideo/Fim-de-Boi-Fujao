import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { auth } from './firebase/config';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Monitoramento = lazy(() => import('./pages/Monitoramento'));
const PainelPrincipal = lazy(() => import('./pages/PainelPrincipal'));
const CadastroAnimais = lazy(() => import('./pages/CadastroAnimais'));
const CompletarCadastro = lazy(() => import('./pages/CompletarCadastro'));
const GestaoPastos = lazy(() => import('./pages/GestaoPastos.tsx'));
const AnimalDetail = lazy(() => import('./pages/AnimalDetail.tsx'));
const PrivacyPolicy = lazy(() => import('./privacy/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./privacy/TermsOfUse'));

// Loading fallback component
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    Carregando...
  </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurar persistência do Firebase Auth
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Erro ao configurar persistência:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/monitoramento" replace /> : <Login />} 
            />
            <Route 
              path="/monitoramento" 
              element={user ? <Monitoramento /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/painel-principal" 
              element={user ? <PainelPrincipal /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/cadastro-animais" 
              element={user ? <CadastroAnimais /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/gestao-pastos"
              element={user ? <GestaoPastos /> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/animal/:id"
              element={user ? <AnimalDetail /> : <Navigate to="/login" replace />}
            />
            <Route 
              path="/completar-cadastro" 
              element={user ? <CompletarCadastro /> : <Navigate to="/login" replace />} 
            />
            <Route 
              path="/privacy-policy" 
              element={<PrivacyPolicy />} 
            />
            <Route 
              path="/terms-of-use" 
              element={<TermsOfUse />} 
            />
            <Route 
              path="*" 
              element={<Navigate to={user ? "/monitoramento" : "/login"} replace />} 
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
