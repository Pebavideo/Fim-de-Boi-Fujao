import { ReactNode } from 'react';
import TopNav from './TopNav';

interface LayoutPadraoProps {
  children: ReactNode;
}

export default function LayoutPadrao({ children }: LayoutPadraoProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '20px 15px', boxSizing: 'border-box' }}>
      <div
        style={{
          width: '90%',
          maxWidth: '1200px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          padding: '25px',
          boxSizing: 'border-box',
          minHeight: '100%',
          position: 'relative'
        }}
      >
        <TopNav />
        <main>{children}</main>
      </div>
    </div>
  );
}
