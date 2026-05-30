import React, { useState, useMemo } from 'react';
import { 
  Truck, Plus, Search, Calendar, MapPin, CheckCircle, 
  Trash2, User, Phone, Clipboard, ArrowRight, DollarSign, ListTodo
} from 'lucide-react';
import { DispatchEntry, DispatchItem, DispatchMode, DispatchStatus, Order } from '../types';

interface DispatchPlannerProps {
  entries: DispatchEntry[];
  orders: Order[];
  onAddEntry: (entry: DispatchEntry) => void;
  onUpdateEntry: (entry: DispatchEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  currency?: string;
}

export const DispatchPlanner: React.FC<DispatchPlannerProps> = ({
  entries, orders, onAddEntry, onUpdateEntry, onDeleteEntry, currency = '₹'
}) => {
  const [currentTab, setCurrentTab] = useState<'DISPATCH_QUEUE' | 'WAY_BILL_LOGS'>('DISPATCH_QUEUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingDispatch, setIsCreatingDispatch] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Form State
  const [dispatchNo, setDispatchNo] = useState('');
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>('ROAD');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  
  // Logistics coordinates
  const [carrierName, setCarrierName] = useState('Gati Express Cargo');
  const [vehicleNo, setVehicleNo] = useState('DL-1Z-A-8842');
  const [driverName, setDriverName] = useState('Ramu Singh');
  const [driverPhone, setDriverPhone] = useState('+91 98765 43210');
  const [lrNumber, setLrNumber] = useState(''); // Lorry Receipt Number
  const [ewayBill, setEwayBill] = useState('');
  const [freightCost, setFreightCost] = useState<number>(3500);

  // Selection state for packing items
  const [parcelWeight, setParcelWeight] = useState<number>(120); // total dispatch weight in KG
  const [remarks, setRemarks] = useState('');

  // Active orders available for dispatch
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status?.toUpperCase() !== 'DELIVERED');
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Filters
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const q = searchQuery.toLowerCase();
      return e.dispatchNumber?.toLowerCase().includes(q) || 
             e.mode?.toLowerCase().includes(q) ||
             e.status?.toLowerCase().includes(q) ||
             e.carrierName?.toLowerCase().includes(q);
    });
  }, [entries, searchQuery]);

  const handleCreateDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchNo) return;

    // Load dispatch cargo items from the selected sales order
    const cargoItems: DispatchItem[] = selectedOrder ? selectedOrder.items.map(item => ({
      orderId: selectedOrder.id,
      orderNumber: selectedOrder.id,
      customerName: selectedOrder.customerName,
      productName: item.productName,
      qty: item.quantity,
      unit: item.unit || 'PIECE',
      packed: true
    })) : [];

    const totalQty = cargoItems.reduce((acc, curr) => acc + curr.qty, 0);

    const key = `DISP-${Date.now()}`;
    const preparedEntry: DispatchEntry = {
      id: key,
      dispatchNumber: dispatchNo,
      date: new Date().toISOString().split('T')[0],
      mode: dispatchMode,
      status: 'PENDING',
      items: cargoItems,
      totalQty,
      totalWeight: Number(parcelWeight),
      totalValue: selectedOrder ? selectedOrder.totalAmount : 0,
      carrierName,
      vehicleNumber: vehicleNo,
      driverName,
      driverPhone,
      lrNumber: lrNumber || `LR-${Math.floor(Math.random() * 900000) + 100000}`,
      ewayBillNumber: ewayBill || `EWAY-${Math.floor(Math.random() * 90000000000) + 10000000000}`,
      freightCost: Number(freightCost),
      remarks,
      trackingEvents: [
        { timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16), location: 'Workshop Loading Dock', status: 'Waybill Generated & Packed' }
      ]
    };

    onAddEntry(preparedEntry);
    setIsCreatingDispatch(false);
    setDispatchNo('');
    setLrNumber('');
    setEwayBill('');
    setSelectedOrderId('');
    setBannerMsg(`Logistic Waybill generated successfully! Number: ${preparedEntry.dispatchNumber}. E-Way Bill and LR Tracking are now active!`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const handleUpdateStatusAndLog = (entryId: string, targetStatus: DispatchStatus) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const currentLoc = targetStatus === 'DISPATCHED' ? 'In-transit Highway Border' : 'Destination Warehouse Dock';
    const newEvent = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      location: currentLoc,
      status: `Parcel advanced to: ${targetStatus}`
    };

    onUpdateEntry({
      ...entry,
      status: targetStatus,
      trackingEvents: [...(entry.trackingEvents || []), newEvent]
    });

    setBannerMsg(`Apparel shipment ${entry.dispatchNumber} state successfully set to ${targetStatus}!`);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden text-left">
      
      {/* HEADER ACTION BAR */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Apparel Dispatch & Logistics</span>
              <span className="text-xs text-cyan-600 bg-cyan-50 px-2.5 py-0.5 rounded-full font-bold border border-cyan-200">ERP Logistics</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium font-sans">Organize outbound freight loads, Lorry Receipts, driver credentials, and E-Way bill audits.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCreatingDispatch(true)}
              className="bg-[#0891b2] hover:bg-cyan-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Settle Ship Note / Loading Chute
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mt-4 border-t border-slate-100 pt-3 text-xs">
          <button 
            onClick={() => setCurrentTab('DISPATCH_QUEUE')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${currentTab === 'DISPATCH_QUEUE' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Logistic Deliveries Queue
          </button>
          <button 
            onClick={() => setCurrentTab('WAY_BILL_LOGS')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${currentTab === 'WAY_BILL_LOGS' ? 'border-[#0891b2] text-[#0891b2]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Sourced Waybills & Trip Logs
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto space-y-6">

        {bannerMsg && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2 font-bold animate-pulse">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
        )}

        {/* METRIC SUMMARIES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-semibold">
          <div className="bg-white border border-[#d1d8dd] p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Outbound Deliveries</p>
              <p className="text-xl font-black text-cyan-600 block mt-0.5">{entries.length} Settle orders</p>
            </div>
          </div>

          <div className="bg-white border border-[#d1d8dd] p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Outstanding Order Queues</p>
              <p className="text-xl font-black text-blue-600 block mt-0.5">{pendingOrders.length} pending</p>
            </div>
          </div>

          <div className="bg-white border border-[#d1d8dd] p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase">Freight Toll Pool</p>
              <p className="text-xl font-black text-emerald-600 block mt-0.5">{currency}{entries.reduce((acc, c) => acc + (c.freightCost || 0), 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 1. DISPATCH QUEUE TAB */}
        {currentTab === 'DISPATCH_QUEUE' && (
          <div className="space-y-6">
            
            {/* Search Filters */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl p-4 text-xs">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by waybill, shipping driver, LR notes reference..."
                  className="w-full pl-9 pr-4 py-2 border border-[#d1d8dd] rounded-lg bg-[#fafbfb] focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* List Table of Logistics */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl overflow-hidden shadow-macos-sm">
              <table className="w-full text-xs text-left divide-y divide-[#d1d8dd]">
                <thead className="bg-[#f8fafc] text-slate-600 font-bold uppercase select-none">
                  <tr>
                    <th className="px-5 py-3">Logistics Ref</th>
                    <th className="px-5 py-3">Carrier / Registration</th>
                    <th className="px-5 py-3">Driver Profile</th>
                    <th className="px-5 py-3 text-right">Cargo Volume</th>
                    <th className="px-5 py-3 text-right">Freight Charges</th>
                    <th className="px-5 py-3">E-Way Credentials</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredEntries.length > 0 ? (
                    filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-all">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-slate-900">{entry.dispatchNumber}</p>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 mt-1">MODE: {entry.mode}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-bold text-slate-800">{entry.carrierName || 'Self pickup'}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">VEHICLE: {entry.vehicleNumber || 'No entry'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold">
                          {entry.driverName ? (
                            <div>
                              <p className="text-slate-800 flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {entry.driverName}
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {entry.driverPhone}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">Owner transport</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div>
                            <p className="font-black text-slate-850">{entry.totalQty} items</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">WT: {entry.totalWeight || 0} Kg</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-600">
                          {currency}{(entry.freightCost || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          <div>
                            <p className="text-[10px] font-mono bg-[#f4f5f6] px-1 rounded block w-fit truncate max-w-[130px]">EWAY: {entry.ewayBillNumber}</p>
                            <p className="text-[10px] font-mono mt-1 text-slate-400 truncate max-w-[130px]">LR#: {entry.lrNumber}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            entry.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border border-green-200' :
                            entry.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            {entry.status === 'PENDING' && (
                              <button 
                                onClick={() => handleUpdateStatusAndLog(entry.id, 'DISPATCHED')}
                                className="h-6 px-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded flex items-center gap-1 transition-all"
                              >
                                Ship Note Out
                              </button>
                            )}
                            {entry.status === 'DISPATCHED' && (
                              <button 
                                onClick={() => handleUpdateStatusAndLog(entry.id, 'DELIVERED')}
                                className="h-6 px-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded flex items-center gap-1 transition-all"
                              >
                                Delivered Done
                              </button>
                            )}
                            <button 
                              onClick={() => onDeleteEntry(entry.id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                        <Truck className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                        No logistics logs compiled on active routing directories.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* 2. TRACKING AND STATUS WAYBILLS */}
        {currentTab === 'WAY_BILL_LOGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            
            {/* Settle timeline list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-[#d1d8dd] rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-sm text-[#1c2126] border-b pb-1.5">Outbound Highway Tracking logs</h4>
                
                <div className="space-y-4 pt-1">
                  {entries.map(entry => (
                    <div key={entry.id} className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
                      <div className="flex justify-between items-center bg-white p-2 border rounded border-slate-100 flex-wrap gap-2">
                        <div>
                          <span className="font-black text-slate-800 text-xs">{entry.dispatchNumber}</span>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">CARRIER: {entry.carrierName}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700">VEHICLE: {entry.vehicleNumber}</span>
                      </div>

                      {/* Timeline Events */}
                      <div className="pl-4 border-l border-indigo-200 ml-1 space-y-2 pt-1 font-semibold text-xs text-slate-700">
                        {(entry.trackingEvents || []).map((ev, idx) => (
                          <div key={idx} className="relative">
                            <div className="absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white" />
                            <p className="text-[11px] text-slate-400 font-mono">{ev.timestamp}</p>
                            <p className="font-bold text-slate-800 mt-0.5">{ev.status}</p>
                            <p className="text-slate-500 italic mt-0.5">Location: {ev.location}</p>
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="space-y-4">
              <div className="bg-[#ecfdf5] border border-emerald-250 p-5 rounded-xl text-emerald-900 space-y-3">
                <h5 className="font-bold text-[13px] flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  E-Way Logistics Compliances
                </h5>
                <p className="leading-relaxed text-[11px]">
                  Apparel consignments exceeding threshold limits demand valid electronic registry waybills (**E-Way Bills**). When generating dispatches under TexFlow ERP, we automatically construct a 12-digit mock code linked to the Lorry Receipt (LR) for state checkpost audits.
                </p>
                <div className="bg-white/70 p-3 rounded border border-emerald-100 text-slate-700 text-[11px] font-medium space-y-1">
                  <p className="font-bold text-[#0f5132]">E-Way Bill Status Codes:</p>
                  <p>● **GEN**: Waybill registered on portal</p>
                  <p>● **ACT**: Consignment in active journey</p>
                  <p>● **CLR**: Consignment cleared checkpost</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* CREATE SHIPMENT LOAD CHUTE MODAL */}
      {isCreatingDispatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-xs font-sans">
          <div className="bg-white rounded-xl border border-[#d1d8dd] max-w-lg w-full overflow-hidden shadow-macos-lg text-left">
            <div className="p-4 border-b border-[#eef1f4] flex justify-between items-center bg-[#fafbfc]">
              <span className="font-bold text-[14px]">Generate Logistics Note / Waybill</span>
              <button onClick={() => setIsCreatingDispatch(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatchSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Dispatch Number <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={dispatchNo}
                    onChange={e => setDispatchNo(e.target.value)}
                    placeholder="e.g. DISP-2026-MAY-04"
                    required
                    className="p-2 border border-[#d1d8dd] rounded-lg tracking-wide font-bold"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Logistic Transit Mode</label>
                  <select 
                    value={dispatchMode}
                    onChange={e => setDispatchMode(e.target.value as DispatchMode)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none font-bold"
                  >
                    <option value="ROAD">Road Freight (Truck/Lorry)</option>
                    <option value="RAIL">Rail Cargo</option>
                    <option value="COURIER">Express Courier</option>
                    <option value="AIR">Air Cargo</option>
                    <option value="HAND_DELIVERY">Hand Delivery</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Outbound Sales Order Reference</label>
                  <select 
                    value={selectedOrderId}
                    onChange={e => setSelectedOrderId(e.target.value)}
                    required
                    className="p-2.5 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="">Select outstanding Sales order...</option>
                    {pendingOrders.map(o => (
                      <option key={o.id} value={o.id}>{o.id} — {o.customerName} ({currency}{o.totalAmount.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Carrier Logistics Name</label>
                  <input 
                    type="text" 
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                    placeholder="e.g. Gati Transport Corporation"
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Vehicle Registration Number</label>
                  <input 
                    type="text" 
                    value={vehicleNo}
                    onChange={e => setVehicleNo(e.target.value)}
                    placeholder="e.g. DL-1Z-A-8842"
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Driver in Charge Name</label>
                  <input 
                    type="text" 
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="e.g. Ramu Singh"
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Driver Phone Number</label>
                  <input 
                    type="text" 
                    value={driverPhone}
                    onChange={e => setDriverPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">E-Way Bill (Optional override)</label>
                  <input 
                    type="text"
                    value={ewayBill}
                    onChange={e => setEwayBill(e.target.value)}
                    placeholder="Auto-generates if empty"
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Lorry Receipt Number (LR#)</label>
                  <input 
                    type="text"
                    value={lrNumber}
                    onChange={e => setLrNumber(e.target.value)}
                    placeholder="Auto-generates if empty"
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700 font-sans text-xs">Consignment Total Weight (Kg)</label>
                  <input 
                    type="number"
                    value={parcelWeight}
                    onChange={e => setParcelWeight(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700 font-sans text-xs">Freight Quoted Cost ({currency})</label>
                  <input 
                    type="number"
                    value={freightCost}
                    onChange={e => setFreightCost(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#eef1f4]">
                <button 
                  type="button" 
                  onClick={() => setIsCreatingDispatch(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Confirm Shipment & Packing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
