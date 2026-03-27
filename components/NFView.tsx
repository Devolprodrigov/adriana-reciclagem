
import React, { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle2, AlertCircle, Building, Truck, User, Info, Package, ShieldAlert } from 'lucide-react';
import { CustomerPF, CustomerPJ } from '../types';

interface Props {
  customersPF: CustomerPF[];
  customersPJ: CustomerPJ[];
  notify: (m: string) => void;
}

const NFView: React.FC<Props> = ({ customersPF, customersPJ, notify }) => {
  const [loading, setLoading] = useState(false);
  const [recipientType, setRecipientType] = useState<'CPF' | 'CNPJ'>('CNPJ');
  const [docNumber, setDocNumber] = useState('');
  
  // Form States
  const [formData, setFormData] = useState({
    // Emitente (Updated with Adriana Reciclagem data)
    issuerName: 'ADRIANA RECICLAGEM LTDA',
    issuerCnpj: '18.560.350/0001-78',
    issuerIE: '76754', // Inscrição Municipal
    issuerAddress: 'Rua Rio Iguaçu, 1267 - Weissópolis, Pinhais - PR, 83.322-160',
    issuerCnae: '4744-0/99 - Comércio varejista de materiais de construção em geral',
    issuerRegime: 'Simples Nacional (Micro Empresa)',

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
    totalValue: '',

    // Tributos
    taxIcms: 'Diferimento',
    taxPis: '0.00',
    taxCofins: '0.00',
    taxIpi: '0.00',
    cst: '101',

    // Resíduo Perigoso
    isHazardous: false,
    mtr: '',
    cadri: '',
    envLicense: '',
    antt: '',
    riskClass: '',
    onuNumber: '',
    shippingName: '',
    vehiclePlate: ''
  });

  // Auto-fill logic
  useEffect(() => {
    if (recipientType === 'CPF') {
      const customer = customersPF.find(c => (c.cpf || '').replace(/\D/g, '') === (docNumber || '').replace(/\D/g, ''));
      if (customer) {
        setFormData(prev => ({
          ...prev,
          destName: customer.name,
          destDoc: customer.cpf,
          destIE: 'Isento',
          destAddress: `${customer.address}, ${customer.number} - ${customer.neighborhood}, ${customer.city} - ${customer.state}`
        }));
        notify("Dados do cliente PF carregados!");
      }
    } else {
      const customer = customersPJ.find(c => (c.cnpj || '').replace(/\D/g, '') === (docNumber || '').replace(/\D/g, ''));
      if (customer) {
        setFormData(prev => ({
          ...prev,
          destName: customer.companyName,
          destDoc: customer.cnpj,
          destIE: customer.stateRegistration || '',
          destAddress: `${customer.address}, ${customer.number} - ${customer.neighborhood}, ${customer.city} - ${customer.state}`
        }));
        notify("Dados da empresa PJ carregados!");
      }
    }
  }, [docNumber, recipientType, customersPF, customersPJ]);

  const handleTransmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/nfe/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        notify(result.mensagem || "Nota Fiscal Eletrônica transmitida com sucesso!");
      } else {
        throw new Error(result.error || "Erro na transmissão");
      }
    } catch (error: any) {
      console.error(error);
      notify("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cfopOptions = [
    { code: '5.102', desc: 'Venda de mercadoria (Dentro do Estado)' },
    { code: '5.551', desc: 'Venda de bem do ativo (Dentro do Estado)' },
    { code: '6.102', desc: 'Venda de mercadoria (Fora do Estado)' },
    { code: '1.102', desc: 'Compra de sucata (Dentro do Estado)' },
    { code: '2.102', desc: 'Compra de sucata (Fora do Estado)' },
    { code: '5.901', desc: 'Remessa para industrialização' },
    { code: '6.901', desc: 'Remessa para industrialização (Fora)' },
  ];

  const ncmOptions = [
    { code: '7204.49.00', desc: 'Sucata de ferro' },
    { code: '7602.00.00', desc: 'Sucata de alumínio' },
    { code: '4707', desc: 'Papel para reciclagem' },
    { code: '3915', desc: 'Plástico para reciclagem' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <form onSubmit={handleTransmit} className="space-y-8">
        {/* Header Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
              <FileText size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Emissor de Nota Fiscal</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Reciclagem & Gestão de Resíduos</p>
            </div>
          </div>

          {/* 1. Dados do Emitente */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-indigo-600 rounded-full"></div> 1. Dados do Emitente (Sua Empresa)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Razão Social</label>
                <p className="font-bold text-slate-700 text-sm">{formData.issuerName}</p>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">CNPJ</label>
                <p className="font-bold text-slate-700 text-sm">{formData.issuerCnpj}</p>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Inscrição Estadual</label>
                <p className="font-bold text-slate-700 text-sm">{formData.issuerIE}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Endereço Completo</label>
                <p className="font-bold text-slate-700 text-sm">{formData.issuerAddress}</p>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Regime Tributário</label>
                <p className="font-bold text-slate-700 text-sm">{formData.issuerRegime}</p>
              </div>
            </div>
          </div>

          {/* 2. Dados do Destinatário */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-emerald-600 rounded-full"></div> 2. Dados do Destinatário (Cliente)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Tipo de Pessoa</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setRecipientType('CNPJ')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${recipientType === 'CNPJ' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >CNPJ</button>
                  <button 
                    type="button"
                    onClick={() => setRecipientType('CPF')}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${recipientType === 'CPF' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                  >CPF</button>
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">{recipientType}</label>
                <input 
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder={recipientType === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nome / Razão Social</label>
                <input 
                  value={formData.destName}
                  onChange={(e) => setFormData({...formData, destName: e.target.value})}
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div className="md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Inscrição Estadual</label>
                <input 
                  value={formData.destIE}
                  onChange={(e) => setFormData({...formData, destIE: e.target.value})}
                  placeholder="Isento"
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
              <div className="md:col-span-3">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Endereço Completo</label>
                <input 
                  value={formData.destAddress}
                  onChange={(e) => setFormData({...formData, destAddress: e.target.value})}
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none" 
                />
              </div>
            </div>
          </div>

          {/* 3. Natureza & CFOP */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-amber-600 rounded-full"></div> 3. Natureza da Operação & CFOP
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Natureza da Operação</label>
                <select 
                  value={formData.nature}
                  onChange={(e) => setFormData({...formData, nature: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option>Venda de sucata</option>
                  <option>Compra de sucata</option>
                  <option>Remessa para industrialização</option>
                  <option>Remessa para reciclagem</option>
                  <option>Prestação de serviço de coleta de resíduos</option>
                  <option>Remessa para destinação final</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">CFOP</label>
                <select 
                  value={formData.cfop}
                  onChange={(e) => setFormData({...formData, cfop: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {cfopOptions.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.code} - {opt.desc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. Itens da Nota */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-blue-600 rounded-full"></div> 4. Descrição do Produto & NCM
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Descrição Detalhada</label>
                <input 
                  value={formData.prodDesc}
                  onChange={(e) => setFormData({...formData, prodDesc: e.target.value})}
                  placeholder="Ex: Sucata de ferro, Sucata de alumínio..."
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">NCM (Código Fiscal)</label>
                <select 
                  value={formData.ncm}
                  onChange={(e) => setFormData({...formData, ncm: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecione o NCM</option>
                  {ncmOptions.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.code} - {opt.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Quantidade</label>
                <input 
                  type="number"
                  value={formData.qty}
                  onChange={(e) => setFormData({...formData, qty: e.target.value})}
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Unidade</label>
                <select 
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option>KG</option>
                  <option>TON</option>
                  <option>UN</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Valor Unitário</label>
                <input 
                  type="number"
                  step="0.01"
                  value={formData.unitValue}
                  onChange={(e) => setFormData({...formData, unitValue: e.target.value})}
                  required
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Valor Total</label>
                <input 
                  readOnly
                  value={(Number(formData.qty) * Number(formData.unitValue)).toFixed(2)}
                  className="w-full p-4 bg-slate-100 rounded-2xl font-black text-indigo-600 border-none outline-none" 
                />
              </div>
            </div>
          </div>

          {/* 5. Tributos */}
          <div className="mb-12">
            <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-widest mb-6 flex items-center gap-2">
              <div className="w-8 h-1 bg-rose-600 rounded-full"></div> 5. Tributação (ICMS / PIS / COFINS)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">ICMS</label>
                <input 
                  value={formData.taxIcms}
                  onChange={(e) => setFormData({...formData, taxIcms: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-rose-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">PIS</label>
                <input 
                  value={formData.taxPis}
                  onChange={(e) => setFormData({...formData, taxPis: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-rose-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">COFINS</label>
                <input 
                  value={formData.taxCofins}
                  onChange={(e) => setFormData({...formData, taxCofins: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-rose-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">IPI</label>
                <input 
                  value={formData.taxIpi}
                  onChange={(e) => setFormData({...formData, taxIpi: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-rose-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">CST/CSOSN</label>
                <input 
                  value={formData.cst}
                  onChange={(e) => setFormData({...formData, cst: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-rose-500 outline-none" 
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <Info size={14} className="text-indigo-600" />
              <span>Diferimento de ICMS aplicado automaticamente para operações internas no Paraná (conforme regulamento).</span>
            </div>
          </div>

          {/* 6. Resíduos Perigosos */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2">
                <div className="w-8 h-1 bg-slate-600 rounded-full"></div> 6. Resíduos Perigosos & Transporte
              </h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-[10px] font-black uppercase text-slate-400">Ativar campos extras?</span>
                <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                  <input 
                    type="checkbox" 
                    checked={formData.isHazardous}
                    onChange={(e) => setFormData({...formData, isHazardous: e.target.checked})}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  />
                  <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isHazardous ? 'bg-indigo-600' : 'bg-slate-200'}`}></label>
                </div>
              </label>
            </div>

            {formData.isHazardous && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">MTR</label>
                  <input 
                    value={formData.mtr}
                    onChange={(e) => setFormData({...formData, mtr: e.target.value})}
                    placeholder="Manifesto de Transporte"
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">CADRI</label>
                  <input 
                    value={formData.cadri}
                    onChange={(e) => setFormData({...formData, cadri: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Classe de Risco</label>
                  <input 
                    value={formData.riskClass}
                    onChange={(e) => setFormData({...formData, riskClass: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Número ONU</label>
                  <input 
                    value={formData.onuNumber}
                    onChange={(e) => setFormData({...formData, onuNumber: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Nome para Embarque</label>
                  <input 
                    value={formData.shippingName}
                    onChange={(e) => setFormData({...formData, shippingName: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Placa do Veículo</label>
                  <input 
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({...formData, vehiclePlate: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">ANTT</label>
                  <input 
                    value={formData.antt}
                    onChange={(e) => setFormData({...formData, antt: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"/>
            ) : (
              <>Transmitir NF-e Agora <Send size={18}/></>
            )}
          </button>
        </div>
      </form>

      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><CheckCircle2 size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Última Transmissão</p>
              <p className="text-sm font-black text-slate-800 mt-1">NFe #4458 - SUCESSO</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl"><FileText size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Mês Atual</p>
              <p className="text-sm font-black text-slate-800 mt-1">128 Documentos</p>
            </div>
         </div>
         <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Send size={20}/></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ambiente</p>
              <p className="text-sm font-black text-slate-800 mt-1 uppercase">PRODUÇÃO (Sefaz)</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default NFView;
