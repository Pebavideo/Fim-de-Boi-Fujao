import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { logoutSeguro } from '../utils/auth';
import Button from '../components/Button';
import LayoutPadrao from '../components/LayoutPadrao';

const paginas = [
  { nome: 'Painel Principal', caminho: '/painel-principal' },
  { nome: 'Monitoramento', caminho: '/monitoramento' },
  { nome: 'Cadastro de Animais', caminho: '/cadastro-animais' },
  { nome: 'Gestão de Pastos', caminho: '/gestao-pastos' },
  { nome: 'Gestão de Lotes', caminho: '/gestao-lotes' },
  { nome: 'Completar Cadastro', caminho: '/completar-cadastro' },
  { nome: 'Detalhes Animal', caminho: '/detalhes-animal/1' },
  { nome: 'Animal Detail', caminho: '/animal/1' },
  { nome: 'Lote Detail', caminho: '/lote/1' }
];

export default function PainelPrincipal() {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (_user: User | null) => {
      setCarregando(false);
    });

    return () => unsubscribe();
  }, []);

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ margin: 0 }}>Painel Principal</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>Olá, lojista!</p>
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

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          {paginas.map((pagina, index) => (
            <Link key={index} to={pagina.caminho} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001, transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <h3 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>{pagina.nome}</h3>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{pagina.caminho}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </LayoutPadrao>
  );
}
