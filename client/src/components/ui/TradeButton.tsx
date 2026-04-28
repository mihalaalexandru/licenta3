import { HTMLMotionProps, motion } from 'framer-motion';

interface TradeButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'buy' | 'sell' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const TradeButton = ({ 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  className = '', 
  children, 
  ...props 
}: TradeButtonProps) => {
  const baseStyles = "font-bold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#2B3139] text-white hover:bg-[#3B434D]",
    buy: "bg-[#0ECB81] text-white hover:bg-[#0BA86A] shadow-[0_4px_16px_rgba(14,203,129,0.2)]",
    sell: "bg-[#F6465D] text-white hover:bg-[#D9384E] shadow-[0_4px_16px_rgba(246,70,93,0.2)]",
    ghost: "bg-transparent text-[#848E9C] hover:text-white hover:bg-[#2B3139]",
    outline: "bg-transparent border border-[#2B3139] text-[#848E9C] hover:text-white hover:border-[#3B82F6]"
  };

  const sizes = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-2.5 px-4 text-sm",
    lg: "py-4 px-6 text-base"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};