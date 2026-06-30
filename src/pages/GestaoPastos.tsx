import { useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';

interface Pasto {
  id: string;
  nome: string;
  criadoEm?: any;
}

export default function GestaoPastos() {
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [carregando, setCarregando] = useState(true);

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
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: '#666' }}>Nenhum pasto cadastrado ainda.</p>
      )}
    </LayoutPadrao>
  );
}
