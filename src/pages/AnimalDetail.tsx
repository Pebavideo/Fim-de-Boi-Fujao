import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';

interface AnimalData {
  [key: string]: any;
}

function formatValue(value: any) {
  if (value === null || value === undefined) return 'Não disponível';
  if (typeof value === 'object' && value?.seconds) {
    return new Date(value.seconds * 1000).toLocaleString('pt-BR');
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
}

export default function AnimalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<AnimalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnimal = async () => {
      const user = auth.currentUser;
      if (!user?.email || !id) {
        setLoading(false);
        return;
      }

      try {
        const animalRef = doc(db, 'animais', id);
        const animalSnap = await getDoc(animalRef);
        if (animalSnap.exists()) {
          const data = animalSnap.data();
          if (data.emailDono === user.email) {
            setAnimal({ id: animalSnap.id, ...data });
          }
        }
      } catch (error) {
        console.error('Erro ao carregar animal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnimal();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const knownFields = [
    'idBrinco',
    'categoria',
    'peso',
    'status',
    'origem',
    'dataNascimento',
    'pastoAutorizado',
    'pastoAtual',
    'foto',
    'dataCadastro',
    'historicoSaude'
  ];

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
            width: 100%;
            margin: 0;
            box-shadow: none;
            background: white;
          }
          .print-row {
            display: block !important;
            width: 100% !important;
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
          <h2>Ficha do Animal</h2>
          <p style={{ color: '#666', marginTop: '6px' }}>Confira a rastreabilidade e gere a ficha oficial para impressão.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/monitoramento')} style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Voltar
          </Button>
          <Button onClick={handlePrint} style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Gerar Ficha Oficial
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Carregando dados do animal...</p>
      ) : !animal ? (
        <p style={{ color: '#666' }}>Animal não encontrado ou acesso negado.</p>
      ) : (
        <div className="print-area" style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e0e0e0', padding: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Dados Técnicos</h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                {knownFields.filter((key) => key !== 'foto' && key !== 'historicoSaude').map((field) => (
                  <div key={field} style={{ display: 'grid', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#777', textTransform: 'capitalize' }}>{field === 'idBrinco' ? 'ID / Brinco' : field === 'dataNascimento' ? 'Data de Nascimento' : field === 'pastoAutorizado' ? 'Pasto Autorizado' : field === 'pastoAtual' ? 'Pasto Atual' : field === 'dataCadastro' ? 'Data de Cadastro' : field === 'origem' ? 'Origem' : field === 'status' ? 'Status' : field === 'categoria' ? 'Categoria' : field === 'peso' ? 'Peso (kg)' : field}</span>
                    <strong style={{ color: '#222' }}>{formatValue(animal[field])}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e0e0e0', overflow: 'hidden', minHeight: '280px' }}>
              <img
                src={animal.foto || 'https://via.placeholder.com/640x480?text=Sem+Foto'}
                alt={animal.idBrinco || 'Imagem do animal'}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e0e0e0', padding: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Histórico de Saúde</h3>
              {Array.isArray(animal.historicoSaude) && animal.historicoSaude.length > 0 ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {animal.historicoSaude.map((item: any, index: number) => (
                    <div key={item.id || index} style={{ padding: '14px', background: '#f8f9ff', borderRadius: '14px', border: '1px solid #dde2f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#1a73e8' }}>{item.tipo || 'Item'}</strong>
                        <span style={{ color: '#555' }}>{formatValue(item.data)}</span>
                      </div>
                      <p style={{ margin: '10px 0 0 0', color: '#444' }}>{formatValue(item.descricao)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666', margin: 0 }}>Nenhum histórico de saúde registrado.</p>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e0e0e0', padding: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Assinatura do Veterinário</h3>
              <div style={{ minHeight: '140px', border: '1px dashed #c3c4cc', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, color: '#555' }}>Nome / CRM:</p>
                  <p style={{ margin: '8px 0 0 0', color: '#222', fontWeight: 'bold' }}>______________________________________</p>
                </div>
                <div>
                  <p style={{ margin: 0, color: '#555' }}>Assinatura:</p>
                  <p style={{ margin: '8px 0 0 0', color: '#222', fontWeight: 'bold' }}>______________________________________</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e0e0e0', padding: '20px' }}>
              <h3 style={{ marginTop: 0 }}>Informações adicionais</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {Object.keys(animal).filter((field) => !knownFields.includes(field) && field !== 'emailDono' && field !== 'id').map((field) => (
                  <div key={field} style={{ display: 'grid', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#777', textTransform: 'capitalize' }}>{field.replace(/([A-Z])/g, ' $1')}</span>
                    <strong style={{ color: '#222' }}>{formatValue(animal[field])}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutPadrao>
  );
}
