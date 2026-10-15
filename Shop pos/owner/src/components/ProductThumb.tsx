import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { PRODUCT_ICON_OPTIONS } from '../data/productIcons';

interface ProductThumbProps {
  iconType: string;
  name: string;
  category?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ProductThumb: React.FC<ProductThumbProps> = ({
  iconType,
  name,
  category: _category,
  color,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 rounded-lg text-xs',
    md: 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl text-sm',
    lg: 'w-24 h-24 rounded-2xl text-base',
    xl: 'w-28 h-28 sm:w-32 sm:h-32 rounded-2xl text-lg',
  }[size];

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[size];

  const isImage =
    !imageError &&
    Boolean(
      iconType &&
        (iconType.startsWith('data:image') ||
          iconType.startsWith('http://') ||
          iconType.startsWith('https://') ||
          iconType.startsWith('blob:') ||
          iconType.startsWith('/'))
    );

  if (isImage) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden border shadow-2xs shrink-0 select-none bg-slate-50 border-slate-200/80 ${sizeClasses} ${className}`}
        style={color ? { borderColor: `${color}40` } : undefined}
      >
        <img
          src={iconType}
          alt={name || 'Product'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  const iconDef = PRODUCT_ICON_OPTIONS.find(
    (item) => item.id.toLowerCase() === iconType?.toLowerCase()
  );

  const renderIcon = () => {
    if (iconDef) {
      const IconComp = iconDef.icon;
      return <IconComp className={iconSizes} style={{ color: color || iconDef.defaultColor }} />;
    }
    // Default icon or fallback character
    if (name) {
      return (
        <span
          className="font-black tracking-tight uppercase"
          style={{ color: color || '#475569' }}
        >
          {name.charAt(0)}
        </span>
      );
    }
    return <Package className={`${iconSizes} text-slate-500`} />;
  };

  const bgClass = iconDef?.defaultBg || 'bg-slate-50';
  const borderClass = iconDef?.defaultBorder || 'border-slate-200/80';

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border shadow-2xs shrink-0 select-none transition-transform ${sizeClasses} ${bgClass} ${borderClass} ${className}`}
      style={color ? { borderColor: `${color}50` } : undefined}
    >
      {renderIcon()}
    </div>
  );
};
