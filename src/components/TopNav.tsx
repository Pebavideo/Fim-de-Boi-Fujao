import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Radar,
  ClipboardPlus,
  Trees,
  Boxes,
  UserCog,
  Search,
  Layers,
} from 'lucide-react';
import './TopNav.css';

const navItems = [
  { label: 'Painel', path: '/painel-principal', icon: LayoutDashboard },
  { label: 'Monitoramento', path: '/monitoramento', icon: Radar },
  { label: 'Cadastro', path: '/cadastro-animais', icon: ClipboardPlus },
  { label: 'Pastos', path: '/gestao-pastos', icon: Trees },
  { label: 'Editar Lote', path: '/gestao-lotes', icon: Boxes },
  { label: 'Completar Cadastro', path: '/completar-cadastro', icon: UserCog },
  { label: 'Consulta Precisão', path: '/animal/1', icon: Search },
  { label: 'Detalhes do Lote', path: '/lote/1', icon: Layers },
];

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="top-nav" aria-label="Navegação principal">
      <div className="top-nav__brand">
        <img src="/assets/logo192.png" alt="" className="top-nav__brand-icon" />
        <span>Fim de Boi Fujão</span>
      </div>
      <div className="top-nav__links">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`top-nav__link${active ? ' top-nav__link--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
