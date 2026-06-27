interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type: string;
}

export default function Input({ type, placeholder, className, value, onChange, readOnly, ...props }: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      {...props}
    />
  );
}
