import { doc, setDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';

const productsToSeed = [
  // MATERIAL FINO (AMARELO)
  { code: '1', name: 'Latinha', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '2', name: 'Alumínio mole', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '3', name: 'Alumínio duro Limpo', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '4', name: 'Antimônio', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '5', name: 'Bisnaga Limpa (perfume)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '6', name: 'Bateria de Carros, Moto e Alarmes', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '8', name: 'Cobre de 4ª', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '9', name: 'Cavaco de Alumínio', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '10', name: 'cavaco de INOX', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '11', name: 'Cavaco de metal (bronze latão)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '12', name: 'Chumbo', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '13', name: 'Inox', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '14', name: 'Inox Ferroso', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '15', name: 'Mel', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '16', name: 'Misto', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '17', name: 'Motor de Geladeira', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '18', name: 'Offset', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '19', name: 'Panela Limpa', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '20', name: 'Persiana Limpa', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '21', name: 'Panela Suja com Cabo Parafuso', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '22', name: 'Persiana Suja', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '23', name: 'Perfil Natural', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '24', name: 'Perfil Colorido Limpo', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '25', name: 'Perfil Natural Sujo', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '26', name: 'Perfil Colorido Sujo', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '28', name: 'Radiador Alumínio e Cobre', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '29', name: 'Radiador de Metal (Limpo sem ferro)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '33', name: 'Rodas de Alumínio', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '34', name: 'Alumínio Duro Sujo', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '35', name: 'Fios de Computador', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '36', name: 'CABO 1 CAPA (acima de 16mm)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '37', name: 'CABO 2 CAPAs (acima de 16mm)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '38', name: 'Bronze(Metal)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '40', name: 'Chaparia de Alumínio (telha)', category: 'MATERIAL FINO', unit: 'KG' },
  { code: '171', name: 'Fios com capa', category: 'MATERIAL FINO', unit: 'KG' },

  // FERRO EM GERAL (LARANJA)
  { code: '51', name: 'Cavaco de Ferro', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '52', name: 'Ferro Mista', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '53', name: 'Ferro Miúda', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '54', name: 'Estamparia', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '55', name: 'Ferro Graúda', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '56', name: 'Ferro Oxicorte', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '57', name: 'Ferro Fundido 2', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '59', name: 'Motores Induzidos para Limpeza (Cobre)', category: 'FERRO EM GERAL', unit: 'KG' },
  { code: '60', name: 'Motores para Limpeza (Alumínio)', category: 'FERRO EM GERAL', unit: 'KG' },

  // PAPELÃO (AZUL CLARO)
  { code: '61', name: 'Papelão - 2', category: 'PAPELÃO', unit: 'KG' },
  { code: '62', name: 'Papel branco', category: 'PAPELÃO', unit: 'KG' },
  { code: '63', name: 'Terceira', category: 'PAPELÃO', unit: 'KG' },
  { code: '64', name: 'Revista + Tetra', category: 'PAPELÃO', unit: 'KG' },
  { code: '65', name: 'Papelão Marrom - 1', category: 'PAPELÃO', unit: 'KG' },

  // PLÁSTICOS EM GERAL (VERDE)
  { code: '131', name: 'Pet Cristal', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '132', name: 'Pet Azul', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '133', name: 'Pet Verde', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '134', name: 'Pet Misto', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '135', name: 'Pead Branco (Produtos de Limpeza)', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '136', name: 'Pead Colorido', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '138', name: 'Pead Bombona', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '139', name: 'P.P Balde, bacia Branco', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '140', name: 'P.P Balde, bacia Colorido', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '141', name: 'P.P Balde, bacia Preto', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '143', name: 'Cristal Sujo', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '144', name: 'Cristal Colorido', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '145', name: 'Cristal Sujo (2)', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '146', name: 'Parachoque', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '147', name: 'Fita Verde', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '148', name: 'PVC', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '149', name: 'Sacolinhas LONA PRETA', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '150', name: 'PET MIOLO + Tanque de Combustível', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },
  { code: '152', name: 'Caixa de Frutas', category: 'PLÁSTICOS EM GERAL', unit: 'KG' },

  // COMPUTADOR (AZUL ESCURO)
  { code: '91', name: 'Sucata de Celular', category: 'COMPUTADOR', unit: 'KG' },
  { code: '92', name: 'Placa mãe de Computador', category: 'COMPUTADOR', unit: 'KG' },
  { code: '93', name: 'Bateria de Notebook', category: 'COMPUTADOR', unit: 'KG' },
  { code: '94', name: 'Placa Marrom', category: 'COMPUTADOR', unit: 'KG' },
  { code: '95', name: 'Placa Pesada', category: 'COMPUTADOR', unit: 'KG' },
  { code: '96', name: 'Bateria de Celular', category: 'COMPUTADOR', unit: 'KG' },
  { code: '99', name: 'CPU Completo', category: 'COMPUTADOR', unit: 'KG' },
  { code: '100', name: 'Fonte de Computador', category: 'COMPUTADOR', unit: 'KG' },
  { code: '101', name: 'Processador', category: 'COMPUTADOR', unit: 'KG' },
  { code: '102', name: 'Placas de Celular', category: 'COMPUTADOR', unit: 'KG' },
  { code: '103', name: 'Memória Dourada', category: 'COMPUTADOR', unit: 'KG' },

  // LITROS
  { code: '71', name: 'Litros 51 e velho Barreiro', category: 'LITROS', unit: 'UN' },
  { code: '73', name: 'Pote de Conserva', category: 'LITROS', unit: 'UN' },
  { code: '74', name: 'Compota Média', category: 'LITROS', unit: 'UN' },
  { code: '75', name: 'Potão Boca Larga', category: 'LITROS', unit: 'UN' },
  { code: '76', name: 'Garrafão de Vinho', category: 'LITROS', unit: 'UN' },
  { code: '77', name: 'Garrafão Ruim', category: 'LITROS', unit: 'UN' },
  { code: '78', name: 'Caco Misto', category: 'LITROS', unit: 'KG' },
  { code: '160', name: 'Óleo de cozinha usado', category: 'LITROS', unit: 'LT' },
];

export async function seedProducts() {
  try {
    console.log('Iniciando carga completa dos 78 produtos...');
    
    for (const product of productsToSeed) {
      const docRef = doc(db, 'products', product.code); 
      await setDoc(docRef, {
        ...product,
        stock: 0,
        minStock: 0,
        costPrice: 0,
        sellPrice: 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    
    console.log('✅ CATÁLOGO COMPLETO CARREGADO COM SUCESSO!');
  } catch (error) {
    console.error('❌ Erro na carga:', error);
  }
}