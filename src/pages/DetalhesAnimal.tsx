import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';

interface AnimalDetalhes {
  idBrinco: string;
  categoria: string;
  peso: number;
  status: string;
  pastoAutorizado: string;
  pastoAtual: string;
  foto: string;
  dataCadastro: any;
}

export default function DetalhesAnimal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState<AnimalDetalhes | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarAnimal = async () => {
      const user = auth.currentUser;
      if (!user?.email || !id) {
        setCarregando(false);
        return;
      }

      try {
        const animalRef = doc(db, 'animais', id);
        const animalSnap = await getDoc(animalRef);
        if (animalSnap.exists()) {
          const data = animalSnap.data();
          if (data.emailDono === user.email) {
            setAnimal(data as AnimalDetalhes);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do animal:', error);
      } finally {
        setCarregando(false);
      }
    };

    carregarAnimal();
  }, [id]);

  return (
    <LayoutPadrao>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2>Detalhes do Animal</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>Visualize as informações completas e o histórico básico do animal.</p>
        </div>
        <Button onClick={() => navigate('/monitoramento')} style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px' }}>
          Voltar ao Monitoramento
        </Button>
      </div>

      {carregando ? (
        <p>Carregando detalhes...</p>
      ) : !animal ? (
        <p style={{ color: '#666' }}>Animal não encontrado ou você não tem permissão para visualizá-lo.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#f7f9ff' }}>
              <img src={animal.foto} alt={animal.idBrinco} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
                <h3 style={{ marginBottom: '10px' }}>ID / Brinco</h3>
                <p>{animal.idBrinco}</p>
              </div>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
                <h3 style={{ marginBottom: '10px' }}>Categoria</h3>
                <p>{animal.categoria}</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginBottom: '10px' }}>Peso</h3>
              <p>{animal.peso} kg</p>
            </div>
            <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginBottom: '10px' }}>Status</h3>
              <p>{animal.status}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginBottom: '10px' }}>Pasto Autorizado</h3>
              <p>{animal.pastoAutorizado}</p>
            </div>
            <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
              <h3 style={{ marginBottom: '10px' }}>Pasto Atual</h3>
              <p>{animal.pastoAtual}</p>
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '16px', background: '#fff', border: '1px solid #e0e0e0' }}>
            <h3 style={{ marginBottom: '10px' }}>Data de Cadastro</h3>
            <p>{animal.dataCadastro ? new Date(animal.dataCadastro.seconds * 1000).toLocaleString('pt-BR') : 'Não disponível'}</p>
          </div>
        </div>
      )}
    </LayoutPadrao>
  );
}
