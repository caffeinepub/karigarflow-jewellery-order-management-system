import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import type { PersistentOrder } from '../../backend';

interface KarigarSummaryCardsProps {
  orders: PersistentOrder[];
  selectedKarigar: string | null;
  onSelectKarigar: (karigar: string) => void;
}

const CARD_COLORS = [
  'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background hover:from-emerald-100 dark:hover:from-emerald-950/30',
  'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background hover:from-amber-100 dark:hover:from-amber-950/30',
  'border-rose-200 dark:border-rose-800 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-background hover:from-rose-100 dark:hover:from-rose-950/30',
  'border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background hover:from-blue-100 dark:hover:from-blue-950/30',
  'border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-background hover:from-violet-100 dark:hover:from-violet-950/30',
  'border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background hover:from-orange-100 dark:hover:from-orange-950/30',
];

export function KarigarSummaryCards({ orders, selectedKarigar, onSelectKarigar }: KarigarSummaryCardsProps) {
  const karigarStats = useMemo(() => {
    const stats = new Map<string, { totalOrders: number; totalQty: number }>();
    
    orders.forEach(order => {
      const karigar = formatKarigarName(order.karigarId);
      if (karigar === 'Unassigned') return;
      
      const current = stats.get(karigar) || { totalOrders: 0, totalQty: 0 };
      stats.set(karigar, {
        totalOrders: current.totalOrders + 1,
        totalQty: current.totalQty + Number(order.qty),
      });
    });
    
    return Array.from(stats.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  if (karigarStats.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center space-y-2">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No karigars found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {karigarStats.map((stat, index) => {
        const colorClass = CARD_COLORS[index % CARD_COLORS.length];
        const isSelected = selectedKarigar === stat.name;
        
        return (
          <Card
            key={stat.name}
            className={`cursor-pointer transition-all ${colorClass} ${
              isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
            onClick={() => onSelectKarigar(stat.name)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-1" title={stat.name}>
                    {stat.name}
                  </h3>
                  {isSelected && (
                    <Badge variant="default" className="text-xs shrink-0">
                      Selected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Orders:</span>
                  <span className="font-medium">{stat.totalOrders}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Qty:</span>
                  <span className="font-medium">{stat.totalQty}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
