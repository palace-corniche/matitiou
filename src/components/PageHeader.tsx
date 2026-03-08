import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  className?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  className,
  children
}) => {
  return (
    <div className={cn("border-b border-b-money-green/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto px-3 py-3 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-4 min-w-0">
            {Icon && (
              <div className="p-2 sm:p-3 bg-primary/15 rounded-lg shrink-0 money-glow">
                <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
            )}
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-3xl font-bold tracking-tight truncate gold-shimmer">{title}</h1>
                {badge && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {badge}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-muted-foreground text-xs sm:text-base max-w-3xl line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>
          {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
        </div>
      </div>
    </div>
  );
};
