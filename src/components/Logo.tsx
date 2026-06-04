import icon from '../../assets/icon.png';

interface LogoProps {
  size?: number;
  className?: string;
}

function Logo({ size = 48, className = '' }: LogoProps) {
  return (
    <img
      src={icon}
      alt="M-Society"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
      draggable={false}
    />
  );
}

export default Logo;
