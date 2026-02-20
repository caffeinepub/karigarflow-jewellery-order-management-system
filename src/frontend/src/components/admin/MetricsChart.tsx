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
      <Card className="gradient-card-violet text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-5 w-5 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalOrders}</div>
        </CardContent>
      </Card>

      <Card className="gradient-card-pink text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          <Hash className="h-5 w-5 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalQty}</div>
        </CardContent>
      </Card>

      <Card className="gradient-card-gold text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
          <Weight className="h-5 w-5 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.totalWeight}g</div>
        </CardContent>
      </Card>

      <Card className="gradient-card-green text-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Customer Orders</CardTitle>
          <ShoppingCart className="h-5 w-5 opacity-90" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{metrics.customerOrders}</div>
        </CardContent>
      </Card>
    </div>
  );
}
