import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import { formatCrmv, formatSisbov, formatTrackingTechnology, isValidCrmv, buildLoteCertificadoData, getAnimalSisbov } from '../utils/VeterinarioModule';

interface AnimalData {
  id: string;
  idBrinco?: string;
  sisbov?: string;
  tecnologiaRastreamento?: string;
  [key: string]: any;
}

interface LoteData {
  id: string;
  nome_lote: string;
  animais: string[];
  data_criacao: any;
  emailDono: string;
  nomeFazenda?: string;
  nomeResponsavelTecnico?: string;
  crmv?: string;
  gta?: string;
  confirmacaoSanitaria?: boolean;
  dataAssinatura?: any;
  assinaturaEletronica?: string;
  status?: string;
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
  const [editingEnabled, setEditingEnabled] = useState(true);
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [nomeResponsavelTecnico, setNomeResponsavelTecnico] = useState('');
  const [crmv, setCrmv] = useState('');
  const [gta, setGta] = useState('');
  const [sisbovMap, setSisbovMap] = useState<Record<string, string>>({});
  const [confirmacaoSanitaria, setConfirmacaoSanitaria] = useState(false);
  const [lotesVazios, setLotesVazios] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const lotesRef = collection(db, 'lotes');
        const lotesSnap = await getDocs(lotesRef);
        const estaVazio = lotesSnap.empty;
        console.log('Lotes collection empty?', estaVazio);
        setLotesVazios(estaVazio);

        if (estaVazio) {
          setLoading(false);
          return;
        }

        // Se id não for passado, tentar carregar por busca (mas por enquanto, segue o fluxo original)
        if (id) {
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
          setNomeFazenda(loteData.nomeFazenda || '');
          setNomeResponsavelTecnico(loteData.nomeResponsavelTecnico || '');
          setCrmv(loteData.crmv || '');
          setGta(loteData.gta || '');
          setConfirmacaoSanitaria(loteData.confirmacaoSanitaria || false);
          
          // Verificar se o lote já está certificado
          if (loteData.status === 'CERTIFICADO') {
            setEditingEnabled(false);
          }

          // Carregar animais do lote (agora buscamos por campo 'lote' em animais, não por array)
          const animaisRef = collection(db, 'animais');
          const q = query(animaisRef, where('emailDono', '==', user.email), where('lote', '==', loteData.nome_lote));
          const animaisSnap = await getDocs(q);
          const animaisList = animaisSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AnimalData[];
          setAnimais(animaisList);

          // Carregar map de SISBOV dos animais
          const initialSisbovMap: Record<string, string> = {};
          animaisList.forEach(animal => {
            const val = getAnimalSisbov(animal, {});
            if (val) {
              initialSisbovMap[animal.id] = val;
            }
          });
          setSisbovMap(initialSisbovMap);
        }
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

  const handleFinalizarCertificado = async () => {
    if (!id || !lote) return;

    if (!confirmacaoSanitaria) {
      alert('Por favor, confirme a validação sanitária antes de finalizar.');
      return;
    }

    if (!nomeResponsavelTecnico) {
      alert('Por favor, informe o nome do Responsável Técnico.');
      return;
    }

    if (!crmv) {
      alert('Por favor, informe o número do CRMV do Responsável Técnico.');
      return;
    }

    if (!gta) {
      alert('Por favor, informe o número da GTA.');
      return;
    }

    if (!isValidCrmv(crmv)) {
      alert('Por favor, informe um CRMV válido no formato CRMV/UF + número (ex: CRMV/SP12345).');
      return;
    }

    // Verificar se todos os animais têm SISBOV preenchido
    for (const animal of animais) {
      const animalSisbov = getAnimalSisbov(animal, sisbovMap);
      if (!animalSisbov) {
        alert(`Por favor, informe o número SISBOV do animal ${animal.idBrinco || animal.id}.`);
        return;
      }
    }

    try {
      const batch = writeBatch(db);
      const loteRef = doc(db, 'lotes', id);
      
      // Atualizar lote no batch
      batch.update(loteRef, buildLoteCertificadoData(
        nomeFazenda,
        nomeResponsavelTecnico,
        crmv,
        gta,
        confirmacaoSanitaria
      ));

      // Atualizar animais no batch
      for (const animal of animais) {
        const animalSisbov = getAnimalSisbov(animal, sisbovMap);
        const animalRef = doc(db, 'animais', animal.id);
        batch.update(animalRef, {
          sisbov: animalSisbov
        });
      }

      // Commit do batch
      await batch.commit();

      setEditingEnabled(false);
      setLote(prev => prev ? {
        ...prev,
        ...buildLoteCertificadoData(
          nomeFazenda,
          nomeResponsavelTecnico,
          crmv,
          gta,
          confirmacaoSanitaria
        )
      } : null);
      
      alert('Certificado finalizado e emitido com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar certificado:', error);
      alert('Erro ao finalizar certificado.');
    }
  };

