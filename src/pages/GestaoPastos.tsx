import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import MapComponent from '../components/MapComponent';

interface Pasto {
  id: string;
  nome: string;
  criadoEm?: any;
  polygon?: number[][]; // Adicionado para armazenar as coordenadas do polígono
  status?: string;
  loteVinculado?: string;
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
  const [novoPastoPolygon, setNovoPastoPolygon] = useState<number[][] | undefined>(undefined);
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'VAZIOS' | 'OCUPADOS'>('TODOS');
  const [loteParaVincular, setLoteParaVincular] = useState<Record<string, string>>({});

  const handleCriarPasto = async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      console.error('Usuário não autenticado.');
      return;
    }

    if (!novoPastoNome.trim() || !novoPastoPolygon) {
      alert('Por favor, informe o nome do pasto e desenhe o polígono.');
      return;
    }

    try {
      await addDoc(collection(db, 'pastos_do_usuario'), {
        emailDono: user.email,
        nome: novoPastoNome.trim(),
        polygon: novoPastoPolygon,
        status: 'vazio',
        criadoEm: serverTimestamp(),
      });
      setNovoPastoNome('');
      setNovoPastoPolygon(undefined);
      setLoteParaVincular({});
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

  const handleToggleStatus = async (pasto: Pasto) => {
    const statusAtual = (pasto.status ?? 'vazio').toLowerCase() === 'ocupado' ? 'ocupado' : 'vazio';
    const novoStatus = statusAtual === 'ocupado' ? 'vazio' : 'ocupado';
    try {
      const pastoRef = doc(db, 'pastos_do_usuario', pasto.id);
      await updateDoc(pastoRef, { status: novoStatus });
      setPastos((prev) => prev.map((item) => item.id === pasto.id ? { ...item, status: novoStatus } : item));
    } catch (error) {
      console.error('Erro ao atualizar status do pasto:', error);
    }
  };

  const handleVincularLote = async (pasto: Pasto) => {
    const lote = loteParaVincular[pasto.id];
    if (!lote) {
      alert('Selecione um lote para vincular.');
      return;
    }

    try {
      const pastoRef = doc(db, 'pastos_do_usuario', pasto.id);
      await updateDoc(pastoRef, {
        status: 'ocupado',
        loteVinculado: lote,
      });
      setPastos((prev) => prev.map((item) => item.id === pasto.id ? { ...item, status: 'ocupado', loteVinculado: lote } : item));
      alert(`Pasto vinculado ao lote ${lote}.`);
    } catch (error) {
      console.error('Erro ao vincular lote ao pasto:', error);
      alert('Erro ao vincular lote ao pasto.');
    }
  };

  const filteredPastos = pastos.filter((pasto) => {
    const status = (pasto.status ?? 'vazio').toLowerCase();
    if (filtroStatus === 'TODOS') return true;
    if (filtroStatus === 'VAZIOS') return status === 'vazio';
    if (filtroStatus === 'OCUPADOS') return status === 'ocupado';
    return true;
  });

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
        <p style={{ color: '#555', marginBottom: '16px' }}>
          Registre um pasto independente com nome e polígono. O lote pode ser vinculado depois.
        </p>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#444', fontWeight: 600 }}>Nome do Pasto</label>
          <input
            type="text"
            value={novoPastoNome}
            onChange={(e) => setNovoPastoNome(e.target.value)}
            placeholder="Informe o nome do pasto"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>
      </div>
      <div style={{ height: '400px', marginBottom: '10px' }}>
        <MapComponent
          initialPolygon={undefined}
          onPolygonCreated={(coords) => {
            setNovoPastoPolygon(coords ?? undefined);
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
      ) : filteredPastos.length ? (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {(['TODOS', 'VAZIOS', 'OCUPADOS'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: filtroStatus === status ? '2px solid #1a73e8' : '1px solid #ddd',
                  backgroundColor: filtroStatus === status ? '#1a73e8' : '#fff',
                  color: filtroStatus === status ? 'white' : '#333',
                  cursor: 'pointer'
                }}
              >
                {status}
              </button>
            ))}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
            {filteredPastos.map((pasto) => {
              const status = (pasto.status ?? 'vazio').toLowerCase();
              return (
                <li key={pasto.id} style={{ background: '#f7f9ff', border: '1px solid #dce4f5', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <strong>{pasto.nome}</strong>
                      <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                        Cadastrado em: {pasto.criadoEm ? new Date(pasto.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </div>
                      {pasto.polygon && (
                        <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                          Polígono Cadastrado: Sim
                        </div>
                      )}
                      {pasto.loteVinculado && (
                        <div style={{ marginTop: '8px', color: '#444', fontSize: '14px' }}>
                          Lote Vinculado: {pasto.loteVinculado}
                        </div>
                      )}
                      <div style={{ marginTop: '8px', fontSize: '14px', color: status === 'ocupado' ? '#d32f2f' : '#388e3c' }}>
                        Status: {status}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '10px', minWidth: '220px' }}>
                      <button
                        onClick={() => handleToggleStatus(pasto)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: status === 'ocupado' ? '#ff7043' : '#4caf50',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        {status === 'ocupado' ? 'Marcar como VAZIO' : 'Marcar como OCUPADO'}
                      </button>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <select
                          value={loteParaVincular[pasto.id] ?? ''}
                          onChange={(e) => setLoteParaVincular((prev) => ({ ...prev, [pasto.id]: e.target.value }))}
                          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', width: '100%' }}
                        >
                          <option value="">Selecione um lote</option>
                          {lotesDisponiveis.map((lote) => (
                            <option key={lote.nome} value={lote.nome}>
                              {lote.nome} ({lote.quantidadeCabecas} cabeças)
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleVincularLote(pasto)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#1a73e8',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          Vincular Lote
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p style={{ color: '#666' }}>Nenhum pasto cadastrado ainda.</p>
      )}
    </LayoutPadrao>
  );
}
