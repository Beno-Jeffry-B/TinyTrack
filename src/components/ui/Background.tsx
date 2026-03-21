import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedDonutProps {
  size: number;
  opacity: number;
  duration: number;
  color: string;
  blur: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AnimatedDonut = ({
  size, opacity, duration, color, blur, className, style
}: AnimatedDonutProps) => {
  return (
    <motion.div
      className={cn("absolute pointer-events-none z-0 mix-blend-multiply dark:mix-blend-screen overflow-visible will-change-transform rounded-full", className)}
      style={{ 
        width: size, 
        height: size, 
        background: `radial-gradient(circle at 35% 35%, ${color}60 0%, ${color}10 60%, transparent 100%)`,
        opacity,
        boxShadow: `
          inset 0 10px 20px rgba(0,0,0,0.15), 
          inset 0 -10px 20px rgba(255,255,255,0.1),
          0 20px 40px ${color}40
        `,
        filter: blur ? `blur(${blur}px)` : undefined,
        ...style 
      }}
      animate={{
        rotate: [0, 360],
        x: [0, 40, -20, 0],
        y: [0, -40, 30, 0],
        scale: [1, 1.05, 0.95, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

export const Background = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50/50 dark:bg-[#0b1220]" aria-hidden>
    {/* Colorful radial gradients / soft blobs */}
    <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-pink-400/30 dark:bg-pink-600/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
    <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] rounded-full bg-blue-400/30 dark:bg-blue-600/10 blur-[140px] mix-blend-multiply dark:mix-blend-screen" />
    <div className="absolute top-[20%] right-[10%] w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full bg-purple-400/30 dark:bg-purple-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
    
    {/* Animated 3D Orbs */}
    <AnimatedDonut
      size={480} blur={50} opacity={0.35} duration={18} color="#3b82f6"
      style={{ top: '-10%', left: '-5%' }}
    />
    <AnimatedDonut
      size={360} blur={30} opacity={0.25} duration={16} color="#6366f1"
      style={{ bottom: '-10%', right: '-5%' }}
    />
    <AnimatedDonut
      size={220} blur={15} opacity={0.25} duration={14} color="#8b5cf6"
      style={{ top: '40%', right: '5%' }}
    />
    <AnimatedDonut
      size={140} blur={8} opacity={0.3} duration={12} color="#3b82f6"
      style={{ bottom: '25%', left: '8%' }}
    />
  </div>
);
