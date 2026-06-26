import React, { useState, useMemo, useRef } from 'react';
import { ShoppingCart, Search, Scale, Plus, Trash2, Wifi, WifiOff, Printer, ArrowUpRight, ArrowDownLeft, Calendar, Coins, CreditCard, UserCheck } from 'lucide-react';
import { Product, FinancialRecord, CustomerPF, CustomerPJ } from '../types';
import { db } from '../firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';

interface Props {
  products: Product[];
  financials: FinancialRecord[];
  customersPF: CustomerPF[];
  customersPJ: CustomerPJ[];
  notify: (m: string) => void;
  operatorName: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  customPrice: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const OrdersView: React.FC<Props> = ({ products, financials, customersPF, customersPJ, notify, operatorName }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'compra' | 'venda'>('compra');
  const [paymentMethod, setPaymentMethod] = useState<string>('banco');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<{id: string, name: string} | null>(null);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

  // Balança States
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const connectScale = async () => {
    try {
      if (!('serial' in navigator)) {
        notify("Navegador sem suporte a Serial.");
        return;
      }
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setIsScaleConnected(true);
      notify("Balança conectada!");
      
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
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            const cleaned = line.replace(/[^\d.-]/g, '');
            if (cleaned) {
              const weight = parseFloat(cleaned);
              if (!isNaN(weight)) setScaleWeight(weight);
            }
          }
        }
      }
    } catch (error) {
      setIsScaleConnected(false);
      notify("Erro na balança.");
    }
  };

  const disconnectScale = async () => {
    if (readerRef.current) await readerRef.current.cancel();
    if (portRef.current) await portRef.current.close();
    setIsScaleConnected(false);
    setScaleWeight(0);
    notify("Desconectado.");
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    if (newQty < 0) return;
    setCart(cart.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
    ));
  };

  const updateCartPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart(cart.map(item => 
      item.product.id === productId ? { ...item, customPrice: newPrice } : item
    ));
  };

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const allPartners = useMemo(() => {
    const pf = customersPF.map(c => ({ id: c.id, name: c.name, type: 'PF' }));
    const pj = customersPJ.map(c => ({ id: c.id, name: c.companyName, type: 'PJ' }));
    return [...pf, ...pj].filter(p => p.name.toLowerCase().includes(customerSearch.toLowerCase()));
  }, [customersPF, customersPJ, customerSearch]);

  const addToCart = (p: Product) => {
    const qtyToAdd = scaleWeight > 0 ? scaleWeight : 1;
    const initialPrice = orderType === 'venda' ? (p.sellPrice || 0) : (p.costPrice || 0);
    
    const existing = cart.find(i => i.product.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + qtyToAdd } : i));
    } else {
      setCart([...cart, { product: p, quantity: qtyToAdd, customPrice: initialPrice }]);
    }
    notify(`+ ${qtyToAdd}kg de ${p.name}`);
  };

  const removeFromCart = (id: string) => setCart(cart.filter(i => i.product.id !== id));

  const total = cart.reduce((acc, item) => {
    return acc + (item.customPrice * item.quantity);
  }, 0);

  // FUNÇÃO DE IMPRESSÃO AJUSTADA COM MARGEM DE SEGURANÇA À ESQUERDA
  const printTicket = (items: any[], partnerName: string, totalVal: number, type: 'compra' | 'venda', customDate?: string, methodUsed?: string, operator?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const date = customDate || new Date().toLocaleString('pt-BR');
    const displayMethod = methodUsed === 'dinheiro' ? 'DINHEIRO VIVO (CAIXA)' : 'PIX / BANCO';
    
    const itemsHtml = items.map(i => {
      const name = i.productName || i.product?.name || 'Material';
      const quantity = Number(i.quantity || 0);
      const price = Number(i.customPrice || i.price || 0);
      const subTotal = price * quantity;
      
      return `
        <div style="margin-bottom: 5px; border-bottom: 1px dotted #000; padding-bottom: 3px;">
          <strong>${name}</strong><br>
          ${quantity.toFixed(2)}kg x ${formatCurrency(price)} = ${formatCurrency(subTotal)}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { 
              font-family: monospace; 
              width: 255px; /* Reduzido ligeiramente a área útil */
              margin: 0; 
              padding-top: 5px;
              padding-bottom: 5px;
              padding-right: 5px;
              padding-left: 15px; /* Adicionado recuo de segurança para evitar cortes físicos de letras */
              font-size: 11px; 
              line-height: 1.3; 
              color: #000; 
              background-color: #fff; 
            }
            center { margin-bottom: 5px; padding-right: 10px; }
            hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
          </style>
        </head>
        <body>
          <center>
            <strong style="font-size: 12px;">ADRIANA RECICLAGEM</strong><br>
            ${type === 'compra' ? 'TICKET DE ENTRADA (COMPRA)' : 'TICKET DE SAÍDA (VENDA)'}
            ${customDate ? '<br><small>* SEGUNDA VIA *</small>' : ''}
          </center>
          DATA: ${date}<br>
          PARCEIRO: ${partnerName}<br>
          FORMA: ${displayMethod}<br>
          OPERADOR: ${operator || 'SISTEMA'}<hr>
          
          ${itemsHtml}
          
          <hr>
          <span style="font-size: 12px;"><strong>TOTAL GERAL: ${formatCurrency(totalVal)}</strong></span>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReprintHistory = (record: FinancialRecord) => {
    const type: 'compra' | 'venda' = record.type === 'receita' ? 'venda' : 'compra';
    const partnerName = record.description.split(' - ')[1] || 'Não Identificado';
    
    const mockItems = [{
      productName: record.category === 'Vendas' ? 'Saída de Materiais Recicláveis' : 'Entrada de Materiais Consolidados',
      quantity: 1,
      price: record.value
    }];

    const customDate = record.date ? new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR') : undefined;
    const savedOperator = (record as any).operator || 'SISTEMA';
    printTicket(mockItems, partnerName, record.value, type, customDate, record.paymentMethod, savedOperator);
  };

  const handleFinish = async () => {
    if (cart.length === 0 || !selectedPartner) return;
    
    const currentOrderType = orderType;
    const currentCart = [...cart];
    const currentPartner = { ...selectedPartner };
    const currentTotal = total;
    const currentMethod = paymentMethod;
    const currentOperator = operatorName;

    try {
      const batch = writeBatch(db);
      currentCart.forEach(item => {
        const productRef = doc(db, 'products', item.product.id);
        const newStock = currentOrderType === 'venda' ? item.product.stock - item.quantity : item.product.stock + item.quantity;
        batch.update(productRef, { stock: newStock });
      });

      const financialRef = doc(collection(db, 'financials'));
      batch.set(financialRef, {
        type: currentOrderType === 'venda' ? 'receita' : 'despesa',
        description: `${currentOrderType.toUpperCase()} - ${currentPartner.name}`,
        value: currentTotal,
        date: new Date().toISOString().split('T')[0],
        status: 'pago',
        paymentMethod: currentMethod,
        operator: currentOperator,
        category: currentOrderType === 'venda' ? 'Vendas' : 'COMPRA DE MATERIAIS RECO',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      
      if (currentOrderType === 'compra') {
        const desejaImprimir = window.confirm("Pedido gravado com sucesso! Deseja emitir o ticket de entrada para o fornecedor?");
        if (desejaImprimir) {
          printTicket(currentCart, currentPartner.name, currentTotal, currentOrderType, undefined, currentMethod, currentOperator);
        }
      } else {
        notify("Venda finalizada e estoque atualizado!");
        const desejaImprimirVenda = window.confirm("Venda realizada! Deseja emitir o ticket de saída?");
        if (desejaImprimirVenda) {
          printTicket(currentCart, currentPartner.name, currentTotal, currentOrderType, undefined, currentMethod, currentOperator);
        }
      }

      setCart([]);
      setSelectedPartner(null);
      setCustomerSearch('');
      setPaymentMethod('banco');
      if (currentOrderType === 'compra') notify("Finalizado com sucesso!");
    } catch (e) {
      notify("Erro ao salvar operation.");
    }
  };

  const filteredOrders = useMemo(() => {
    return financials.filter(f => {
      const isOrder = f.description.startsWith('COMPRA') || f.description.startsWith('VENDA');
      if (!isOrder || !f.date) return false;
      return f.date.startsWith(selectedMonth);
    });
  }, [financials, selectedMonth]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
      {/* Bloco Esquerdo */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 pb-6">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
               <button onClick={() => { setOrderType('compra'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase ${orderType === 'compra' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>Compra</button>
               <button onClick={() => { setOrderType('venda'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase ${orderType === 'venda' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>Venda</button>
             </div>
             <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${isScaleConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <Scale size={18} className={isScaleConnected ? 'text-emerald-500' : 'text-slate-300'}/>
                <span className="text-lg font-black">{scaleWeight.toFixed(3)} KG</span>
                <button onClick={isScaleConnected ? disconnectScale : connectScale} className="text-indigo-600 ml-2">
                    {isScaleConnected ? <WifiOff size={18}/> : <Wifi size={18}/>}
                </button>
             </div>
          </div>

          <div className="relative">
             <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Selecione o Cliente/Fornecedor..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" />
              {customerSearch && !selectedPartner && (
                <div className="absolute bg-white shadow-xl rounded-2xl z-50 w-full p-2 border border-slate-100 mt-1">
                  {allPartners.slice(0, 5).map(p => (
                    <button key={p.id} onClick={() => { setSelectedPartner(p); setCustomerSearch(p.name); }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl font-bold text-sm">{p.name} ({p.type})</button>
                  ))}
                </div>
              )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Pesquisar material catálogo..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredProducts.length > 0 ? filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center group">
                <div>
                  <p className="font-black text-slate-800 uppercase text-sm">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-400">SALDO: {p.stock}kg</p>
                </div>
                <button onClick={() => addToCart(p)} className="w-10 h-10 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center"><Plus size={20}/></button>
              </div>
            )) : (
              <p className="col-span-2 text-center py-10 text-xs font-bold text-slate-300 uppercase">Nenhum material localizado</p>
            )}
          </div>
        </div>
      </div>

      {/* Bloco Direito (Checkout) */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-xl sticky top-8">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart size={20} className="text-indigo-600"/>
            <h4 className="font-black text-lg uppercase tracking-tight">Checkout</h4>
          </div>

          <div className="space-y-4 mb-6 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {cart.length === 0 ? (
              <p className="text-center py-10 text-xs font-bold text-slate-300 uppercase italic">Nenhum item pesado</p>
            ) : cart.map(item => (
              <div key={item.product.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-3 relative group">
                <div className="flex justify-between items-start">
                  <p className="font-black text-[11px] uppercase text-slate-800 pr-6 leading-tight">{item.product.name}</p>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 p-1 hover:bg-rose-50 rounded-lg transition-colors absolute right-3 top-3">
                    <Trash2 size={16}/>
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Peso (KG)</label>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-2">
                      <input 
                        type="number" step="0.001" value={item.quantity}
                        onChange={e => updateCartQuantity(item.product.id, Number(e.target.value))}
                        className="w-full text-xs font-black text-slate-700 outline-none bg-transparent"
                      />
                      <span className="text-[9px] font-black text-slate-400">KG</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Preço (R$)</label>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-3 py-2">
                      <span className="text-[10px] font-black text-slate-400">R$</span>
                      <input 
                        type="number" step="0.01" value={item.customPrice}
                        onChange={e => updateCartPrice(item.product.id, Number(e.target.value))}
                        className="w-full text-xs font-black text-indigo-600 outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] font-bold text-slate-400 uppercase">
                  Subtotal: <span className="text-slate-700 font-black">{formatCurrency(item.customPrice * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-wider">Forma de Pagamento / Recebimento</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button 
                type="button" 
                onClick={() => setPaymentMethod('banco')}
                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMethod === 'banco' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                PIX / BANCO
              </button>
              <button 
                type="button" 
                onClick={() => setPaymentMethod('dinheiro')}
                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMethod === 'dinheiro' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
              >
                CAIXA FISICO
              </button>
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-3 rounded-2xl flex items-center gap-2 border border-slate-100/80 mb-4">
            <UserCheck size={14} className="text-emerald-500 shrink-0" />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              Operador Ativo: <span className="text-slate-700">{operatorName}</span>
            </span>
          </div>

          <div className="border-t pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase">Total Geral</p>
            <p className="text-3xl font-black mb-4">{formatCurrency(total)}</p>
            <button onClick={handleFinish} disabled={cart.length === 0 || !selectedPartner} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs disabled:opacity-20 transition-all shadow-xl shadow-indigo-100 hover:bg-indigo-700">Finalizar Pedido</button>
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: SEGUNDA VIA */}
      <div className="lg:col-span-12 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
            <Printer size={20} className="text-slate-700" />
            <h4 className="font-black text-lg uppercase tracking-tight">Segunda Via de Tickets</h4>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl max-w-xs w-full sm:w-auto">
            <Calendar size={16} className="text-slate-400 shrink-0"/>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-black text-slate-700 outline-none w-full cursor-pointer uppercase" />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-slate-100">
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Movimentação</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Descrição / Parceiro</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Operador</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</th>
                <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor Total</th>
                <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? filteredOrders.map(record => {
                const isVenda = record.type === 'receita';
                const isDinheiro = record.paymentMethod === 'dinheiro';
                return (
                  <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${isVenda ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isVenda ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                        {isVenda ? 'Venda' : 'Compra'}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isDinheiro ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {isDinheiro ? 'CAIXA FISICO' : 'PIX / BANCO'}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-slate-700 text-sm">{record.description}</td>
                    <td className="py-4 font-black text-indigo-600 text-xs uppercase">{(record as any).operator || 'SISTEMA'}</td>
                    <td className="py-4 text-xs font-bold text-slate-400">{record.date ? new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="py-4 font-black text-slate-800 text-sm">{formatCurrency(record.value)}</td>
                    <td className="py-4 text-right">
                      <button onClick={() => handleReprintHistory(record)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors shadow-sm">
                        <Printer size={12}/> Reimprimir
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} className="text-center py-12 text-xs font-bold text-slate-300 uppercase italic">Nenhuma movimentação localizada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrdersView;
