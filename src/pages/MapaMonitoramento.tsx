import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { verificarPosicao } from '../utils/geofencing';

interface AnimalData {
  id: string;
  idBrinco?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  pastoAutorizado?: string; // Adicionado
  pastoId?: string; // Adicionado
  [key: string]: any;
}

interface PastoData {
  id: string;
  nome: string;
  polygon?: number[][];
}

export default function MapaMonitoramento() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [animals, setAnimals] = useState<AnimalData[]>([]);
  const [pastos, setPastos] = useState<PastoData[]>([]); // Novo estado para pastos
  const [loading, setLoading] = useState(true);
  const [centerLat, setCenterLat] = useState(-15.7801);
  const [centerLng, setCenterLng] = useState(-47.9292);

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // Carregar animais
        const animaisRef = collection(db, 'animais');
        const qAnimais = query(animaisRef, where('emailDono', '==', user.email));
        const snapshotAnimais = await getDocs(qAnimais);
        const animalList = snapshotAnimais.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AnimalData[];
        setAnimals(animalList);

        // Carregar pastos
        const pastosRef = collection(db, 'pastos_do_usuario');
        const qPastos = query(pastosRef, where('emailDono', '==', user.email));
        const snapshotPastos = await getDocs(qPastos);
        const pastoList = snapshotPastos.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PastoData[];
        setPastos(pastoList);

        // Se houver animais com localização, centralize no primeiro
        const comLocalizacao = animalList.filter(a => a.latitude && a.longitude);
        if (comLocalizacao.length > 0) {
          setCenterLat(comLocalizacao[0].latitude!);
          setCenterLng(comLocalizacao[0].longitude!);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar mapa
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 13);
    mapInstance.current = map;

    // Adicionar tile layer do OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, [centerLat, centerLng]);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Limpar marcadores antigos
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Adicionar novos marcadores para animais com coordenadas e verificar geofencing
    animals.forEach(async animal => {
      if (animal.latitude && animal.longitude) {
        const marker = L.marker([animal.latitude, animal.longitude])
          .bindPopup(`
            <div>
              <h4>ID do Brinco: ${animal.idBrinco || 'Não informado'}</h4>
              <p><strong>Status:</strong> ${animal.status || 'Não informado'}</p>
              <p><strong>Pasto Autorizado:</strong> ${animal.pastoAutorizado || 'Não informado'}</p>
            </div>
          `)
          .addTo(mapInstance.current!);
        markersRef.current.push(marker);

        // Lógica de Geofencing
        const pastoAutorizado = pastos.find(p => p.nome === animal.pastoAutorizado);

        if (pastoAutorizado && pastoAutorizado.polygon) {
          const isInside = verificarPosicao(animal.latitude, animal.longitude, pastoAutorizado.polygon);

          if (!isInside) {
            console.warn(`Animal ${animal.idBrinco} está fora do pasto ${pastoAutorizado.nome}!`);
            // Registrar alerta no Firestore
            try {
              await addDoc(collection(db, 'Alertas'), {
                animalId: animal.id,
                idBrinco: animal.idBrinco,
                pastoId: pastoAutorizado.id,
                pastoNome: pastoAutorizado.nome,
                timestamp: serverTimestamp(),
                status: 'pendente',
                latitude: animal.latitude,
                longitude: animal.longitude,
              });
              console.log('Alerta registrado com sucesso!');
            } catch (error) {
              console.error('Erro ao registrar alerta:', error);
            }
          }
        }
      }
    });
  }, [animals, pastos]);

  return (
    <LayoutPadrao>
      <style>{`
        .leaflet-container {
          z-index: 1;
        }
      `}</style>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Monitoramento Geográfico</h2>
          <p style={{ color: '#666', marginTop: '6px' }}>Visualize a localização dos animais em tempo real.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '12px 18px', borderRadius: '10px' }}>
            Voltar
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Carregando dados...</p>
      ) : (
        <div style={{ width: '100%', height: '70vh', borderRadius: '15px', overflow: 'hidden' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </LayoutPadrao>
  );
}
