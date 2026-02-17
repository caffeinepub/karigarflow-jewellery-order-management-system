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
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('delivered');
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
  const [deliveredSelectedOrders, setDeliveredSelectedOrders] = useState<Set<string>>(new Set());
  const [hallmarkSelectedOrders, setHallmarkSelectedOrders] = useState<Set<string>>(new Set());
  const [rbEditOrder, setRbEditOrder] = useState<PersistentOrder | null>(null);
  const [imageViewerDesignCode, setImageViewerDesignCode] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const hallmarkReturnMutation = useHandleHallmarkReturns();

  const isLoading = fetchingOrders || loadingCache;
  
  // Sanitize orders as a last line of defense
  const rawOrders = fetchedOrders || cachedOrders || [];
  const { validOrders: orders } = sanitizeOrders(rawOrders);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearLocalOrdersCacheAndReload();
      toast.success('Local cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear local cache');
    } finally {
      setIsClearing(false);
    }
  };

  const applyFilters = (ordersList: PersistentOrder[], filters: typeof totalFilters) => {
    return ordersList.filter(order => {
      if (filters.karigar && formatKarigarName(order.karigarName) !== filters.karigar) {
        return false;
      }
      if (filters.status && order.status !== filters.status) {
        return false;
      }
      if (filters.orderNoQuery && !order.orderNo.toLowerCase().includes(filters.orderNoQuery.toLowerCase())) {
        return false;
      }
      
      // Separate CO and RB filters with strict equality
      if (filters.coFilter && filters.rbFilter) {
        // Both enabled: show both CO and RB
        if (order.orderType !== 'CO' && order.orderType !== 'RB') {
          return false;
        }
      } else if (filters.coFilter) {
        // Only CO enabled: show only CO
        if (order.orderType !== 'CO') {
          return false;
        }
      } else if (filters.rbFilter) {
        // Only RB enabled: show only RB
        if (order.orderType !== 'RB') {
          return false;
        }
      }
      // If neither enabled, show all order types
      
      if (filters.dateFrom || filters.dateTo) {
        const orderDate = getOrderTimestamp(order);
        if (filters.dateFrom && orderDate < startOfDay(filters.dateFrom)) {
          return false;
        }
        if (filters.dateTo && orderDate > endOfDay(filters.dateTo)) {
          return false;
        }
      }
      return true;
    });
  };

  // Base datasets for each tab (before applying filters) - strictly segregated
  const deliveredBaseOrders = orders.filter(o => o.status === 'delivered');
  const hallmarkBaseOrders = orders.filter(o => o.status === 'given_to_hallmark');
  const totalBaseOrders = orders.filter(o => o.status !== 'given_to_hallmark' && o.status !== 'delivered');
  const customerBaseOrders = orders.filter(o => o.isCustomerOrder && o.status !== 'given_to_hallmark' && o.status !== 'delivered');
  const karigarBaseOrders = orders.filter(o => o.status !== 'given_to_hallmark' && o.status !== 'delivered');

  // Apply filters to each tab's base dataset
  const deliveredOrders = applyFilters(deliveredBaseOrders, deliveredFilters);
  const hallmarkOrders = applyFilters(hallmarkBaseOrders, hallmarkFilters);
  const totalOrders = applyFilters(totalBaseOrders, totalFilters);
  const customerOrders = applyFilters(customerBaseOrders, coFilters);
  const filteredKarigarOrders = applyFilters(karigarBaseOrders, karigarFilters);

  // Compute metrics from the active tab's filtered dataset
  const getActiveTabDataset = () => {
    switch (activeTab) {
      case 'delivered':
        return deliveredOrders;
      case 'hallmark':
        return hallmarkOrders;
      case 'total':
        return totalOrders;
      case 'co':
        return customerOrders;
      case 'karigars':
        return filteredKarigarOrders;
      default:
        return deliveredOrders;
    }
  };

  const activeTabDataset = getActiveTabDataset();
  const metrics = deriveMetrics(activeTabDataset);
  const karigarNames = Object.keys(metrics.byKarigar).sort();

  // Compute total qty breakdown for dialog - from visible filtered orders
  const totalQtyBreakdown = {
    delivered: deliveredOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    hallmark: hallmarkOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    totalOrders: totalOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    customerOrders: customerOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    karigars: filteredKarigarOrders.reduce((sum, o) => sum + Number(o.qty), 0),
  };

  const handleViewDesignImage = (order: PersistentOrder) => {
    setImageViewerDesignCode(order.designCode);
    setImageViewerOpen(true);
  };

  const handleEditRbSupplied = (order: PersistentOrder) => {
    setRbEditOrder(order);
  };

  const handleGiveToHallmark = async () => {
    if (selectedOrders.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus: 'given_to_hallmark',
      });
      toast.success(`${selectedOrders.size} orders marked as given to hallmark`);
      setSelectedOrders(new Set());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update orders';
      toast.error(errorMsg);
    }
  };

  const handleDeliveredGiveToHallmark = async () => {
    if (deliveredSelectedOrders.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(deliveredSelectedOrders),
        newStatus: 'given_to_hallmark',
      });
      toast.success(`${deliveredSelectedOrders.size} orders marked as given to hallmark`);
      setDeliveredSelectedOrders(new Set());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update orders';
      toast.error(errorMsg);
    }
  };

  const handleCancelDelivered = async () => {
    if (deliveredSelectedOrders.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(deliveredSelectedOrders),
        newStatus: 'pending',
        isReturnedFromDelivered: true,
      });
      toast.success(`${deliveredSelectedOrders.size} orders cancelled and returned to active`);
      setDeliveredSelectedOrders(new Set());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to cancel orders';
      toast.error(errorMsg);
    }
  };

  const handleMarkAsReturned = async () => {
    if (hallmarkSelectedOrders.size === 0) return;

    try {
      await hallmarkReturnMutation.mutateAsync({
        orderNos: Array.from(hallmarkSelectedOrders),
        actionType: 'return_hallmark' as any,
      });
      toast.success(`${hallmarkSelectedOrders.size} orders returned from hallmark`);
      setHallmarkSelectedOrders(new Set());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to return orders';
      toast.error(errorMsg);
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading orders: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (selectedKarigar) {
    const karigarOrders = filteredKarigarOrders.filter(o => formatKarigarName(o.karigarName) === selectedKarigar);
    const sortedKarigarOrders = sortOrdersDesignWise(karigarOrders);

    return (
      <div className="space-y-6">
        <OrdersDataWarningBanner 
          skippedCount={invalidOrdersSkippedCount} 
          onClearCache={handleClearCache}
          isClearing={isClearing}
        />
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders for {selectedKarigar}</h1>
            <p className="text-muted-foreground mt-1">{sortedKarigarOrders.length} active orders</p>
          </div>
          <Button variant="outline" onClick={() => setSelectedKarigar(null)}>
            Back to Dashboard
          </Button>
        </div>

        <KarigarDrilldownExportBar 
          karigarName={selectedKarigar} 
          allOrders={sortedKarigarOrders}
          selectedDate={selectedDate}
        />

        <Card>
          <CardContent className="pt-6">
            <OrdersTable 
              orders={sortedKarigarOrders} 
              onEditRbSupplied={handleEditRbSupplied}
              onViewDesignImage={handleViewDesignImage}
            />
          </CardContent>
        </Card>

        {rbEditOrder && (
          <RbSuppliedQtyEditDialog
            order={rbEditOrder}
            open={true}
            onOpenChange={(open) => !open && setRbEditOrder(null)}
          />
        )}

        <DesignImageViewerDialog
          designCode={imageViewerDesignCode}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OrdersDataWarningBanner 
        skippedCount={invalidOrdersSkippedCount} 
        onClearCache={handleClearCache}
        isClearing={isClearing}
      />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <ExportActions filteredOrders={orders} selectedDate={selectedDate} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Orders in View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Customer Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{metrics.customerOrdersCount}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">Active Karigars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-300">{karigarNames.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
              {metrics.totalWeight.toFixed(2)}g
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-l-4 border-l-pink-500 bg-gradient-to-br from-pink-50/50 to-transparent dark:from-pink-950/20 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setTotalQtyDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pink-700 dark:text-pink-400 flex items-center gap-1">
              <Package className="h-4 w-4" />
              Total Qty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-900 dark:text-pink-300">
              {metrics.totalQty}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="admin-tabs-list grid w-full grid-cols-5">
          <TabsTrigger value="delivered" className="admin-tab-trigger">Delivered</TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tab-trigger">Hallmark</TabsTrigger>
          <TabsTrigger value="total" className="admin-tab-trigger">Total Orders</TabsTrigger>
          <TabsTrigger value="co" className="admin-tab-trigger">Customer Orders</TabsTrigger>
          <TabsTrigger value="karigars" className="admin-tab-trigger">Karigars</TabsTrigger>
        </TabsList>

        <TabsContent value="delivered" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Orders</CardTitle>
              <CardDescription>{deliveredOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={deliveredBaseOrders}
                filters={deliveredFilters}
                onFiltersChange={setDeliveredFilters}
                showOrderNoSearch
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleDeliveredGiveToHallmark}
                  disabled={deliveredSelectedOrders.size === 0 || bulkUpdateMutation.isPending}
                >
                  {bulkUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Give to Hallmark (${deliveredSelectedOrders.size})`
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelDelivered}
                  disabled={deliveredSelectedOrders.size === 0 || bulkUpdateMutation.isPending}
                >
                  {bulkUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Cancel (${deliveredSelectedOrders.size})`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeliveredSelectedOrders(new Set())}
                  disabled={deliveredSelectedOrders.size === 0}
                >
                  Clear Selection
                </Button>
              </div>
              <OrdersTable
                orders={sortOrdersDesignWise(deliveredOrders)}
                selectionMode
                selectedOrders={deliveredSelectedOrders}
                onSelectionChange={setDeliveredSelectedOrders}
                onViewDesignImage={handleViewDesignImage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hallmark Orders</CardTitle>
              <CardDescription>{hallmarkOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={hallmarkBaseOrders}
                filters={hallmarkFilters}
                onFiltersChange={setHallmarkFilters}
                showOrderNoSearch
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleMarkAsReturned}
                  disabled={hallmarkSelectedOrders.size === 0 || hallmarkReturnMutation.isPending}
                >
                  {hallmarkReturnMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Mark as Returned (${hallmarkSelectedOrders.size})`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setHallmarkSelectedOrders(new Set())}
                  disabled={hallmarkSelectedOrders.size === 0}
                >
                  Clear Selection
                </Button>
              </div>
              <OrdersTable
                orders={sortOrdersDesignWise(hallmarkOrders)}
                selectionMode
                selectedOrders={hallmarkSelectedOrders}
                onSelectionChange={setHallmarkSelectedOrders}
                onEditRbSupplied={handleEditRbSupplied}
                onViewDesignImage={handleViewDesignImage}
                allowRbEditStatuses={['given_to_hallmark']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Orders</CardTitle>
              <CardDescription>{totalOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={totalBaseOrders}
                filters={totalFilters}
                onFiltersChange={setTotalFilters}
                showOrderNoSearch
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleGiveToHallmark}
                  disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
                >
                  {bulkUpdateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Give to Hallmark (${selectedOrders.size})`
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedOrders(new Set())}
                  disabled={selectedOrders.size === 0}
                >
                  Clear Selection
                </Button>
              </div>
              <OrdersTable
                orders={sortOrdersDesignWise(totalOrders)}
                selectionMode
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
                onEditRbSupplied={handleEditRbSupplied}
                onViewDesignImage={handleViewDesignImage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="co" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <CardDescription>{customerOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={customerBaseOrders}
                filters={coFilters}
                onFiltersChange={setCoFilters}
                showOrderNoSearch
              />
              <OrdersTable
                orders={sortOrdersDesignWise(customerOrders)}
                onEditRbSupplied={handleEditRbSupplied}
                onViewDesignImage={handleViewDesignImage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Karigars</CardTitle>
              <CardDescription>{karigarNames.length} active karigars</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={karigarBaseOrders}
                filters={karigarFilters}
                onFiltersChange={setKarigarFilters}
                showOrderNoSearch
              />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {karigarNames.map((name) => {
                  const karigarStats = metrics.byKarigar[name];
                  const gradients = [
                    'from-blue-500 to-cyan-500',
                    'from-purple-500 to-pink-500',
                    'from-amber-500 to-orange-500',
                    'from-emerald-500 to-teal-500',
                    'from-rose-500 to-red-500',
                    'from-indigo-500 to-blue-500',
                  ];
                  const gradient = gradients[karigarNames.indexOf(name) % gradients.length];

                  return (
                    <Card
                      key={name}
                      className={`cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br ${gradient} text-white border-0`}
                      onClick={() => setSelectedKarigar(name)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white">{name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-white/90">Orders:</span>
                            <span className="font-bold">{karigarStats.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/90">Qty:</span>
                            <span className="font-bold">{karigarStats.totalQty}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/90">Weight:</span>
                            <span className="font-bold">{karigarStats.totalWeight.toFixed(2)}g</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TotalQtyBreakdownDialog
        open={totalQtyDialogOpen}
        onOpenChange={setTotalQtyDialogOpen}
        breakdownData={totalQtyBreakdown}
      />

      {rbEditOrder && (
        <RbSuppliedQtyEditDialog
          order={rbEditOrder}
          open={true}
          onOpenChange={(open) => !open && setRbEditOrder(null)}
        />
      )}

      <DesignImageViewerDialog
        designCode={imageViewerDesignCode}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  );
}
