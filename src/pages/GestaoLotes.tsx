import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import LayoutPadrao from '../components/LayoutPadrao';
import Button from '../components/Button';
import Input from '../components/Input';

interface AnimalData {
  id: string;
  [key: string]: any;
}

interface LoteData {
  id: string;
  nome_lote: string;
  animais: string[];
  data_criacao: any;
}

export default function GestaoLotes() {
  const navigate = useNavigate();
  const [animais, setAnimais] = useState<AnimalData[]>([]);
  const [lotes, setLotes] = useState<LoteData[]>([]);
  const [nomeLote, setNomeLote] = useState('');
  const [animaisSelecionados, setAnimaisSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const carregarDados = async () => {
      const user = auth.currentUser;
      if (!user?.email) return;

      try {
        // Carregar animais do usuário
        const animaisRef = collection(db, 'animais');
        const animaisQuery = query(animaisRef, where('emailDono', '==', user.email));
        const animaisSnap = await getDocs(animaisQuery);
        const animaisList = animaisSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AnimalData[];
        setAnimais(animaisList);

        // Carregar lotes do usuário
        const lotesRef = collection(db, 'lotes');
        const lotesQuery = query(lotesRef, where('emailDono', '==', user.email));
        const lotesSnap = await getDocs(lotesQuery);
        const lotesList = lotesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LoteData[];
        setLotes(lotesList);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const handleToggleAnimal = (animalId: string) => {
    setAnimaisSelecionados(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId) 
        : [...prev, animalId]
    );
  };

  const handleSalvarLote = async () => {
    if (!nomeLote.trim()) {
      alert('Por favor, informe o nome do lote.');
      return;
    }
    if (animaisSelecionados.length === 0) {
      alert('Por favor, selecione pelo menos um animal.');
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) return;

    try {
      await addDoc(collection(db, 'lotes'), {
        nome_lote: nomeLote.trim(),
        animais: animaisSelecionados,
        data_criacao: new Date(),
        emailDono: user.email
      });

      alert('Lote salvo com sucesso!');
      setNomeLote('');
      setAnimaisSelecionados([]);
      
      // Recarregar lotes
      const lotesRef = collection(db, 'lotes');
      const lotesQuery = query(lotesRef, where('emailDono', '==', user.email));
      const lotesSnap = await getDocs(lotesQuery);
      const lotesList = lotesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoteData[];
      setLotes(lotesList);
    } catch (error) {
      console.error('Erro ao salvar lote:', error);
      alert('Erro ao salvar lote.');
    }
  };

  const animaisFiltrados = animais.filter(animal => 
    (animal.idBrinco || '').toLowerCase().includes(busca.toLowerCase()) ||
    (animal.categoria || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <LayoutPadrao>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Gestão de Lotes</h2>
        <Button onClick={() => navigate('/painel-principal')} className="btn-responsivo" style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px' }}>
          Voltar
        </Button>
      </div>

      {loading ? (
        <p>Carregando dados...</p>
      ) : (
        <>
          {/* Formulário de Criação */}
          <div style={{ background: '#f0f4ff', padding: '15px', borderRadius: '15px', border: '1px solid #dce4f5', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Criar Novo Lote</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>Nome do Lote</label>
              <Input 
                type="text" 
                value={nomeLote} 
                onChange={(e) => setNomeLote(e.target.value)} 
                className="campo" 
                placeholder="Ex: Lote de Inverno 2024" 
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>Buscar Animais</label>
              <Input 
                type="text" 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
                className="campo" 
                placeholder="Buscar por brinco ou categoria" 
              />
            </div>

            <div style={{ marginBottom: '20px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '10px', padding: '10px' }}>
              {animaisFiltrados.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', margin: 0, padding: '20px' }}>Nenhum animal encontrado.</p>
              ) : (
                animaisFiltrados.map(animal => (
                  <label 
                    key={animal.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: '12px', 
                      background: animaisSelecionados.includes(animal.id) ? '#e8f0ff' : 'white', 
                      borderRadius: '8px', 
                      marginBottom: '8px', 
                      cursor: 'pointer',
                      border: animaisSelecionados.includes(animal.id) ? '1px solid #1a73e8' : '1px solid #eee'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={animaisSelecionados.includes(animal.id)} 
                      onChange={() => handleToggleAnimal(animal.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <strong>{animal.idBrinco}</strong>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {animal.categoria} • {animal.peso}kg
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <Button onClick={handleSalvarLote} className="btn-responsivo" style={{ width: '100%', background: '#25d366', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold' }}>
              Salvar Lote ({animaisSelecionados.length} animais)
            </Button>
          </div>

          {/* Lista de Lotes */}
          <div>
            <h3 style={{ marginBottom: '15px' }}>Lotes Criados</h3>
            {lotes.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>Nenhum lote criado ainda.</p>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {lotes.map(lote => (
                  <div 
                    key={lote.id} 
                    style={{ 
                      background: 'white', 
                      border: '1px solid #dce4f5', 
                      borderRadius: '15px', 
                      padding: '20px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap',
                      gap: '15px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 5px 0' }}>{lote.nome_lote}</h4>
                      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                        {lote.animais.length} cabeças • Criado em {lote.data_criacao?.toDate().toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate(`/lote/${lote.id}`)} 
                      className="btn-responsivo"
                      style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px' }}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </LayoutPadrao>
  );
}
