import React from 'react';
import { ImageIcon, Package } from 'lucide-react';
import { Design, InventoryItem } from '../types';

interface ProductImageThumbProps {
  productName?: string;
  sku?: string;
  designs?: Design[];
  inventory?: InventoryItem[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const resolveProductImage = (
  productName = '',
  designs: Design[] = [],
  inventory: InventoryItem[] = [],
  sku = ''
) => {
  const normalizedName = productName.trim().toLowerCase();
  const normalizedSku = sku.trim().toLowerCase();

  const design = designs.find((item) => {
    const designName = item.name?.trim().toLowerCase() || '';
    const designSku = item.sku?.trim().toLowerCase() || '';
    return (designName && designName === normalizedName) ||
      (designSku && designSku === normalizedName) ||
      (normalizedSku && designSku === normalizedSku) ||
      (designName && normalizedName.includes(designName)) ||
      (designSku && normalizedName.includes(designSku));
  });

  if (design?.imageUrl) return design.imageUrl;

  const item = inventory.find((entry) => {
    const itemName = entry.name?.trim().toLowerCase() || '';
    return (itemName && itemName === normalizedName) || (itemName && normalizedName.includes(itemName));
  });

  return item?.imageUrl || '';
};

const sizeClass = {
  sm: 'w-9 h-9 rounded-lg',
  md: 'w-12 h-12 rounded-xl',
  lg: 'w-16 h-16 rounded-xl',
};

const iconClass = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

const ProductImageThumb: React.FC<ProductImageThumbProps> = ({
  productName = '',
  sku = '',
  designs = [],
  inventory = [],
  size = 'md',
  className = '',
}) => {
  const imageUrl = resolveProductImage(productName, designs, inventory, sku);

  return (
    <div className={`${sizeClass[size]} overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 ${className}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={productName || sku || 'Product'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
          {productName || sku ? <Package className={iconClass[size]} /> : <ImageIcon className={iconClass[size]} />}
        </div>
      )}
    </div>
  );
};

export default ProductImageThumb;
