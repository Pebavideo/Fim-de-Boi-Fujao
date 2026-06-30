import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';
import LayoutPadrao from '../components/LayoutPadrao';

const estadosBR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE'
];

export default function CompletarCadastro() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [uf, setUf] = useState('');
  const [carregando, setCarregando] = useState(false);

  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSalvar = async () => {
    const user = auth.currentUser;

    if (!user?.email) {
      alert('Sessão de autenticação inválida.');
      return;
    }

    if (!nome.trim() || !whatsapp.trim() || !localizacao.trim() || !uf) {
      alert('Preencha nome, WhatsApp, cidade e UF para continuar.');
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
        uf,
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
    <LayoutPadrao>
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
          onChange={(e) => setNome(e.target.value.replace(/[^A-Za-zÀ-ÿ\s]/g, ''))}
        />

        <Input
          type="tel"
          className="campo"
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
        />

        <Input
          type="text"
          className="campo"
          placeholder="Cidade / Localização"
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
        />

        <select
          className="campo"
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          style={{ appearance: 'none', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
        >
          <option value="">Selecione o estado (UF)</option>
          {estadosBR.map((estado) => (
            <option key={estado} value={estado}>{estado}</option>
          ))}
        </select>

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
    </LayoutPadrao>
  );
}
