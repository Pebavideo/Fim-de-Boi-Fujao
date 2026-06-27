import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, limit, query, orderBy, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Button from '../components/Button';
import Input from '../components/Input';

interface DadosLojista {
  nome: string;
  whatsapp: string;
  localizacao: string;
}

interface Item {
  id: string;
  nome: string;
  valor: number;
}

interface Animal {
  id: string;
  idBrinco: string;
  categoria: string;
  peso: number;
  status: string;
  pastoAutorizado: string;
  pastoAtual: string;
  foto: string;
  dataCadastro: any;
}

export default function Monitoramento() {
  const navigate = useNavigate();
  const [dadosLojista, setDadosLojista] = useState<DadosLojista | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [todosAnimais, setTodosAnimais] = useState<Animal[]>([]);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [ultimoDoc, setUltimoDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<Item | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [valorEdit, setValorEdit] = useState('');

  const carregarPrimeirosAnimais = async () => {
    const user = auth.currentUser;
    if (user?.email) {
      const animaisRef = collection(db, 'animais');
      const q = query(
        animaisRef, 
        where('emailDono', '==', user.email),
        orderBy('dataCadastro', 'desc'), 
        limit(20)
      );
      const animaisSnap = await getDocs(q);
      
      const animaisList = animaisSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Animal[];
      
      setTodosAnimais(animaisList);
      setAnimais(animaisList);
      
      if (animaisSnap.docs.length === 20) {
        setUltimoDoc(animaisSnap.docs[animaisSnap.docs.length - 1]);
        setTemMais(true);
      } else {
        setTemMais(false);
      }
    }
  };

  const carregarMaisAnimais = async () => {
    const user = auth.currentUser;
    if (user?.email && ultimoDoc) {
      const animaisRef = collection(db, 'animais');
      const q = query(
        animaisRef, 
        where('emailDono', '==', user.email),
        orderBy('dataCadastro', 'desc'), 
        startAfter(ultimoDoc), 
        limit(20)
      );
      const animaisSnap = await getDocs(q);
      
      const novosAnimais = animaisSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Animal[];
      
      const todosNovosAnimais = [...todosAnimais, ...novosAnimais];
      setTodosAnimais(todosNovosAnimais);
      setAnimais(todosNovosAnimais);
      
      if (animaisSnap.docs.length === 20) {
        setUltimoDoc(animaisSnap.docs[animaisSnap.docs.length - 1]);
        setTemMais(true);
      } else {
        setTemMais(false);
      }
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (user?.email) {
        // Carregar dados do lojista da coleção /lojistas/{email} ou podemos criar um documento /usuarios/{email} - vamos manter a lógica original de lojista, mas atualizar o caminho
        const docRef = doc(db, 'lojistas', user.email);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDadosLojista(docSnap.data() as DadosLojista);
        } else {
          setDadosLojista({
            nome: user.displayName || 'Usuário',
            whatsapp: '',
            localizacao: ''
          });
        }

        // Carregar itens da coleção /itens com filtro
        const itemsRef = collection(db, 'itens');
        const itemsQ = query(itemsRef, where('emailDono', '==', user.email));
        const itemsSnap = await getDocs(itemsQ);
        const itemsList = itemsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Item[];
        setItens(itemsList);

        // Carregar primeiros 20 animais
        await carregarPrimeirosAnimais();
      }
      setCarregando(false);
    };

    carregarDados();
  }, []);

  // Filtro local
  const animaisFiltrados = todosAnimais.filter(animal => 
    animal.idBrinco.toLowerCase().includes(filtroBusca.toLowerCase()) ||
    animal.categoria.toLowerCase().includes(filtroBusca.toLowerCase()) ||
    animal.status.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      signOut(auth);
    }
  };

  const handleAbrirEditar = (item: Item) => {
    setItemEditando(item);
    setNomeEdit(item.nome);
    setValorEdit(item.valor.toString());
    setModalAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!nomeEdit.trim() || !valorEdit.trim()) {
      alert('Preencha todos os campos!');
      return;
    }

    const user = auth.currentUser;
    if (user?.email && itemEditando) {
      const itemRef = doc(db, 'itens', itemEditando.id);
      await updateDoc(itemRef, {
        nome: nomeEdit,
        valor: parseFloat(valorEdit),
        emailDono: user.email
      });

      const itemsRef = collection(db, 'itens');
      const itemsQ = query(itemsRef, where('emailDono', '==', user.email));
      const itemsSnap = await getDocs(itemsQ);
      const itemsList = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      setItens(itemsList);

      setModalAberto(false);
      setItemEditando(null);
    }
  };

  const handleDeletar = async (item: Item) => {
    if (!confirm('Deseja realmente deletar este item?')) {
      return;
    }

    const user = auth.currentUser;
    if (user?.email) {
      const itemRef = doc(db, 'itens', item.id);
      await deleteDoc(itemRef);

      const itemsRef = collection(db, 'itens');
      const itemsQ = query(itemsRef, where('emailDono', '==', user.email));
      const itemsSnap = await getDocs(itemsQ);
      const itemsList = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      setItens(itemsList);
    }
  };

  return (
    <div className="app-card" style={{ zIndex: 1000 }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>{dadosLojista?.nome || 'Monitoramento'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', zIndex: 100 }}>
          <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            Painel Principal
          </Button>
          <Button onClick={handleLogout} className="btn-responsivo" style={{ fontSize: '12px', color: 'white', background: '#ff4444', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            SAIR
          </Button>
        </div>
      </div>

      {carregando ? (
        <p>Carregando dados...</p>
      ) : dadosLojista ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '5px', display: 'block' }}>Nome</label>
              <Input type="text" value={dadosLojista.nome} readOnly className="campo" />
            </div>
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '5px', display: 'block' }}>WhatsApp</label>
              <Input type="text" value={dadosLojista.whatsapp} readOnly className="campo" />
            </div>
            <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', zIndex: 1001 }}>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '5px', display: 'block' }}>Localização</label>
              <Input type="text" value={dadosLojista.localizacao} readOnly className="campo" />
            </div>
          </div>

          <h3 style={{ marginBottom: '10px' }}>Itens</h3>
          <ul style={{ padding: 0, listStyle: 'none', margin: 0, marginBottom: '25px' }}>
            {itens.map(item => (
              <li key={item.id} style={{ background: 'white', border: '1px solid #eee', padding: '15px', borderRadius: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1001 }}>
                <div style={{ flex: 1 }}>
                  <div><strong>{item.nome}</strong></div>
                  <div>R$ {item.valor.toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={() => handleAbrirEditar(item)} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '14px' }}>
                    Editar
                  </Button>
                  <Button onClick={() => handleDeletar(item)} className="btn-responsivo" style={{ background: '#ff4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '14px' }}>
                    Deletar
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <h3 style={{ marginBottom: '10px' }}>Animais</h3>
          
          {/* Barra de busca */}
          <div style={{ marginBottom: '15px' }}>
            <Input 
              type="text" 
              placeholder="Buscar por brinco, categoria ou status..." 
              value={filtroBusca} 
              onChange={(e) => setFiltroBusca(e.target.value)} 
              className="campo" 
            />
          </div>

          <ul style={{ padding: 0, listStyle: 'none', margin: 0, marginBottom: '15px' }}>
            {animaisFiltrados.map(animal => {
              const fugiu = animal.pastoAtual !== animal.pastoAutorizado;
              return (
                <li 
                  key={animal.id} 
                  style={{ 
                    background: fugiu ? '#ffebee' : 'white', 
                    border: fugiu ? '2px solid #f44336' : '1px solid #eee', 
                    padding: '15px', 
                    borderRadius: '12px', 
                    marginBottom: '8px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    zIndex: 1001 
                  }}
                >
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                    <img src={animal.foto} alt={animal.idBrinco} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {animal.idBrinco} 
                        {fugiu && <span style={{ color: '#f44336', fontSize: '18px' }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {animal.categoria} • {animal.peso}kg • {animal.status}
                      </div>
                      <div style={{ fontSize: '13px', color: fugiu ? '#f44336' : '#4caf50' }}>
                        Pasto: {animal.pastoAtual} {fugiu ? '(Fugiu! Autorizado: ' + animal.pastoAutorizado + ')' : ''}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Botão Carregar Mais */}
          {temMais && (
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <Button onClick={carregarMaisAnimais} className="btn-responsivo" style={{ background: '#607d8b', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px' }}>
                Carregar Mais
              </Button>
            </div>
          )}
        </>
      ) : (
        <p>Nenhum dado encontrado.</p>
      )}

      {modalAberto && itemEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Editar Item</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>Nome</label>
              <Input 
                type="text" 
                value={nomeEdit} 
                onChange={(e) => setNomeEdit(e.target.value)} 
                className="campo" 
                placeholder="Nome do item" 
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>Valor</label>
              <Input 
                type="number" 
                value={valorEdit} 
                onChange={(e) => setValorEdit(e.target.value)} 
                className="campo" 
                placeholder="0.00" 
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={() => setModalAberto(false)} className="btn-responsivo" style={{ flex: 1, background: '#9e9e9e', color: 'white', border: 'none', padding: '12px', borderRadius: '8px' }}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicao} className="btn-responsivo" style={{ flex: 1, background: '#1a73e8', color: 'white', border: 'none', padding: '12px', borderRadius: '8px' }}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
