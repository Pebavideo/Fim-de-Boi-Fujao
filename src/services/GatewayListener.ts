import { collection, query, where, getDocs, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface GatewaySignal {
  brinco_id: string;
  lat: number;
  long: number;
  bateria: number;
}

function isValidLatitude(value: any): value is number {
  return typeof value === 'number' && value >= -90 && value <= 90;
}

function isValidLongitude(value: any): value is number {
  return typeof value === 'number' && value >= -180 && value <= 180;
}

function isValidBattery(value: any): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

function isValidBrincoId(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function handleGatewaySignal(signal: GatewaySignal): Promise<void> {
  const { brinco_id, lat, long, bateria } = signal;

  if (!isValidBrincoId(brinco_id)) {
    throw new Error('brinco_id inválido ou ausente.');
  }
  if (!isValidLatitude(lat)) {
    throw new Error('Latitude inválida. Deve estar entre -90 e 90.');
  }
  if (!isValidLongitude(long)) {
    throw new Error('Longitude inválida. Deve estar entre -180 e 180.');
  }
  if (!isValidBattery(bateria)) {
    throw new Error('Bateria inválida. Deve ser número entre 0 e 100.');
  }

  const collectionRef = collection(db, 'monitoramento_animais');
  const queryByBrinco = query(collectionRef, where('brinco_id', '==', brinco_id));
  const existing = await getDocs(queryByBrinco);

  const documentData = {
    brinco_id,
    lat,
    long,
    bateria,
    timestamp: serverTimestamp(),
  };

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    await setDoc(doc(db, 'monitoramento_animais', existingDoc.id), documentData, { merge: true });
    return;
  }

  await addDoc(collectionRef, documentData);
}
