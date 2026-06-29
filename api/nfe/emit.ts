import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Garante que só aceita requisições do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const token = '48SAduCjq7TO1KbiQJlLJFjE1WO4zseN';
  const formData = req.body;

  try {
    // 1. Mapeamento do formulário do seu sistema para o formato JSON exigido pela Focus NFe
    const nfePayload = {
      natureza_operacao: formData.nature,
      regime_tributario: 1, // 1 = Simples Nacional
      tipo_documento: 1,    // 1 = Saída
      finalidade_emissao: 1, // 1 = Normal
      
      // Dados do Emitente (Sua Empresa)
      emitente: {
        cnpj: formData.issuerCnpj.replace(/\D/g, ''),
        inscricao_estadual: formData.issuerIE.replace(/\D/g, '')
      },

      // Dados do Destinatário (Cliente)
      destinatario: {
        nome_razao_social: formData.destName,
        inscricao_estadual: formData.destIE.toUpperCase() === 'ISENTO' ? '' : formData.destIE.replace(/\D/g, ''),
        [formData.destDoc.length > 14 ? 'cnpj' : 'cpf']: formData.destDoc.replace(/\D/g, ''),
        // Nota: Em produção real, você pode quebrar a string de endereço ou enviar o formato simplificado se a Focus aceitar
        logradouro: formData.destAddress.split(',')[0] || formData.destAddress,
        numero: formData.destAddress.split(',')[1]?.split('-')[0]?.trim() || 'SN',
        bairro: formData.destAddress.split('-')[1]?.split(',')[0]?.trim() || 'CENTRO',
        municipio: 'Pinhais', // Sugerido puxar dinamicamente depois
        uf: 'PR'
      },

      // Lista de Produtos/Itens da Nota
      items: [
        {
          numero_item: 1,
          codigo_produto: '001',
          descricao: formData.prodDesc,
          cfop: formData.cfop.replace('.', ''),
          ncm: formData.ncm.replace('.', ''),
          unidade_comercial: formData.unit,
          quantidade_comercial: parseFloat(formData.qty),
          valor_unitario_comercial: parseFloat(formData.unitValue),
          valor_bruto: parseFloat(formData.qty) * parseFloat(formData.unitValue),
          icms_situacao_tributaria: formData.cst, // ex: 101, 400, 900
          icms_origem: 0
        }
      ]
    };

    // 2. Envia os dados estruturados para o servidor de produção da Focus NFe
    // Geramos um número de referência único baseado no horário atual para evitar duplicidade
    const referenciaUnica = `adriana_${Date.now()}`;
    const focusResponse = await fetch(`https://api.focusnfe.com.br/v2/nfe?ref=${referenciaUnica}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(token + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nfePayload)
    });

    const focusResult = await focusResponse.json();

    if (focusResponse.status === 202 || focusResponse.status === 200) {
      // Nota aceita para processamento ou já autorizada
      return res.status(200).json({
        mensagem: "Nota enviada com sucesso para a SEFAZ!",
        pdfUrl: focusResult.caminho_danfe || null,
        xmlUrl: focusResult.caminho_xml_nota_fiscal || null
      });
    } else {
      // Trata erros retornados pela Focus/SEFAZ (como rejeições de NCM ou CFOP)
      return res.status(400).json({
        error: focusResult.mensagem || "Rejeição da SEFAZ. Verifique os dados tributários."
      });
    }

  } catch (error: any) {
    console.error("Erro interno no servidor de NF-e:", error);
    return res.status(500).json({ error: "Erro interno ao processar a transmissão." });
  }
}
