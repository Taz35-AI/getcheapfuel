import { getBrandLogo } from '@/lib/brand-logos';

interface Props {
  brand: string | undefined;
  size?: number;
  className?: string;
}

export default function BrandLogo({ brand, size = 28, className = '' }: Props) {
  const logo = getBrandLogo(brand);
  return (
    <div
      className={`flex-shrink-0 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={logo.src}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
