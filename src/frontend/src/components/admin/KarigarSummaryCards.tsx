import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { getKarigarColor } from '../../lib/karigars/getKarigarColor';
import { resolveKarigarName } from '../../lib/orders/resolveKarigarName';
import { useListKarigarReference } from '../../hooks/useQueries';
import type { PersistentOrder } from '../../backend';

interface KarigarSummaryCardsProps {
  orders: PersistentOrder[];
  selectedKarigar: string | null;
  onKarigarSelect: (karigarId: string) => void;
  onKarigarDeselect: () => void;
}

export function KarigarSummaryCards({
  orders,
  selectedKarigar,
  onKarigarSelect,
  onKarigarDeselect,
}: KarigarSummaryCardsProps) {
  const { data: karigars = [] } = useListKarigarReference();

  const karigarSummary = useMemo(() => {
    const summary = new Map<string, { name: string; count: number; qty: number }>();

    orders.forEach((order) => {
      const karigarId = order.karigarId;
      const karigarName = resolveKarigarName(karigarId, karigars);

      if (!summary.has(karigarId)) {
        summary.set(karigarId, { name: karigarName, count: 0, qty: 0 });
      }

      const entry = summary.get(karigarId)!;
      entry.count += 1;
      entry.qty += Number(order.qty);
    });

    return Array.from(summary.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [orders, karigars]);

  if (karigarSummary.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No karigars found in current dataset</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {selectedKarigar && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Filtered by: {resolveKarigarName(selectedKarigar, karigars)}
          </h3>
          <Button variant="outline" size="sm" onClick={onKarigarDeselect} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filter
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {karigarSummary.map((karigar) => {
          const isSelected = selectedKarigar === karigar.id;
          const colorClasses = getKarigarColor(karigar.name);

          return (
            <Card
              key={karigar.id}
              className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
              onClick={() => onKarigarSelect(karigar.id)}
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground truncate">{karigar.name}</h4>
                    <Badge className={colorClasses.badge}>
                      {karigar.count}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{karigar.qty}</span> total qty
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
