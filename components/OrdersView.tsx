// ... (mantenha os imports e as funções de balança e lógica como estão)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in p-2">
      <div className="lg:col-span-8 space-y-6">
        {/* HEADER: TIPO DE OPERAÇÃO E BALANÇA */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-50 pb-6">
             <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
               <button onClick={() => { setOrderType('compra'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${orderType === 'compra' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>
                 Compra
               </button>
               <button onClick={() => { setOrderType('venda'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${orderType === 'venda' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
                 Venda
               </button>
             </div>
             
             <div className="flex items-center gap-4">
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${isScaleConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <Scale size={20} className={isScaleConnected ? 'animate-pulse' : ''}/>
                  <span className="text-lg font-black">{scaleWeight.toFixed(3)} KG</span>
                  <button onClick={isScaleConnected ? disconnectScale : connectScale} className="ml-2 p-1 hover:bg-white rounded-lg transition-colors">
                    {isScaleConnected ? <WifiOff size={18} className="text-rose-500"/> : <Wifi size={18} className="text-indigo-600"/>}
                  </button>
                </div>
             </div>
          </div>

          {/* SELEÇÃO DE CLIENTE/PARCEIRO */}
          <div className="relative">
             <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Parceiro Comercial (PF/PJ)</label>
             <div className="relative">
               <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
               <input 
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Pesquisar nome do fornecedor ou cliente..."
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500/20 transition-all"
                />
             </div>
              {customerSearch && !selectedPartner && (
                <div className="absolute bg-white shadow-2xl rounded-2xl z-50 w-full mt-2 border border-slate-100 p-2 animate-in slide-in-from-top-2">
                  {allPartners.length > 0 ? allPartners.slice(0, 5).map(p => (
                    <button key={p.id} onClick={() => { setSelectedPartner(p); setCustomerSearch(p.name); }} className="w-full text-left p-4 hover:bg-indigo-50 rounded-xl font-bold text-sm flex items-center justify-between group">
                      <span>{p.name}</span>
                      <span className="text-[10px] bg-slate-100 px-2 py-1 rounded group-hover:bg-white">{p.type}</span>
                    </button>
                  )) : <p className="p-4 text-xs font-bold text-slate-400 text-center">Nenhum parceiro encontrado</p>}
                </div>
              )}
          </div>
        </div>

        {/* --- NOVA SEÇÃO: BUSCA DE MATERIAIS --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Materiais Disponíveis</h4>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar material..."
                className="w-full pl-11 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredProducts.length > 0 ? filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Package size={24}/>
                  </div>
                  <div>
                    <p className="font-black text-slate-800 uppercase text-sm">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">ESTOQUE: <span className={p.stock <= p.minStock ? 'text-rose-500' : 'text-slate-600'}>{p.stock}kg</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => addToCart(p)} 
                  className="w-10 h-10 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center shadow-lg active:scale-90"
                  title="Pesar Material"
                >
                  <Plus size={20}/>
                </button>
              </div>
            )) : (
              <div className="col-span-full py-10 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase">Nenhum material encontrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CARRINHO (LATERAL DIREITA) */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl sticky top-8">
          <div className="flex items-center gap-3 mb-6">
            <ShoppingCart size={20} className="text-indigo-600"/>
            <h4 className="font-black text-lg uppercase tracking-tight">Checkout</h4>
          </div>
          
          <div className="space-y-3 mb-8 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {cart.length === 0 ? (
              <p className="text-center py-10 text-xs font-bold text-slate-300 uppercase italic">Nenhum item pesado</p>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div>
                  <p className="font-black text-[10px] uppercase text-slate-800">{item.product.name}</p>
                  <p className="text-xs font-bold text-indigo-600">{item.quantity} kg</p>
                </div>
                <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{formatCurrency(total)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Itens</p>
                <p className="font-black">{cart.length}</p>
              </div>
            </div>
            
            <button 
              onClick={handleFinish} 
              disabled={cart.length === 0 || !selectedPartner} 
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-20 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              Confirmar Operação <ArrowRight size={18}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersView;


// import React, { useState, useMemo, useEffect, useRef } from 'react';
// import { ShoppingCart, Package, ArrowRight, Plus, Trash2, User, Building2, Search, Scale, Printer, Wifi, WifiOff } from 'lucide-react';
// import { Product, FinancialRecord, CustomerPF, CustomerPJ } from '../types';
// import { db } from '../firebase'; // AJUSTADO: Importando do lugar correto
// import { collection, writeBatch, doc, addDoc } from 'firebase/firestore';

// interface Props {
//   products: Product[];
//   financials: FinancialRecord[];
//   customersPF: CustomerPF[];
//   customersPJ: CustomerPJ[];
//   notify: (m: string) => void;
// }

// const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// const OrdersView: React.FC<Props> = ({ products, financials, customersPF, customersPJ, notify }) => {
//   const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
//   const [orderType, setOrderType] = useState<'compra' | 'venda'>('compra');
//   const [searchTerm, setSearchTerm] = useState('');
//   const [customerSearch, setCustomerSearch] = useState('');
//   const [selectedPartner, setSelectedPartner] = useState<{id: string, name: string} | null>(null);

//   // Balança States
//   const [scaleWeight, setScaleWeight] = useState<number>(0);
//   const [isScaleConnected, setIsScaleConnected] = useState(false);
//   const [baudRate, setBaudRate] = useState(9600);
//   const portRef = useRef<any>(null);
//   const readerRef = useRef<any>(null);

//   const connectScale = async () => {
//     try {
//       if (!('serial' in navigator)) {
//         notify("Seu navegador não suporta conexão USB/Serial. Use Chrome ou Edge.");
//         return;
//       }
//       const port = await (navigator as any).serial.requestPort();
//       await port.open({ baudRate: baudRate });
//       portRef.current = port;
//       setIsScaleConnected(true);
//       notify(`Balança USB conectada (${baudRate} bps)!`);
//       const decoder = new TextDecoderStream();
//       port.readable.pipeTo(decoder.writable);
//       const reader = decoder.readable.getReader();
//       readerRef.current = reader;
//       let buffer = '';
//       while (true) {
//         const { value, done } = await reader.read();
//         if (done) break;
//         if (value) {
//           buffer += value;
//           const lines = buffer.split(/[\r\n]+/);
//           buffer = lines.pop() || '';
//           for (const line of lines) {
//             const cleaned = line.replace(/[^\d.-]/g, '');
//             if (cleaned) {
//               const weight = parseFloat(cleaned);
//               if (!isNaN(weight)) setScaleWeight(weight);
//             }
//           }
//         }
//       }
//     } catch (error) {
//       console.error("Erro na balança:", error);
//       setIsScaleConnected(false);
//       notify("Conexão USB cancelada ou erro na porta.");
//     }
//   };

//   const disconnectScale = async () => {
//     if (readerRef.current) await readerRef.current.cancel();
//     if (portRef.current) await portRef.current.close();
//     setIsScaleConnected(false);
//     setScaleWeight(0);
//     notify("Balança desconectada.");
//   };

//   const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
//   const allPartners = useMemo(() => {
//     const pf = customersPF.map(c => ({ id: c.id, name: c.name, type: 'PF' }));
//     const pj = customersPJ.map(c => ({ id: c.id, name: c.companyName, type: 'PJ' }));
//     return [...pf, ...pj].filter(p => p.name.toLowerCase().includes(customerSearch.toLowerCase()));
//   }, [customersPF, customersPJ, customerSearch]);

//   const addToCart = (p: Product) => {
//     const qtyToAdd = scaleWeight > 0 ? scaleWeight : 1; // Mudei para 1kg padrão se não tiver balança
//     const existing = cart.find(i => i.product.id === p.id);
//     if (existing) {
//       setCart(cart.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + qtyToAdd } : i));
//     } else {
//       setCart([...cart, { product: p, quantity: qtyToAdd }]);
//     }
//     notify(`+ ${qtyToAdd}kg de ${p.name}`);
//   };

//   const removeFromCart = (id: string) => setCart(cart.filter(i => i.product.id !== id));

//   const total = cart.reduce((acc, item) => {
//     const price = orderType === 'venda' ? item.product.sellPrice : item.product.costPrice;
//     return acc + (price * item.quantity);
//   }, 0);

//   const handleFinish = async () => {
//     if (cart.length === 0 || !selectedPartner) return;
    
//     const currentOrderType = orderType;
//     const currentCart = [...cart];
//     const currentPartner = { ...selectedPartner };
//     const currentTotal = total;

//     try {
//       const batch = writeBatch(db);

//       // 1. Atualização do Estoque
//       currentCart.forEach(item => {
//         const productRef = doc(db, 'products', item.product.id);
//         const newStock = currentOrderType === 'venda' ? item.product.stock - item.quantity : item.product.stock + item.quantity;
//         batch.update(productRef, { stock: newStock });
//       });

//       // 2. Registro Financeiro
//       const financialRef = doc(collection(db, 'financials'));
//       batch.set(financialRef, {
//         type: currentOrderType === 'venda' ? 'receita' : 'despesa',
//         description: `${currentOrderType === 'venda' ? 'Venda' : 'Compra'} - ${currentPartner.name}`,
//         value: currentTotal,
//         date: new Date().toISOString().split('T')[0],
//         status: 'pago',
//         category: currentOrderType === 'venda' ? 'Vendas' : 'Suprimentos',
//         createdAt: new Date().toISOString()
//       });

//       await batch.commit();

//       if (currentOrderType === 'compra') printTicket(currentCart, currentPartner, currentTotal);

//       setCart([]);
//       setSelectedPartner(null);
//       setCustomerSearch('');
//       notify("Operação finalizada com sucesso!");
//     } catch (error: any) {
//       console.error("Erro ao finalizar:", error);
//       alert("Erro ao salvar no banco: " + error.message);
//     }
//   };

//   const printTicket = (items: any[], partner: any, totalVal: number) => {
//     const printWindow = window.open('', '_blank');
//     if (!printWindow) return;
//     const date = new Date().toLocaleString('pt-BR');
//     printWindow.document.write(`
//       <html>
//         <head><title>Ticket - Adriana Reciclagem</title></head>
//         <body style="font-family: monospace; width: 300px; padding: 10px;">
//           <center><strong>ADRIANA RECICLAGEM</strong><br>Entrada de Material</center><br>
//           DATA: ${date}<br>PARCEIRO: ${partner.name}<hr>
//           ${items.map(i => `${i.product.name} - ${i.quantity}kg<br>`).join('')}
//           <hr><strong>TOTAL: ${formatCurrency(totalVal)}</strong>
//           <script>window.onload=()=>{window.print();window.close();};</script>
//         </body>
//       </html>
//     `);
//     printWindow.document.close();
//   };

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
//       <div className="lg:col-span-8 space-y-8">
//         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
//           <div className="flex justify-between items-center border-b border-slate-50 pb-6">
//              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
//                <button onClick={() => { setOrderType('compra'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase ${orderType === 'compra' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}>
//                  Compra
//                </button>
//                <button onClick={() => { setOrderType('venda'); setCart([]); }} className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase ${orderType === 'venda' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>
//                  Venda
//                </button>
//              </div>
//              <div className="flex items-center gap-4">
//                 <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border ${isScaleConnected ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
//                   <Scale size={16} className={isScaleConnected ? 'text-emerald-500' : 'text-slate-300'}/>
//                   <span className="text-sm font-black">{scaleWeight.toFixed(3)} KG</span>
//                   <button onClick={isScaleConnected ? disconnectScale : connectScale} className="text-indigo-600 ml-2">
//                     {isScaleConnected ? <WifiOff size={16}/> : <Wifi size={16}/>}
//                   </button>
//                 </div>
//              </div>
//           </div>

//           <div className="space-y-4">
//              <input 
//                 value={customerSearch}
//                 onChange={e => setCustomerSearch(e.target.value)}
//                 placeholder="Selecione o Cliente/Fornecedor..."
//                 className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none"
//               />
//               {customerSearch && !selectedPartner && (
//                 <div className="absolute bg-white shadow-xl rounded-2xl z-50 w-full max-w-md p-2">
//                   {allPartners.slice(0, 5).map(p => (
//                     <button key={p.id} onClick={() => { setSelectedPartner(p); setCustomerSearch(p.name); }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl font-bold text-sm">
//                       {p.name} ({p.type})
//                     </button>
//                   ))}
//                 </div>
//               )}
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {filteredProducts.map(p => (
//             <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center">
//               <div><p className="font-black">{p.name}</p><p className="text-[10px] text-slate-400 uppercase">Saldo: {p.stock}kg</p></div>
//               <button onClick={() => addToCart(p)} className="w-12 h-12 bg-slate-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center">
//                 <Plus size={24}/>
//               </button>
//             </div>
//           ))}
//         </div>
//       </div>

//       <div className="lg:col-span-4">
//         <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl sticky top-8">
//           <h4 className="font-black text-lg mb-6 uppercase tracking-tight">Carrinho</h4>
//           <div className="space-y-4 mb-8 max-h-96 overflow-y-auto">
//             {cart.map(item => (
//               <div key={item.product.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
//                 <div><p className="font-black text-xs uppercase">{item.product.name}</p><p className="text-xs">{item.quantity}kg</p></div>
//                 <button onClick={() => removeFromCart(item.product.id)} className="text-rose-400"><Trash2 size={16}/></button>
//               </div>
//             ))}
//           </div>
//           <div className="border-t pt-6">
//             <p className="text-[10px] font-black text-slate-400 uppercase">Total Geral</p>
//             <p className="text-2xl font-black mb-6">{formatCurrency(total)}</p>
//             <button onClick={handleFinish} disabled={cart.length === 0 || !selectedPartner} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs disabled:opacity-30">
//               Confirmar Operação
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OrdersView;