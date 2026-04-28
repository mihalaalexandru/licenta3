import { InputHTMLAttributes, ReactNode } from 'react';

interface TradeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: ReactNode;
}

export const TradeInput = ({ label, suffix, className = '', ...props }: TradeInputProps) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-semibold text-[#848E9C]">{label}</label>}
      <div className="flex items-center bg-[#0B0E11] border border-[#2B3139] focus-within:border-[#3B82F6] rounded-lg px-4 py-3 transition-colors">
        <input
          className={`flex-1 bg-transparent border-none text-white font-medium outline-none ${className}`}
          {...props}
        />
        {suffix && <span className="text-[#848E9C] text-sm ml-2 font-semibold">{suffix}</span>}
      </div>
    </div>
  );
};