import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { logoutSeguro } from '../utils/auth';
import { Radar, Map, ClipboardPlus, Trees, Boxes, LogOut, TriangleAlert, CheckCheck } from 'lucide-react';
import Button from '../components/Button';
import LayoutPadrao from '../components/LayoutPadrao';

const acessosRapidos = [
  { label: 'Monitoramento', desc: 'Acompanhe seu rebanho em tempo real', path: '/monitoramento', icon: Radar, color: '#10b981' },
  { label: 'Mapa de Monitoramento', desc: 'Visualize pastos e localização no mapa', path: '/mapa-monitoramento', icon: Map, color: '#0ea5e9' },
  { label: 'Cadastro de Animais', desc: 'Registre novos animais e lotes', path: '/cadastro-animais', icon: ClipboardPlus, color: '#1a73e8' },
  { label: 'Gestão de Pastos', desc: 'Gerencie áreas e cercas virtuais', path: '/gestao-pastos', icon: Trees, color: '#16a34a' },
  { label: 'Gestão de Lotes', desc: 'Edite e organize seus lotes', path: '/gestao-lotes', icon: Boxes, color: '#f59e0b' },
];

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
      return `Bom dia, ${nome}! Um cheirinho de café passando...`;
    } else if (hora >= 12 && hora < 18) {
      return `Boa tarde, ${nome}! Um cheirinho de café passando...`;
    } else {
      return `Boa noite, ${nome}! Um cheirinho de café passando...`;
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
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e3e8f2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/assets/logo192.png" alt="Boi Fujão" style={{ width: '56px', height: '56px', borderRadius: '14px', boxShadow: '0 6px 16px rgba(26,115,232,0.18)' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Painel Principal</h2>
            <p style={{ margin: '4px 0 0', color: '#5b6577', fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.4 }}>
              {getSaudacaoCompleta()}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={() => navigate('/cadastro-animais')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700 }}>
            <ClipboardPlus size={16} strokeWidth={2.5} /> Novo Cadastro
          </Button>
          <Button onClick={handleLogout} className="btn-responsivo" style={{ fontSize: '0.85rem', color: '#dc2626', background: '#fdecec', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700 }}>
            <LogOut size={16} strokeWidth={2.5} /> Sair
          </Button>
        </div>
      </div>

      {alertas.length > 0 && (
        <div style={{ marginBottom: '28px', padding: '20px', border: '1px solid #f5c6cb', borderRadius: 'var(--radius-lg)', backgroundColor: '#fdecec' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginTop: 0, marginBottom: '15px', fontSize: '1.05rem' }}>
            <TriangleAlert size={18} /> Alertas de Geofencing ({alertas.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {alertas.map(alerta => (
              <div key={alerta.id} style={{ background: 'white', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #f3c6c9', boxShadow: 'var(--shadow-sm)' }}>
                <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#dc2626' }}>Animal Fora do Pasto!</p>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#3a4150' }}>Brinco: {alerta.idBrinco}</p>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#3a4150' }}>Pasto: {alerta.pastoNome}</p>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#8a93a6' }}>
                  {alerta.timestamp?.toDate().toLocaleString('pt-BR') || 'Data não disponível'}
                </p>
                <button
                  onClick={() => handleMarcarComoLido(alerta.id)}
                  className="btn-interativo"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    padding: '8px 14px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  <CheckCheck size={14} /> Marcar como Lido
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1a2233' }}>Acessos Rápidos</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {acessosRapidos.map(({ label, desc, path, icon: Icon, color }) => (
          <Link key={path} to={path} style={{ textDecoration: 'none' }}>
            <div
              className="btn-interativo"
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #e3e8f2',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                height: '100%'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Icon size={22} color={color} strokeWidth={2.25} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', color: '#1a2233', fontSize: '1rem' }}>{label}</h3>
              <p style={{ margin: 0, color: '#8a93a6', fontSize: '0.85rem', lineHeight: 1.4 }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </LayoutPadrao>
  );
}
