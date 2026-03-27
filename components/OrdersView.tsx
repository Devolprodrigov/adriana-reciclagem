
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Package, ArrowRight, Plus, Trash2, User, Building2, Search, Scale, Printer, Wifi, WifiOff } from 'lucide-react';
import { Product, FinancialRecord, CustomerPF, CustomerPJ } from '../types';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../src/lib/db';

interface Props {
  products: Product[];
  financials: FinancialRecord[];
  customersPF: CustomerPF[];
  customersPJ: CustomerPJ[];
  notify: (m: string) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const OrdersView: React.FC<Props> = ({ products, financials, customersPF, customersPJ, notify }) => {
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [orderType, setOrderType] = useState<'compra' | 'venda'>('compra');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<{id: string, name: string} | null>(null);

  // Balança States
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(9600);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const connectScale = async () => {
    try {
      if (!('serial' in navigator)) {
        notify("Seu navegador não suporta conexão USB/Serial. Use Chrome ou Edge.");
        return;
      }

      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: baudRate });
      portRef.current = port;
      setIsScaleConnected(true);
      notify(`Balança USB conectada (${baudRate} bps)!`);

      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          // As balanças costumam enviar dados terminados em \r ou \n
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            // Regex mais flexível para capturar o peso (ex: "  12.50 kg ", "ST,GS,+  0.500kg")
            const cleaned = line.replace(/[^\d.-]/g, '');
            if (cleaned) {
              const weight = parseFloat(cleaned);
              if (!isNaN(weight)) setScaleWeight(weight);
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro na balança:", error);
      setIsScaleConnected(false);
      notify("Conexão USB cancelada ou erro na porta.");
    }
  };

