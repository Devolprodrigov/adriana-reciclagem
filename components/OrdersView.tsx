import React, { useState, useMemo, useRef } from 'react';
import { ShoppingCart, Package, ArrowRight, Plus, Trash2, User, Search, Scale, Wifi, WifiOff } from 'lucide-react';
import { Product, FinancialRecord, CustomerPF, CustomerPJ } from '../types';
import { db } from '../firebase';
import { collection, writeBatch, doc, addDoc, serverTimestamp } from 'firebase/firestore';

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

  // --- FUNÇÃO PARA DIGITAR O PESO QUE VOCÊ QUER DIRETO NO CHECKOUT ---
  const updateCartQuantity = (productId: string, newQty: number) => {
    if (newQty < 0) return; // Impede pesos negativos
    setCart(cart.map(item => 
      item.product.id === productId ? { ...item, quantity: newQty } : item
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
    // Se a balança estiver conectada puxa o peso dela, senão joga 1KG padrão para você ajustar digitando
    const qtyToAdd = scaleWeight > 0 ? scaleWeight : 1;
    const existing = cart.find(i => i.product.id === p.id);
    if (existing) {
      setCart(cart.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + qtyToAdd } : i));
    } else {
      setCart([...cart, { product: p, quantity: qtyToAdd }]);
    }
    notify(`+ ${qtyToAdd}kg de ${p.name}`);
  };

  const removeFromCart = (id: string) => setCart(cart.filter(i => i.product.id !== id));

  const total = cart.reduce((acc, item) => {
    const price = orderType === 'venda' ? item.product.sellPrice : item.product.costPrice;
    return acc + (price * item.quantity);
  }, 0);

  const printTicket = (items: any[], partner: any, totalVal: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const date = new Date().toLocaleString('pt-BR');
    printWindow.document.write(`
      <html>
        <head><title>Ticket - Adriana Reciclagem</title></head>
        <body style="font-family: monospace; width: 300px; padding: 10px;">
          <center><strong>ADRIANA RECICLAGEM</strong><br>Entrada de Material</center><br>
          DATA: ${date}<br>PARCEIRO: ${partner.name}<hr>
          ${items.map(i => `${i.product.name} - ${i.quantity}kg<br>`).join('')}
          <hr><strong>TOTAL: ${formatCurrency(totalVal)}</strong>
          <script>window.onload=()=>{window.print();window.close();};</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleFinish = async () => {
    if (cart.length === 0 || !selectedPartner) return;
    
    const currentOrderType = orderType;
    const currentCart = [...cart];
    const currentPartner = { ...selectedPartner };
    const currentTotal = total;

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
        category: currentOrderType === 'venda' ? 'Vendas' : 'Suprimentos',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      
      if (currentOrderType === 'compra') {
        printTicket(currentCart, currentPartner, currentTotal);
      }

      setCart([]);
      setSelectedPartner(null);
      setCustomerSearch('');
      notify("Finalizado com sucesso!");
    } catch (e) {
      notify("Erro ao salvar.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
      {/* SEÇÃO DA ESQUERDA: BALANÇA, CLIENTE E LISTA DE MATERIAIS */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* BALANÇA E ABAS COMPRA/VENDA */}
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

          {/* BUSCA E SELEÇÃO DE CLIENTE */}
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

        {/* BUSCA DE MATERIAIS */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Pesquisar material catálogo..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20 transition-all" 
            />
          </div>

          {/* MATERIAIS ENCONTRADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
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

      {/* --- SEÇÃO DA DIREITA: CHECKOUT COM CAMPO DE DIGITAÇÃO DE PESO REAL --- */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl sticky top-8">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart size={20} className="text-indigo-600"/>
            <h4 className="font-black text-lg uppercase tracking-tight">Checkout</h4>
          </div>

          <div className="space-y-3 mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {cart.length === 0 ? (
              <p className="text-center py-10 text-xs font-bold text-slate-300 uppercase italic">Nenhum item pesado</p>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="flex-1 mr-2">
                  <p className="font-black text-[10px] uppercase text-slate-800 mb-1">{item.product.name}</p>
                  
                  {/* INPUT NUMÉRICO: PERMITE ALTERAR OU DIGITAR O PESO MANUALMENTE */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 max-w-[130px]">
                    <input 
                      type="number"
                      step="0.001"
                      value={item.quantity}
                      onChange={e => updateCartQuantity(item.product.id, Number(e.target.value))}
                      className="w-full text-xs font-black text-indigo-600 outline-none bg-transparent"
                    />
                    <span className="text-[10px] font-black text-slate-400">KG</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400 p-1 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>

          {/* TOTAIS E CONFIRMAÇÃO */}
          <div className="border-t pt-6">
            <p className="text-[10px] font-black text-slate-400 uppercase">Total Geral</p>
            <p className="text-3xl font-black mb-6">{formatCurrency(total)}</p>
            <button onClick={handleFinish} disabled={cart.length === 0 || !selectedPartner} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs disabled:opacity-20 transition-all shadow-xl shadow-indigo-100 hover:bg-indigo-700">Finalizar Pedido</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersView;
