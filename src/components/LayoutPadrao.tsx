import { ReactNode } from 'react';
import TopNav from './TopNav';

interface LayoutPadraoProps {
  children: ReactNode;
}

export default function LayoutPadrao({ children }: LayoutPadraoProps) {
  return (
    <div className="layout-wrapper">
      <style>{`
        .layout-wrapper{display:flex;justify-content:center;width:100%;padding:28px 15px;box-sizing:border-box}
        .layout-inner{width:90%;max-width:1200px;background:#ffffff;border-radius:20px;box-shadow:0 20px 45px rgba(16,24,40,0.10);padding:28px 32px 32px;box-sizing:border-box;min-height:100%;position:relative;border:1px solid #edf1f8}
        @media (max-width:600px){
          .layout-wrapper{padding:0}
          .layout-inner{width:100%;padding:16px;border-radius:0;border:none;min-height:100vh}
        }
      `}</style>

      <div className="layout-inner">
        <TopNav />
        <main>{children}</main>
      </div>
    </div>
  );
}
