import { useMemo, useState } from 'react';
import { useGetOrders, useGetCallerUserProfile, useBulkUpdateOrderStatus } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { Package, Weight, Hash, CheckCircle, AlertCircle } from 'lucide-react';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { toast } from 'sonner';

export function KarigarDashboardPage() {
  const { data: orders = [], isLoading: ordersLoading, error: ordersError, refetch } = useGetOrders();
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Filter out delivered orders from the default view
  const activeOrders = useMemo(() => 
    orders.filter(o => o.status !== 'delivered'),
    [orders]
  );

  const sortedOrders = useMemo(() => sortOrdersDesignWise(activeOrders), [activeOrders]);
  const metrics = useMemo(() => deriveMetrics(sortedOrders), [sortedOrders]);

  const handleBulkMarkAsDelivered = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus: 'delivered',
      });
      toast.success(`${selectedOrders.size} order(s) marked as delivered`);
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Failed to update orders:', error);
      toast.error('Failed to update order status');
    }
  };

  // Check if karigarName is missing
  if (!profileLoading && userProfile && !userProfile.karigarName) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">View and update your assigned orders</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription>
            Your profile is missing a Karigar name. Please contact your administrator to configure your account properly.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (ordersError) {
    return (
      <InlineErrorState
        title="Failed to load orders"
        message="Unable to fetch your assigned orders from the backend."
        onRetry={() => refetch()}
        error={ordersError}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="text-muted-foreground">View and update your assigned orders</p>
      </div>

      {ordersLoading ? (
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assigned Orders</CardTitle>
              {selectedOrders.size > 0 && (
                <Button 
                  onClick={handleBulkMarkAsDelivered}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark {selectedOrders.size} as Delivered
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {sortedOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active orders assigned to you</p>
                </div>
              ) : (
                <OrdersTable 
                  orders={sortedOrders}
                  selectionMode
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                  emptyMessage="No active orders assigned to you"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
