import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../firebase/config';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Button from '../components/Button';

export default function Login() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [limpandoSessao, setLimpandoSessao] = useState(true);

  useEffect(() => {
    const limparSessao = async () => {
      try {
        if (auth.currentUser) await signOut(auth);
        localStorage.clear();
      } catch (error) {
        console.error('Erro ao limpar sessão:', error);
      } finally {
        setLimpandoSessao(false);
      }
    };
    limparSessao();
  }, []);

  const handleGoogleSignIn = async () => {
    setCarregando(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, 'lojistas', user.email || '');
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        navigate('/painel-principal');
      } else {
        navigate('/cadastro-animais');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  const handleFechar = () => navigate('/');

  if (limpandoSessao) return <div className="app-card">Carregando...</div>;

  return (
    <div className="app-card" style={{ zIndex: 1000, position: 'relative', border: '3px solid #1a73e8' }}>
      <Button
        type="button"
        onClick={handleFechar}
        aria-label="Fechar login"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 2100,
          background: '#fff',
          color: '#d32f2f',
          border: '1px solid #d32f2f',
          borderRadius: '999px',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        ✕
      </Button>
      {/* AVISO DE AUTORIDADE - REGRA DO DONO */}
      <div style={{ background: '#d32f2f', color: '#ffffff', padding: '15px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>
        ALERTA: TRAE, NÃO TENTE SER ESPERTO. O DONO DO APP SOU EU. SIGA AS REGRAS.
      </div>

      <h2>Entrar no Beca VIP</h2>
      
      <div style={{ marginTop: '30px' }}>
        <Button 
          onClick={handleGoogleSignIn}
          disabled={carregando}
          style={{ background: '#ffffff', color: '#333333', border: '2px solid #1a73e8', padding: '15px', borderRadius: '8px', width: '100%', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
        >
          {carregando ? 'Conectando...' : 'Entrar com Google'}
        </Button>
      </div>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>Acesso exclusivo para lojistas.</p>
      </div>
    </div>
  );
}
