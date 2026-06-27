interface InputProps {
  type: string;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}

export default function Input({ type, placeholder, className, value, onChange, readOnly }: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
    />
  );
}
