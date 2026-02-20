import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HallmarkOrdersTable } from './HallmarkOrdersTable';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import type { SavedOrder } from '../../backend';
import { useState } from 'react';

interface HallmarkOrdersGroupedByDateProps {
  orders: SavedOrder[];
  selectedOrderNos: string[];
  onSelectionChange: (orderNos: string[]) => void;
}

export function HallmarkOrdersGroupedByDate({
  orders,
  selectedOrderNos,
  onSelectionChange,
}: HallmarkOrdersGroupedByDateProps) {
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());

  // Group orders by date
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, SavedOrder[]>();

    for (const order of orders) {
      const date = getOrderTimestamp(order);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(order);
    }

    // Sort by date (most recent first)
    return Array.from(groups.entries()).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateB.getTime() - dateA.getTime();
    });
  }, [orders]);

  const toggleDate = (dateKey: string) => {
    setOpenDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groupedOrders.map(([dateKey, dateOrders]) => {
        const isOpen = openDates.has(dateKey);
        
        return (
          <Collapsible key={dateKey} open={isOpen} onOpenChange={() => toggleDate(dateKey)}>
            <Card className="card-glow-subtle">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      {dateKey}
                      <Badge variant="outline" className="ml-2 text-white">
                        {dateOrders.length} orders
                      </Badge>
                    </div>
                    <div className="text-sm font-normal text-muted-foreground">
                      Total Qty: {dateOrders.reduce((sum, o) => sum + Number(o.qty), 0)}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <HallmarkOrdersTable
                    orders={dateOrders}
                    selectedOrderNos={selectedOrderNos}
                    onSelectionChange={onSelectionChange}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
