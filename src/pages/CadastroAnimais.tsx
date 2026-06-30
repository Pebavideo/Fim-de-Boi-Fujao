import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';
import LayoutPadrao from '../components/LayoutPadrao';

interface HistoricoSaude {
  id: string;
  tipo: string;
  descricao: string;
  data: string;
}

const MAX_IMAGE_SIZE = 1048487; // ~1MB

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1024;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(compressedFile);
            } else {
              reject(new Error('Erro ao compactar imagem'));
            }
          },
          'image/jpeg',
          0.7
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function CadastroAnimais() {
  const navigate = useNavigate();

  const [idBrinco, setIdBrinco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [peso, setPeso] = useState('');
  const [status, setStatus] = useState('');
  const [origem, setOrigem] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [pastoAutorizado, setPastoAutorizado] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [historicoSaude, setHistoricoSaude] = useState<HistoricoSaude[]>([]);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [historicoTipo, setHistoricoTipo] = useState('Vacina');
  const [historicoData, setHistoricoData] = useState('');
  const [historicoDescricao, setHistoricoDescricao] = useState('');

  const handleFotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
      
      let compressedFile = file;
      if (file.size > MAX_IMAGE_SIZE) {
        compressedFile = await compressImage(file);
      }
      setFoto(compressedFile);
    }
  };

  const handleSalvar = async () => {
    if (!idBrinco.trim() || !categoria.trim() || !peso.trim() || !status.trim() || !pastoAutorizado.trim() || !foto) {
      alert('Preencha todos os campos e adicione uma foto!');
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      alert('Usuário não autenticado!');
      return;
    }

    setCarregando(true);
    try {
      // Convertendo foto para base64 para salvar no Firestore (simples para exemplo)
      const reader = new FileReader();
      reader.readAsDataURL(foto);
      reader.onloadend = async () => {
        const fotoBase64 = reader.result as string;
        
        await addDoc(collection(db, 'animais'), {
          idBrinco,
          categoria,
          peso: parseFloat(peso),
          status,
          origem: origem || null,
          dataNascimento: dataNascimento || null,
          pastoAutorizado,
          pastoAtual: pastoAutorizado,
          foto: fotoBase64,
          historicoSaude: historicoSaude,
          dataCadastro: new Date(),
          emailDono: user.email
        });

        // Adiciona pasto único ao Firestore para o lojista
        const pastoNome = pastoAutorizado.trim();
        if (pastoNome) {
          const pastosRef = collection(db, 'pastos_do_usuario');
          const pastosSnap = await getDocs(query(pastosRef, where('emailDono', '==', user.email)));
          const existePasto = pastosSnap.docs.some((docSnap) => {
            const data = docSnap.data();
            return typeof data.nome === 'string' && data.nome.trim().toLowerCase() === pastoNome.toLowerCase();
          });

          if (!existePasto) {
            await addDoc(pastosRef, {
              nome: pastoNome,
              emailDono: user.email,
              uidDono: user.uid,
              criadoEm: new Date()
            });
          }
        }
        
        alert('Animal cadastrado com sucesso!');
        navigate(-1);
      };
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar cadastro!');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <LayoutPadrao>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', zIndex: 100 }}>
          <Button onClick={() => navigate(-1)} className="btn-responsivo" style={{ background: '#9e9e9e', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', zIndex: 100 }}>
            Voltar
          </Button>
          <h2 style={{ margin: 0 }}>Cadastro de Animais</h2>
        </div>
        <div></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>ID/Brinco</label>
          <Input type="text" placeholder="Número do brinco" value={idBrinco} onChange={(e) => setIdBrinco(e.target.value)} className="campo" />
        </div>

        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Categoria</label>
          <Input type="text" placeholder="Ex: Bovino, Suíno" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="campo" />
        </div>

        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Peso (kg)</label>
          <Input type="number" step="0.01" placeholder="Peso em kg" value={peso} onChange={(e) => setPeso(e.target.value)} className="campo" />
        </div>

        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Status</label>
          <Input type="text" placeholder="Ex: Saudável, Em tratamento" value={status} onChange={(e) => setStatus(e.target.value)} className="campo" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Origem</label>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="campo"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d8d8d8', background: 'white' }}
            >
              <option value="">Selecione</option>
              <option value="Própria">Própria</option>
              <option value="Compra">Compra</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Data de Nascimento</label>
            <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} className="campo" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button
            type="button"
            onClick={() => setModalHistoricoAberto(true)}
            className="btn-responsivo"
            style={{ background: '#ffa726', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', width: 'fit-content' }}
          >
            + Adicionar Histórico de Saúde
          </Button>
          {historicoSaude.length > 0 && (
            <div style={{ background: '#f7f7f7', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>Histórico de Saúde</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {historicoSaude.map((item) => (
                  <li key={item.id} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '10px', border: '1px solid #e0e0e0' }}>
                    <strong>{item.tipo}</strong> - {item.data}
                    <p style={{ margin: '8px 0 0 0', color: '#555' }}>{item.descricao}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Pasto Autorizado</label>
          <Input
            type="text"
            placeholder="Digite o nome do pasto autorizado"
            value={pastoAutorizado}
            onChange={(e) => setPastoAutorizado(e.target.value)}
            className="campo"
          />
        </div>

        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Foto do Animal</label>
          <input type="file" accept="image/*" hidden id="fotoInput" onChange={handleFotoChange} />
          <label htmlFor="fotoInput" style={{ display: 'block', background: '#f0f4ff', padding: '20px', borderRadius: '10px', border: '2px dashed #1a73e8', textAlign: 'center', cursor: 'pointer', zIndex: 1001 }}>
            {fotoPreview ? <img src={fotoPreview} alt="Preview" style={{ maxHeight: '150px', borderRadius: '10px' }} /> : <span style={{ color: '#666' }}>Clique para selecionar uma foto</span>}
          </label>
        </div>

        <Button onClick={handleSalvar} disabled={carregando} className="btn-responsivo" style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '16px', fontWeight: 'bold', marginTop: '10px' }}>
          {carregando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {modalHistoricoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ width: 'min(560px, 95%)', background: 'white', borderRadius: '18px', padding: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.16)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Novo item de histórico</h3>
                <p style={{ margin: '8px 0 0 0', color: '#666' }}>Registre vacinas ou vitaminas para o animal.</p>
              </div>
              <Button onClick={() => setModalHistoricoAberto(false)} style={{ background: '#e0e0e0', color: '#333', border: 'none', padding: '10px 14px', borderRadius: '10px' }}>Fechar</Button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Tipo</label>
                <select value={historicoTipo} onChange={(e) => setHistoricoTipo(e.target.value)} className="campo" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d8d8d8', background: 'white' }}>
                  <option value="Vacina">Vacina</option>
                  <option value="Vitamina">Vitamina</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Data</label>
                <Input type="date" value={historicoData} onChange={(e) => setHistoricoData(e.target.value)} className="campo" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Descrição</label>
                <textarea value={historicoDescricao} onChange={(e) => setHistoricoDescricao(e.target.value)} className="campo" style={{ minHeight: '100px', resize: 'vertical' }} placeholder="Vacina X aplicada, vitamina Y administrada, observações..." />
              </div>

              <Button
                onClick={() => {
                  if (!historicoData || !historicoDescricao.trim()) {
                    alert('Preencha a data e a descrição do histórico.');
                    return;
                  }

                  setHistoricoSaude((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
                      tipo: historicoTipo,
                      data: historicoData,
                      descricao: historicoDescricao.trim()
                    }
                  ]);
                  setHistoricoTipo('Vacina');
                  setHistoricoData('');
                  setHistoricoDescricao('');
                  setModalHistoricoAberto(false);
                }}
                className="btn-responsivo"
                style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold' }}
              >
                Salvar item de histórico
              </Button>
            </div>
          </div>
        </div>
      )}
    </LayoutPadrao>
  );
}