  const disconnectScale = async () => {
    if (readerRef.current) {
      await readerRef.current.cancel();
    }
    if (portRef.current) {
      await portRef.current.close();
    }
    setIsScaleConnected(false);
    setScaleWeight(0);
    notify("Balança desconectada.");
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const allPartners = useMemo(() => {
    const pf = customersPF.map(c => ({ id: c.id, name: c.name, type: 'PF' }));
    const pj = customersPJ.map(c => ({ id: c.id, name: c.companyName, type: 'PJ' }));
    return [...pf, ...pj].filter(p => p.name.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customersPF, customersPJ, customerSearch]);

  const addToCart = (p: Product) => {
    const qtyToAdd = scaleWeight > 0 ? scaleWeight : 50;
    const existing = cart.find(i => i.product.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + qtyToAdd } : i));
    } else {
      setCart([...cart, { product: p, quantity: qtyToAdd }]);
    }
    notify(`+ ${qtyToAdd}kg de ${p.name} adicionados`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(i => i.product.id !== id));
  };

  const total = cart.reduce((acc, item) => {
    const price = orderType === 'venda' ? item.product.sellPrice : item.product.costPrice;
    return acc + (price * item.quantity);
  }, 0);

  const handleFinish = async () => {
    if (cart.length === 0 || !selectedPartner) return;
    
    // Salva o tipo e dados para o ticket antes de resetar
    const currentOrderType = orderType;
    const currentCart = [...cart];
    const currentPartner = { ...selectedPartner };
    const currentTotal = total;

    try {
      const batch = writeBatch(db);

      // 1. Atualização do Estoque
      cart.forEach(item => {
        const productRef = doc(db, 'products', item.product.id);
        const newStock = orderType === 'venda' ? item.product.stock - item.quantity : item.product.stock + item.quantity;
        batch.update(productRef, { stock: newStock });
      });

      // 2. Registro Financeiro
      const financialRef = doc(collection(db, 'financials'));
      const newRecord = {
        type: orderType === 'venda' ? 'receita' : 'despesa',
        description: `${orderType === 'venda' ? 'Venda' : 'Compra'} p/ ${selectedPartner.name} - ${cart.length} itens`,
        value: total,
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        category: orderType === 'venda' ? 'Vendas' : 'Suprimentos'
      };
      batch.set(financialRef, newRecord);

      await batch.commit();

      // 3. Impressão de Ticket se for Compra
      if (currentOrderType === 'compra') {
        printTicket(currentCart, currentPartner, currentTotal);
      }

      // 4. Reset
      setCart([]);
      setSelectedPartner(null);
      setCustomerSearch('');
      notify(`${orderType === 'venda' ? 'Venda' : 'Compra'} finalizada e estoque atualizado!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders_batch');
    }
  };

  const printTicket = (items: any[], partner: any, totalVal: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const date = new Date().toLocaleString('pt-BR');
    const ticketNo = Math.floor(Math.random() * 90000) + 10000;

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket de Entrada - ADRIANA RECICLAGEM</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 300px; padding: 10px; font-size: 12px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .company { font-weight: bold; font-size: 14px; }
            .title { font-weight: bold; margin-top: 5px; text-transform: uppercase; }
            .details { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th { text-align: left; border-bottom: 1px solid #000; }
            .total { border-top: 1px dashed #000; padding-top: 10px; font-weight: bold; font-size: 14px; text-align: right; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { @page { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">ADRIANA RECICLAGEM</div>
            <div>Rua Rio Iguaçu, 1267 - Pinhais/PR</div>
            <div>CNPJ: 18.560.350/0001-78</div>
            <div class="title">TICKET DE ENTRADA #${ticketNo}</div>
          </div>
          
          <div class="details">
            <div>DATA: ${date}</div>
            <div>FORNECEDOR: ${partner.name}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ITEM</th>
                <th style="text-align: right">PESO</th>
                <th style="text-align: right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td style="text-align: right">${item.quantity}kg</td>
                  <td style="text-align: right">${formatCurrency(item.product.costPrice * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            TOTAL A PAGAR: ${formatCurrency(totalVal)}
          </div>

          <div class="footer">
            ESTE DOCUMENTO NÃO POSSUI VALOR FISCAL.<br>
            OBRIGADO PELA PARCERIA!
          </div>

          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
      {/* Coluna de Seleção de Materiais */}
      <div className="lg:col-span-8 space-y-8">
        {/* Seletor de Tipo e Parceiro */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 pb-6">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
               <button onClick={() => { setOrderType('compra'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${orderType === 'compra' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>
                 Compra (Entrada)
               </button>
               <button onClick={() => { setOrderType('venda'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${orderType === 'venda' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                 Venda (Saída)
               </button>
             </div>
             <div className="flex items-center gap-4">
                {/* Widget da Balança */}
                <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${isScaleConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`p-2 rounded-lg ${isScaleConnected ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    <Scale size={16}/>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Balança USB</p>
                    <p className={`text-sm font-black ${isScaleConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {scaleWeight.toFixed(3)} <span className="text-[10px]">KG</span>
                    </p>
                  </div>
                  
                  {!isScaleConnected && (
                    <select 
                      value={baudRate} 
                      onChange={(e) => setBaudRate(Number(e.target.value))}
                      className="bg-transparent text-[10px] font-black text-slate-400 outline-none border-l border-slate-200 pl-2 ml-1"
                    >
                      <option value={2400}>2400</option>
                      <option value={4800}>4800</option>
                      <option value={9600}>9600</option>
                      <option value={19200}>19200</option>
                    </select>
                  )}

                  <button 
                    onClick={isScaleConnected ? disconnectScale : connectScale}
                    className={`p-2 rounded-lg transition-all ${isScaleConnected ? 'text-rose-500 hover:bg-rose-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
                    title={isScaleConnected ? "Desconectar Balança USB" : "Conectar Balança USB"}
                  >
                    {isScaleConnected ? <WifiOff size={16}/> : <Wifi size={16}/>}
                  </button>
                </div>

                <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status do Pedido</span>
                    <span className={`text-xs font-bold ${orderType === 'compra' ? 'text-emerald-600' : 'text-indigo-600'}`}>Aguardando Lançamento</span>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                {orderType === 'compra' ? <User size={14}/> : <Building2 size={14}/>} 
                Selecione o {orderType === 'compra' ? 'Fornecedor' : 'Cliente'}
             </label>
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input 
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Pesquise por nome, CPF ou CNPJ..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                {customerSearch && !selectedPartner && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 z-30 max-h-64 overflow-y-auto custom-scrollbar p-2">
                    {allPartners.length > 0 ? allPartners.map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => { setSelectedPartner(p); setCustomerSearch(p.name); }}
                        className="w-full text-left p-4 hover:bg-slate-50 rounded-2xl flex justify-between items-center group/item"
                      >
                        <span className="font-black text-slate-700">{p.name}</span>
                        <span className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-2 py-1 rounded-full">{p.type}</span>
                      </button>
                    )) : <p className="p-4 text-xs font-bold text-slate-400">Nenhum parceiro encontrado.</p>}
                  </div>
                )}
             </div>
             {selectedPartner && (
               <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl flex justify-between items-center border border-indigo-100 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm"><User size={16}/></div>
                    <span className="font-black text-sm">{selectedPartner.name}</span>
                  </div>
                  <button onClick={() => { setSelectedPartner(null); setCustomerSearch(''); }} className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-900">Trocar</button>
               </div>
             )}
          </div>
        </div>

        {/* Listagem de Materiais para Adicionar */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione os Materiais</h4>
             <div className="relative w-48">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12}/>
               <input 
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrar..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
               />
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-indigo-100 transition-all flex justify-between items-center group">
                <div>
                  <p className="font-black text-slate-800">{p.name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Saldo Atual: {p.stock}kg</p>
                </div>
                <button 
                  onClick={() => addToCart(p)}
                  disabled={orderType === 'venda' && p.stock <= 0}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                    orderType === 'venda' && p.stock <= 0 
                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                    : 'bg-slate-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-100'
                  }`}
                >
                  <Plus size={24}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout / Resumo Lateral */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col h-[calc(100vh-16rem)] sticky top-8">
          <div className="flex items-center gap-3 mb-8">
            <div className={`p-3 rounded-2xl ${orderType === 'compra' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">Resumo do Pedido</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{orderType === 'compra' ? 'Lote de Entrada' : 'Saída de Carga'}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-8">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Package size={48} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">Pedido Vazio</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="p-5 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-black text-slate-700 text-xs uppercase leading-tight">{item.product.name}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: Math.max(0, i.quantity - 10)} : i))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 font-black flex items-center justify-center"
                      >-</button>
                      <span className="text-sm font-black text-slate-800">{item.quantity} KG</span>
                      <button 
                        onClick={() => setCart(cart.map(i => i.product.id === item.product.id ? {...i, quantity: i.quantity + 10} : i))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 font-black flex items-center justify-center"
                      >+</button>
                    </div>
                    <span className={`text-sm font-black ${orderType === 'compra' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      {formatCurrency((orderType === 'venda' ? item.product.sellPrice : item.product.costPrice) * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-8 border-t border-slate-100 space-y-6">
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do {orderType === 'compra' ? 'Pagamento' : 'Recebimento'}</span>
                <span className="text-2xl font-black text-slate-800">{formatCurrency(total)}</span>
              </div>
              <Scale className="text-slate-200" size={32}/>
            </div>
            
            <button 
              onClick={handleFinish}
              disabled={cart.length === 0 || !selectedPartner}
              className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 group ${
                cart.length === 0 || !selectedPartner
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                : orderType === 'compra' 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              Confirmar e Baixar Estoque <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            {!selectedPartner && cart.length > 0 && (
              <p className="text-[10px] font-bold text-rose-500 text-center uppercase animate-pulse">Selecione o {orderType === 'compra' ? 'Fornecedor' : 'Cliente'} acima!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersView;
