import React from 'react';

const TacticalPanel = ({ title, children, icon: Icon, extra, className = "", headerStyle = "default" }) => (
  <div className={`bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl overflow-hidden flex flex-col ${className}`}>
    <div className={`h-12 border-b border-slate-100 px-6 flex items-center justify-between shrink-0 ${headerStyle === 'alert' ? 'bg-red-50' : 'bg-slate-50/50'}`}>
      <div className="flex items-center gap-3">
        {Icon && <Icon className={`w-4 h-4 ${headerStyle === 'alert' ? 'text-rose-500' : 'text-[#7C3AED]'}`} />}
        <h3 className="text-[18px] bold font-black uppercase tracking-[0.2em] text-[#1A1A2E]">{title}</h3>
      </div>
      {extra}
    </div>
    <div className="flex-grow overflow-hidden relative">
      {children}
    </div>
  </div>
);

export default TacticalPanel;
