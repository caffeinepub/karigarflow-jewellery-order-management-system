import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Package } from 'lucide-react';
import { useGetOrders, useBulkUpdateOrderStatus, useHandleHallmarkReturns } from '../../hooks/useQueries';
import { useOrdersCache } from '../../hooks/useOrdersCache';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { KarigarDrilldownExportBar } from '../../components/exports/KarigarDrilldownExportBar';
import { RbSuppliedQtyEditDialog } from '../../components/orders/RbSuppliedQtyEditDialog';
import { DesignImageViewerDialog } from '../../components/designImages/DesignImageViewerDialog';
import { OrdersDataWarningBanner } from '../../components/orders/OrdersDataWarningBanner';
import { TotalQtyBreakdownDialog } from '../../components/admin/TotalQtyBreakdownDialog';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { sanitizeOrders } from '../../lib/orders/validatePersistentOrder';
import type { PersistentOrder } from '../../backend';
import { Variant_update_status_return_hallmark } from '../../backend';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

type ActiveTab = 'delivered' | 'hallmark' | 'total' | 'co' | 'karigars';

export function AdminDashboardPage() {
  const { data: fetchedOrders, isLoading: fetchingOrders, isError, error } = useGetOrders();
  const { 
    orders: cachedOrders, 
    isLoading: loadingCache, 
    invalidOrdersSkippedCount,
    clearLocalOrdersCacheAndReload 
  } = useOrdersCache();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('total');
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isClearing, setIsClearing] = useState(false);
  const [totalQtyDialogOpen, setTotalQtyDialogOpen] = useState(false);
  
  // Get today's date for default filtering
  const today = new Date();
  
  // Filters state per tab - default to today's date
  const [deliveredFilters, setDeliveredFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: today, 
    dateTo: today, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  const [hallmarkFilters, setHallmarkFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: today, 
    dateTo: today, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  const [totalFilters, setTotalFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: today, 
    dateTo: today, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  const [coFilters, setCoFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: today, 
    dateTo: today, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  const [karigarFilters, setKarigarFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: today, 
    dateTo: today, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [editingRbOrder, setEditingRbOrder] = useState<PersistentOrder | null>(null);
  const [viewingDesignCode, setViewingDesignCode] = useState<string | null>(null);

  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const hallmarkMutation = useHandleHallmarkReturns();

  const combinedOrders = fetchedOrders || cachedOrders;
  const isLoading = fetchingOrders || loadingCache;

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedOrders(new Set());
    setSelectedKarigar(null);
  }, [activeTab]);

  const getActiveFilters = () => {
    switch (activeTab) {
      case 'delivered': return deliveredFilters;
      case 'hallmark': return hallmarkFilters;
      case 'total': return totalFilters;
      case 'co': return coFilters;
      case 'karigars': return karigarFilters;
      default: return totalFilters;
    }
  };

  const setActiveFilters = (filters: typeof totalFilters) => {
    switch (activeTab) {
      case 'delivered': setDeliveredFilters(filters); break;
      case 'hallmark': setHallmarkFilters(filters); break;
      case 'total': setTotalFilters(filters); break;
      case 'co': setCoFilters(filters); break;
      case 'karigars': setKarigarFilters(filters); break;
    }
  };

  const applyFilters = (orders: PersistentOrder[], filters: typeof totalFilters) => {
    const { validOrders } = sanitizeOrders(orders);
    
    return validOrders.filter(order => {
      const orderDate = getOrderTimestamp(order);
      const dateFrom = startOfDay(filters.dateFrom);
      const dateTo = endOfDay(filters.dateTo);
      
      const matchesDate = orderDate >= dateFrom && orderDate <= dateTo;
      const matchesKarigar = !filters.karigar || order.karigarName === filters.karigar;
      const matchesStatus = !filters.status || order.status === filters.status;
      const matchesOrderNo = !filters.orderNoQuery || 
        order.orderNo.toLowerCase().includes(filters.orderNoQuery.toLowerCase());
      
      // CO/RB filter logic
      let matchesOrderType = true;
      if (filters.coFilter && filters.rbFilter) {
        matchesOrderType = true; // Both selected = show all
      } else if (filters.coFilter) {
        matchesOrderType = order.orderType.toUpperCase().includes('CO');
      } else if (filters.rbFilter) {
        matchesOrderType = order.orderType.toUpperCase().includes('RB');
      }
      
      return matchesDate && matchesKarigar && matchesStatus && matchesOrderNo && matchesOrderType;
    });
  };

  // Filter orders based on active tab
  const getFilteredOrders = () => {
    if (!combinedOrders) return [];
    
    const filters = getActiveFilters();
    let baseOrders = combinedOrders;

    switch (activeTab) {
      case 'delivered':
        baseOrders = combinedOrders.filter(o => o.status === 'delivered');
        break;
      case 'hallmark':
        baseOrders = combinedOrders.filter(o => o.status === 'given_to_hallmark');
        break;
      case 'total':
        baseOrders = combinedOrders;
        break;
      case 'co':
        baseOrders = combinedOrders.filter(o => o.isCustomerOrder);
        break;
      case 'karigars':
        if (selectedKarigar) {
          baseOrders = combinedOrders.filter(o => o.karigarName === selectedKarigar);
        } else {
          baseOrders = [];
        }
        break;
    }

    return applyFilters(baseOrders, filters);
  };

  const filteredOrders = getFilteredOrders();
  const sortedOrders = sortOrdersDesignWise(filteredOrders);

  // Compute metrics for the currently visible filtered orders
  const metrics = deriveMetrics(filteredOrders);

  // Compute breakdown data for the dialog
  const getBreakdownData = () => {
    if (!combinedOrders) {
      return {
        delivered: 0,
        hallmark: 0,
        totalOrders: 0,
        customerOrders: 0,
        karigars: 0,
      };
    }

    const deliveredOrders = applyFilters(
      combinedOrders.filter(o => o.status === 'delivered'),
      deliveredFilters
    );
    const hallmarkOrders = applyFilters(
      combinedOrders.filter(o => o.status === 'given_to_hallmark'),
      hallmarkFilters
    );
    const totalOrdersFiltered = applyFilters(combinedOrders, totalFilters);
    const coOrdersFiltered = applyFilters(
      combinedOrders.filter(o => o.isCustomerOrder),
      coFilters
    );
    const karigarOrdersFiltered = selectedKarigar
      ? applyFilters(
          combinedOrders.filter(o => o.karigarName === selectedKarigar),
          karigarFilters
        )
      : [];

    return {
      delivered: deriveMetrics(deliveredOrders).totalQty,
      hallmark: deriveMetrics(hallmarkOrders).totalQty,
      totalOrders: deriveMetrics(totalOrdersFiltered).totalQty,
      customerOrders: deriveMetrics(coOrdersFiltered).totalQty,
      karigars: deriveMetrics(karigarOrdersFiltered).totalQty,
    };
  };

  const handleCancelDelivered = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select orders to cancel');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus: 'pending',
      });
      toast.success(`${selectedOrders.size} order(s) returned to active status`);
      setSelectedOrders(new Set());
    } catch (error: any) {
      console.error('Failed to cancel delivered orders:', error);
      toast.error(error?.message || 'Failed to cancel orders');
    }
  };

  const handleSendToHallmark = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select orders to send to hallmark');
      return;
    }

    try {
      await hallmarkMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        actionType: Variant_update_status_return_hallmark.update_status,
      });
      toast.success(`${selectedOrders.size} order(s) sent to hallmark`);
      setSelectedOrders(new Set());
    } catch (error: any) {
      console.error('Failed to send orders to hallmark:', error);
      toast.error(error?.message || 'Failed to send orders to hallmark');
    }
  };

  const handleReturnFromHallmark = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select orders to return from hallmark');
      return;
    }

    try {
      await hallmarkMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        actionType: Variant_update_status_return_hallmark.return_hallmark,
      });
      toast.success(`${selectedOrders.size} order(s) returned from hallmark`);
      setSelectedOrders(new Set());
    } catch (error: any) {
      console.error('Failed to return orders from hallmark:', error);
      toast.error(error?.message || 'Failed to return orders from hallmark');
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearLocalOrdersCacheAndReload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
      setIsClearing(false);
    }
  };

  if (isError) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Orders</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {invalidOrdersSkippedCount > 0 && (
        <OrdersDataWarningBanner
          skippedCount={invalidOrdersSkippedCount}
          onClearCache={handleClearCache}
          isClearing={isClearing}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage orders and track progress</p>
        </div>
        <ExportActions filteredOrders={filteredOrders} selectedDate={selectedDate} />
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={() => setTotalQtyDialogOpen(true)}
              title="View breakdown"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWeight.toFixed(2)}g</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="space-y-4">
        <TabsList className="admin-tabs-list">
          <TabsTrigger value="delivered" className="admin-tabs-trigger">
            Delivered
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tabs-trigger">
            Hallmark
          </TabsTrigger>
          <TabsTrigger value="total" className="admin-tabs-trigger">
            Total Orders
          </TabsTrigger>
          <TabsTrigger value="co" className="admin-tabs-trigger">
            Customer Orders
          </TabsTrigger>
          <TabsTrigger value="karigars" className="admin-tabs-trigger">
            Karigars
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivered" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Delivered Orders</CardTitle>
                  <CardDescription>Orders that have been delivered</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancelDelivered}
                    disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
                  >
                    {bulkUpdateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      `Cancel (${selectedOrders.size})`
                    )}
                  </Button>
                  <Button
                    onClick={handleSendToHallmark}
                    disabled={selectedOrders.size === 0 || hallmarkMutation.isPending}
                  >
                    {hallmarkMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      `Send to Hallmark (${selectedOrders.size})`
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={deliveredFilters}
                onFiltersChange={setDeliveredFilters}
                orders={combinedOrders || []}
              />
              <OrdersTable
                orders={sortedOrders}
                selectionMode
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
                onViewDesignImage={(order) => setViewingDesignCode(order.designCode)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Hallmark Orders</CardTitle>
                  <CardDescription>Orders sent to hallmark</CardDescription>
                </div>
                <Button
                  onClick={handleReturnFromHallmark}
                  disabled={selectedOrders.size === 0 || hallmarkMutation.isPending}
                >
                  {hallmarkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Returning...
                    </>
                  ) : (
                    `Return from Hallmark (${selectedOrders.size})`
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={hallmarkFilters}
                onFiltersChange={setHallmarkFilters}
                orders={combinedOrders || []}
              />
              <OrdersTable
                orders={sortedOrders}
                selectionMode
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
                onViewDesignImage={(order) => setViewingDesignCode(order.designCode)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>Complete order list</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={totalFilters}
                onFiltersChange={setTotalFilters}
                orders={combinedOrders || []}
              />
              <OrdersTable
                orders={sortedOrders}
                onEditRbSupplied={(order) => setEditingRbOrder(order)}
                onViewDesignImage={(order) => setViewingDesignCode(order.designCode)}
                allowRbEditStatuses={['pending']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="co" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <CardDescription>Orders marked as customer orders (CO)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={coFilters}
                onFiltersChange={setCoFilters}
                orders={combinedOrders || []}
              />
              <OrdersTable
                orders={sortedOrders}
                onViewDesignImage={(order) => setViewingDesignCode(order.designCode)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Karigar-wise Orders</CardTitle>
              <CardDescription>View orders by karigar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.keys(metrics.byKarigar).sort().map((karigarName) => {
                  const stat = metrics.byKarigar[karigarName];
                  return (
                    <Badge
                      key={karigarName}
                      variant={selectedKarigar === karigarName ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedKarigar(karigarName)}
                    >
                      {formatKarigarName(karigarName)} ({stat.totalOrders})
                    </Badge>
                  );
                })}
              </div>

              {selectedKarigar && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Orders for {formatKarigarName(selectedKarigar)}
                    </h3>
                    <KarigarDrilldownExportBar
                      allOrders={sortedOrders}
                      karigarName={selectedKarigar}
                      selectedDate={selectedDate}
                    />
                  </div>
                  <OrdersFiltersBar
                    filters={karigarFilters}
                    onFiltersChange={setKarigarFilters}
                    orders={combinedOrders || []}
                  />
                  <OrdersTable
                    orders={sortedOrders}
                    onViewDesignImage={(order) => setViewingDesignCode(order.designCode)}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingRbOrder && (
        <RbSuppliedQtyEditDialog
          open={!!editingRbOrder}
          onOpenChange={(open) => !open && setEditingRbOrder(null)}
          order={editingRbOrder}
        />
      )}

      {viewingDesignCode && (
        <DesignImageViewerDialog
          open={!!viewingDesignCode}
          onOpenChange={(open) => !open && setViewingDesignCode(null)}
          designCode={viewingDesignCode}
        />
      )}

      <TotalQtyBreakdownDialog
        open={totalQtyDialogOpen}
        onOpenChange={setTotalQtyDialogOpen}
        breakdownData={getBreakdownData()}
      />
    </div>
  );
}
