import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';

export default function CompletarCadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSalvar = async () => {
    const user = auth.currentUser;

    if (!user?.email) {
      alert('Sessão de autenticação inválida.');
      return;
    }

    if (!nome.trim() || !whatsapp.trim() || !localizacao.trim()) {
      alert('Preencha nome, WhatsApp e localização para continuar.');
      return;
    }

    setCarregando(true);

    try {
      const docId = user.email;
      await setDoc(doc(db, 'lojistas', docId), {
        uid: user.uid,
        nome: nome.trim(),
        email: user.email,
        whatsapp: whatsapp.trim(),
        localizacao: localizacao.trim(),
        emailDono: user.email,
      });

      navigate('/painel-principal');
    } catch (error) {
      console.error('Erro ao completar cadastro:', error);
      alert('Não foi possível salvar os dados. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="app-card" style={{ zIndex: 1000, position: 'relative' }}>
      <h2 style={{ marginBottom: '20px' }}>Completar Cadastro</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Finalize seu cadastro para continuar usando o app.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Input
          type="text"
          className="campo"
          placeholder="Nome completo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <Input
          type="tel"
          className="campo"
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />

        <Input
          type="text"
          className="campo"
          placeholder="Cidade / Localização"
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
        />

        <Button
          onClick={handleSalvar}
          disabled={carregando}
          className="btn-responsivo"
          style={{
            background: '#1a73e8',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
        >
          {carregando ? 'Salvando...' : 'Salvar cadastro'}
        </Button>
      </div>
    </div>
  );
}
