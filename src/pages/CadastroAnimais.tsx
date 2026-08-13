import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { ClipboardPlus, ArrowLeft, Eraser, Scale } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import LayoutPadrao from '../components/LayoutPadrao';

const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label: string;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [value]);

  return (
    <div>
      <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
        {label}
      </label>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="campo"
        style={{
          resize: 'none',
          fontFamily: 'inherit',
          lineHeight: '1.5',
          margin: 0,
        }}
      />
    </div>
  );
};

const ResumoCadastro = ({
  nomeFazenda,
  idBrinco,
  categoria,
  lote,
  qtdCabecas,
  pesoPorCabeca,
  pesoTotalFormatado,
  totalArrobasFormatado,
  vacinasMedicamentos,
}: any) => {
  return (
    <div style={{ background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', padding: '18px', border: '1px solid var(--color-border)' }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: '#1a73e8' }}>Resumo do Cadastro</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {nomeFazenda && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>Fazenda:</strong> {nomeFazenda}
          </div>
        )}
        {idBrinco && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>ID/Brinco:</strong> {idBrinco}
          </div>
        )}
        {categoria && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>Categoria:</strong> {categoria}
          </div>
        )}
        {lote && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>Lote:</strong> {lote}
          </div>
        )}
        {qtdCabecas > 0 && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>Quantidade de Cabeças:</strong> {qtdCabecas}
          </div>
        )}
        {pesoPorCabeca > 0 && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>Peso Médio:</strong> {pesoPorCabeca} kg/cabeça
          </div>
        )}
        <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
          <strong>Peso Total:</strong> {pesoTotalFormatado} kg
        </div>
        <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
          <strong>Total em Arrobas:</strong> {totalArrobasFormatado} @
        </div>
        {vacinasMedicamentos && (
          <div style={{ fontSize: '0.875rem', color: '#3a4150' }}>
            <strong>Vacinas/Medicamentos:</strong> {vacinasMedicamentos}
          </div>
        )}
      </div>
    </div>
  );
};

