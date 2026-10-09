import React, { useState, useMemo, useRef } from 'react';
import { ShoppingCart, Search, Scale, Plus, Trash2, Wifi, WifiOff, Printer, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
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
  isAdmin: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  customPrice: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const OrdersView: React.FC<Props> = ({ products, financials, customersPF, customersPJ, notify, operatorName, isAdmin }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'compra' | 'venda'>('compra');
  const [paymentMethod, setPaymentMethod] = useState<string>('banco');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<{id: string, name: string, type?: string, pixKey?: string} | null>(null);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);

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
    const pf = customersPF.map(c => ({ id: c.id, name: c.name, type: 'PF', pixKey: (c as any).pixKey || (c as any).chavePix || '' }));
    const pj = customersPJ.map(c => ({ id: c.id, name: c.companyName, type: 'PJ', pixKey: (c as any).pixKey || (c as any).chavePix || '' }));
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

  const total = cart.reduce((acc, item) => acc + (item.customPrice * item.quantity), 0);

  const printTicket = (
    items: any[], 
    partnerName: string, 
    totalVal: number, 
    type: 'compra' | 'venda', 
    customDate?: string, 
    methodUsed?: string, 
    operator?: string, 
    customTime?: string, 
    pixKeyToUse?: string,
    isSecondCopy?: boolean
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const now = new Date();
    const timeDisplay = customTime || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateDisplay = customDate ? `${customDate}, ${timeDisplay}` : `${now.toLocaleDateString('pt-BR')}, ${timeDisplay}`;
    const displayMethod = methodUsed === 'dinheiro' ? 'DINHEIRO VIVO (CAIXA)' : 'PIX / BANCO';
    const chavePixSistema = pixKeyToUse || 'Não cadastrada';

    const itemsHtml = items.map(i => {
      const name = i.productName || i.product?.name || i.name || 'Material';
      const quantity = Number(i.quantity || 1);
      const price = Number(i.customPrice || i.price || 0);
      const subTotal = price * quantity;
      
      return `
        <div style="margin-bottom: 5px; border-bottom: 1px dotted #000; padding-bottom: 3px;">
          <strong>${name}</strong><br>
          ${quantity.toFixed(3)}kg x ${formatCurrency(price)} = ${formatCurrency(subTotal)}
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
              width: 255px; 
              margin: 0; 
              padding: 5px 5px 5px 15px; 
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
            ${isSecondCopy ? '<br><small style="font-weight: bold;">*** 2ª VIA ***</small>' : ''}
          </center>
          DATA: ${dateDisplay}<br>
          PARCEIRO: ${partnerName}<br>
          FORMA: ${displayMethod}<br>
          ${methodUsed !== 'dinheiro' ? `CHAVE PIX: ${chavePixSistema}<br>` : ''}
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
    const partnerName = (record as any).partnerNameSnapshot || record.description.split(' - ')[1] || 'Não Identificado';
    
    const savedItems = (record as any).itemsSnapshot;
    let mockItems = [];

    if (Array.isArray(savedItems) && savedItems.length > 0) {
      mockItems = savedItems;
    } else {
      const rawNames = (record as any).productsNameCleaned || record.category || 'MATERIAL';
      const namesArray = rawNames.split(', ');
      const totalQ = (record as any).totalQtySaved || 1;
      const splitQty = totalQ / namesArray.length;
      const splitPrice = record.value / totalQ;

      mockItems = namesArray.map((n: string) => ({
        productName: n.toUpperCase(),
        quantity: splitQty,
        customPrice: splitPrice
      }));
    }

    const customDate = record.date ? new Date(record.date + 'T12:00:00').toLocaleDateString('pt-BR') : undefined;
    const savedOperator = (record as any).operator || 'SISTEMA';
    const savedTime = (record as any).time || undefined;
    const savedPixKey = (record as any).pixKeySnapshot || '';
    
    printTicket(mockItems, partnerName, record.value, type, customDate, record.paymentMethod, savedOperator, savedTime, savedPixKey, true);
  };

  const handleFinish = async () => {
    if (cart.length === 0 || !selectedPartner) return;
    const currentOrderType = orderType;
    const currentCart = [...cart];
    const currentPartner = { ...selectedPartner };
    const currentTotal = total;
    const currentMethod = paymentMethod;
    const currentOperator = operatorName;
    const exactTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const itemsSnapshot = currentCart.map(item => ({
      productName: item.product.name.toUpperCase(),
      quantity: item.quantity,
      customPrice: item.customPrice
    }));
    const productsListText = currentCart.map(i => i.product.name).join(', ');
    const totalQtyCalculated = currentCart.reduce((sum, i) => sum + i.quantity, 0);
    const pixKeySnapshot = currentPartner.pixKey || '';

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
        time: exactTime,
        status: 'pago',
        paymentMethod: currentMethod,
        operator: currentOperator,
        partnerId: currentPartner.id,
        partnerNameSnapshot: currentPartner.name,
        pixKeySnapshot: pixKeySnapshot,
        itemsSnapshot: itemsSnapshot,
        productsNameCleaned: productsListText,
        totalQtySaved: totalQtyCalculated,
        category: currentCart[0]?.product.name || (currentOrderType === 'venda' ? 'Vendas' : 'COMPRA DE MATERIAIS RECO'),
        createdAt: serverTimestamp()
      });

      await batch.commit();
      
      printTicket(itemsSnapshot, currentPartner.name, currentTotal, currentOrderType, undefined, currentMethod, currentOperator, exactTime, pixKeySnapshot, false);

      setCart([]);
      setSelectedPartner(null);
      setCustomerSearch('');
      setPaymentMethod('banco');
      notify("Pedido finalizado com sucesso!");
    } catch (e) {
      notify("Erro ao salvar operação.");
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
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 pb-6">
             <div className="flex bg-
