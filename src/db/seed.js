// Dados iniciais gravados na primeira abertura do banco.
// IDs FIXOS de propósito: assim os mesmos itens têm o mesmo id em qualquer
// aparelho e não duplicam no "importar e mesclar" da fase 2. Não altere os ids.

export const metodosVitoriaIniciais = [
  { id: 'd751207d-0c3c-4f62-a37d-c4757c0296a8', nome: "Pinfall" },
  { id: '60f9c317-d0ad-447e-8296-3a159a8e2b8b', nome: "Submission" },
  { id: 'a4a42953-7f61-42ac-97f1-ac26b206a7f0', nome: "Count Out" },
  { id: '203e0c1b-14d9-49a7-89c1-874439b33c20', nome: "Disqualification" },
  { id: '5ebf2168-f0ce-47b4-8d17-d79d8d96bfe2', nome: "Knockout" },
  { id: 'ec81a469-78e3-4839-b7b5-e6a4a97a6b0d', nome: "Referee Stoppage" },
];

// numLados × wrestlersPorLado = configuração inicial do formulário.
// variavel = permite adicionar lados/wrestlers na luta.
export const tiposMatchIniciais = [
  { id: 'ac3d8995-d5e5-4f2f-9ba9-472dde5afd9e', nome: "Singles", numLados: 2, wrestlersPorLado: 1, variavel: false },
  { id: '5ba6c76c-3307-41f0-810c-7ccebfccf3eb', nome: "Tag Team", numLados: 2, wrestlersPorLado: 2, variavel: false },
  { id: 'fa92fe30-7c77-4d9e-a28b-1fa68515bca0', nome: "Trios", numLados: 2, wrestlersPorLado: 3, variavel: false },
  { id: '439ce488-f40e-4ec5-afbc-435a6d3e787f', nome: "Triple Threat", numLados: 3, wrestlersPorLado: 1, variavel: false },
  { id: '41c535d3-c33a-4f90-8203-e9e8fd691732', nome: "Fatal 4-Way", numLados: 4, wrestlersPorLado: 1, variavel: false },
  { id: '4f7df534-cf66-495c-8ec0-a45aac993f96', nome: "Four Corners Tag", numLados: 4, wrestlersPorLado: 2, variavel: false },
  { id: '164d3656-b65c-4d9b-9480-1bd0235deb41', nome: "Multi-Man", numLados: 2, wrestlersPorLado: 4, variavel: true },
  { id: '9ce972d9-4258-4fc7-b19b-f74eb0de6737', nome: "Battle Royal", numLados: 10, wrestlersPorLado: 1, variavel: true },
  { id: '57e14f4f-8097-4b80-bb24-c7343c1db6a1', nome: "Gauntlet", numLados: 3, wrestlersPorLado: 1, variavel: true },
  { id: '8bc30bd7-3117-4c1f-8426-3472ac931dcc', nome: "Handicap", numLados: 2, wrestlersPorLado: 1, variavel: true },
];

export const estipulacoesIniciais = [
  { id: '05e6c774-c81d-415b-9861-c3024a42df43', nome: "No DQ" },
  { id: '84b2b862-d24e-478f-8542-ca10d1ecb14a', nome: "Falls Count Anywhere" },
  { id: '28f273e2-89ce-49bb-8a24-7ef7655f4ac7', nome: "Street Fight" },
  { id: 'cdd8799d-07de-4844-997b-e61f92f01e96', nome: "Hardcore" },
  { id: '318b2fbd-76aa-469b-ae86-9195893ea932', nome: "Ladder" },
  { id: 'abb493d4-5f74-4ae9-9294-912a96d44df9', nome: "Tables" },
  { id: '752ebd32-f47d-4a62-96af-4cceb96101cf', nome: "TLC" },
  { id: '5f9fe315-eecb-4115-90ff-5e58290804a3', nome: "Cage" },
  { id: 'f9927f12-1529-4b84-b9d6-3d6a91f95b72', nome: "Hell in a Cell" },
  { id: '2ed53fc0-b360-4a23-a088-6bca272dc8a7', nome: "Last Man Standing" },
  { id: 'e4007955-c5b4-4a9c-a9d1-6040418799ae', nome: "I Quit" },
  { id: 'd50b5092-1421-4cc8-ad2c-2bd3eef46d8e', nome: "Submission Match" },
  { id: '11a2ea13-faf2-4fd4-9987-2ac87596a697', nome: "Iron Man" },
  { id: 'bd01e5ed-852c-4283-848e-d1a49153f6ae', nome: "2 out of 3 Falls" },
  { id: 'd7dff17e-b9de-467a-8247-4f0ab7ee38c3', nome: "Death Match" },
  { id: '6ebb3c11-dfa4-4aba-b612-d5578434d58e', nome: "Lumberjack" },
  { id: '5ac84ecc-6462-4ba9-8cf5-838e3f3c804b', nome: "Anarchy in the Arena" },
  { id: '27573589-67c6-4a2f-97ee-43bf6d4559e7', nome: "Blood and Guts" },
  { id: '273be912-bc6b-4d59-964d-238fc2b3dec6', nome: "Elimination Chamber" },
  { id: 'b3edaf0d-6490-4a6c-9e9d-c4faf2177bd4', nome: "WarGames" },
];
