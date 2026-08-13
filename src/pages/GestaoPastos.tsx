import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Trees, MapPinned, Link2 } from 'lucide-react';
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
      <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trees size={22} color="#16a34a" /> Gestão de Pastos
        </h2>
        <p style={{ color: '#5b6577', marginTop: '8px' }}>
          Aqui você encontra os pastos cadastrados para o seu usuário.
        </p>
      </div>

      <div style={{ marginBottom: '24px', padding: '20px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface-alt)' }}>
        <h3 style={{ margin: '0 0 8px' }}>Cadastrar Novo Pasto</h3>
        <p style={{ color: '#5b6577', marginBottom: '16px' }}>
          Registre um pasto independente com nome e polígono. O lote pode ser vinculado depois.
        </p>
        <div style={{ display: 'grid', gap: '8px', marginBottom: '20px', maxWidth: '420px' }}>
          <label style={{ display: 'block', color: '#3a4150', fontWeight: 600, fontSize: '0.9rem' }}>Nome do Pasto</label>
          <input
            type="text"
            className="campo"
            value={novoPastoNome}
            onChange={(e) => setNovoPastoNome(e.target.value)}
            placeholder="Informe o nome do pasto"
            style={{ margin: 0 }}
          />
        </div>
      </div>
      <div style={{ height: '400px', marginBottom: '16px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
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
        className="btn-interativo"
        style={{
          backgroundColor: !novoPastoNome || !novoPastoPolygon ? '#c9cfdb' : '#16a34a',
          color: 'white',
          padding: '12px 20px',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: !novoPastoNome || !novoPastoPolygon ? 'not-allowed' : 'pointer',
          fontSize: '0.95rem',
          fontWeight: 700,
          marginBottom: '28px'
        }}
      >
        Salvar Pasto
      </button>

      {carregando ? (
        <p style={{ color: '#5b6577' }}>Carregando pastos...</p>
      ) : filteredPastos.length ? (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {(['TODOS', 'VAZIOS', 'OCUPADOS'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className="btn-interativo"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-pill)',
                  border: filtroStatus === status ? '1px solid #1a73e8' : '1px solid var(--color-border)',
                  backgroundColor: filtroStatus === status ? '#1a73e8' : '#fff',
                  color: filtroStatus === status ? 'white' : '#3a4150',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
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
                <li key={pasto.id} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '1.05rem' }}>{pasto.nome}</strong>
                        <span className={`badge ${status === 'ocupado' ? 'badge-danger' : 'badge-success'}`}>
                          {status === 'ocupado' ? 'Ocupado' : 'Vazio'}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', color: '#5b6577', fontSize: '0.85rem' }}>
                        Cadastrado em: {pasto.criadoEm ? new Date(pasto.criadoEm.seconds * 1000).toLocaleDateString('pt-BR') : 'Data não disponível'}
                      </div>
                      {pasto.polygon && (
                        <div style={{ marginTop: '6px', color: '#5b6577', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPinned size={14} /> Polígono cadastrado
                        </div>
                      )}
                      {pasto.loteVinculado && (
                        <div style={{ marginTop: '6px', color: '#3a4150', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Link2 size={14} /> Lote vinculado: {pasto.loteVinculado}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: '10px', minWidth: '220px' }}>
                      <button
                        onClick={() => handleToggleStatus(pasto)}
                        className="btn-interativo"
                        style={{
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          backgroundColor: status === 'ocupado' ? '#fdecec' : '#eafaf0',
                          color: status === 'ocupado' ? '#dc2626' : '#16a34a',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        {status === 'ocupado' ? 'Marcar como VAZIO' : 'Marcar como OCUPADO'}
                      </button>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        <select
                          value={loteParaVincular[pasto.id] ?? ''}
                          onChange={(e) => setLoteParaVincular((prev) => ({ ...prev, [pasto.id]: e.target.value }))}
                          className="campo"
                          style={{ margin: 0 }}
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
                          className="btn-interativo"
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: '#1a73e8',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.85rem'
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
        <p style={{ color: '#5b6577' }}>Nenhum pasto cadastrado ainda.</p>
      )}
    </LayoutPadrao>
  );
}
