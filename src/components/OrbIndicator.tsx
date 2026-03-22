import React from 'react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface OrbIndicatorProps {
  clicks: number;
  maxClicks: number;
}

const OrbIndicator: React.FC<OrbIndicatorProps> = ({ clicks, maxClicks }) => {
  // Balanced SaaS Sizing
  const minSize = 12;
  const maxSize = 38;
  
  const ratio = maxClicks > 0 ? (clicks / maxClicks) : 0;
  
  let tier: 'low' | 'medium' | 'high' = 'low';
  if (ratio > 0.6) tier = 'high';
  else if (ratio > 0.1) tier = 'medium';

  const scaledSize = Math.max(minSize, Math.floor(ratio * maxSize));

  return (
    <div className="flex items-center justify-center shrink-0 w-14 h-14 rounded-full bg-slate-50 border border-slate-100 shadow-inner relative group/orb">
      {/* Subtle Glow Overlay */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-opacity duration-300 opacity-20 group-hover/orb:opacity-30 blur-md",
        tier === 'high' && "bg-blue-300",
        tier === 'medium' && "bg-indigo-300",
        tier === 'low' && "bg-slate-200"
      )} />

      <div
        className={cn(
          "rounded-full transition-all duration-300 ease-in-out relative shadow-md overflow-hidden",
          // Clean SaaS Multi-tone Gradients
          tier === 'high' && "bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_4px_12px_rgba(59,130,246,0.3)]",
          tier === 'medium' && "bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-[0_4px_8px_rgba(129,140,248,0.2)]",
          tier === 'low' && "bg-gradient-to-br from-slate-400 to-slate-500"
        )}
        style={{ 
          width: `${scaledSize}px`, 
          height: `${scaledSize}px`,
        }}
      >
        {/* Subtle 3D Polish Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 pointer-events-none" />
        <div className="absolute top-1 left-1.5 w-1/4 h-1/4 bg-white/30 blur-[1px] rounded-full pointer-events-none" />
        
        {/* Inner Border */}
        <div className="absolute inset-0 rounded-full border border-white/10" />
      </div>
    </div>
  );
};

export default memo(OrbIndicator);
