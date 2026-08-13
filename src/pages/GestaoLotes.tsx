import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import Input from '../components/Input';
import MapComponent from '../components/MapComponent';
import { ArrowLeft, Search, Boxes, FileCheck, X, Trash2, PencilLine, TriangleAlert } from 'lucide-react';

interface LoteData {
  id: string;
  nome_lote: string;
  animais: string[];
  data_criacao: any;
  emailDono: string;
}

export default function GestaoLotes() {
  const navigate = useNavigate();
  const [lotes, setLotes] = useState<LoteData[]>([]);
  const [loading, setLoading] = useState(true);

  const [animalId, setAnimalId] = useState<string | null>(null);
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [idBrinco, setIdBrinco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [origem, setOrigem] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [pastoAutorizado, setPastoAutorizado] = useState('');
  const [lote, setLote] = useState('');
  const [qtdCabecas, setQtdCabecas] = useState(0);
  const [pesoPorCabeca, setPesoPorCabeca] = useState(0);
  const [vacinasMedicamentos, setVacinasMedicamentos] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [buscaLote, setBuscaLote] = useState('');
  const [buscaBrinco, setBuscaBrinco] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  const [selectedLoteOption, setSelectedLoteOption] = useState<string>('');
  const [showMap, setShowMap] = useState(false);

  const pesoTotal = qtdCabecas * pesoPorCabeca;
  const pesoTotalFormatado = pesoTotal.toLocaleString('pt-BR');
  const totalArrobas = pesoTotal / 15;
  const totalArrobasFormatado = totalArrobas.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (!user?.email) return;

      try {
        const lotesRef = collection(db, 'lotes');
        const lotesQuery = query(lotesRef, where('emailDono', '==', user.email));
        const lotesSnap = await getDocs(lotesQuery);
        const lotesList = lotesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LoteData[];
        setLotes(lotesList);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const lotesFiltrados = lotes.filter(loteItem =>
    (loteItem.nome_lote || '').toLowerCase().includes(buscaLote.toLowerCase())
  );

  const handleLimpar = () => {
    setAnimalId(null);
    setNomeFazenda('');
    setIdBrinco('');
    setCategoria('');
    setOrigem('');
    setDataNascimento('');
    setPastoAutorizado('');
    setLote('');
    setQtdCabecas(0);
    setPesoPorCabeca(0);
    setVacinasMedicamentos('');
    setObservacoes('');
    setBuscaLote('');
    setBuscaBrinco('');
    setSelectedLoteOption('');
    setMensagem(null);
    setShowMap(false);
    setSelectedLoteId(null);
  };

  const handleBuscarLoteEnter = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await handleBuscarLote();
    }
  };

  const handleBuscarLote = async () => {
    const filtro = selectedLoteOption || buscaLote;
    const loteEncontrado = lotes.find(l => 
      (l.nome_lote || '').toLowerCase() === filtro.toLowerCase().trim()
    );

    if (loteEncontrado) {
      await handleSelecionarLote(loteEncontrado.id);
      setSelectedLoteId(loteEncontrado.id);
      setShowMap(true);
      setMensagem(null);
    } else {
      setMensagem('Lote não encontrado');
      setSelectedLoteId(null);
      setShowMap(false);
      setTimeout(() => setMensagem(null), 3000);
    }
  };

  const handleBuscarBrinco = async () => {
    const user = auth.currentUser;
    if (!user?.email) return;

    try {
      const animaisRef = collection(db, 'animais');
      const q = query(
        animaisRef,
        where('emailDono', '==', user.email),
        where('idBrinco', '==', buscaBrinco.trim())
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setAnimalId(snapshot.docs[0].id);
        setNomeFazenda(docData.nomeFazenda || '');
        setIdBrinco(docData.idBrinco || '');
        setCategoria(docData.categoria || '');
        setOrigem(docData.origem || '');
        setDataNascimento(docData.dataNascimento || '');
        setPastoAutorizado(docData.pastoAutorizado || '');
        setLote(docData.lote || '');
        setQtdCabecas(docData.qtdCabecas || 0);
        setPesoPorCabeca(docData.pesoPorCabeca || 0);
        setVacinasMedicamentos(docData.vacinasMedicamentos || '');
        setObservacoes(docData.observacoes || '');
        setMensagem(null);
      } else {
        setMensagem('Animal não encontrado');
        setTimeout(() => setMensagem(null), 3000);
      }
    } catch (error) {
      console.error('Erro ao buscar animal:', error);
    }
  };

  const handleBuscarBrincoEnter = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await handleBuscarBrinco();
    }
  };

  const handleSelecionarLote = async (loteId: string) => {
    const loteEncontrado = lotes.find(l => l.id === loteId);
    if (!loteEncontrado) return;

    setSelectedLoteId(loteEncontrado.id);
    setLote(loteEncontrado.nome_lote);
    setSelectedLoteOption(loteEncontrado.nome_lote);
    setMensagem(null);
    setShowMap(true);

    const user = auth.currentUser;
    if (!user?.email) return;

    try {
      const animaisRef = collection(db, 'animais');
      const q = query(
        animaisRef,
        where('emailDono', '==', user.email),
        where('lote', '==', loteEncontrado.nome_lote)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setAnimalId(snapshot.docs[0].id);
        setNomeFazenda(docData.nomeFazenda || '');
        setIdBrinco(docData.idBrinco || '');
        setCategoria(docData.categoria || '');
        setOrigem(docData.origem || '');
        setDataNascimento(docData.dataNascimento || '');
        setPastoAutorizado(docData.pastoAutorizado || '');
        setLote(docData.lote || loteEncontrado.nome_lote);
        setQtdCabecas(docData.qtdCabecas || loteEncontrado.animais.length || 0);
        setPesoPorCabeca(docData.pesoPorCabeca || 0);
        setVacinasMedicamentos(docData.vacinasMedicamentos || '');
        setObservacoes(docData.observacoes || '');
      } else {
        setAnimalId(null);
        setQtdCabecas(loteEncontrado.animais.length || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do lote:', error);
      setAnimalId(null);
      setQtdCabecas(loteEncontrado.animais.length || 0);
    }
  };

  const handleDeletar = async () => {
    if (!animalId) return;

    const confirmar = window.confirm('Tem certeza que deseja dar baixa neste animal?');
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, 'animais', animalId));
      alert('Animal deletado com sucesso!');
      handleLimpar();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar!');
    }
  };

  const handleSalvarEdicao = async () => {
    if (!idBrinco.trim() && !lote.trim()) {
      alert('Por favor, informe pelo menos o ID do Brinco ou o Nome do Lote!');
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      alert('Usuário não autenticado!');
      return;
    }

    try {
      const dados = {
        idBrinco,
        categoria,
        peso: pesoTotal,
        vacinasMedicamentos,
        origem: origem || null,
        dataNascimento: dataNascimento || null,
        pastoAutorizado,
        pastoAtual: pastoAutorizado,
        emailDono: user.email,
        lote,
        qtdCabecas,
        pesoPorCabeca,
        nomeFazenda: nomeFazenda || null,
        observacoes: observacoes || null,
        dataAtualizacao: new Date(),
      };

      if (animalId) {
        const docRef = doc(db, 'animais', animalId);
        await updateDoc(docRef, dados);
      } else if (idBrinco.trim()) {
        const animaisRef = collection(db, 'animais');
        const q = query(
          animaisRef,
          where('emailDono', '==', user.email),
          where('idBrinco', '==', idBrinco.trim())
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docRef = doc(db, 'animais', snapshot.docs[0].id);
          await updateDoc(docRef, dados);
        } else {
          await addDoc(collection(db, 'animais'), {
            ...dados,
            dataCadastro: new Date(),
            historicoSaude: [],
            historicoManejo: []
          });
        }
      }

      if (lote.trim()) {
        const lotesRef = collection(db, 'lotes');
        const q = query(lotesRef, where('emailDono', '==', user.email), where('nome_lote', '==', lote.trim()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docRef = doc(db, 'lotes', snapshot.docs[0].id);
          await updateDoc(docRef, {
            nome_lote: lote.trim(),
            dataAtualizacao: new Date(),
          });
        } else {
          await addDoc(collection(db, 'lotes'), {
            nome_lote: lote.trim(),
            animais: [],
            data_criacao: new Date(),
            emailDono: user.email,
          });
        }
      }

      alert('Edição salva com sucesso!');
      
      const lotesRef = collection(db, 'lotes');
      const lotesQuery = query(lotesRef, where('emailDono', '==', user.email));
      const lotesSnap = await getDocs(lotesQuery);
      const lotesList = lotesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoteData[];
      setLotes(lotesList);

    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar!');
    }
  };

  return (
    <LayoutPadrao>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Boxes size={22} color="#f59e0b" /> Gestão de Lotes
        </h2>
        <Button onClick={() => { handleLimpar(); navigate('/painel-principal'); }} className="btn-responsivo" style={{ background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '10px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>

      {loading ? (
        <p style={{ color: '#5b6577' }}>Carregando dados...</p>
      ) : (
        <>
          {mensagem && (
            <div style={{ background: 'var(--color-warning-light)', border: '1px solid #fcd9a4', color: '#92400e', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TriangleAlert size={16} /> {mensagem}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div style={{ background: 'white', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.05rem' }}>Buscar</h3>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={selectedLoteOption}
                    onChange={(e) => {
                      setSelectedLoteOption(e.target.value);
                      setBuscaLote(e.target.value);
                    }}
                    className="campo"
                    style={{ flex: 1, margin: 0 }}
                  >
                    <option value="">Selecionar lote</option>
                    {lotes.map((loteItem) => (
                      <option key={loteItem.id} value={loteItem.nome_lote}>
                        {loteItem.nome_lote}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBuscarLote}
                    className="btn-interativo"
                    style={{ minWidth: '140px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    Buscar Lote
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Input
                    type="text"
                    value={buscaLote}
                    onChange={(e) => setBuscaLote(e.target.value)}
                    onKeyDown={handleBuscarLoteEnter}
                    className="campo"
                    placeholder="Buscar por nome do lote"
                    style={{ flex: 1, margin: 0 }}
                  />
                  <button
                    onClick={handleBuscarLote}
                    className="btn-interativo"
                    style={{ minWidth: '120px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    Carregar
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Input
                    type="text"
                    value={buscaBrinco}
                    onChange={(e) => setBuscaBrinco(e.target.value)}
                    onKeyDown={handleBuscarBrincoEnter}
                    className="campo"
                    placeholder="Buscar por Brinco"
                    style={{ flex: 1, margin: 0 }}
                  />
                  <button
                    onClick={handleBuscarBrinco}
                    className="btn-interativo"
                    style={{ minWidth: '120px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    <Search size={14} /> Buscar
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                {showMap && selectedLoteId ? (
                  <MapComponent
                    drawEnabled={Boolean(selectedLoteId)}
                    onPolygonCreated={() => {}}
                  />
                ) : (
                  <div style={{ minHeight: '300px', border: '1.5px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: '#5b6577', background: 'var(--color-surface-alt)', textAlign: 'center', fontSize: '0.9rem' }}>
                    Selecione um lote e clique em "Buscar Lote" para carregar o mapa e habilitar o desenho.
                  </div>
                )}
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '16px' }}>
                {lotesFiltrados.length === 0 ? (
                  <p style={{ color: '#5b6577', textAlign: 'center', padding: '20px' }}>
                    Nenhum lote encontrado.
                  </p>
                ) : (
                  lotesFiltrados.map(loteItem => (
                    <div
                      key={loteItem.id}
                      className="btn-interativo"
                      style={{
                        background: lote === loteItem.nome_lote ? 'var(--color-primary-soft)' : 'white',
                        border: lote === loteItem.nome_lote ? '1px solid #1a73e8' : '1px solid var(--color-border)',
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        wordBreak: 'break-word'
                      }}
                      onClick={() => handleSelecionarLote(loteItem.id)}
                    >
                      <h4 style={{ margin: '0 0 4px 0' }}>{loteItem.nome_lote}</h4>
                      <p style={{ margin: 0, color: '#5b6577', fontSize: '0.85rem' }}>
                        {loteItem.animais.length} cabeças
                      </p>
                    </div>
                  ))
                )}
              </div>

              <Button onClick={handleLimpar} className="btn-responsivo" style={{ width: '100%', background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                Limpar
              </Button>
            </div>

            {lote || animalId ? (
              <div style={{ background: 'white', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{animalId ? 'Editar Registro' : 'Lote Selecionado'}</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {lote && (
                      <Button onClick={() => {
                        const loteEncontrado = lotes.find(l => l.nome_lote === lote);
                        if (loteEncontrado) {
                          navigate(`/lote/${loteEncontrado.id}`);
                        }
                      }} className="btn-responsivo" style={{ background: '#eafaf0', color: '#16a34a', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <FileCheck size={15} /> Certidão de Rastreabilidade
                      </Button>
                    )}
                    <Button onClick={handleLimpar} aria-label="Fechar" className="btn-interativo" style={{ background: 'var(--color-surface-alt)', color: '#5b6577', border: 'none', padding: '8px', borderRadius: '999px', width: '32px', height: '32px', minWidth: '32px' }}>
                      <X size={16} />
                    </Button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Nome da Fazenda</label>
                  <Input
                    type="text"
                    placeholder="Nome da fazenda ou propriedade"
                    value={nomeFazenda}
                    onChange={(e) => setNomeFazenda(e.target.value)}
                    className="campo"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Identificação do Brinco</label>
                    <Input
                      type="text"
                      placeholder="Número do brinco"
                      value={idBrinco}
                      onChange={(e) => setIdBrinco(e.target.value)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Categoria</label>
                    <Input
                      type="text"
                      placeholder="Boi, Vaca, Bezerro..."
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Origem (opcional)</label>
                    <Input
                      type="text"
                      placeholder="Compra, Nascimento na propriedade..."
                      value={origem}
                      onChange={(e) => setOrigem(e.target.value)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Data de Nascimento (opcional)</label>
                    <Input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => setDataNascimento(e.target.value)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Pasto Autorizado</label>
                    <Input
                      type="text"
                      placeholder="Digite o nome do pasto autorizado"
                      value={pastoAutorizado}
                      onChange={(e) => setPastoAutorizado(e.target.value)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Lote</label>
                    <Input
                      type="text"
                      placeholder="Nome do lote"
                      value={lote}
                      onChange={(e) => setLote(e.target.value)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Quantidade de Cabeças</label>
                    <Input
                      type="number"
                      placeholder="Quantidade"
                      value={qtdCabecas}
                      onChange={(e) => setQtdCabecas(parseFloat(e.target.value) || 0)}
                      className="campo"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Peso Médio por Cabeça (kg)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Peso médio em kg"
                      value={pesoPorCabeca}
                      onChange={(e) => setPesoPorCabeca(parseFloat(e.target.value) || 0)}
                      className="campo"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Vacinas/Medicamentos</label>
                  <textarea
                    value={vacinasMedicamentos}
                    onChange={(e) => setVacinasMedicamentos(e.target.value)}
                    placeholder="Lista de vacinas ou medicamentos aplicados..."
                    className="campo"
                    style={{
                      resize: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      margin: 0,
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Observações</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Observações adicionais sobre o animal..."
                    className="campo"
                    style={{
                      resize: 'none',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                      minHeight: '80px',
                      margin: 0,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '14px 16px', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#5b6577', fontWeight: 600, marginBottom: '4px' }}>PESO TOTAL</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a2233' }}>{pesoTotalFormatado} kg</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#5b6577', fontWeight: 600, marginBottom: '4px' }}>TOTAL EM ARROBAS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a2233' }}>{totalArrobasFormatado} @</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '10px' }}>
                  <Button onClick={handleDeletar} className="btn-responsivo" style={{ background: '#fdecec', color: '#dc2626', border: 'none', padding: '12px 22px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                    <Trash2 size={16} /> Deletar
                  </Button>
                  <Button onClick={handleSalvarEdicao} className="btn-responsivo" style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '12px 22px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                    <PencilLine size={16} /> Editar Lote
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </LayoutPadrao>
  );
}
