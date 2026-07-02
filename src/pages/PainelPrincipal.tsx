import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { logoutSeguro } from '../utils/auth';
import Button from '../components/Button';
import LayoutPadrao from '../components/LayoutPadrao';

interface DadosLojista {
  nome: string;
  whatsapp: string;
  localizacao: string;
}

interface Alerta {
  id: string;
  animalId: string;
  idBrinco: string;
  pastoId: string;
  pastoNome: string;
  timestamp: any;
  status: 'pendente' | 'lido';
  latitude: number;
  longitude: number;
}

console.log('🚀 PainelPrincipal.tsx está carregando!');

export default function PainelPrincipal() {
  const navigate = useNavigate();
  const [dadosLojista, setDadosLojista] = useState<DadosLojista | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  console.log('🎨 Renderizando PainelPrincipal COMPLETO!');

  const getSaudacaoCompleta = () => {
    const hora = new Date().getHours();
    const nome = dadosLojista?.nome || 'lojista';
    
    if (hora >= 5 && hora < 12) {
      return `Bom dia, ${nome}! Hum, estou sentindo o cheirinho de café...`;
    } else if (hora >= 12 && hora < 18) {
      return `Boa tarde, ${nome}!`;
    } else {
      return `Boa noite, ${nome}!`;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (user?.email) {
        try {
          const docRef = doc(db, 'lojistas', user.email);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setDadosLojista(docSnap.data() as DadosLojista);
          }

          // Carregar alertas pendentes
          const alertasRef = collection(db, 'Alertas');
          const qAlertas = query(alertasRef, where('status', '==', 'pendente'));
          const snapshotAlertas = await getDocs(qAlertas);
          const listaAlertas = snapshotAlertas.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Alerta[];
          setAlertas(listaAlertas);

        } catch (error) {
          console.error('Erro ao carregar dados do lojista ou alertas:', error);
        }
      }
    };
    carregarDados();
  }, []);

  const handleMarcarComoLido = async (alertaId: string) => {
    try {
      const alertaRef = doc(db, 'Alertas', alertaId);
      await updateDoc(alertaRef, { status: 'lido' });
      setAlertas(prevAlertas => prevAlertas.filter(alerta => alerta.id !== alertaId));
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
    }
  };

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      try {
        await logoutSeguro();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  return (
    <LayoutPadrao>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src="/assets/avatar-boi.svg" alt="Boi Fujão" style={{ width: '60px', height: '60px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ margin: 0 }}>Painel Principal</h2>
            <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
              {getSaudacaoCompleta()}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', zIndex: 100 }}>
          <Button onClick={() => navigate('/cadastro-animais')} className="btn-responsivo" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            Novo Cadastro
          </Button>
          <Button onClick={handleLogout} className="btn-responsivo" style={{ fontSize: '12px', color: 'white', background: '#ff4444', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            SAIR
          </Button>
        </div>
      </div>

      {alertas.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', border: '2px solid #f44336', borderRadius: '15px', backgroundColor: '#ffebee' }}>
          <h3 style={{ color: '#f44336', marginTop: 0, marginBottom: '15px' }}>Alertas de Geofencing ({alertas.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
            {alertas.map(alerta => (
              <div key={alerta.id} style={{ background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #ef9a9a', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: '#d32f2f' }}>Animal Fora do Pasto!</p>
                <p style={{ margin: '0 0 5px 0' }}>Brinco: {alerta.idBrinco}</p>
                <p style={{ margin: '0 0 5px 0' }}>Pasto: {alerta.pastoNome}</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#777' }}>
                  {alerta.timestamp?.toDate().toLocaleString('pt-BR') || 'Data não disponível'}
                </p>
                <button
                  onClick={() => handleMarcarComoLido(alerta.id)}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Marcar como Lido
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px', background: '#fffbeb', padding: '20px', borderRadius: '15px', border: '2px dashed #f97316' }}>
        <Link to="/monitoramento" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>1. Monitoramento</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/monitoramento</p>
          </div>
        </Link>

        <Link to="/mapa-monitoramento" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>2. Mapa Monitoramento</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/mapa-monitoramento</p>
          </div>
        </Link>

        <Link to="/painel-principal" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>3. Painel Principal</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/painel-principal</p>
          </div>
        </Link>

        <Link to="/cadastro-animais" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>4. Cadastro Animais</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/cadastro-animais</p>
          </div>
        </Link>

        <Link to="/gestao-pastos" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>5. Gestão Pastos</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/gestao-pastos</p>
          </div>
        </Link>

        <Link to="/gestao-lotes" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>6. Gestão Lotes</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/gestao-lotes</p>
          </div>
        </Link>

        <Link to="/completar-cadastro" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '2px solid #10b981', zIndex: 1001, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#10b981', fontSize: '18px' }}>7. Completar Cadastro</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>/completar-cadastro</p>
          </div>
        </Link>
      </div>
    </LayoutPadrao>
  );
}
