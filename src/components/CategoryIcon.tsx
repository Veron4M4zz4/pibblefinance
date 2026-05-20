/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Building2,
  CreditCard,
  Coins,
  PiggyBank,
  Utensils,
  Car,
  Sparkles,
  Heart,
  BookOpen,
  Home,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  Cpu,
  DollarSign,
  RefreshCw,
  Ellipsis,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Smartphone,
  Info
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Building2,
  CreditCard,
  Coins,
  PiggyBank,
  Utensils,
  Car,
  Sparkles,
  Heart,
  BookOpen,
  Home,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  Cpu,
  DollarSign,
  RefreshCw,
  Ellipsis,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Smartphone,
  Info
};

interface CategoryIconProps {
  name: string;
  size?: number;
  className?: string;
  fallback?: string;
}

export default function CategoryIcon({ name, size = 18, className = '', fallback = 'Ellipsis' }: CategoryIconProps) {
  const IconComponent = iconMap[name] || iconMap[fallback] || Ellipsis;
  return <IconComponent size={size} className={className} />;
}
