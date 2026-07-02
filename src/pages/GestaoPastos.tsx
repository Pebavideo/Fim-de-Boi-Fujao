import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import MapComponent from '../components/MapComponent';
import * as L from 'leaflet'; // Ensure L is imported as namespace

interface Pasto {
  id: string;
  nome: string;
  criadoEm?: any;
  polygon?: number[][]; // Adicionado para armazenar as coordenadas do polígono
}

export default function GestaoPastos() {
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoPastoNome, setNovoPastoNome] = useState('');
  const [novoPastoPolygon, setNovoPastoPolygon] = useState<number[][] | undefined>(undefined);

  const handleCriarPasto = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      console.error('Usuário não autenticado.');
      return;
    }

    if (!novoPastoNome || !novoPastoPolygon) {
      alert('Por favor, preencha o nome do pasto e desenhe o polígono.');
      return;
    }

    try {
      await addDoc(collection(db, 'pastos_do_usuario'), {
        emailDono: user.email,
        nome: novoPastoNome,
        polygon: novoPastoPolygon,
        criadoEm: serverTimestamp(),
      });
      setNovoPastoNome('');
      setNovoPastoPolygon(undefined);
      // Recarregar a lista de pastos após a criação
      const pastosRef = collection(db, 'pastos_do_usuario');
      const pastosSnap = await getDocs(query(pastosRef, where('emailDono', '==', user.email)));
      const lista = pastosSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Pasto[];
      setPastos(lista);
      alert('Pasto criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pasto:', error);
      alert('Erro ao criar pasto.');
    }
  };

  useEffect(() => {
    const carregarPastos = async () => {
      const user = auth.currentUser;
      if (!user?.email) {
        setPastos([]);
        setCarregando(false);
        return;
      }

      try {
        const pastosRef = collection(db, 'pastos_do_usuario');
        const pastosSnap = await getDocs(query(pastosRef, where('emailDono', '==', user.email)));
        const lista = pastosSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any)
        })) as Pasto[];
        setPastos(lista);
      } catch (error) {
        console.error('Erro ao carregar pastos:', error);
        setPastos([]);
      } finally {
        setCarregando(false);
      }
    };

    carregarPastos();
  }, []);

  return (
    <LayoutPadrao>
      <div style={{ marginBottom: '20px' }}>
        <h2>Gestão de Pastos</h2>
        <p style={{ color: '#666', marginTop: '8px' }}>
          Aqui você encontra os pastos cadastrados para o seu usuário.
        </p>
      </div>

      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3>Cadastrar Novo Pasto</h3>
        <input
          type="text"
          placeholder="Nome do Pasto"
          value={novoPastoNome}
          onChange={(e) => setNovoPastoNome(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <div style={{ height: '400px', marginBottom: '10px' }}>
          <MapComponent onPolygonCreated={(polygon) => {
            if (polygon) {
              const latLngs = polygon.getLatLngs() as L.LatLng[][];
              const coords = (latLngs[0] ?? []).map((latlng) => [latlng.lat, latlng.lng]);
              setNovoPastoPolygon(coords);
            } else {
              setNovoPastoPolygon(undefined);
            }
          }} />
        </div>
        <button
          onClick={handleCriarPasto}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Salvar Pasto
        </button>
      </div>

      {carregando ? (
        <p>Carregando pastos...</p>
      ) : pastos.length ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
          {pastos.map((pasto) => (
            <li key={pasto.id} style={{ background: '#f7f9ff', border: '1px solid #dce4f5', borderRadius: '14px', padding: '16px' }}>
              <strong>{pasto.nome}</strong>
              <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                Cadastrado em: {pasto.criadoEm ? new Date(pasto.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'Data não disponível'}
              </div>
              {pasto.polygon && (
                <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                  Polígono Cadastrado: Sim
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#666' }}>Nenhum pasto cadastrado ainda.</p>
      )}
    </LayoutPadrao>
  );
}
