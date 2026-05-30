import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderProps {
  title: string;
}

const PlaceholderModule: React.FC<PlaceholderProps> = ({ title }) => {
  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
         <div className="flex justify-between items-center h-8">
            <div className="flex items-center gap-3">
               <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">{title}</span>
            </div>
         </div>
      </div>
      <div className="flex-1 overflow-auto p-5 flex items-center justify-center">
         <div className="text-center">
            <Construction className="w-12 h-12 text-[#8d99a6] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#1c2126] mb-1">Under Construction</h3>
            <p className="text-[13px] text-[#525c66]">The {title} module is currently being built.</p>
         </div>
      </div>
    </div>
  );
};

export default PlaceholderModule;
