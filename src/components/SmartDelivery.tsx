import React from 'react';
import { Truck } from 'lucide-react';

const SmartDelivery: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
    <Truck className="w-12 h-12 opacity-30" />
    <p className="text-sm font-medium">Smart Delivery</p>
    <p className="text-xs">This module is coming soon.</p>
  </div>
);

export default SmartDelivery;
