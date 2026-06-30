import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, query, where, doc, getDoc } from 'firebase/firestore';
import { logoutSeguro } from '../utils/auth';
import Button from '../components/Button';
import Input from '../components/Input';
import LayoutPadrao from '../components/LayoutPadrao';

interface Item {
  id: string;
  nome: string;
  valor: number;
}

export default function PainelPrincipal() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<Item[]>([]);
  const [totalItens, setTotalItens] = useState(0);
  const [totalValor, setTotalValor] = useState(0);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [numeroChip, setNumeroChip] = useState('');
  const [descricaoChip, setDescricaoChip] = useState('');
  const [valorChip, setValorChip] = useState('');
  const [nomeLojista, setNomeLojista] = useState<string | null>(null);

  const getSaudacao = (nome: string | null) => {
    const hora = new Date().getHours();
    if (!nome) {
      return 'Olá, lojista!';
    }
    if (hora >= 5 && hora < 12) {
      return `Bom dia, ${nome}! Um cheirinho de café para começar bem o dia.`;
    } else if (hora >= 12 && hora < 18) {
      return `Boa tarde, ${nome}! Que tal um café para renovar as energias?`;
    } else {
      return `Boa noite, ${nome}! Hora de encerrar as atividades com um café.`;
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (user?.email) {
        // Carregar dados do lojista
        const lojistaDocRef = doc(db, 'lojistas', user.email);
        const lojistaDocSnap = await getDoc(lojistaDocRef);
        if (lojistaDocSnap.exists()) {
          const dadosLojista = lojistaDocSnap.data();
          setNomeLojista(dadosLojista.nome || null);
        }

        // Carregar itens vinculados ao usuário
        const itemsRef = collection(db, 'itens');
        let itemsSnap = await getDocs(query(itemsRef, where('uidDono', '==', user.uid)));

        if (itemsSnap.empty) {
          itemsSnap = await getDocs(query(itemsRef, where('emailDono', '==', user.email)));
        }

        const itensList = itemsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Item[];
        
        setItens(itensList);
      }
      setCarregando(false);
    };

    carregarDados();
  }, []);

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      try {
        await logoutSeguro();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  const handleFecharModalCadastro = () => {
    setModalCadastroAberto(false);
    setNumeroChip('');
    setDescricaoChip('');
    setValorChip('');
  };

  const handleSalvarChip = async () => {
    if (!numeroChip.trim() || !descricaoChip.trim() || !valorChip.trim()) {
      alert('Preencha todos os campos!');
      return;
    }

    const user = auth.currentUser;
    if (user?.email) {
      const itemsRef = collection(db, 'itens');
      await addDoc(itemsRef, {
          nome: `${numeroChip} - ${descricaoChip}`,
          valor: parseFloat(valorChip),
          numeroChip: numeroChip,
          descricaoChip: descricaoChip,
          emailDono: user.email,
          uidDono: user.uid
        });

      const itemsQ = query(itemsRef, where('uidDono', '==', user.uid));
      const itemsSnap = await getDocs(itemsQ);
      const itensList = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      
      setItens(itensList);

      handleFecharModalCadastro();
    }
  };

  const itensFiltrados = itens.filter(item => 
    item.nome.toLowerCase().includes(busca.toLowerCase())
  );

  useEffect(() => {
    setTotalItens(itens.length);
    setTotalValor(itens.reduce((sum, item) => sum + (item.valor || 0), 0));
  }, [itens]);

  return (
    <LayoutPadrao>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee', zIndex: 100 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ margin: 0 }}>Painel Principal</h2>
          <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>{getSaudacao(nomeLojista)}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', zIndex: 100 }}>
          <Button onClick={() => navigate('/cadastro-animais')} className="btn-responsivo" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            Novo Cadastro
          </Button>
          <Button onClick={() => navigate('/monitoramento')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            Monitoramento
          </Button>
          <Button onClick={handleLogout} className="btn-responsivo" style={{ fontSize: '12px', color: 'white', background: '#ff4444', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            SAIR
          </Button>
        </div>
      </div>

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <Input 
              type="text" 
              placeholder="Buscar itens..." 
              className="campo" 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              style={{ flex: 1, minWidth: '200px' }}
            />
            <Button onClick={() => setModalCadastroAberto(true)} className="btn-responsivo" style={{ background: '#25d366', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold' }}>
              Novo Chip
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Total de Itens</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#1a73e8' }}>{totalItens || 0}</p>
            </div>
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Total em Valor</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#25d366' }}>R$ {(totalValor || 0).toFixed(2)}</p>
            </div>
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>Última Atualização</h3>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#333' }}>{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
            <h3 style={{ padding: '15px 15px 0 15px', margin: 0 }}>Últimos Itens</h3>
            <ul style={{ padding: '15px', listStyle: 'none', margin: 0 }}>
              {itensFiltrados.slice(-5).reverse().map(item => (
                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.nome}</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#1a73e8' }}>R$ {item.valor.toFixed(2)}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {modalCadastroAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ position: 'relative', background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
            <Button
              type="button"
              onClick={handleFecharModalCadastro}
              aria-label="Fechar cadastro de chip"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 2100,
                background: '#fff',
                color: '#d32f2f',
                border: '1px solid #d32f2f',
                borderRadius: '999px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              ✕
            </Button>
            <h3 style={{ margin: '0 0 20px 0' }}>Cadastrar Chip</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>Número do Chip</label>
              <Input 
                type="text" 
                value={numeroChip} 
                onChange={(e) => setNumeroChip(e.target.value)} 
                className="campo" 
                placeholder="Número do chip" 
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>Descrição</label>
              <Input 
                type="text" 
                value={descricaoChip} 
                onChange={(e) => setDescricaoChip(e.target.value)} 
                className="campo" 
                placeholder="Descrição" 
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>Valor</label>
              <Input 
                type="number" 
                value={valorChip} 
                onChange={(e) => setValorChip(e.target.value)} 
                className="campo" 
                placeholder="0.00" 
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleFecharModalCadastro} className="btn-responsivo" style={{ flex: 1, background: '#9e9e9e', color: 'white', border: 'none', padding: '12px', borderRadius: '8px' }}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarChip} className="btn-responsivo" style={{ flex: 1, background: '#1a73e8', color: 'white', border: 'none', padding: '12px', borderRadius: '8px' }}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </LayoutPadrao>
  );
}