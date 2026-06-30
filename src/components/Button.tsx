interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  );
}
