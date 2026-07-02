import { useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';
import './TopNav.css';

const navItems = [
  { label: 'Painel', path: '/painel-principal' },
  { label: 'Monitoramento', path: '/monitoramento' },
  { label: 'Cadastro', path: '/cadastro-animais' },
  { label: 'Pastos', path: '/gestao-pastos' },
  { label: 'Lotes', path: '/gestao-lotes' },
  { label: 'Completar Cadastro', path: '/completar-cadastro' },
  { label: 'Consulta Precisão', path: '/animal/1' },
  { label: 'Lote Detail', path: '/lote/1' }
];

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="btn-responsivo"
            style={{
              background: active ? '#1a73e8' : '#f0f4ff',
              color: active ? '#fff' : '#1a73e8',
              border: active ? 'none' : '1px solid #1a73e8',
              padding: '12px 18px',
              borderRadius: '10px',
              minWidth: '140px',
              textAlign: 'center',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
