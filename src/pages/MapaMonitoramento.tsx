import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import MapComponent from '../components/MapComponent';
import Button from '../components/Button';
import { Search, ArrowLeft } from 'lucide-react';
import { Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface AnimalData {
  id: string;
  idBrinco?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  pastoAutorizado?: string;
  [key: string]: any;
}

interface PastoData {
  id: string;
  nome: string;
  polygon?: number[][];
}

export default function MapaMonitoramento() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const [pastos, setPastos] = useState<PastoData[]>([]);
  const [filtroBrinco, setFiltroBrinco] = useState('');
  const [pastoSelecionado, setPastoSelecionado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const animaisRef = collection(db, 'animais');
        const qAnimaisPorDono = query(animaisRef, where('dono_email', '==', user.email));
        const qAnimaisPorEmailDono = query(animaisRef, where('emailDono', '==', user.email));

        const [snapshotDonoEmail, snapshotEmailDono] = await Promise.all([
          getDocs(qAnimaisPorDono),
          getDocs(qAnimaisPorEmailDono)
        ]);

        const animaisMap = new Map<string, AnimalData>();
        snapshotDonoEmail.docs.forEach(doc => {
          animaisMap.set(doc.id, { id: doc.id, ...doc.data() } as AnimalData);
        });
        snapshotEmailDono.docs.forEach(doc => {
          if (!animaisMap.has(doc.id)) {
            animaisMap.set(doc.id, { id: doc.id, ...doc.data() } as AnimalData);
          }
        });

        const animalList = Array.from(animaisMap.values());
        setAnimals(animalList);

        const pastosRef = collection(db, 'pastos_do_usuario');
        const qPastos = query(pastosRef, where('emailDono', '==', user.email));
        const snapshotPastos = await getDocs(qPastos);
        const pastoList = snapshotPastos.docs.map(doc => ({ id: doc.id, ...doc.data() } as PastoData));
        setPastos(pastoList);

        // Mantém o mapa centrado pelo CSS do componente MapComponent.
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const filteredAnimals = animals.filter((animal) => {
    const matchesBrinco = filtroBrinco
      ? animal.idBrinco?.toLowerCase().includes(filtroBrinco.toLowerCase())
      : true;
    const matchesPasto = pastoSelecionado
      ? animal.pastoAutorizado === pastoSelecionado
      : true;
    return matchesBrinco && matchesPasto;
  });

  return (
    <LayoutPadrao>
      <style>{`
        .leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 1;
        }
      `}</style>

      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Monitoramento Geográfico</h2>
          <p style={{ color: '#5b6577', margin: '8px 0 0' }}>Visualize a localização dos animais em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8a93a6' }} />
            <input
              type="text"
              className="campo"
              placeholder="Buscar brinco..."
              value={filtroBrinco}
              onChange={(e) => setFiltroBrinco(e.target.value)}
              style={{
                paddingLeft: '36px',
                margin: 0,
                minWidth: '220px'
              }}
            />
          </div>
          <select
            value={pastoSelecionado}
            onChange={(e) => setPastoSelecionado(e.target.value)}
            className="campo"
            style={{ margin: 0, minWidth: '200px' }}
          >
            <option value="">Todos os pastos</option>
            {pastos.map((pasto) => (
              <option key={pasto.id} value={pasto.nome}>
                {pasto.nome}
              </option>
            ))}
          </select>
          <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: 'var(--color-surface-alt)', color: '#3a4150', border: '1px solid var(--color-border)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
            <ArrowLeft size={16} /> Voltar
          </Button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#5b6577' }}>Carregando dados...</p>
      ) : (
        <div style={{ width: '100%', height: '70vh', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <MapComponent onPolygonCreated={() => {}}>
            {filteredAnimals.map((animal) => {
              if (!animal.latitude || !animal.longitude) return null;
              return (
                <Marker key={animal.id} position={[animal.latitude, animal.longitude]}>
                  <Popup>
                    <div>
                      <strong>ID do Brinco:</strong> {animal.idBrinco || 'Não informado'}<br />
                      <strong>Status:</strong> {animal.status || 'Não informado'}<br />
                      <strong>Pasto:</strong> {animal.pastoAutorizado || 'Não informado'}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapComponent>
        </div>
      )}
    </LayoutPadrao>
  );
}
