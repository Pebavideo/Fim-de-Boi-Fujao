import { collection, query, where, getDocs, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { verificarPosicao } from '../utils/geofencing';

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

export interface AnimalRecord {
  dono_email?: string;
  idBrinco?: string;
  [key: string]: any;
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

  const animaisRef = collection(db, 'animais');
  const animalQuery = query(animaisRef, where('idBrinco', '==', brinco_id));
  const animalSnapshot = await getDocs(animalQuery);

  if (animalSnapshot.empty) {
    throw new Error('Animal não encontrado para o brinco informado.');
  }

  const animalDoc = animalSnapshot.docs[0];
  const animalData = animalDoc.data() as AnimalRecord;
  const donoEmail = animalData.dono_email;

  if (!donoEmail) {
    throw new Error('Dono do animal não identificado. Monitoramento não salvo.');
  }

  let shouldFireAlert = false;
  let pastoNome = animalData.pastoAutorizado;

  if (pastoNome) {
    const pastosRef = collection(db, 'pastos_do_usuario');
    const pastoQuery = query(
      pastosRef,
      where('nome', '==', pastoNome),
      where('emailDono', '==', donoEmail)
    );
    const pastoSnapshot = await getDocs(pastoQuery);

    if (!pastoSnapshot.empty) {
      const pastoData = pastoSnapshot.docs[0].data() as { polygon?: number[][] };
      if (pastoData.polygon && pastoData.polygon.length > 0) {
        const isInside = verificarPosicao(lat, long, pastoData.polygon);
        if (!isInside) {
          shouldFireAlert = true;
        }
      }
    }
  }

  const collectionRef = collection(db, 'monitoramento_animais');
  const queryByBrinco = query(collectionRef, where('brinco_id', '==', brinco_id));
  const existing = await getDocs(queryByBrinco);

  const documentData = {
    brinco_id,
    lat,
    long,
    bateria,
    dono_email: donoEmail,
    timestamp: serverTimestamp(),
  };

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    await setDoc(doc(db, 'monitoramento_animais', existingDoc.id), documentData, { merge: true });
  } else {
    await addDoc(collectionRef, documentData);
  }

  if (shouldFireAlert) {
    await addDoc(collection(db, 'Alertas'), {
      animalId: animalDoc.id,
      idBrinco: brinco_id,
      dono_email: donoEmail,
      pastoNome,
      timestamp: serverTimestamp(),
      status: 'pendente',
      latitude: lat,
      longitude: long,
      origem: 'geofence',
    });
  }
}
