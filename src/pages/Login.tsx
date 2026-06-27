import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';

// Regex profissional para validação de e-mail
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [modoCadastro, setModoCadastro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [sucessoRecuperacao, setSucessoRecuperacao] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Sanitização básica do e-mail (trim)
    const emailSanitizado = email.trim();

    // Validação de e-mail com regex
    if (!emailRegex.test(emailSanitizado)) {
      setErro('Por favor, insira um e-mail válido.');
      return;
    }

    // Validação de senha mínima
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true);

    try {
      if (modoCadastro) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailSanitizado, senha);
        const novoUser = userCredential.user;
        
        // Cria documento do lojista no Firestore
        await setDoc(doc(db, 'lojistas', novoUser.email || ''), {
          nome: novoUser.displayName || 'Usuário',
          email: novoUser.email,
          whatsapp: '',
          localizacao: '',
          emailDono: novoUser.email
        });
      } else {
        await signInWithEmailAndPassword(auth, emailSanitizado, senha);
      }
    } catch (err: any) {
      // Tratamento de erros específicos do Firebase
      if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-email') {
        setErro('E-mail inválido.');
      } else if (err.code === 'auth/user-disabled') {
        setErro('Usuário desativado.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErro('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/weak-password') {
        setErro('Senha muito fraca.');
      } else {
        setErro('Erro na autenticação. Verifique os dados.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    
    // Sanitização e validação de e-mail
    const emailSanitizado = email.trim();
    if (!emailRegex.test(emailSanitizado)) {
      setErro('Por favor, insira um e-mail válido.');
      return;
    }

    setCarregando(true);

    try {
      await sendPasswordResetEmail(auth, emailSanitizado);
      setSucessoRecuperacao(true);
    } catch (err: any) {
      if (err.code === 'auth/invalid-email') {
        setErro('E-mail inválido.');
      } else if (err.code === 'auth/user-not-found') {
        setErro('Não há conta associada a este e-mail.');
      } else {
        setErro('Erro ao enviar e-mail de recuperação. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="app-card" style={{ zIndex: 1000 }}>
      <h2 style={{ zIndex: 100 }}>
        {modoRecuperacao ? 'Recuperar Senha' : (modoCadastro ? 'Cadastro' : 'Login')}
      </h2>
      
      {sucessoRecuperacao ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#4CAF50', marginBottom: '20px' }}>
            Um e-mail de recuperação foi enviado para o endereço cadastrado!
          </p>
          <Button 
            onClick={() => {
              setModoRecuperacao(false);
              setSucessoRecuperacao(false);
              setEmail('');
            }} 
            className="btn-responsivo"
            style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', zIndex: 100 }}
          >
            Voltar ao Login
          </Button>
        </div>
      ) : (
        <form onSubmit={modoRecuperacao ? handleRecuperarSenha : handleSubmit} style={{ zIndex: 100 }}>
          <Input 
            type="email" 
            className="campo" 
            placeholder="E-mail" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          
          {!modoRecuperacao && (
            <Input 
              type="password" 
              className="campo" 
              placeholder="Senha (mínimo 6 caracteres)" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
            />
          )}

          {erro && <p style={{ color: 'red', zIndex: 100, marginTop: '10px' }}>{erro}</p>}
          
          <Button 
            type="submit" 
            className="btn-responsivo" 
            disabled={carregando} 
            style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', zIndex: 100, marginTop: '15px' }}
          >
            {carregando ? 'Carregando...' : (modoRecuperacao ? 'Enviar E-mail' : (modoCadastro ? 'Cadastrar' : 'Entrar'))}
          </Button>
        </form>
      )}
      
      {!modoRecuperacao && !sucessoRecuperacao && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', zIndex: 100 }}>
          {!modoCadastro && (
            <Button 
              onClick={() => setModoRecuperacao(true)} 
              className="btn-responsivo"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a73e8', zIndex: 100, padding: '0' }}
              disabled={carregando}
            >
              Esqueceu sua senha?
            </Button>
          )}
          
          <Button 
            onClick={() => {
              setModoCadastro(!modoCadastro);
              setErro('');
            }} 
            className="btn-responsivo"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1a73e8', zIndex: 100 }}
            disabled={carregando}
          >
            {modoCadastro ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </Button>
        </div>
      )}
    </div>
  );
}
