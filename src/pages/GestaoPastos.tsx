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

interface LoteDisponivel {
  nome: string;
  quantidadeCabecas: number;
}

export default function GestaoPastos() {
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [lotesDisponiveis, setLotesDisponiveis] = useState<LoteDisponivel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoPastoNome, setNovoPastoNome] = useState('');
  const [nomeLote, setNomeLote] = useState('');
  const [quantidadeCabecasInput, setQuantidadeCabecasInput] = useState('');
  const [novoPastoPolygon, setNovoPastoPolygon] = useState<number[][] | undefined>(undefined);
  const [selectedPastoPolygon, setSelectedPastoPolygon] = useState<L.Polygon | null>(null);
  const [mensagemBuscaPasto, setMensagemBuscaPasto] = useState<string | null>(null);

  const handleCriarPasto = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      console.error('Usuário não autenticado.');
      return;
    }

    if (!novoPastoNome || !novoPastoPolygon) {
      alert('Por favor, selecione um lote válido e desenhe o polígono.');
      return;
    }

    if (!nomeLote.trim() || !quantidadeCabecasInput.trim()) {
      alert('Por favor, preencha o Nome do Lote e a Quantidade de Cabeças antes de salvar.');
      return;
    }

    const loteSelecionado = lotesDisponiveis.find((lote) => lote.nome === novoPastoNome);
    if (!loteSelecionado) {
      alert('Lote inválido. Selecione um lote cadastrado em Animais.');
      return;
    }

    try {
      await addDoc(collection(db, 'pastos_do_usuario'), {
        emailDono: user.email,
        nome: novoPastoNome,
        polygon: novoPastoPolygon,
        quantidadeCabecas: loteSelecionado.quantidadeCabecas,
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
        setLotesDisponiveis([]);
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

        const animaisRef = collection(db, 'animais');
        const qDonoEmail = query(animaisRef, where('dono_email', '==', user.email));
        const qEmailDono = query(animaisRef, where('emailDono', '==', user.email));
        const [snapshotDonoEmail, snapshotEmailDono] = await Promise.all([
          getDocs(qDonoEmail),
          getDocs(qEmailDono),
        ]);

        const loteMap = new Map<string, number>();
        snapshotDonoEmail.docs.forEach((doc) => {
          const data = doc.data() as any;
          const lote = data.lote?.trim();
          if (lote) {
            loteMap.set(lote, (loteMap.get(lote) || 0) + 1);
          }
        });
        snapshotEmailDono.docs.forEach((doc) => {
          const data = doc.data() as any;
          const lote = data.lote?.trim();
          if (lote) {
            loteMap.set(lote, (loteMap.get(lote) || 0) + 1);
          }
        });

        const listaLotes = Array.from(loteMap.entries()).map(([nome, quantidadeCabecas]) => ({ nome, quantidadeCabecas }));
        setLotesDisponiveis(listaLotes);
      } catch (error) {
        console.error('Erro ao carregar pastos e lotes:', error);
        setPastos([]);
        setLotesDisponiveis([]);
      } finally {
        setCarregando(false);
      }
    };

    carregarPastos();
  }, []);

  const handleBuscarPasto = () => {
    const loteSelecionado = lotesDisponiveis.find((lote) => lote.nome === novoPastoNome);
    if (!loteSelecionado) {
      setMensagemBuscaPasto('Lote não encontrado');
      setSelectedPastoPolygon(null);
      return;
    }

    const pastoEncontrado = pastos.find((pasto) => pasto.nome === loteSelecionado.nome);
    if (!pastoEncontrado?.polygon?.length) {
      setMensagemBuscaPasto('Lote não encontrado');
      setSelectedPastoPolygon(null);
      return;
    }

    const polygon = L.polygon(pastoEncontrado.polygon as [number, number][]);
    setSelectedPastoPolygon(polygon);
    setMensagemBuscaPasto(null);
  };

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
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#444' }}>Selecione o lote cadastrado em Animais</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <select
              value={novoPastoNome}
              onChange={(e) => setNovoPastoNome(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#fff' }}
            >
              <option value="">Escolha um lote</option>
              {lotesDisponiveis.map((lote) => (
                <option key={lote.nome} value={lote.nome}>
                  {lote.nome} ({lote.quantidadeCabecas} cabeças)
                </option>
              ))}
            </select>
            <button
              onClick={handleBuscarPasto}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer' }}
            >
              BUSCAR LOTE
            </button>
          </div>
          {mensagemBuscaPasto && (
            <div style={{ color: '#a00', fontSize: '14px', marginTop: '10px' }}>{mensagemBuscaPasto}</div>
          )}
        </div>
          {novoPastoNome && (
            <div style={{ marginBottom: '12px', color: '#555', fontSize: '14px' }}>
              <div><strong>Nome do Lote/Pasto:</strong> {novoPastoNome}</div>
              <div><strong>Quantidade de Cabeças:</strong> {lotesDisponiveis.find((lote) => lote.nome === novoPastoNome)?.quantidadeCabecas ?? 0}</div>
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#444', fontWeight: 600 }}>Nome do Lote</label>
            <input
              type="text"
              value={nomeLote}
              onChange={(e) => setNomeLote(e.target.value)}
              placeholder="Informe o nome do lote"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#444', fontWeight: 600 }}>Quantidade de Cabeças</label>
            <input
              type="number"
              value={quantidadeCabecasInput}
              onChange={(e) => setQuantidadeCabecasInput(e.target.value)}
              placeholder="Informe a quantidade de cabeças"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>
          {!lotesDisponiveis.length && (
            <div style={{ color: '#a00', fontSize: '14px' }}>
              Nenhum lote encontrado em Animais. Cadastre ao menos um animal com lote para liberar a criação de pasto.
            </div>
          )}
        </div>
        <div style={{ height: '400px', marginBottom: '10px' }}>
          <MapComponent
            initialPolygon={selectedPastoPolygon}
            onPolygonCreated={(polygon) => {
              if (polygon) {
                const latLngs = polygon.getLatLngs() as L.LatLng[][];
                const coords = (latLngs[0] ?? []).map((latlng) => [latlng.lat, latlng.lng]);
                setNovoPastoPolygon(coords);
              } else {
                setNovoPastoPolygon(undefined);
              }
            }}
          />
        </div>
        <button
          onClick={handleCriarPasto}
          disabled={!novoPastoNome || !novoPastoPolygon}
          style={{
            backgroundColor: !novoPastoNome || !novoPastoPolygon ? '#999' : '#4CAF50',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: !novoPastoNome || !novoPastoPolygon ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          Salvar Pasto
        </button>

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
