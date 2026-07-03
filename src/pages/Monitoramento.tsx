import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, onSnapshot, getDocs, updateDoc, deleteDoc, limit, query, orderBy, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { logoutSeguro } from '../utils/auth';
import { formatTrackingTechnology } from '../utils/VeterinarioModule';
import { verificarPosicao } from '../utils/geofencing';
import Button from '../components/Button';
import Input from '../components/Input';
import LayoutPadrao from '../components/LayoutPadrao';
import MapComponent from '../components/MapComponent';

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

interface PastoData {
  id: string;
  nome: string;
  polygon?: number[][];
}

interface Animal {
  id: string;
  idBrinco: string;
  nome: string;
  categoria: string;
  peso: number;
  status: string;
  pastoAutorizado: string;
  pastoAtual: string;
  foto: string;
  dataCadastro: any;
  lat?: number;
  long?: number;
  latitude?: number;
  longitude?: number;
  bateria?: number;
  tecnologiaRastreamento?: string;
}

interface GatewayAnimal {
  id: string;
  brinco_id: string;
  lat: number;
  long: number;
  bateria: number;
  timestamp?: any;
}

export default function Monitoramento() {
  const navigate = useNavigate();
  const [dadosLojista, setDadosLojista] = useState<DadosLojista | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [todosAnimais, setTodosAnimais] = useState<Animal[]>([]);
  const [pastos, setPastos] = useState<PastoData[]>([]);
  const [pastosCarregando, setPastosCarregando] = useState(true);
  const [animaisConsultando, setAnimaisConsultando] = useState(false);
  const [geofenceAlerts, setGeofenceAlerts] = useState<{ animalId: string; idBrinco: string; status: 'outside' | 'no-signal' | 'nopasto' | 'nopolygon' | 'inside'; message: string; }[]>([]);
  const [pastoSelecionado, setPastoSelecionado] = useState('');
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
      setAnimaisConsultando(true);
      const animaisRef = collection(db, 'animais');
      const q = query(
        animaisRef, 
        where('emailDono', '==', user.email),
        orderBy('dataCadastro', 'desc'), 
        limit(20)
      );

      try {
        console.log('[Monitoramento] consultando coleção de animais no Firestore');
        const animaisSnap = await getDocs(q);
        if (animaisSnap.empty) {
          console.log('Coleção de animais vazia ou inacessível no Firestore.');
        }
        const animaisList = animaisSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Animal[];
        
        setTodosAnimais(animaisList);
        
        if (animaisSnap.docs.length === 20) {
          setUltimoDoc(animaisSnap.docs[animaisSnap.docs.length - 1]);
          setTemMais(true);
        } else {
          setTemMais(false);
        }
      } catch (error) {
        console.log('Coleção de animais vazia ou inacessível no Firestore.');
        console.error('Erro ao consultar animais:', error);
      } finally {
        setAnimaisConsultando(false);
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
      
      if (animaisSnap.docs.length === 20) {
        setUltimoDoc(animaisSnap.docs[animaisSnap.docs.length - 1]);
        setTemMais(true);
      } else {
        setTemMais(false);
      }
    }
  };

  const carregarPastosDoUsuario = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      setPastos([]);
      setPastosCarregando(false);
      return;
    }

    try {
      const pastosRef = collection(db, 'pastos_do_usuario');
      const pastosQuery = query(pastosRef, where('emailDono', '==', user.email));
      const pastosSnap = await getDocs(pastosQuery);
      const listaPastos = pastosSnap.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as { nome?: string; polygon?: number[][] })
        }))
        .filter((pasto): pasto is PastoData => typeof pasto.nome === 'string');

      setPastos(listaPastos);
    } catch (error) {
      console.error('Erro ao carregar pastos do usuário:', error);
      setPastos([]);
    } finally {
      setPastosCarregando(false);
    }
  };

  const parseLocationCoordinates = (location?: string): [number, number] | null => {
    if (!location) return null;
    const parts = location.split(/[,;\s]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return [lat, lng];
      }
    }
    return null;
  };

  const getFarmCenter = (): [number, number] => {
    return parseLocationCoordinates(dadosLojista?.localizacao) ?? [-15.7801, -47.9292];
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
    carregarPastosDoUsuario();
  }, []);

  useEffect(() => {
    const monitorCollection = collection(db, 'monitoramento_animais');
    const unsubscribe = onSnapshot(monitorCollection, snapshot => {
      const gatewayData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GatewayAnimal[];

      setTodosAnimais(prevAnimals => prevAnimals.map(animal => {
        const gatewayEntry = gatewayData.find(entry => entry.brinco_id === animal.idBrinco);
        if (!gatewayEntry) {
          return animal;
        }
        return {
          ...animal,
          latitude: gatewayEntry.lat,
          longitude: gatewayEntry.long,
          bateria: gatewayEntry.bateria
        };
      }));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!todosAnimais.length || !pastos.length) {
      setGeofenceAlerts([]);
      return;
    }

    const generatedAlerts = todosAnimais.map((animal) => {
      if (!animal.latitude || !animal.longitude) {
        return {
          animalId: animal.id,
          idBrinco: animal.idBrinco,
          status: 'no-signal' as const,
          message: `Animal ${animal.idBrinco || animal.id} sem sinal de GPS.`
        };
      }

      if (!animal.pastoAutorizado) {
        return {
          animalId: animal.id,
          idBrinco: animal.idBrinco,
          status: 'nopasto' as const,
          message: `Animal ${animal.idBrinco || animal.id} não possui pasto autorizado definido.`
        };
      }

      const pasto = pastos.find(p => p.nome === animal.pastoAutorizado);
      if (!pasto || !pasto.polygon || !pasto.polygon.length) {
        return {
          animalId: animal.id,
          idBrinco: animal.idBrinco,
          status: 'nopolygon' as const,
          message: `Animal ${animal.idBrinco || animal.id} não possui área registrada para o pasto ${animal.pastoAutorizado}.`
        };
      }

      const isInside = verificarPosicao(animal.latitude, animal.longitude, pasto.polygon);
      return {
        animalId: animal.id,
        idBrinco: animal.idBrinco,
        status: isInside ? 'inside' as const : 'outside' as const,
        message: isInside
          ? `Animal ${animal.idBrinco || animal.id} está dentro da área delimitada.`
          : `Animal ${animal.idBrinco || animal.id} saiu da área delimitada!`
      };
    });

    setGeofenceAlerts(generatedAlerts.filter(alert => alert.status !== 'inside'));
  }, [todosAnimais, pastos]);

  // Filtro local
  const animaisFiltrados = todosAnimais.filter(animal => {
    const matchesBusca = 
      animal.idBrinco.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      animal.categoria.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      animal.status.toLowerCase().includes(filtroBusca.toLowerCase());
    const matchesPasto = pastoSelecionado ? animal.pastoAtual === pastoSelecionado : true;
    return matchesBusca && matchesPasto;
  });

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      try {
        await logoutSeguro();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  const handleAbrirEditar = (item: Item) => {
    setItemEditando(item);
    setNomeEdit(item.nome);
    setValorEdit(item.valor.toString());
    setModalAberto(true);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setItemEditando(null);
    setNomeEdit('');
    setValorEdit('');
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

      handleFecharModal();
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
    <LayoutPadrao>
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

      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        <Input
          type="text"
          placeholder="Buscar por brinco, categoria ou status..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="campo"
        />
        <select
          value={pastoSelecionado}
          onChange={(e) => setPastoSelecionado(e.target.value)}
          className="campo"
          style={{ appearance: 'none', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
        >
          <option value="">Filtrar por pasto (todos)</option>
          {pastosCarregando ? (
            <option value="">Carregando pastos...</option>
          ) : (
            pastos.map((pasto) => (
              <option key={pasto.id} value={pasto.nome}>{pasto.nome}</option>
            ))
          )}
        </select>
      </div>

      {geofenceAlerts.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'grid', gap: '12px', padding: '16px', borderRadius: '14px', background: '#fff3f3', border: '1px solid #f5c6cb' }}>
          <h3 style={{ margin: 0, color: '#c62828', fontSize: '1rem' }}>Alertas de Cerca Virtual</h3>
          {geofenceAlerts.map((alert) => (
            <div key={alert.animalId} style={{ background: '#fde7e9', border: '1px solid #f5c6cb', borderRadius: '10px', padding: '12px', color: '#9a1c25', fontSize: '0.95rem' }}>
              <strong>{alert.message}</strong>
            </div>
          ))}
        </div>
      )}

      {animaisConsultando && !carregando && (
        <p>Consultando animais...</p>
      )}

      {carregando ? (
        <p>Carregando dados...</p>
      ) : !todosAnimais.length ? (
        <div style={{ display: 'grid', gap: '20px', padding: '20px 0' }}>
          <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #dce4f5', padding: '28px', boxShadow: '0 14px 32px rgba(0,0,0,0.08)', zIndex: 1000 }}>
            <h2 style={{ margin: '0 0 12px', color: '#1a73e8' }}>Nenhum animal cadastrado no sistema</h2>
            <p style={{ margin: '0 0 20px', color: '#555', lineHeight: 1.6 }}>
              Clique abaixo para cadastrar seu primeiro animal e começar a monitorar sua fazenda.
            </p>
            <Button onClick={() => navigate('/cadastro-animais')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px', fontWeight: 'bold' }}>
              Cadastrar seu primeiro animal
            </Button>
          </div>
          <div style={{ width: '100%', minHeight: '400px', borderRadius: '18px', overflow: 'hidden', border: '1px solid #dce4f5' }}>
            <MapComponent onPolygonCreated={() => {}} drawEnabled={false} center={getFarmCenter()} zoom={12} />
          </div>
        </div>
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
                  onClick={() => navigate(`/animal/${animal.id}`)}
                  role="button"
                  style={{ 
                    background: fugiu ? '#ffebee' : 'white', 
                    border: fugiu ? '2px solid #f44336' : '1px solid #eee', 
                    padding: '15px', 
                    borderRadius: '12px', 
                    marginBottom: '8px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    zIndex: 1001,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1 }}>
                    <img src={animal.foto} alt={animal.idBrinco} loading="lazy" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {animal.idBrinco} 
                        {fugiu && <span style={{ color: '#f44336', fontSize: '18px' }}>⚠️</span>}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '4px' }}>
                        {animal.categoria} • {animal.peso}kg • {animal.status}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#444', marginBottom: '4px' }}>
                        Tecnologia: {formatTrackingTechnology(animal)}
                      </div>
                      {animal.bateria !== undefined && (
                        <div style={{ fontSize: '0.875rem', color: '#444', marginBottom: '4px' }}>
                          Bateria: {animal.bateria}%
                        </div>
                      )}
                      <div style={{ fontSize: '0.8125rem', color: fugiu ? '#f44336' : '#4caf50' }}>
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
          <div style={{ position: 'relative', background: 'white', padding: '20px', borderRadius: '15px', width: '100%', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <Button
              type="button"
              onClick={handleFecharModal}
              aria-label="Fechar edição de item"
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
              <Button onClick={handleFecharModal} className="btn-responsivo" style={{ flex: 1, background: '#9e9e9e', color: 'white', border: 'none', padding: '12px', borderRadius: '8px' }}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicao} className="btn-responsivo" style={{ flex: 1, background: '#1a73e8', color: 'white', border: 'none', padding: '12px', borderRadius: '8px' }}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </LayoutPadrao>
  );
}
