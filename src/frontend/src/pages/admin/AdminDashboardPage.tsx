import { useMemo, useState } from 'react';
import { useGetOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { CalendarIcon, Package, Weight, Hash, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';

export function AdminDashboardPage() {
  const { data: orders = [], isLoading, error, refetch } = useGetOrders();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const sortedOrders = useMemo(() => sortOrdersDesignWise(orders), [orders]);

  const metrics = useMemo(() => {
    const todayStart = new Date(selectedDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(selectedDate);
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = sortedOrders.filter((order) => {
      const uploadDate = new Date(Number(order.uploadDate) / 1000000);
      return uploadDate >= todayStart && uploadDate <= todayEnd;
    });

    return deriveMetrics(todayOrders);
  }, [sortedOrders, selectedDate]);

  if (error) {
    return (
      <InlineErrorState
        title="Failed to load orders"
        message="Unable to fetch orders from the backend. Please check your connection and try again."
        onRetry={() => refetch()}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of orders and operations</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">CO Orders</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.coOrders}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Karigar-wise Summary</CardTitle>
                <ExportActions orders={sortedOrders} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.karigarWise).map(([karigar, data]) => (
                  <div key={karigar} className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">{karigar}</span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Qty: {data.qty}</span>
                      <span>Weight: {data.weight.toFixed(2)}g</span>
                    </div>
                  </div>
                ))}
                {Object.keys(metrics.karigarWise).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No orders for selected date</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={sortedOrders} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
