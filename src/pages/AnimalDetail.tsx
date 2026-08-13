import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import Input from '../components/Input';
import { formatTrackingTechnology } from '../utils/VeterinarioModule';
import { Search, ArrowLeft, Printer, HeartPulse, ClipboardList, FileText } from 'lucide-react';

interface AnimalData {
  [key: string]: any;
  tecnologiaRastreamento?: string;
}

interface HistoricoSaude {
  id: string;
  tipo: string;
  data: string;
  descricao: string;
}

interface Manejo {
  id: string;
  data: string;
  medicamento: string;
  observacao: string;
  lote?: string;
  qtdCabecas?: number;
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
  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchByBrinco, setSearchByBrinco] = useState('');
  const [searchByLote, setSearchByLote] = useState('');

  // Load initial search from URL param (id is usually brinco)
  useEffect(() => {
    if (id) {
      setSearchByBrinco(id);
    }
  }, [id]);

  // Search by Brinco (primary search)
  const searchBrinco = async () => {
    if (!searchByBrinco.trim()) {
      alert('Digite o número do brinco para buscar.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) {
        alert('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'animais'),
        where('emailDono', '==', user.email),
        where('idBrinco', '==', searchByBrinco.trim())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        const animal = { id: snapshot.docs[0].id, ...docData };
        setSelectedAnimal(animal);
        setAnimals([animal]);
      } else {
        setSelectedAnimal(null);
        setAnimals([]);
        alert('Nenhum animal encontrado com esse brinco.');
      }
    } catch (error) {
      console.error('Erro ao buscar por brinco:', error);
      alert('Erro ao buscar animal.');
    } finally {
      setLoading(false);
    }
  };

  // Search by Lote (list all animals)
  const searchLote = async () => {
    if (!searchByLote.trim()) {
      alert('Digite o nome do lote para buscar.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) {
        alert('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'animais'),
        where('emailDono', '==', user.email),
        where('lote', '==', searchByLote.trim())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const animalList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnimals(animalList);
        if (animalList.length === 1) {
          setSelectedAnimal(animalList[0]);
        } else {
          setSelectedAnimal(null);
        }
      } else {
        setSelectedAnimal(null);
        setAnimals([]);
        alert('Nenhum animal encontrado para esse lote.');
      }
    } catch (error) {
      console.error('Erro ao buscar por lote:', error);
      alert('Erro ao buscar animais.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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

      {/* Header and Search Area */}
      <div className="no-print" style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Consulta de Precisão</h2>
          <p style={{ color: '#5b6577', marginTop: '8px' }}>Busque por brinco ou lote e visualize o prontuário completo.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Voltar
          </Button>
          {selectedAnimal && (
            <Button onClick={handlePrint} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              <Printer size={16} /> Gerar Ficha Oficial
            </Button>
          )}
        </div>
      </div>

      {/* Search Fields (Double Search) */}
      <div className="no-print" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Search size={16} /> Busca por Brinco
          </h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input
                type="text"
                value={searchByBrinco}
                onChange={(e) => setSearchByBrinco(e.target.value)}
                placeholder="Número do brinco"
                className="campo"
                style={{ flex: 1, margin: 0 }}
                onKeyDown={(e) => e.key === 'Enter' && searchBrinco()}
              />
            <Button onClick={searchBrinco} disabled={loading} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              Buscar
            </Button>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
            <Search size={16} /> Busca por Lote
          </h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input
                type="text"
                value={searchByLote}
                onChange={(e) => setSearchByLote(e.target.value)}
                placeholder="Nome do lote"
                className="campo"
                style={{ flex: 1, margin: 0 }}
                onKeyDown={(e) => e.key === 'Enter' && searchLote()}
              />
            <Button onClick={searchLote} disabled={loading} className="btn-responsivo" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* List of animals (when multiple from lote search) */}
      {!loading && animals.length > 1 && !selectedAnimal && (
        <div className="no-print" style={{ marginBottom: '24px', background: 'white', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Animais Encontrados ({animals.length})</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {animals.map((animal) => (
              <div
                key={animal.id}
                onClick={() => setSelectedAnimal(animal)}
                className="btn-interativo"
                style={{
                  padding: '16px',
                  background: 'var(--color-primary-soft)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ color: '#1a73e8' }}>{animal.idBrinco || 'Sem brinco'}</strong>
                <p style={{ margin: '4px 0 0 0', color: '#5b6577', fontSize: '0.85rem' }}>
                  {animal.categoria || 'Sem categoria'} • Lote: {animal.lote || 'Sem lote'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <p style={{ color: '#5b6577' }}>Carregando dados...</p>}

      {/* Prontuário (when animal selected) */}
      {!loading && selectedAnimal && (
        <div className="print-area" style={{ display: 'grid', gap: '20px' }}>
          {/* Card Principal */}
          <div style={{
            background: 'linear-gradient(135deg, #1a73e8 0%, #1456b3 100%)',
            color: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: '0 12px 28px rgba(26, 115, 232, 0.25)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.4rem' }}>Prontuário do Animal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>ID / Brinco</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700 }}>{selectedAnimal.idBrinco || 'Não informado'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Categoria</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700 }}>{selectedAnimal.categoria || 'Não informado'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Tecnologia</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700 }}>{formatTrackingTechnology(selectedAnimal)}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Data de Nascimento</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700 }}>{formatValue(selectedAnimal.dataNascimento)}</p>
              </div>
              {selectedAnimal.lote && (
                <div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Lote</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700 }}>{selectedAnimal.lote}</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }} className="print-row">
            {/* Card de Saúde */}
            <div style={{
              background: 'var(--color-success-light)',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-lg)',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HeartPulse size={18} /> Histórico de Saúde e Vacinas
              </h3>
              {Array.isArray(selectedAnimal.historicoSaude) && selectedAnimal.historicoSaude.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.historicoSaude.map((item: HistoricoSaude, index: number) => (
                    <div key={item.id || index} style={{
                      background: 'white',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#166534' }}>{item.tipo || 'Item'}</strong>
                        <span style={{ color: '#166534', fontWeight: 500, fontSize: '0.85rem' }}>{formatValue(item.data)}</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', color: '#3a4150' }}>{item.descricao || 'Sem descrição'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#166534', margin: 0 }}>Nenhum histórico de saúde registrado.</p>
              )}

              {selectedAnimal.vacinasMedicamentos && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}>
                  <strong style={{ color: '#166534' }}>Vacinas/Medicamentos Geral:</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#3a4150' }}>{selectedAnimal.vacinasMedicamentos}</p>
                </div>
              )}
            </div>

            {/* Card de Manejo */}
            <div style={{
              background: 'var(--color-warning-light)',
              border: '1px solid #fed7aa',
              borderRadius: 'var(--radius-lg)',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#9a3412', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} /> Histórico de Manejo
              </h3>
              {Array.isArray(selectedAnimal.historicoManejo) && selectedAnimal.historicoManejo.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.historicoManejo.map((item: Manejo, index: number) => (
                    <div key={item.id || index} style={{
                      background: 'white',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #fed7aa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <strong style={{ color: '#9a3412' }}>{item.medicamento || 'Manejo'}</strong>
                        <span style={{ color: '#9a3412', fontWeight: 500, fontSize: '0.85rem' }}>{formatValue(item.data)}</span>
                      </div>
                      {item.lote && (
                        <p style={{ margin: '4px 0', color: '#3a4150' }}><strong>Lote:</strong> {item.lote}</p>
                      )}
                      {item.qtdCabecas && (
                        <p style={{ margin: '4px 0', color: '#3a4150' }}><strong>Quantidade:</strong> {item.qtdCabecas} cabeças</p>
                      )}
                      {item.observacao && (
                        <p style={{ margin: '4px 0 0 0', color: '#3a4150' }}><strong>Observação:</strong> {item.observacao}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9a3412', margin: 0 }}>Nenhum manejo registrado.</p>
              )}
            </div>
          </div>

          {/* Additional Info Card */}
          <div style={{
            background: 'var(--color-primary-soft)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1a73e8', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> Informações Adicionais
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {selectedAnimal.nomeFazenda && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Fazenda</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{selectedAnimal.nomeFazenda}</p>
                </div>
              )}
              {selectedAnimal.pastoAutorizado && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Pasto Autorizado</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{selectedAnimal.pastoAutorizado}</p>
                </div>
              )}
              {selectedAnimal.origem && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Origem</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{selectedAnimal.origem}</p>
                </div>
              )}
              {selectedAnimal.pesoPorCabeca !== undefined && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Peso Médio (kg)</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{selectedAnimal.pesoPorCabeca}</p>
                </div>
              )}
              {selectedAnimal.peso !== undefined && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Peso Total (kg)</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{selectedAnimal.peso}</p>
                </div>
              )}
              {selectedAnimal.qtdCabecas !== undefined && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Quantidade de Cabeças</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{selectedAnimal.qtdCabecas}</p>
                </div>
              )}
              {selectedAnimal.dataCadastro && (
                <div>
                  <span style={{ color: '#5b6577', fontSize: '0.8rem' }}>Data de Cadastro</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 700, color: '#1a2233' }}>{formatValue(selectedAnimal.dataCadastro)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !selectedAnimal && animals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#5b6577' }}>
          <Search size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
          <h3 style={{ color: '#1a2233', margin: '0 0 6px' }}>Nenhum animal selecionado</h3>
          <p style={{ margin: 0 }}>Use os campos de busca acima para encontrar um animal.</p>
        </div>
      )}
    </LayoutPadrao>
  );
}
