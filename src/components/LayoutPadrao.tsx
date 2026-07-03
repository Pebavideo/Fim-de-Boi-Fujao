import { ReactNode } from 'react';
import TopNav from './TopNav';

interface LayoutPadraoProps {
  children: ReactNode;
}

export default function LayoutPadrao({ children }: LayoutPadraoProps) {
  return (
    <div className="layout-wrapper">
      <style>{`
        .layout-wrapper{display:flex;justify-content:center;width:100%;padding:20px 15px;box-sizing:border-box}
        .layout-inner{width:90%;max-width:1200px;background:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.1);padding:25px;box-sizing:border-box;min-height:100%;position:relative}
        @media (max-width:600px){
          .layout-wrapper{padding:12px}
          .layout-inner{width:100%;padding:16px;border-radius:12px}
        }
      `}</style>

      <div className="layout-inner">
        <TopNav />
        <main>{children}</main>
      </div>
    </div>
  );
}
