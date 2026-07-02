import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import Input from '../components/Input';

interface AnimalData {
  [key: string]: any;
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
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Consulta de Precisão</h2>
          <p style={{ color: '#666', marginTop: '6px' }}>Busque por brinco ou lote e visualize o prontuário completo.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Voltar
          </Button>
          {selectedAnimal && (
            <Button onClick={handlePrint} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
              Gerar Ficha Oficial
            </Button>
          )}
        </div>
      </div>

      {/* Search Fields (Double Search) */}
      <div className="no-print" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #dce4f5' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1a73e8' }}>🔍 Busca por Brinco</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input
                type="text"
                value={searchByBrinco}
                onChange={(e) => setSearchByBrinco(e.target.value)}
                placeholder="Número do brinco"
                className="campo"
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && searchBrinco()}
              />
            <Button onClick={searchBrinco} disabled={loading} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
              Buscar
            </Button>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #dce4f5' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#25d366' }}>🔍 Busca por Lote</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input
                type="text"
                value={searchByLote}
                onChange={(e) => setSearchByLote(e.target.value)}
                placeholder="Nome do lote"
                className="campo"
                style={{ flex: 1 }}
                onKeyDown={(e) => e.key === 'Enter' && searchLote()}
              />
            <Button onClick={searchLote} disabled={loading} className="btn-responsivo" style={{ background: '#25d366', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* List of animals (when multiple from lote search) */}
      {!loading && animals.length > 1 && !selectedAnimal && (
        <div className="no-print" style={{ marginBottom: '24px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #dce4f5' }}>
          <h4 style={{ marginTop: 0, marginBottom: '16px' }}>Animais Encontrados ({animals.length})</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {animals.map((animal) => (
              <div
                key={animal.id}
                onClick={() => setSelectedAnimal(animal)}
                style={{
                  padding: '16px',
                  background: '#f0f4ff',
                  border: '1px solid #dce4f5',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <strong style={{ color: '#1a73e8' }}>{animal.idBrinco || 'Sem brinco'}</strong>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                  {animal.categoria || 'Sem categoria'} • Lote: {animal.lote || 'Sem lote'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <p>Carregando dados...</p>}

      {/* Prontuário (when animal selected) */}
      {!loading && selectedAnimal && (
        <div className="print-area" style={{ display: 'grid', gap: '20px' }}>
          {/* Card Principal */}
          <div style={{
            background: '#1a73e8',
            color: 'white',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(26, 115, 232, 0.2)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px' }}>Prontuário do Animal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>ID / Brinco</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>{selectedAnimal.idBrinco || 'Não informado'}</p>
              </div>
              <div>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>Categoria</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>{selectedAnimal.categoria || 'Não informado'}</p>
              </div>
              <div>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>Data de Nascimento</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>{formatValue(selectedAnimal.dataNascimento)}</p>
              </div>
              {selectedAnimal.lote && (
                <div>
                  <span style={{ fontSize: '14px', opacity: 0.9 }}>Lote</span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 'bold' }}>{selectedAnimal.lote}</p>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Card de Saúde */}
            <div style={{
              background: '#dcfce7',
              border: '1px solid #22c55e',
              borderRadius: '15px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '20px' }}>🏥 Histórico de Saúde e Vacinas</h3>
              {Array.isArray(selectedAnimal.historicoSaude) && selectedAnimal.historicoSaude.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.historicoSaude.map((item: HistoricoSaude, index: number) => (
                    <div key={item.id || index} style={{
                      background: 'white',
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #bbf7d0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#166534' }}>{item.tipo || 'Item'}</strong>
                        <span style={{ color: '#166534', fontWeight: '500' }}>{formatValue(item.data)}</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', color: '#44403c' }}>{item.descricao || 'Sem descrição'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#166534', margin: 0 }}>Nenhum histórico de saúde registrado.</p>
              )}

              {selectedAnimal.vacinasMedicamentos && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <strong style={{ color: '#166534' }}>Vacinas/Medicamentos Geral:</strong>
                  <p style={{ margin: '6px 0 0 0', color: '#44403c' }}>{selectedAnimal.vacinasMedicamentos}</p>
                </div>
              )}
            </div>

            {/* Card de Manejo */}
            <div style={{
              background: '#fff7ed',
              border: '1px solid #f97316',
              borderRadius: '15px',
              padding: '20px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#9a3412', fontSize: '20px' }}>📋 Histórico de Manejo</h3>
              {Array.isArray(selectedAnimal.historicoManejo) && selectedAnimal.historicoManejo.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.historicoManejo.map((item: Manejo, index: number) => (
                    <div key={item.id || index} style={{
                      background: 'white',
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid #fed7aa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <strong style={{ color: '#9a3412' }}>{item.medicamento || 'Manejo'}</strong>
                        <span style={{ color: '#9a3412', fontWeight: '500' }}>{formatValue(item.data)}</span>
                      </div>
                      {item.lote && (
                        <p style={{ margin: '4px 0', color: '#44403c' }}><strong>Lote:</strong> {item.lote}</p>
                      )}
                      {item.qtdCabecas && (
                        <p style={{ margin: '4px 0', color: '#44403c' }}><strong>Quantidade:</strong> {item.qtdCabecas} cabeças</p>
                      )}
                      {item.observacao && (
                        <p style={{ margin: '4px 0 0 0', color: '#44403c' }}><strong>Observação:</strong> {item.observacao}</p>
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
            background: '#f0f4ff',
            border: '1px solid #dce4f5',
            borderRadius: '15px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1a73e8', fontSize: '20px' }}>📄 Informações Adicionais</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {selectedAnimal.nomeFazenda && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Fazenda</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{selectedAnimal.nomeFazenda}</p>
                </div>
              )}
              {selectedAnimal.pastoAutorizado && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Pasto Autorizado</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{selectedAnimal.pastoAutorizado}</p>
                </div>
              )}
              {selectedAnimal.origem && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Origem</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{selectedAnimal.origem}</p>
                </div>
              )}
              {selectedAnimal.pesoPorCabeca !== undefined && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Peso Médio (kg)</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{selectedAnimal.pesoPorCabeca}</p>
                </div>
              )}
              {selectedAnimal.peso !== undefined && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Peso Total (kg)</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{selectedAnimal.peso}</p>
                </div>
              )}
              {selectedAnimal.qtdCabecas !== undefined && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Quantidade de Cabeças</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{selectedAnimal.qtdCabecas}</p>
                </div>
              )}
              {selectedAnimal.dataCadastro && (
                <div>
                  <span style={{ color: '#4b5563', fontSize: '14px' }}>Data de Cadastro</span>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: '#111827' }}>{formatValue(selectedAnimal.dataCadastro)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !selectedAnimal && animals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>Nenhum animal selecionado</h3>
          <p>Use os campos de busca acima para encontrar um animal.</p>
        </div>
      )}
    </LayoutPadrao>
  );
}
