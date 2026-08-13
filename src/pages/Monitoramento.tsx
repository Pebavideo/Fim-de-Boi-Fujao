import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc, collection, onSnapshot, getDocs, updateDoc, deleteDoc, limit, query, orderBy, startAfter, QueryDocumentSnapshot, where } from 'firebase/firestore';
import { logoutSeguro } from '../utils/auth';
import { formatTrackingTechnology } from '../utils/VeterinarioModule';
import { verificarPosicao } from '../utils/geofencing';
import { LogOut, TriangleAlert, Battery, X, MapPinOff } from 'lucide-react';
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
      <div className="header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e3e8f2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{dadosLojista?.nome || 'Monitoramento'}</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700 }}>
            Painel Principal
          </Button>
          <Button onClick={handleLogout} className="btn-responsivo" style={{ fontSize: '0.85rem', color: '#dc2626', background: '#fdecec', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700 }}>
            <LogOut size={16} strokeWidth={2.5} /> Sair
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
          style={{ appearance: 'none', width: '100%' }}
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
        <div style={{ marginBottom: '20px', display: 'grid', gap: '10px', padding: '18px', borderRadius: 'var(--radius-lg)', background: '#fdecec', border: '1px solid #f5c6cb' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#c62828', fontSize: '1rem' }}>
            <TriangleAlert size={18} /> Alertas de Cerca Virtual
          </h3>
          {geofenceAlerts.map((alert) => (
            <div key={alert.animalId} style={{ background: 'white', border: '1px solid #f3c6c9', borderRadius: 'var(--radius-sm)', padding: '12px', color: '#9a1c25', fontSize: '0.9rem' }}>
              <strong>{alert.message}</strong>
            </div>
          ))}
        </div>
      )}

      {animaisConsultando && !carregando && (
        <p style={{ color: '#5b6577' }}>Consultando animais...</p>
      )}

      {carregando ? (
        <p style={{ color: '#5b6577' }}>Carregando dados...</p>
      ) : !todosAnimais.length ? (
        <div style={{ display: 'grid', gap: '20px', padding: '20px 0' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid #e3e8f2', padding: '28px', boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ margin: '0 0 12px', color: '#1a73e8' }}>Nenhum animal cadastrado no sistema</h2>
            <p style={{ margin: '0 0 20px', color: '#5b6577', lineHeight: 1.6 }}>
              Clique abaixo para cadastrar seu primeiro animal e começar a monitorar sua fazenda.
            </p>
            <Button onClick={() => navigate('/cadastro-animais')} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px', fontWeight: 700 }}>
              Cadastrar seu primeiro animal
            </Button>
          </div>
          <div style={{ width: '100%', minHeight: '400px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid #e3e8f2' }}>
            <MapComponent onPolygonCreated={() => {}} drawEnabled={false} center={getFarmCenter()} zoom={12} />
          </div>
        </div>
      ) : dadosLojista ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--color-primary-soft)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid #e3e8f2' }}>
              <label style={{ fontSize: '12px', color: '#5b6577', marginBottom: '5px', display: 'block', fontWeight: 600 }}>Nome</label>
              <Input type="text" value={dadosLojista.nome} readOnly className="campo" />
            </div>
            <div style={{ background: 'var(--color-primary-soft)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid #e3e8f2' }}>
              <label style={{ fontSize: '12px', color: '#5b6577', marginBottom: '5px', display: 'block', fontWeight: 600 }}>WhatsApp</label>
              <Input type="text" value={dadosLojista.whatsapp} readOnly className="campo" />
            </div>
            <div style={{ background: 'var(--color-primary-soft)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid #e3e8f2' }}>
              <label style={{ fontSize: '12px', color: '#5b6577', marginBottom: '5px', display: 'block', fontWeight: 600 }}>Localização</label>
              <Input type="text" value={dadosLojista.localizacao} readOnly className="campo" />
            </div>
          </div>

          {itens.length > 0 && (
            <>
              <h3 style={{ marginBottom: '12px', fontSize: '1.05rem' }}>Itens</h3>
              <ul style={{ padding: 0, listStyle: 'none', margin: 0, marginBottom: '25px' }}>
                {itens.map(item => (
                  <li key={item.id} style={{ background: 'white', border: '1px solid var(--color-border)', padding: '15px', borderRadius: 'var(--radius-md)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div><strong>{item.nome}</strong></div>
                      <div style={{ color: '#5b6577' }}>R$ {item.valor.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button onClick={() => handleAbrirEditar(item)} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
                        Editar
                      </Button>
                      <Button onClick={() => handleDeletar(item)} className="btn-responsivo" style={{ background: '#fdecec', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
                        Deletar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h3 style={{ marginBottom: '12px', fontSize: '1.05rem' }}>Animais ({animaisFiltrados.length})</h3>

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
                    background: fugiu ? '#fdecec' : 'white',
                    border: fugiu ? '1.5px solid #f3b4b7' : '1px solid var(--color-border)',
                    padding: '15px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s ease, transform 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <img src={animal.foto} alt={animal.idBrinco} loading="lazy" style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0, background: '#f2f5fb' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {animal.idBrinco}
                        {fugiu && (
                          <span className="badge badge-danger">
                            <TriangleAlert size={12} /> Fugiu
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#5b6577', margin: '4px 0' }}>
                        {animal.categoria} • {animal.peso}kg • {animal.status}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '4px' }}>
                        Tecnologia: {formatTrackingTechnology(animal)}
                      </div>
                      {animal.bateria !== undefined && (
                        <div style={{ fontSize: '0.8rem', color: '#5b6577', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Battery size={13} /> Bateria: {animal.bateria}%
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: fugiu ? '#dc2626' : '#16a34a' }}>
                        Pasto: {animal.pastoAtual} {fugiu ? '(Fugiu! Autorizado: ' + animal.pastoAutorizado + ')' : ''}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {!animaisFiltrados.length && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '18px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-alt)', color: '#5b6577', marginBottom: '15px' }}>
              <MapPinOff size={18} /> Nenhum animal encontrado para o filtro atual.
            </div>
          )}

          {/* Botão Carregar Mais */}
          {temMais && (
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <Button onClick={carregarMaisAnimais} className="btn-responsivo" style={{ background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '10px 24px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                Carregar Mais
              </Button>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: '#5b6577' }}>Nenhum dado encontrado.</p>
      )}

      {modalAberto && itemEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ position: 'relative', background: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <Button
              type="button"
              onClick={handleFecharModal}
              aria-label="Fechar edição de item"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'var(--color-surface-alt)',
                color: '#8a93a6',
                border: 'none',
                borderRadius: '999px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <X size={16} />
            </Button>
            <h3 style={{ margin: '0 0 20px 0' }}>Editar Item</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#5b6577', fontWeight: 600 }}>Nome</label>
              <Input
                type="text"
                value={nomeEdit}
                onChange={(e) => setNomeEdit(e.target.value)}
                className="campo"
                placeholder="Nome do item"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#5b6577', fontWeight: 600 }}>Valor</label>
              <Input
                type="number"
                value={valorEdit}
                onChange={(e) => setValorEdit(e.target.value)}
                className="campo"
                placeholder="0.00"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleFecharModal} className="btn-responsivo" style={{ flex: 1, background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicao} className="btn-responsivo" style={{ flex: 1, background: '#1a73e8', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </LayoutPadrao>
  );
}
