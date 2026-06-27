interface BotaoPadraoProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  zIndex?: number;
}

export default function BotaoPadrao({ 
  children, 
  className = "", 
  onClick, 
  zIndex = 1000 
}: BotaoPadraoProps) {
  return (
    <button
      className={className}
      onClick={onClick}
      style={{ zIndex }}
    >
      {children}
    </button>
  );
}
