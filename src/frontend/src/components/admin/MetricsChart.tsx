import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import type { PersistentOrder } from '../../backend';

interface MetricsChartProps {
  orders: PersistentOrder[];
}

export function MetricsChart({ orders }: MetricsChartProps) {
  const metrics = useMemo(() => deriveMetrics(orders), [orders]);

  const metricCards = [
    {
      title: 'Total Orders',
      value: metrics.totalOrders,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Quantity',
      value: metrics.totalQty,
      icon: TrendingUp,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Unique Karigars',
      value: metrics.uniqueKarigars,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Unique Designs',
      value: metrics.uniqueDesigns,
      icon: DollarSign,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric) => (
        <Card key={metric.title} className="bg-card border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
