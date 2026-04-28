interface TradeToggleProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export const TradeToggle = ({ options, value, onChange }: TradeToggleProps) => {
  return (
    <div className="flex bg-[#0B0E11] rounded-lg p-1 border border-[#2B3139] w-full">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
            value === option ? 'bg-[#2B3139] text-white shadow-sm' : 'text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};