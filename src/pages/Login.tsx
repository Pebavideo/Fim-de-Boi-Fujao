import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase/config';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
    console.log('Botão Google clicado');
    setCarregando(true);

    if (!isFirebaseConfigured) {
      console.error('Não foi possível iniciar o login com Google porque a configuração do Firebase ainda está em modo placeholder.');
      setCarregando(false);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email?.trim();

      if (!email) {
        console.error('Login com Google concluído, mas o e-mail autenticado não foi retornado pela sessão.');
        return;
      }

      const userDocRef = doc(db, 'lojistas', email);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        navigate('/painel-principal');
      } else {
        navigate('/completar-cadastro');
      }
    } catch (err: any) {
      console.error('Falha no fluxo de login com Google', {
        code: err?.code,
        message: err?.message,
        stack: err?.stack
      });
    } finally {
      setCarregando(false);
    }
  };

  const handleFechar = () => {
    console.log('Botão Fechar clicado');
    navigate('/');
  };

  if (limpandoSessao) {
    return (
      <div className="app-card auth-card" style={{ textAlign: 'center', color: '#5b6577' }}>
        Carregando...
      </div>
    );
  }

  return (
    <div className="app-card auth-card" style={{ zIndex: 1000, position: 'relative' }}>
      <button
        type="button"
        onClick={handleFechar}
        aria-label="Fechar login"
        className="btn-interativo"
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 2100,
          background: '#f7f9fd',
          color: '#8a93a6',
          border: 'none',
          borderRadius: '999px',
          width: '34px',
          height: '34px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '15px'
        }}
      >
        ✕
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '8px' }}>
        <img
          src="/assets/logo192.png"
          alt="Fim de Boi Fujão"
          style={{ width: '64px', height: '64px', borderRadius: '16px', marginBottom: '18px', boxShadow: '0 8px 20px rgba(26,115,232,0.25)' }}
        />
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Fim de Boi Fujão</h2>
        <p style={{ margin: '8px 0 0', color: '#8a93a6', fontSize: '0.9rem' }}>
          Monitoramento inteligente da sua fazenda
        </p>
      </div>

      <div style={{ marginTop: '32px' }}>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={carregando}
          className="btn-interativo"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#ffffff',
            color: '#1a2233',
            border: '1.5px solid #e3e8f2',
            padding: '15px',
            borderRadius: '10px',
            width: '100%',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(16,24,40,0.06)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.6-.2-3.1-.9-4.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.5 29.6 4.5 24 4.5c-7.5 0-13.9 4.3-17.1 10.5z"/>
            <path fill="#4CAF50" d="M24 45.5c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4c-2 1.5-4.6 2.4-7.6 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 40.9 16.4 45.5 24 45.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C41.5 35.9 44.5 30.9 44.5 25c0-1.6-.2-3.1-.9-4.5z"/>
          </svg>
          {carregando ? 'Conectando...' : 'Entrar com Google'}
        </button>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <p style={{ color: '#8a93a6', fontSize: '13px', margin: 0 }}>Acesso exclusivo para lojistas.</p>
      </div>
    </div>
  );
}