  const handleReabrirCertificado = async () => {
    if (!id || !lote) return;

    if (!window.confirm('Tem certeza que deseja reabrir este certificado para edições?')) {
      return;
    }

    try {
      const loteRef = doc(db, 'lotes', id);
      await updateDoc(loteRef, {
        status: 'PENDENTE'
      });

      setEditingEnabled(true);
      setLote(prev => prev ? { ...prev, status: 'PENDENTE' } : null);
      
      alert('Certificado reaberto para edições!');
    } catch (error) {
      console.error('Erro ao reabrir certificado:', error);
      alert('Erro ao reabrir certificado.');
    }
  };

  const handleShare = async () => {
    if (!lote) return;
    if (!navigator.share) {
      alert('Recurso de compartilhamento não suportado pelo seu navegador.');
      return;
    }

    try {
      await navigator.share({
        title: `Certificado de Rastreabilidade - Lote ${lote.nome_lote}`,
        text: `Certidão oficial de rastreabilidade do lote ${lote.nome_lote}`,
        url: window.location.href,
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      alert('Erro ao compartilhar o certificado.');
    }
  };

  if (loading) return <LayoutPadrao><p>Carregando...</p></LayoutPadrao>;
  if (lotesVazios) {
    return (
      <LayoutPadrao>
        <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Nenhum lote cadastrado no sistema.</h2>
          <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.6' }}>
            Por favor, acesse a área de cadastro para iniciar.
          </p>
        </div>
      </LayoutPadrao>
    );
  }
  if (!lote) return <LayoutPadrao><p>Lote não encontrado.</p></LayoutPadrao>;

  return (
    <LayoutPadrao>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          .print-area, .print-area * {
            visibility: visible;
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
          .input-field {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #dce4f5;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
          }
          .input-field:read-only {
            background: #f5f5f5;
            cursor: not-allowed;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Certidão de Rastreabilidade do Lote</h2>
          <p style={{ color: '#666', marginTop: '6px', marginBottom: 0 }}>{lote.nome_lote}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/gestao-lotes')} className="btn-responsivo" style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Voltar
          </Button>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="no-print" style={{ 
        background: '#e8f0fe', 
        border: '1px solid #1a73e8', 
        borderRadius: '15px', 
        padding: '20px', 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px',
        zIndex: 1000
      }}>
        <h3 style={{ margin: 0, color: '#1a73e8' }}>Ações Veterinárias Oficiais</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button 
            onClick={handlePrint} 
            className="btn-responsivo" 
            style={{ 
              background: '#1a73e8', 
              color: 'white', 
              border: 'none', 
              padding: '12px 20px', 
              borderRadius: '10px', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir
          </Button>
          <Button 
            onClick={handleShare} 
            className="btn-responsivo" 
            style={{ 
              background: '#667eea', 
              color: 'white', 
              border: 'none', 
              padding: '12px 20px', 
              borderRadius: '10px', 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            Compartilhar
          </Button>
          {!editingEnabled ? (
            <Button 
              onClick={handleReabrirCertificado} 
              className="btn-responsivo" 
              style={{ 
                background: '#ff9800', 
                color: 'white', 
                border: 'none', 
                padding: '12px 20px', 
                borderRadius: '10px', 
                fontWeight: 'bold'
              }}
            >
              Reabrir Certificado para Edições
            </Button>
          ) : (
            <Button 
              onClick={handleFinalizarCertificado} 
              className="btn-responsivo" 
              style={{ 
                background: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                padding: '12px 20px', 
                borderRadius: '10px', 
                fontWeight: 'bold'
              }}
            >
              Finalizar e Emitir Certificado
            </Button>
          )}
        </div>
      </div>

      <div className="print-area" style={{ background: 'white', borderRadius: '15px', border: '1px solid #dce4f5', padding: '20px' }}>
        {/* Cabeçalho do Relatório */}
        <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #1a73e8' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img src="/assets/logo192.png" alt="Boi Fujão" style={{ width: '80px', height: '80px' }} />
          </div>
          <h1 style={{ margin: 0, color: '#1a73e8' }}>Certidão de Rastreabilidade do Lote</h1>
          <h2 style={{ margin: '10px 0 0 0' }}>{lote.nome_lote}</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666' }}>
            Data de Emissão: {new Date().toLocaleDateString('pt-BR')}
          </p>
          <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.125rem' }}>
            Total de Cabeças: {animais.length}
          </p>
          {gta && (
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1rem', color: '#1a73e8' }}>
              GTA (Guia de Trânsito Animal): {gta}
            </p>
          )}
          {lote.status === 'CERTIFICADO' && (
            <p style={{ margin: '10px 0 0 0', color: '#4CAF50', fontWeight: 'bold', fontSize: '1rem' }}>
              ✅ Certificado Válido para Governo
            </p>
          )}
        </div>

        {/* Inputs de Identificação */}
        <div style={{ marginBottom: '30px', background: '#f5f5f5', padding: '20px', borderRadius: '10px' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>Identificação Oficial</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome da Fazenda:</label>
              <input 
                type="text" 
                className="input-field" 
                value={nomeFazenda} 
                onChange={(e) => setNomeFazenda(e.target.value)} 
                readOnly={!editingEnabled}
                placeholder="Informe o nome da fazenda"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome do Responsável Técnico (Veterinário) <span style={{ color: '#c62828' }}>*</span>:</label>
              <input 
                type="text" 
                className="input-field" 
                value={nomeResponsavelTecnico} 
                onChange={(e) => setNomeResponsavelTecnico(e.target.value)} 
                readOnly={!editingEnabled}
                placeholder="Informe o nome do responsável técnico"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CRMV (Registro Profissional) <span style={{ color: '#c62828' }}>*</span>:</label>
              <input 
                type="text" 
                className="input-field" 
                value={crmv} 
                onChange={(e) => setCrmv(formatCrmv(e.target.value))} 
                readOnly={!editingEnabled}
                placeholder="CRMV/UF + número (ex: CRMV/SP12345)"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>GTA (Guia de Trânsito Animal) <span style={{ color: '#c62828' }}>*</span>:</label>
              <input 
                type="text" 
                className="input-field" 
                value={gta} 
                onChange={(e) => setGta(e.target.value)} 
                readOnly={!editingEnabled}
                placeholder="Informe o número da GTA"
              />
            </div>
          </div>
        </div>

        {/* Visão Geral Sanitária */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>Visão Geral Sanitária Oficial</h3>
          {animais.length === 0 ? (
            <p style={{ color: '#666' }}>Nenhum animal neste lote.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dce4f5' }}>
                <thead>
                  <tr style={{ background: '#1a73e8', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dce4f5' }}>Brinco</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dce4f5' }}>Número SISBOV <span style={{ color: '#ffeb3b' }}>*</span></th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dce4f5' }}>Tecnologia</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dce4f5' }}>Data da Última Vacina</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dce4f5' }}>Status de Saúde</th>
                  </tr>
                </thead>
                <tbody>
                  {animais.map((animal) => {
                    const animalSisbov = getAnimalSisbov(animal, sisbovMap);
                    return (
                      <tr key={animal.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{formatValue(animal.idBrinco)}</td>
                        <td style={{ padding: '12px' }}>
                          {editingEnabled ? (
                            <input 
                              type="text" 
                              className="input-field"
                              style={{ maxWidth: '200px' }}
                              value={animalSisbov}
                              onChange={(e) => setSisbovMap(prev => ({
                                ...prev,
                                [animal.id]: formatSisbov(e.target.value)
                              }))}
                              placeholder="Informe o SISBOV (15 dígitos)"
                              maxLength={15}
                            />
                          ) : (
                            <span style={{ fontWeight: 'bold' }}>{animalSisbov}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{formatTrackingTechnology(animal)}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{formatValue(animal.dataUltimaVacina) || 'Não registrada'}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            background: animal.status?.toLowerCase() === 'saudável' || animal.status?.toLowerCase() === 'saudavel' ? '#e8f5e9' : '#ffebee', 
                            color: animal.status?.toLowerCase() === 'saudável' || animal.status?.toLowerCase() === 'saudavel' ? '#2e7d32' : '#c62828', 
                            padding: '4px 12px', 
                            borderRadius: '12px', 
                            fontWeight: 'bold'
                          }}>
                            {formatValue(animal.status) || 'Não informado'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ficha Técnica Completa dos Animais */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>Ficha Técnica dos Animais</h3>
          {animais.length === 0 ? (
            <p style={{ color: '#666' }}>Nenhum animal neste lote.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {animais.map((animal, index) => {
                const animalSisbov = getAnimalSisbov(animal, sisbovMap);
                return (
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
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Número SISBOV:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animalSisbov)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Categoria:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.categoria)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Tecnologia de Rastreamento:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatTrackingTechnology(animal)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Peso:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.peso)} kg</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Pasto Autorizado:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.pastoAutorizado)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Pasto Atual:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.pastoAtual)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Data de Cadastro:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.dataCadastro)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#777' }}>Observações:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.observacoes)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bloco de Assinatura */}
        <div className="signature-section" style={{ borderTop: '2px solid #000', paddingTop: '30px', marginTop: '30px', pageBreakInside: 'avoid' }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>Validação Veterinária Oficial</h3>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div className="no-print">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', cursor: editingEnabled ? 'pointer' : 'not-allowed' }}>
                <input 
                  type="checkbox" 
                  checked={confirmacaoSanitaria} 
                  onChange={(e) => setConfirmacaoSanitaria(e.target.checked)} 
                  disabled={!editingEnabled}
                  style={{ width: '20px', height: '20px' }}
                />
                <span style={{ fontWeight: 'bold' }}>Confirmar validação sanitária</span>
              </label>
            </div>
            {confirmacaoSanitaria && (
              <>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome do Veterinário (Assinatura Eletrônica):</label>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', padding: '10px 0', borderBottom: '1px solid #000', minHeight: '100px' }}>
                    {nomeResponsavelTecnico || lote.nomeResponsavelTecnico || 'Não informado'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CRMV (Registro Profissional):</label>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', padding: '10px 0', borderBottom: '1px solid #000' }}>
                    {crmv || lote.crmv || 'Não informado'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Data da Assinatura:</label>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', padding: '10px 0', borderBottom: '1px solid #000' }}>
                    {lote.dataAssinatura ? formatValue(lote.dataAssinatura) : new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Linha de Assinatura Manual:</label>
                  <div style={{ minHeight: '40px', borderBottom: '1px solid #000' }} />
                </div>
              </>
            )}
            {!editingEnabled && (
              <div style={{ marginTop: '20px', background: '#e8f5e9', padding: '15px', borderRadius: '8px', border: '1px solid #4CAF50' }}>
                <p style={{ margin: 0, color: '#2e7d32', fontWeight: 'bold', fontSize: '16px' }}>
                  ✅ Certificado validado e finalizado em {lote.dataAssinatura ? formatValue(lote.dataAssinatura) : new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutPadrao>
  );
}