export default function CadastroAnimais() {
  const navigate = useNavigate();

  const [idBrinco, setIdBrinco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [vacinasMedicamentos, setVacinasMedicamentos] = useState('');
  const [origem, setOrigem] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [pastoAutorizado, setPastoAutorizado] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [lote, setLote] = useState('');
  const [qtdCabecas, setQtdCabecas] = useState(0);
  const [pesoPorCabeca, setPesoPorCabeca] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [celularAlertas, setCelularAlertas] = useState(''); // Novo estado para celular de alertas

  const pesoTotal = qtdCabecas * pesoPorCabeca;
  const pesoTotalFormatado = pesoTotal.toLocaleString('pt-BR');
  const totalArrobas = pesoTotal / 15;
  const totalArrobasFormatado = totalArrobas.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length <= 2) {
      return `(${value}`;
    } else if (value.length <= 7) {
      return `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else {
      return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
    }
  };

  const handleLimpar = () => {
    setIdBrinco('');
    setCategoria('');
    setVacinasMedicamentos('');
    setOrigem('');
    setDataNascimento('');
    setPastoAutorizado('');
    setNomeFazenda('');
    setLote('');
    setQtdCabecas(0);
    setPesoPorCabeca(0);
    setObservacoes('');
    setCelularAlertas(''); // Limpar também o celular de alertas
  };

  const handleSalvar = async () => {
    if (!idBrinco.trim() || !categoria.trim() || !pastoAutorizado.trim() || !lote.trim()) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      alert('Erro: Usuário não autenticado');
      return;
    }

    setCarregando(true);
    try {
      const animaisRef = collection(db, 'animais');
      const q = query(
        animaisRef,
        where('emailDono', '==', user.email),
        where('idBrinco', '==', idBrinco.trim())
      );
      const snapshot = await getDocs(q);

      const formData = {
        idBrinco,
        categoria,
        vacinasMedicamentos,
        origem: origem || null,
        dataNascimento: dataNascimento || null,
        pastoAutorizado,
        pastoAtual: pastoAutorizado,
        lote,
        qtdCabecas,
        pesoPorCabeca,
        nomeFazenda: nomeFazenda || null,
        observacoes: observacoes || null,
        celularAlertas: celularAlertas.replace(/\D/g, ''), // Salvar apenas números
        dono_email: user.email,
        emailDono: user.email,
      };

      const dados = {
        ...formData,
        peso: pesoTotal,
        arrobas: totalArrobas,
        historicoSaude: [],
        historicoManejo: [],
        dataCadastro: new Date(),
        dataAtualizacao: new Date(),
      };

      if (!snapshot.empty) {
        const docRef = doc(db, 'animais', snapshot.docs[0].id);
        const currentData = snapshot.docs[0].data();
        await updateDoc(docRef, {
          ...dados,
          historicoSaude: currentData.historicoSaude || [],
          historicoManejo: currentData.historicoManejo || []
        });
        alert('Cadastro atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'animais'), dados);
        alert('Animal cadastrado com sucesso!');
      }

      navigate('/monitoramento');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar!');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <LayoutPadrao>
      <div className="header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardPlus size={22} color="#1a73e8" /> Cadastro de Animais
          </h2>
          <p style={{ margin: '6px 0 0', color: '#5b6577', fontSize: '0.95rem' }}>Adicione um novo animal ou atualize um cadastro existente</p>
        </div>
        <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ fontSize: '0.85rem', color: '#3a4150', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', padding: '10px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Nome da Fazenda</label>
          <Input
            type="text"
            placeholder="Nome da fazenda ou propriedade"
            value={nomeFazenda}
            onChange={(e) => setNomeFazenda(e.target.value)}
            className="campo"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Identificação do Brinco (Obrigatório)</label>
            <Input
              type="text"
              placeholder="Número do brinco"
              value={idBrinco}
              onChange={(e) => setIdBrinco(e.target.value)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Categoria</label>
            <Input
              type="text"
              placeholder="Boi, Vaca, Bezerro..."
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Origem (opcional)</label>
            <Input
              type="text"
              placeholder="Compra, Nascimento na propriedade..."
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Data de Nascimento (opcional)</label>
            <Input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Pasto Autorizado</label>
            <Input
              type="text"
              placeholder="Digite o nome do pasto autorizado"
              value={pastoAutorizado}
              onChange={(e) => setPastoAutorizado(e.target.value)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Lote</label>
            <Input
              type="text"
              placeholder="Nome do lote"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Quantidade de Cabeças</label>
            <Input
              type="number"
              placeholder="Quantidade"
              value={qtdCabecas}
              onChange={(e) => setQtdCabecas(parseFloat(e.target.value) || 0)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Peso Médio por Cabeça (kg)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="Peso médio em kg"
              value={pesoPorCabeca}
              onChange={(e) => setPesoPorCabeca(parseFloat(e.target.value) || 0)}
              className="campo"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Celular para Alertas (WhatsApp)</label>
            <Input
              type="tel"
              placeholder="(00) 00000-0000"
              value={formatPhoneNumber(celularAlertas)}
              onChange={(e) => setCelularAlertas(e.target.value)}
              className="campo"
            />
          </div>
        </div>

        <AutoResizeTextarea
          label="Vacinas/Medicamentos"
          placeholder="Lista de vacinas ou medicamentos aplicados..."
          value={vacinasMedicamentos}
          onChange={setVacinasMedicamentos}
        />

        <div style={{ marginTop: '20px' }}>
          <label style={{ fontSize: '13px', color: '#5b6577', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Observações</label>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '20px', marginBottom: '20px' }}>
          <div style={{ padding: '14px 16px', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: '#5b6577', fontWeight: 600, marginBottom: '4px' }}>PESO TOTAL DO LOTE</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a2233' }}>{pesoTotalFormatado} kg</div>
          </div>
          <div style={{ padding: '14px 16px', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Scale size={18} color="#1a73e8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#5b6577', fontWeight: 600, marginBottom: '4px' }}>TOTAL EM ARROBAS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a2233' }}>{totalArrobasFormatado} @</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <ResumoCadastro
            nomeFazenda={nomeFazenda}
            idBrinco={idBrinco}
            categoria={categoria}
            lote={lote}
            qtdCabecas={qtdCabecas}
            pesoPorCabeca={pesoPorCabeca}
            pesoTotalFormatado={pesoTotalFormatado}
            totalArrobasFormatado={totalArrobasFormatado}
            vacinasMedicamentos={vacinasMedicamentos}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '10px' }}>
          <Button onClick={handleLimpar} className="btn-responsivo" style={{ background: '#fef6e7', color: '#b45309', border: 'none', padding: '12px 22px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
            <Eraser size={16} /> Limpar
          </Button>
          <Button onClick={() => { handleLimpar(); navigate('/painel-principal'); }} className="btn-responsivo" style={{ background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '12px 22px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} className="btn-responsivo" disabled={carregando} style={{ background: carregando ? '#c9cfdb' : '#1a73e8', color: 'white', border: 'none', padding: '12px 22px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
            {carregando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </LayoutPadrao>
  );
}
