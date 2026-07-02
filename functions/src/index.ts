import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Função utilitária para verificar se um ponto está dentro de um polígono
function verificarPosicao(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

export const receberDadosBrinco = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { brincoId, lat, lng } = req.body;

  if (!brincoId || lat === undefined || lng === undefined) {
    return res.status(400).send('Missing brincoId, lat, or lng');
  }

  try {
    // 1. Localizar o animal no Firestore
    const animaisRef = db.collection('animais');
    const animalQuery = await animaisRef.where('idBrinco', '==', brincoId).limit(1).get();

    if (animalQuery.empty) {
      return res.status(404).send('Animal not found');
    }

    const animalDoc = animalQuery.docs[0];
    const animalData = animalDoc.data();
    const animalId = animalDoc.id;

    // 2. Atualizar o campo posicaoAtual desse animal
    await animalDoc.ref.update({
      latitude: lat,
      longitude: lng,
      dataAtualizacaoPosicao: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Executar a função verificarPosicao para checar se ele saiu da cerca
    const pastoAutorizadoNome = animalData.pastoAutorizado;
    if (pastoAutorizadoNome) {
      const pastosRef = db.collection('pastos_do_usuario');
      const pastoQuery = await pastosRef.where('nome', '==', pastoAutorizadoNome).limit(1).get();

      if (!pastoQuery.empty) {
        const pastoData = pastoQuery.docs[0].data();
        const pastoPolygon = pastoData.polygon;

        if (pastoPolygon && pastoPolygon.length > 0) {
          const isInside = verificarPosicao(lat, lng, pastoPolygon);

          if (!isInside) {
            // 4. Se estiver fora, criar o alerta automaticamente
            await db.collection('Alertas').add({
              animalId: animalId,
              idBrinco: brincoId,
              pastoId: pastoQuery.docs[0].id,
              pastoNome: pastoAutorizadoNome,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              status: 'pendente',
              latitude: lat,
              longitude: lng,
            });
            console.log(`Alerta criado para o animal ${brincoId}: fora do pasto ${pastoAutorizadoNome}`);
          }
        } else {
          console.warn(`Pasto ${pastoAutorizadoNome} não possui polígono definido.`);
        }
      } else {
        console.warn(`Pasto autorizado '${pastoAutorizadoNome}' não encontrado.`);
      }
    } else {
      console.warn(`Animal ${brincoId} não possui pasto autorizado definido.`);
    }

    return res.status(200).send('Dados do brinco recebidos e processados com sucesso.');
  } catch (error) {
    console.error('Erro ao processar dados do brinco:', error);
    return res.status(500).send('Internal Server Error');
  }
});
