import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';

interface AnimalData {
  id: string;
  [key: string]: any;
}

interface LoteData {
  id: string;
  nome_lote: string;
  animais: string[];
  data_criacao: any;
  emailDono: string;
}

function formatValue(value: any) {
  if (value === null || value === undefined) return 'Não disponível';
  if (typeof value === 'object' && value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleDateString('pt-BR');
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
}

export default function LoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lote, setLote] = useState<LoteData | null>(null);
  const [animais, setAnimais] = useState<AnimalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (!user?.email || !id) {
        setLoading(false);
        return;
      }

      try {
        // Carregar lote
        const loteRef = doc(db, 'lotes', id);
        const loteSnap = await getDoc(loteRef);
        if (!loteSnap.exists()) {
          setLoading(false);
          return;
        }

        const loteData = { id: loteSnap.id, ...loteSnap.data() } as LoteData;
        
        // Verificar se o lote pertence ao usuário
        if (loteData.emailDono !== user.email) {
          setLoading(false);
          return;
        }

        setLote(loteData);

        // Carregar animais do lote
        const animaisList: AnimalData[] = [];
        for (const animalId of loteData.animais) {
          const animalRef = doc(db, 'animais', animalId);
          const animalSnap = await getDoc(animalRef);
          if (animalSnap.exists()) {
            animaisList.push({ id: animalSnap.id, ...animalSnap.data() });
          }
        }
        setAnimais(animaisList);
      } catch (error) {
        console.error('Erro ao carregar lote:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LayoutPadrao><p>Carregando...</p></LayoutPadrao>;
  if (!lote) return <LayoutPadrao><p>Lote não encontrado.</p></LayoutPadrao>;

  return (
    <LayoutPadrao>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            background: white;
          }
          @page {
            margin: 1cm;
          }
        }
        @media screen {
          .print-area {
            background: #fafbff;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Detalhes do Lote</h2>
          <p style={{ color: '#666', marginTop: '6px', marginBottom: 0 }}>{lote.nome_lote}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/gestao-lotes')} className="btn-responsivo" style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Voltar
          </Button>
          <Button onClick={handlePrint} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Gerar Relatório de Lote
          </Button>
        </div>
      </div>

      <div className="print-area" style={{ background: 'white', borderRadius: '15px', border: '1px solid #dce4f5', padding: '20px' }}>
        {/* Cabeçalho do Relatório */}
        <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #1a73e8' }}>
          <h1 style={{ margin: 0, color: '#1a73e8' }}>Relatório de Lote</h1>
          <h2 style={{ margin: '10px 0 0 0' }}>{lote.nome_lote}</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            Data de Criação: {lote.data_criacao?.toDate().toLocaleDateString('pt-BR')}
          </p>
          <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '18px' }}>
            Total de Cabeças: {animais.length}
          </p>
        </div>

        {/* Lista de Animais */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>Ficha Técnica dos Animais</h3>
          {animais.length === 0 ? (
            <p style={{ color: '#666' }}>Nenhum animal neste lote.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {animais.map((animal, index) => (
                <div 
                  key={animal.id} 
                  style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '10px', 
                    padding: '15px', 
                    pageBreakInside: 'avoid'
                  }}
                >
                  <h4 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>
                    Animal {index + 1}: {animal.idBrinco}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: '#777' }}>Categoria:</span>
                      <div style={{ fontWeight: 'bold' }}>{formatValue(animal.categoria)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: '#777' }}>Peso:</span>
                      <div style={{ fontWeight: 'bold' }}>{formatValue(animal.peso)} kg</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: '#777' }}>Status:</span>
                      <div style={{ fontWeight: 'bold' }}>{formatValue(animal.status)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: '#777' }}>Pasto Autorizado:</span>
                      <div style={{ fontWeight: 'bold' }}>{formatValue(animal.pastoAutorizado)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: '#777' }}>Pasto Atual:</span>
                      <div style={{ fontWeight: 'bold' }}>{formatValue(animal.pastoAtual)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: '#777' }}>Data de Cadastro:</span>
                      <div style={{ fontWeight: 'bold' }}>{formatValue(animal.dataCadastro)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco de Assinatura */}
        <div style={{ borderTop: '2px solid #1a73e8', paddingTop: '30px', marginTop: '30px' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Validação Veterinária</h3>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '5px' }}>Nome do Veterinário:</label>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '5px', minHeight: '24px' }}></div>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '5px' }}>CRM:</label>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '5px', minHeight: '24px' }}></div>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '5px' }}>Data:</label>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '5px', minHeight: '24px' }}></div>
            </div>
            <div style={{ marginTop: '30px' }}>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '5px' }}>Assinatura:</label>
              <div style={{ borderBottom: '1px solid #000', paddingBottom: '5px', minHeight: '40px' }}></div>
            </div>
          </div>
        </div>
      </div>
    </LayoutPadrao>
  );
}
