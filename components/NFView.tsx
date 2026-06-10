import React, { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle2, Info, Box } from 'lucide-react';
import { CustomerPF, CustomerPJ } from '../types';

interface Props {
  customersPF: CustomerPF[];
  customersPJ: CustomerPJ[];
  notify: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const NFView: React.FC<Props> = ({ customersPF, customersPJ, notify }) => {
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'CPF' | 'CNPJ'>('CNPJ');
  const [docNumber, setDocNumber] = useState('');
  
  const [formData, setFormData] = useState({
    // Emitente (Dados Reais Adriana Reciclagem)
    issuerName: 'ADRIANA RECICLAGEM LTDA',
    issuerCnpj: '18.560.350/0001-78',
    issuerIE: '90637152-40',
    issuerAddress: 'Rua Rio Iguaçu, 1267 - Weissópolis, Pinhais - PR, 83.322-160',
    issuerCnae: '4744-0/99',
    issuerRegime: '1', // 1 = Simples Nacional (Código oficial para NF-e)

    // Destinatário
    destName: '',
    destDoc: '',
    destIE: '',
    destAddress: '',

    // Operação
    nature: 'Venda de sucata',
    cfop: '5.102',
    
    // Produto
    prodDesc: '',
    ncm: '',
    qty: '',
    unit: 'KG',
    unitValue: '',
    totalValue: '0.00',

    // Tributos padrão Simples Nacional
    taxIcms: 'Diferimento',
    taxPis: '0.00',
    taxCofins: '0.00',
    taxIpi: '0.00',
    cst: '400', // CSOSN 400 - Não tributada pelo Simples Nacional

    // Resíduo Perigoso
    isHazardous: false,
    mtr: '',
    cadri: '',
    riskClass: '',
    onuNumber: '',
    shippingName: '',
    vehiclePlate: '',
    antt: ''
  });

  // Cálculo Dinâmico do Valor Total acoplado ao Estado do Componente
  useEffect(() => {
    const calculatedTotal = (Number(formData.qty || 0) * Number(formData.unitValue || 0)).toFixed(2);
    setFormData(prev => ({
      ...prev,
      totalValue: calculatedTotal
    }));
  }, [formData.qty, formData.unitValue]);

  // Lógica de Auto-complete do Destinatário
  useEffect(() => {
    const cleanDocInput = docNumber.replace(/\D/g, '');
    if (!cleanDocInput) return;

    if (recipientType === 'CPF') {
      const customer = customersPF.find(c => (c.cpf || '').replace(/\D/g, '') === cleanDocInput);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          destName: customer.name.toUpperCase(),
          destDoc: customer.cpf,
          destIE: 'ISENTO',
          destAddress: `${customer.address || ''}, ${customer.number || 'S/N'} - ${customer.neighborhood || ''}, ${customer.city || ''} - ${customer.state || ''}`.toUpperCase()
        }));
        notify("Dados do cliente PF carregados!");
      }
    } else {
      const customer = customersPJ.find(c => (c.cnpj || '').replace(/\D/g, '') === cleanDocInput);
      if (customer) {
        setFormData(prev => ({
          ...prev,
          destName: customer.companyName.toUpperCase(),
          destDoc: customer.cnpj,
          destIE: customer.pixKey || 'ISENTO',
          destAddress: `${customer.address || ''}, ${customer.number || 'S/N'} - ${customer.neighborhood || ''}, ${customer.city || ''} - ${customer.state || ''}`.toUpperCase()
        }));
        notify("Dados da empresa PJ carregados!");
      }
    }
  }, [docNumber, recipientType, customersPF, customersPJ]);

  // TRANSMISSÃO BLINDADA CONTRA CONVERSÕES DE PÁGINAS HTML DE ERRO
  const handleTransmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ncm || !formData.destDoc) {
      notify("Erro: Preencha o documento e selecione o NCM fiscal do material!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      // Se o servidor der Erro 404, 500 ou devolver uma página HTML de erro (Vite/Vercel)
      if (!response.ok) {
        const errorText = await response.text(); // Lê como texto e não quebra o JSON parser
        console.error("Erro bruto retornado pelo servidor:", errorText);
        throw new Error(`Servidor fora do ar ou rota inexistente (Status ${response.status}). Verifique a API.`);
      }

      // Se o status for de sucesso, processa o JSON amigável do back-end
      const result = await response.json();
      notify(result.mensagem || "Nota Fiscal Eletrônica emitida e autorizada pela SEFAZ!");

    } catch (error: any) {
      console.error(error);
      notify(error.message || "Falha na conexão com o servidor de notas.");
    } finally {
      setLoading(false);
    }
  };

  const cfopOptions = [
    { code: '5.102', desc: 'Venda de mercadoria (Dentro do Estado)' },
    { code: '5.551', desc: 'Venda de ativo imobilizado' },
    { code: '6.102', desc: 'Venda de mercadoria (Fora do Estado)' },
    { code: '1.102', desc: 'Compra para comercialização (Entrada de Sucata)' },
    { code: '5.949', desc: 'Outra saída de mercadoria não especificada' }
  ];

  const ncmOptions = [
    { code: '7204.49.00', desc: 'Sucata de ferro e aço' },
    { code: '7602.00.00', desc: 'Sucata de alumínio' },
    { code: '7404.00.00', desc: 'Sucata de cobre' },
    { code: '4707.90.00', desc: 'Papel ou papelão para reciclar' },
    { code: '3915.90.00', desc: 'Plásticos e suas obras para reciclagem' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <form onSubmit={handleTransmit} className="space-y-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          
          {/* Cabeçalho */}
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
              <FileText size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Emissor de Nota Fiscal</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Reciclagem & Gestão de Resíduos</p>
            </div>
          </div>

          {/* Emitente */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-indigo-600 rounded-full"></div> 1. Dados do Emitente
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Razão Social</label>
                <p className="font-black text-slate-700 text-sm">{formData.issuerName}</p>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">CNPJ</label>
                <p className="font-black text-slate-700 text-sm">{formData.issuerCnpj}</p>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Endereço Emitente</label>
                <p className="font-medium text-slate-600 text-xs">{formData.issuerAddress}</p>
              </div>
            </div>
          </div>

          {/* Destinatário */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-emerald-600 rounded-full"></div> 2. Dados do Destinatário (Cliente)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Tipo de Identificação</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button type="button" onClick={() => { setRecipientType('CNPJ'); setDocNumber(''); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${recipientType === 'CNPJ' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>CNPJ</button>
                  <button type="button" onClick={() => { setRecipientType('CPF'); setDocNumber(''); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${recipientType === 'CPF' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>CPF</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">{recipientType} do Cliente</label>
                <input value={docNumber} onChange={e => setDocNumber(e.target.value)} placeholder={recipientType === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-emerald-500" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nome / Razão Social</label>
                <input value={formData.destName} onChange={e => setFormData({...formData, destName: e.target.value.toUpperCase()})} required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-emerald-500" />
              </div>
              <div className="md:col-span-4">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Endereço de Entrega/Faturamento</label>
                <input value={formData.destAddress} onChange={e => setFormData({...formData, destAddress: e.target.value.toUpperCase()})} required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-emerald-500" />
              </div>
            </div>
          </div>

          {/* Natureza e CFOP */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-amber-600 rounded-full"></div> 3. Natureza da Operação Fiscal
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Natureza da Operação</label>
                <select value={formData.nature} onChange={e => setFormData({...formData, nature: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-amber-500">
                  <option>Venda de sucata</option>
                  <option>Compra de sucata</option>
                  <option>Remessa para industrialização</option>
                  <option>Remessa para reciclagem</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">CFOP Autorizado</label>
                <select value={formData.cfop} onChange={e => setFormData({...formData, cfop: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-amber-500">
                  {cfopOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.code} - {opt.desc}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-600 rounded-full"></div> 4. Dados do Item Pesado
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Descrição Faturamento</label>
                <input value={formData.prodDesc} onChange={e => setFormData({...formData, prodDesc: e.target.value.toUpperCase()})} placeholder="EX: SUCATA DE COBRE MISTO" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">NCM Vinculado</label>
                <select value={formData.ncm} onChange={e => setFormData({...formData, ncm: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500">
                  <option value="">Selecione o código fiscal NCM</option>
                  {ncmOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.code} - {opt.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Peso / Volume</label>
                <input type="number" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Unidade Comercial</label>
                <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500">
                  <option>KG</option>
                  <option>TON</option>
                  <option>UN</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Preço por KG/Unidade</label>
                <input type="number" step="0.01" value={formData.unitValue} onChange={e => setFormData({...formData, unitValue: e.target.value})} required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Valor Total da Nota</label>
                <input readOnly value={formatCurrency(Number(formData.totalValue))} className="w-full p-4 bg-slate-100 rounded-2xl font-black text-indigo-600 border-none outline-none" />
              </div>
            </div>
          </div>

          {/* Transmissão */}
          <button type="submit" disabled={loading} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"/> : <>Transmitir Nota para Receita Federal <Send size={18}/></>}
          </button>
        </div>
      </form>

      {/* Status Inferior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status SEFAZ</p>
              <p className="text-sm font-black text-slate-800 mt-1">Serviço em Operação</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><FileText size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ambiente</p>
              <p className="text-sm font-black text-slate-800 mt-1 uppercase">Produção Real</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default NFView;
