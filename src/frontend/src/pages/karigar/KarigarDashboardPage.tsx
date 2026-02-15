import { useMemo } from 'react';
import { useGetOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { Package, Weight, Hash } from 'lucide-react';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';

export function KarigarDashboardPage() {
  const { data: orders = [], isLoading, error, refetch } = useGetOrders();

  const metrics = useMemo(() => deriveMetrics(orders), [orders]);

  if (error) {
    return (
      <InlineErrorState
        title="Failed to load orders"
        message="Unable to fetch your assigned orders from the backend."
        onRetry={() => refetch()}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">View and update your assigned orders</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
                <Weight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalWeight.toFixed(2)}g</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalQty}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assigned Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={orders} showStatusUpdate />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
