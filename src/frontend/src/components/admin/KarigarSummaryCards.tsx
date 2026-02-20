import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, X } from 'lucide-react';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { getKarigarBadgeClasses } from '../../lib/karigars/getKarigarColor';
import type { PersistentOrder } from '../../backend';

interface KarigarSummaryCardsProps {
  orders: PersistentOrder[];
  selectedKarigar: string | null;
  onKarigarSelect: (karigar: string) => void;
  onKarigarDeselect: () => void;
}

export function KarigarSummaryCards({ orders, selectedKarigar, onKarigarSelect, onKarigarDeselect }: KarigarSummaryCardsProps) {
  const karigarStats = useMemo(() => {
    const stats = new Map<string, { totalOrders: number; totalQty: number; karigarId: string }>();
    
    orders.forEach(order => {
      const karigar = formatKarigarName(order.karigarId);
      if (karigar === 'Unassigned') return;
      
      const current = stats.get(order.karigarId) || { totalOrders: 0, totalQty: 0, karigarId: order.karigarId };
      stats.set(order.karigarId, {
        totalOrders: current.totalOrders + 1,
        totalQty: current.totalQty + Number(order.qty),
        karigarId: order.karigarId,
      });
    });
    
    return Array.from(stats.entries())
      .map(([karigarId, data]) => ({ 
        name: formatKarigarName(karigarId),
        totalOrders: data.totalOrders,
        totalQty: data.totalQty,
        karigarId: data.karigarId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  if (karigarStats.length === 0) {
    return (
      <Card className="border-dashed bg-card">
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
    <div className="space-y-3">
      {selectedKarigar && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <span className="text-sm font-medium text-foreground">
            Filtering by: <span className="font-bold">{formatKarigarName(selectedKarigar)}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={onKarigarDeselect} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filter
          </Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {karigarStats.map((stat) => {
          const badgeClass = getKarigarBadgeClasses(stat.name);
          const isSelected = selectedKarigar === stat.karigarId;
          
          return (
            <Card
              key={stat.karigarId}
              className={`cursor-pointer transition-all hover:shadow-lg bg-card card-glow-subtle ${
                isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
              onClick={() => onKarigarSelect(stat.karigarId)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className={`text-xs font-semibold ${badgeClass}`}>
                      {stat.name}
                    </Badge>
                    {isSelected && (
                      <Badge variant="default" className="text-xs shrink-0">
                        Selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Orders:</span>
                    <span className="font-medium text-foreground">{stat.totalOrders}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Qty:</span>
                    <span className="font-medium text-foreground">{stat.totalQty}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
