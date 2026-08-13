import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import { formatCrmv, formatSisbov, formatTrackingTechnology, isValidCrmv, buildLoteCertificadoData, getAnimalSisbov } from '../utils/VeterinarioModule';
import { ArrowLeft, Printer, Share2, LockOpen, ShieldCheck, CircleCheckBig, FileCheck } from 'lucide-react';

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
  const [loteNaoEncontrado, setLoteNaoEncontrado] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      setLoteNaoEncontrado(false);
      console.log('[LoteDetail] iniciando busca de lote', { id, collection: 'lotes' });
      const user = auth.currentUser;
      if (!user?.email) {
        console.log('[LoteDetail] usuário não autenticado, abortando busca de lote');
        setLoading(false);
        return;
      }

      try {
        const lotesRef = collection(db, 'lotes');
        const lotesSnap = await getDocs(lotesRef);
        const estaVazio = lotesSnap.empty;
        console.log('[LoteDetail] coleção consultada', { collection: 'lotes', empty: estaVazio });
        setLotesVazios(estaVazio);

        if (estaVazio) {
          console.log('[LoteDetail] coleção de lotes vazia, id buscado:', id);
          setLoteNaoEncontrado(true);
          setLoading(false);
          return;
        }

        if (!id) {
          console.log('[LoteDetail] nenhum id de lote fornecido na URL');
          setLoteNaoEncontrado(true);
          setLoading(false);
          return;
        }

        // Carregar lote
        const loteRef = doc(db, 'lotes', id);
        console.log('[LoteDetail] buscando documento de lote', { id, collection: 'lotes' });
        const loteSnap = await getDoc(loteRef);
        if (!loteSnap.exists()) {
          console.log('[LoteDetail] lote não encontrado', { id, collection: 'lotes' });
          setLoteNaoEncontrado(true);
          setLoading(false);
          return;
        }

        const loteData = { id: loteSnap.id, ...loteSnap.data() } as LoteData;
          
          // Verificar se o lote pertence ao usuário
          if (loteData.emailDono !== user.email) {
            console.log('[LoteDetail] lote pertence a outro usuário', { loteId: id, owner: loteData.emailDono, currentUser: user.email });
            setLoteNaoEncontrado(true);
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
      
      alert(`Certificado assinado eletronicamente com sucesso por ${nomeResponsavelTecnico}!`);
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

  if (loading) return <LayoutPadrao><p style={{ color: '#5b6577' }}>Carregando...</p></LayoutPadrao>;
  if (lotesVazios) {
    return (
      <LayoutPadrao>
        <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Nenhum lote cadastrado no sistema.</h2>
          <p style={{ color: '#5b6577', fontSize: '1rem', lineHeight: '1.6' }}>
            Por favor, acesse a área de cadastro para iniciar.
          </p>
        </div>
      </LayoutPadrao>
    );
  }
  if (!lote && loteNaoEncontrado) {
    return (
      <LayoutPadrao>
        <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '30px', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ margin: '0 0 12px', color: '#1a73e8' }}>Lote não encontrado</h2>
            <p style={{ color: '#3a4150', lineHeight: '1.6', marginBottom: '24px' }}>
              O sistema tentou buscar o lote pelo ID fornecido na URL na coleção <strong>lotes</strong>, mas não encontrou um registro válido.
            </p>
            <Button onClick={() => navigate('/gestao-lotes')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
              Cadastrar Lote
            </Button>
          </div>
        </div>
      </LayoutPadrao>
    );
  }
  if (!lote) return <LayoutPadrao><p style={{ color: '#5b6577' }}>Lote não encontrado.</p></LayoutPadrao>;

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
            border: 1.5px solid var(--color-border);
            border-radius: var(--radius-sm);
            font-size: 16px;
            box-sizing: border-box;
            font-family: inherit;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          .input-field:focus {
            outline: none;
            border-color: #1a73e8;
            box-shadow: 0 0 0 3px var(--color-primary-light);
          }
          .input-field:read-only {
            background: var(--color-surface-alt);
            color: #5b6577;
            cursor: not-allowed;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Certidão de Rastreabilidade do Lote</h2>
          <p style={{ color: '#5b6577', marginTop: '8px', marginBottom: 0 }}>{lote.nome_lote}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/gestao-lotes')} className="btn-responsivo" style={{ background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Voltar
          </Button>
        </div>
      </div>

      {/* Barra de Ferramentas */}
      <div className="no-print" style={{
        background: 'var(--color-primary-soft)',
        border: '1px solid #cfe0fb',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#1a73e8', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} /> Ações Veterinárias Oficiais
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button
            onClick={handlePrint}
            className="btn-responsivo"
            style={{
              background: '#1a73e8',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700
            }}
          >
            <Printer size={16} /> Imprimir
          </Button>
          <Button
            onClick={handleShare}
            className="btn-responsivo"
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700
            }}
          >
            <Share2 size={16} /> Compartilhar
          </Button>
          {!editingEnabled ? (
            <Button
              onClick={handleReabrirCertificado}
              className="btn-responsivo"
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700
              }}
            >
              <LockOpen size={16} /> Reabrir Certificado para Edições
            </Button>
          ) : (
            nomeResponsavelTecnico.trim() && crmv.trim() && gta.trim() ? (
              <Button
                onClick={handleFinalizarCertificado}
                className="btn-responsivo"
                style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700
                }}
              >
                <FileCheck size={16} /> Imprimir / Assinar Certificado
              </Button>
            ) : null
          )}
        </div>
      </div>

      <div className="print-area" style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
        {/* Cabeçalho do Relatório */}
        <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #1a73e8' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <img src="/assets/logo192.png" alt="Boi Fujão" style={{ width: '72px', height: '72px', borderRadius: '16px' }} />
          </div>
          <h1 style={{ margin: 0, color: '#1a73e8', fontSize: '1.5rem' }}>Certidão de Rastreabilidade do Lote</h1>
          <h2 style={{ margin: '10px 0 0 0', fontSize: '1.15rem' }}>{lote.nome_lote}</h2>
          <p style={{ margin: '8px 0 0 0', color: '#5b6577' }}>
            Data de Emissão: {new Date().toLocaleDateString('pt-BR')}
          </p>
          <p style={{ margin: '5px 0 0 0', fontWeight: 700, fontSize: '1.1rem' }}>
            Total de Cabeças: {animais.length}
          </p>
          {gta && (
            <p style={{ margin: '5px 0 0 0', fontWeight: 700, fontSize: '0.95rem', color: '#1a73e8' }}>
              GTA (Guia de Trânsito Animal): {gta}
            </p>
          )}
          {lote.status === 'CERTIFICADO' && (
            <p style={{ margin: '10px 0 0 0', color: '#16a34a', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <CircleCheckBig size={16} /> Certificado Válido para Governo
            </p>
          )}
        </div>

        {/* Inputs de Identificação */}
        <div style={{ marginBottom: '30px', background: 'var(--color-surface-alt)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ color: '#1a2233', marginBottom: '20px', fontSize: '1.05rem' }}>Identificação Oficial</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Nome da Fazenda:</label>
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
              <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Nome do Responsável Técnico (Veterinário) <span style={{ color: '#c62828' }}>*</span>:</label>
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
              <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>CRMV (Registro Profissional) <span style={{ color: '#c62828' }}>*</span>:</label>
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
              <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>GTA (Guia de Trânsito Animal) <span style={{ color: '#c62828' }}>*</span>:</label>
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
          <h3 style={{ color: '#1a2233', marginBottom: '20px', fontSize: '1.05rem' }}>Visão Geral Sanitária Oficial</h3>
          {animais.length === 0 ? (
            <p style={{ color: '#5b6577' }}>Nenhum animal neste lote.</p>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a73e8', color: 'white' }}>
                    <th style={{ padding: '12px' }}>Brinco</th>
                    <th style={{ padding: '12px' }}>Número SISBOV <span style={{ color: '#fde68a' }}>*</span></th>
                    <th style={{ padding: '12px' }}>Tecnologia</th>
                    <th style={{ padding: '12px' }}>Data da Última Vacina</th>
                    <th style={{ padding: '12px' }}>Status de Saúde</th>
                  </tr>
                </thead>
                <tbody>
                  {animais.map((animal) => {
                    const animalSisbov = getAnimalSisbov(animal, sisbovMap);
                    return (
                      <tr key={animal.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px', fontWeight: 700 }}>{formatValue(animal.idBrinco)}</td>
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
                            <span style={{ fontWeight: 700 }}>{animalSisbov}</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatTrackingTechnology(animal)}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{formatValue(animal.dataUltimaVacina) || 'Não registrada'}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`badge ${animal.status?.toLowerCase() === 'saudável' || animal.status?.toLowerCase() === 'saudavel' ? 'badge-success' : 'badge-danger'}`}>
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
          <h3 style={{ color: '#1a2233', marginBottom: '20px', fontSize: '1.05rem' }}>Ficha Técnica dos Animais</h3>
          {animais.length === 0 ? (
            <p style={{ color: '#5b6577' }}>Nenhum animal neste lote.</p>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {animais.map((animal, index) => {
                const animalSisbov = getAnimalSisbov(animal, sisbovMap);
                return (
                  <div
                    key={animal.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      pageBreakInside: 'avoid'
                    }}
                  >
                    <h4 style={{ margin: '0 0 10px 0', color: '#1a73e8' }}>
                      Animal {index + 1}: {animal.idBrinco}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Número SISBOV:</span>
                        <div style={{ fontWeight: 700 }}>{formatValue(animalSisbov)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Categoria:</span>
                        <div style={{ fontWeight: 700 }}>{formatValue(animal.categoria)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Tecnologia de Rastreamento:</span>
                        <div style={{ fontWeight: 700 }}>{formatTrackingTechnology(animal)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Peso:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.peso)} kg</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Pasto Autorizado:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.pastoAutorizado)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Pasto Atual:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.pastoAtual)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Data de Cadastro:</span>
                        <div style={{ fontWeight: 'bold' }}>{formatValue(animal.dataCadastro)}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#8a93a6' }}>Observações:</span>
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
          <h3 style={{ marginBottom: '20px', color: '#1a2233' }}>Validação Veterinária Oficial</h3>
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
                  <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Nome do Veterinário (Assinatura Eletrônica):</label>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', padding: '10px 0', borderBottom: '1px solid #000', minHeight: '100px' }}>
                    {nomeResponsavelTecnico || lote.nomeResponsavelTecnico || 'Não informado'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>CRMV (Registro Profissional):</label>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', padding: '10px 0', borderBottom: '1px solid #000' }}>
                    {crmv || lote.crmv || 'Não informado'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Data da Assinatura:</label>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', padding: '10px 0', borderBottom: '1px solid #000' }}>
                    {lote.dataAssinatura ? formatValue(lote.dataAssinatura) : new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '14px', color: '#5b6577', display: 'block', marginBottom: '5px', fontWeight: 700 }}>Linha de Assinatura Manual:</label>
                  <div style={{ minHeight: '40px', borderBottom: '1px solid #000' }} />
                </div>
              </>
            )}
            {!editingEnabled && (
              <div style={{ marginTop: '20px', background: 'var(--color-success-light)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid #86e0ad' }}>
                <p style={{ margin: 0, color: '#166534', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CircleCheckBig size={16} /> Certificado validado e finalizado em {lote.dataAssinatura ? formatValue(lote.dataAssinatura) : new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutPadrao>
  );
}
