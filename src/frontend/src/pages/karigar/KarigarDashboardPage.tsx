import { useMemo, useState } from 'react';
import { useGetActiveOrdersForKarigar, useListKarigarReference, useBulkMarkOrdersAsDelivered } from '../../hooks/useQueries';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { getKarigarColor } from '../../lib/karigars/getKarigarColor';
import { resolveKarigarName } from '../../lib/orders/resolveKarigarName';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PersistentOrder } from '../../backend';

export function KarigarDashboardPage() {
  const { data: orders = [], isLoading, error, refetch } = useGetActiveOrdersForKarigar();
  const { data: karigars = [] } = useListKarigarReference();
  const { data: userProfile } = useCurrentUser();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');

  const bulkMarkDeliveredMutation = useBulkMarkOrdersAsDelivered();

  // Get unique karigar IDs from orders
  const uniqueKarigarIds = useMemo(() => {
    const ids = new Set(orders.map((o) => o.karigarId));
    return Array.from(ids).filter((id) => id && id.trim() !== '');
  }, [orders]);

  // Filter orders by selected karigar tab
  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter((o) => o.karigarId === activeTab);
  }, [orders, activeTab]);

  const metrics = useMemo(() => deriveMetrics(filteredOrders), [filteredOrders]);

  const handleMarkAsDelivered = async () => {
    if (selectedOrders.length === 0) return;
    try {
      await bulkMarkDeliveredMutation.mutateAsync(selectedOrders);
      toast.success(`${selectedOrders.length} order(s) marked as delivered`);
      setSelectedOrders([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark orders as delivered');
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Karigar Dashboard</h1>
        <InlineErrorState
          title="Failed to load orders"
          message="Unable to fetch your orders from the backend."
          onRetry={() => refetch()}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Karigar Dashboard</h1>
          {userProfile && (
            <p className="text-muted-foreground mt-1">Welcome, {userProfile.name}</p>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card-violet">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="gradient-card-pink">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.totalQty}</div>
          </CardContent>
        </Card>

        <Card className="gradient-card-gold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.totalWeight.toFixed(2)}g</div>
          </CardContent>
        </Card>

        <Card className="gradient-card-green">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Customer Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics.customerOrdersCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="admin-tabs-list flex-wrap h-auto">
          <TabsTrigger value="all" className="admin-tabs-trigger">
            All Orders ({orders.length})
          </TabsTrigger>
          {uniqueKarigarIds.map((karigarId) => {
            const karigarName = resolveKarigarName(karigarId, karigars);
            const karigarOrders = orders.filter((o) => o.karigarId === karigarId);
            const colorClass = getKarigarColor(karigarName);
            
            return (
              <TabsTrigger
                key={karigarId}
                value={karigarId}
                className={`admin-tabs-trigger ${colorClass}`}
              >
                {karigarName} ({karigarOrders.length})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>
                {activeTab === 'all'
                  ? 'All Active Orders'
                  : `Orders for ${resolveKarigarName(activeTab, karigars)}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOrders.length > 0 && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleMarkAsDelivered}
                    disabled={bulkMarkDeliveredMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Delivered ({selectedOrders.length})
                  </Button>
                </div>
              )}
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No active orders found</div>
              ) : (
                <OrdersTable
                  orders={filteredOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
