import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Weight, Hash, ShoppingCart } from 'lucide-react';
import type { PersistentOrder } from '../../backend';

interface MetricsChartProps {
  orders: PersistentOrder[];
}

export function MetricsChart({ orders }: MetricsChartProps) {
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalQty = orders.reduce((sum, order) => sum + Number(order.qty), 0);
    const totalWeight = orders.reduce((sum, order) => sum + (order.weight || 0), 0);
    const customerOrders = orders.filter((order) => order.isCustomerOrder).length;

    return {
      totalOrders,
      totalQty,
      totalWeight: totalWeight.toFixed(2),
      customerOrders,
    };
  }, [orders]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card border-primary/20 card-glow-subtle">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Total Orders</CardTitle>
          <Package className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{metrics.totalOrders}</div>
          <p className="text-xs text-muted-foreground">Active orders in system</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-accent/20 card-glow-subtle">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Total Quantity</CardTitle>
          <Hash className="h-5 w-5 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{metrics.totalQty}</div>
          <p className="text-xs text-muted-foreground">Total pieces</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-secondary/20 card-glow-subtle">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Total Weight</CardTitle>
          <Weight className="h-5 w-5 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{metrics.totalWeight}g</div>
          <p className="text-xs text-muted-foreground">Combined weight</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-primary/20 card-glow-subtle">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Customer Orders</CardTitle>
          <ShoppingCart className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{metrics.customerOrders}</div>
          <p className="text-xs text-muted-foreground">Custom orders</p>
        </CardContent>
      </Card>
    </div>
  );
}
