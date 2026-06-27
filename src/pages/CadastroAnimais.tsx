import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';

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
  const [pastoAutorizado, setPastoAutorizado] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          pastoAutorizado,
          pastoAtual: pastoAutorizado, // Inicializa no mesmo pasto autorizado
          foto: fotoBase64,
          dataCadastro: new Date(),
          emailDono: user.email
        });
        
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
    <div className="app-card" style={{ zIndex: 1000 }}>
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

        <div>
          <label style={{ fontSize: '14px', color: '#666', marginBottom: '5px', display: 'block' }}>Pasto Autorizado</label>
          <select 
            value={pastoAutorizado} 
            onChange={(e) => setPastoAutorizado(e.target.value)} 
            className="campo" 
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', fontSize: '16px' }}
          >
            <option value="">Selecione</option>
            <option value="Pasto A">Pasto A</option>
            <option value="Pasto B">Pasto B</option>
            <option value="Curral">Curral</option>
          </select>
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
    </div>
  );
}
