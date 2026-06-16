import React from 'react';
import { Truck, Clock, MapPin, Package, CheckCircle2 } from 'lucide-react';

interface SmartDeliveryProps {
  [key: string]: any;
}

const SmartDelivery: React.FC<SmartDeliveryProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center">
        <Truck className="w-8 h-8 text-sky-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Smart Delivery</h2>
      <p className="text-slate-500 max-w-sm text-sm">
        AI-assisted delivery route optimisation and real-time dispatch tracking. Coming soon.
      </p>
      <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-sm">
        {[
          { icon: MapPin, label: 'Route Optimisation' },
          { icon: Clock, label: 'ETA Prediction' },
          { icon: CheckCircle2, label: 'Proof of Delivery' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Icon className="w-5 h-5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartDelivery;
