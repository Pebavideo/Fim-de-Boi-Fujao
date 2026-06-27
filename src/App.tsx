import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import Login from './pages/Login';
import Monitoramento from './pages/Monitoramento';
import PainelPrincipal from './pages/PainelPrincipal';
import CadastroAnimais from './pages/CadastroAnimais';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <BrowserRouter>
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
          path="*" 
          element={<Navigate to={user ? "/monitoramento" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
