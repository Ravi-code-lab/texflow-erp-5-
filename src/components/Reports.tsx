
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { FileText, Download, TrendingUp, TrendingDown, Package, Users, IndianRupee, Calendar, BarChart4 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, Order, ProductionJob, Supplier } from '../types';
import SalesAnalytics from './SalesAnalytics';
import DeliveryAnalytics from './DeliveryAnalytics';

interface ReportsProps {
  inventory: InventoryItem[];
  orders: Order[];
  production: ProductionJob[];
  suppliers: Supplier[];
  currency?: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports: React.FC<ReportsProps> = ({ inventory, orders, production, suppliers, currency = '₹' }) => {
  const [activeTab, setActiveTab] = useState<'SALES' | 'INVENTORY' | 'VENDORS' | 'BI' | 'DELIVERY'>('SALES');

  // --- SALES ANALYTICS ---
  const salesByMonth = useMemo(() => {
    const data: Record<string, number> = {};
    orders.forEach(o => {
        if(o.status !== 'CANCELLED') {
            const month = o.orderDate.slice(0, 7); // YYYY-MM
            data[month] = (data[month] || 0) + o.totalAmount;
        }
    });
    return Object.entries(data)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  const topCustomers = useMemo(() => {
      const data: Record<string, number> = {};
      orders.forEach(o => {
          if(o.status !== 'CANCELLED') {
              data[o.customerName] = (data[o.customerName] || 0) + o.totalAmount;
          }
      });
      return Object.entries(data)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
  }, [orders]);

  // --- INVENTORY ANALYTICS ---
  const inventoryByType = useMemo(() => {
      const data: Record<string, number> = {};
      inventory.forEach(i => {
          data[i.type] = (data[i.type] || 0) + (i.quantity * i.pricePerUnit);
      });
      return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [inventory]);

  const stockAgeing = useMemo(() => {
      return [
          { name: '0-30 Days', value: inventory.length * 0.4 },
          { name: '31-60 Days', value: inventory.length * 0.3 },
          { name: '61-90 Days', value: inventory.length * 0.2 },
          { name: '90+ Days', value: inventory.length * 0.1 },
      ];
  }, [inventory]);

  // --- VENDOR ANALYTICS ---
  const vendorPerformance = useMemo(() => {
      return suppliers.map(s => ({
          name: s.name,
          score: s.reliabilityScore,
          materials: s.materialsProvided.length
      })).sort((a, b) => b.score - a.score);
  }, [suppliers]);

  // --- PDF GENERATORS ---
  
  const addPdfHeader = (doc: jsPDF, title: string) => {
      const pageWidth = doc.internal.pageSize.width;
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 16);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(203, 213, 225); // Slate 300
      doc.text("Ravi-Textile ERP Report", pageWidth - 14, 16, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
  };

  const addPdfFooter = (doc: jsPDF) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
          doc.text("Confidential - Internal Use Only", 14, pageHeight - 10);
      }
  };

  const downloadSalesReport = () => {
      const doc = new jsPDF();
      addPdfHeader(doc, "Sales Performance Analysis");

      const totalRevenue = salesByMonth.reduce((acc, c) => acc + c.amount, 0);
      
      // Summary Box
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 35, 180, 20, 2, 2, 'FD');
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Period Revenue: ${currency} ${totalRevenue.toLocaleString()}`, 20, 48);

      // Monthly Table
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("Monthly Revenue Trend", 14, 70);
      
      autoTable(doc, {
          startY: 75,
          head: [['Month', 'Revenue']],
          body: salesByMonth.map(s => [s.date, `${currency} ${s.amount.toLocaleString()}`]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
          columnStyles: { 1: { halign: 'right' } }
      });

      // Top Customers Table
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text("Top Customers by Volume", 14, finalY);
      
      autoTable(doc, {
          startY: finalY + 5,
          head: [['Customer Name', 'Total Volume']],
          body: topCustomers.map(c => [c.name, `${currency} ${c.value.toLocaleString()}`]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] }, // Green
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
      });

      addPdfFooter(doc);
      doc.save('Sales_Report.pdf');
  };

  const downloadInventoryReport = () => {
      const doc = new jsPDF();
      addPdfHeader(doc, "Inventory Valuation Report");
      
      const totalValue = inventory.reduce((acc, i) => acc + (i.quantity * i.pricePerUnit), 0);
      const lowStockCount = inventory.filter(i => i.quantity <= i.minStockLevel).length;

      // Summary
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.text(`Total Stock Value: ₹ ${totalValue.toLocaleString()}`, 14, 35);
      doc.text(`Total SKUs: ${inventory.length}`, 14, 40);
      doc.setTextColor(220, 38, 38);
      doc.text(`Low Stock Alerts: ${lowStockCount} items`, 14, 45);

      autoTable(doc, {
          startY: 50,
          head: [['Item Name', 'Category', 'Qty', 'Unit', 'Rate', 'Value', 'Location']],
          body: inventory.map(i => [
              i.name, 
              i.type, 
              i.quantity, 
              i.unit, 
              `₹ ${i.pricePerUnit}`, 
              `₹ ${(i.quantity * i.pricePerUnit).toFixed(2)}`, 
              i.location || '-'
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [30, 41, 59] },
          columnStyles: { 
              2: { halign: 'right' }, 
              4: { halign: 'right' }, 
              5: { halign: 'right', fontStyle: 'bold' } 
          }
      });

      addPdfFooter(doc);
      doc.save('Inventory_Valuation.pdf');
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
          <div>
             <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart4 className="w-6 h-6 text-indigo-600" />
                Reports & Business Intelligence
             </h2>
             <p className="text-xs text-slate-500 mt-1">Deep dive analytics and exportable insights</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
             <button onClick={() => setActiveTab('SALES')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'SALES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Sales</button>
             <button onClick={() => setActiveTab('INVENTORY')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'INVENTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Inventory</button>
             <button onClick={() => setActiveTab('VENDORS')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'VENDORS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Vendors</button>
             <button onClick={() => setActiveTab('BI')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'BI' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Sales BI</button>
             <button onClick={() => setActiveTab('DELIVERY')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'DELIVERY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Delivery</button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'SALES' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-96 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-slate-800 dark:text-white">Revenue Trend</h3>
                         <button onClick={downloadSalesReport} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded flex items-center gap-1 hover:bg-indigo-100"><Download className="w-3 h-3"/> PDF Report</button>
                      </div>
                      <div className="flex-1">
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesByMonth}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                               <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                               <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                               <RechartsTooltip formatter={(val: any) => `${currency}${Number(val).toLocaleString()}`} />
                               <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                            </AreaChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-96 flex flex-col">
                      <h3 className="font-bold text-slate-800 dark:text-white mb-4">Top Customers</h3>
                      <div className="flex-1">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomers} layout="vertical" margin={{left: 20}}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                               <XAxis type="number" hide />
                               <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 500}} />
                               <RechartsTooltip formatter={(val: any) => `${currency}${Number(val).toLocaleString()}`} cursor={{fill: 'transparent'}} />
                               <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} label={{position: 'right', fill: '#64748b', fontSize: 12}} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'INVENTORY' && (
             <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 lg:col-span-2 h-96 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="font-bold text-slate-800 dark:text-white">Stock Valuation by Category</h3>
                         <button onClick={downloadInventoryReport} className="text-xs bg-green-50 text-green-600 px-3 py-1 rounded flex items-center gap-1 hover:bg-green-100"><Download className="w-3 h-3"/> PDF Report</button>
                      </div>
                      <div className="flex-1">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={inventoryByType}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                               <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                               <RechartsTooltip formatter={(val: any) => `${currency}${Number(val).toLocaleString()}`} cursor={{fill: '#f1f5f9'}} />
                               <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 h-96 flex flex-col">
                      <h3 className="font-bold text-slate-800 dark:text-white mb-4">Inventory Ageing (Est)</h3>
                      <div className="flex-1 relative">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={stockAgeing} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {stockAgeing.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                               </Pie>
                               <RechartsTooltip />
                               <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                         </ResponsiveContainer>
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                               <p className="text-sm font-bold text-slate-800 dark:text-white">{inventory.length}</p>
                               <p className="text-[10px] text-slate-500 uppercase">Items</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'VENDORS' && (
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-6">Vendor Reliability Scorecard</h3>
                <div className="h-80">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vendorPerformance} layout="vertical" margin={{left: 40, right: 40}}>
                         <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                         <XAxis type="number" domain={[0, 100]} hide />
                         <YAxis dataKey="name" type="category" width={150} axisLine={false} tickLine={false} tick={{fontSize: 14, fontWeight: 500}} />
                         <RechartsTooltip cursor={{fill: 'transparent'}} />
                         <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={24} background={{ fill: '#f1f5f9' }}>
                            {vendorPerformance.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10b981' : entry.score > 60 ? '#f59e0b' : '#ef4444'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
          )}
          {activeTab === 'BI' && <SalesAnalytics orders={orders} currency={currency} />}
          {activeTab === 'DELIVERY' && <DeliveryAnalytics orders={orders} currency={currency} />}
       </div>
    </div>
  );
};

export default Reports;
