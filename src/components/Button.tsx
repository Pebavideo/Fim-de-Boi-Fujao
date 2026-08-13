interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className, type = 'button', style, ...props }: ButtonProps & { style?: any }) {
  const defaultStyle: React.CSSProperties = {
    minHeight: 48,
    minWidth: 48,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
  };

  const mergedStyle = { ...defaultStyle, ...style } as React.CSSProperties;
  const mergedClassName = ['btn-interativo', className].filter(Boolean).join(' ');

  return (
    <button type={type} className={mergedClassName} style={mergedStyle} {...props}>
      {children}
    </button>
  );
}
