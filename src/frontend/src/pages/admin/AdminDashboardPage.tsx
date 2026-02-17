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

  const allOrders = fetchedOrders || cachedOrders;
  const { validOrders } = sanitizeOrders(allOrders);
  const isLoading = fetchingOrders || loadingCache;

  // Get current filters based on active tab
  const getCurrentFilters = () => {
    switch (activeTab) {
      case 'delivered': return deliveredFilters;
      case 'hallmark': return hallmarkFilters;
      case 'total': return totalFilters;
      case 'co': return coFilters;
      case 'karigars': return karigarFilters;
      default: return totalFilters;
    }
  };

  const setCurrentFilters = (filters: typeof totalFilters) => {
    switch (activeTab) {
      case 'delivered': setDeliveredFilters(filters); break;
      case 'hallmark': setHallmarkFilters(filters); break;
      case 'total': setTotalFilters(filters); break;
      case 'co': setCoFilters(filters); break;
      case 'karigars': setKarigarFilters(filters); break;
    }
  };

  const currentFilters = getCurrentFilters();

  // Filter orders based on active tab and filters
  const getFilteredOrders = () => {
    let filtered = validOrders;

    // Tab-specific filtering
    switch (activeTab) {
      case 'delivered':
        filtered = filtered.filter(o => o.status === 'delivered');
        break;
      case 'hallmark':
        filtered = filtered.filter(o => o.status === 'given_to_hallmark');
        break;
      case 'total':
        // Show all orders
        break;
      case 'co':
        filtered = filtered.filter(o => o.isCustomerOrder);
        break;
      case 'karigars':
        if (selectedKarigar) {
          filtered = filtered.filter(o => o.karigarName === selectedKarigar);
        }
        break;
    }

    // Apply common filters
    if (currentFilters.karigar) {
      filtered = filtered.filter(o => o.karigarName === currentFilters.karigar);
    }
    if (currentFilters.status) {
      filtered = filtered.filter(o => o.status === currentFilters.status);
    }
    if (currentFilters.orderNoQuery) {
      const query = currentFilters.orderNoQuery.toLowerCase();
      filtered = filtered.filter(o => o.orderNo.toLowerCase().includes(query));
    }

    // CO/RB filters
    if (currentFilters.coFilter && !currentFilters.rbFilter) {
      filtered = filtered.filter(o => o.orderType.includes('CO'));
    } else if (currentFilters.rbFilter && !currentFilters.coFilter) {
      filtered = filtered.filter(o => o.orderType === 'RB');
    }

    // Date filtering
    if (currentFilters.dateFrom || currentFilters.dateTo) {
      filtered = filtered.filter(order => {
        const orderDate = getOrderTimestamp(order);
        if (!orderDate) return false;

        const orderDayStart = startOfDay(orderDate);
        const orderDayEnd = endOfDay(orderDate);

        if (currentFilters.dateFrom && currentFilters.dateTo) {
          const filterStart = startOfDay(currentFilters.dateFrom);
          const filterEnd = endOfDay(currentFilters.dateTo);
          return orderDayStart >= filterStart && orderDayEnd <= filterEnd;
        } else if (currentFilters.dateFrom) {
          const filterStart = startOfDay(currentFilters.dateFrom);
          return orderDayStart >= filterStart;
        } else if (currentFilters.dateTo) {
          const filterEnd = endOfDay(currentFilters.dateTo);
          return orderDayEnd <= filterEnd;
        }
        return true;
      });
    }

    return sortOrdersDesignWise(filtered);
  };

  const filteredOrders = getFilteredOrders();
  const metrics = deriveMetrics(filteredOrders);
  const allMetrics = deriveMetrics(validOrders);

  // Get unique karigars for the Karigars tab
  const uniqueKarigars = Array.from(
    new Set(validOrders.map(o => o.karigarName).filter(Boolean))
  ).sort();

  // Convert byKarigar object to array for karigarStats
  const karigarStats = Object.entries(metrics.byKarigar).map(([karigarName, stats]) => ({
    karigarName,
    ...stats,
  }));

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus,
      });
      toast.success(`${selectedOrders.size} orders updated to ${newStatus}`);
      setSelectedOrders(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update orders');
    }
  };

  const handleHallmarkAction = async (actionType: 'update_status' | 'return_hallmark') => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    try {
      await hallmarkMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        actionType: Variant_update_status_return_hallmark[actionType],
      });
      const message = actionType === 'update_status' 
        ? 'Orders sent to hallmark' 
        : 'Orders returned from hallmark';
      toast.success(message);
      setSelectedOrders(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Failed to process hallmark action');
    }
  };

  const handleCancelDelivered = async () => {
    if (selectedOrders.size === 0) {
      toast.error('No orders selected');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus: 'pending',
        isReturnedFromDelivered: true,
      });
      toast.success(`${selectedOrders.size} orders returned to active status`);
      setSelectedOrders(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel delivered orders');
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

  const handleViewDesignImage = (order: PersistentOrder) => {
    setViewingDesignCode(order.designCode);
  };

  // Calculate breakdown data for all tabs
  const deliveredOrders = validOrders.filter(o => o.status === 'delivered');
  const hallmarkOrders = validOrders.filter(o => o.status === 'given_to_hallmark');
  const customerOrders = validOrders.filter(o => o.isCustomerOrder);
  
  const breakdownData = {
    delivered: deliveredOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    hallmark: hallmarkOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    totalOrders: validOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    customerOrders: customerOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    karigars: Object.values(allMetrics.byKarigar).reduce((sum, stat) => sum + stat.totalQty, 0),
  };

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load orders</p>
          <p className="text-sm text-muted-foreground">{error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage orders, track progress, and export data
          </p>
        </div>
        <ExportActions filteredOrders={filteredOrders} selectedDate={selectedDate} />
      </div>

      {invalidOrdersSkippedCount > 0 && (
        <OrdersDataWarningBanner 
          skippedCount={invalidOrdersSkippedCount}
          onClearCache={handleClearCache}
          isClearing={isClearing}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWeight.toFixed(2)}g</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQty}</div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setTotalQtyDialogOpen(true)}
            >
              View breakdown
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Karigars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{karigarStats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedOrders.size}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="space-y-4">
        <TabsList className="admin-tabs-list">
          <TabsTrigger value="delivered" className="admin-tab-trigger">
            Delivered
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tab-trigger">
            Hallmark
          </TabsTrigger>
          <TabsTrigger value="total" className="admin-tab-trigger">
            Total Orders
          </TabsTrigger>
          <TabsTrigger value="co" className="admin-tab-trigger">
            Customer Orders
          </TabsTrigger>
          <TabsTrigger value="karigars" className="admin-tab-trigger">
            Karigars
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivered" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Delivered Orders</CardTitle>
                  <CardDescription>
                    {filteredOrders.length} orders • {metrics.totalQty} qty • {metrics.totalWeight.toFixed(2)}g
                  </CardDescription>
                </div>
                {selectedOrders.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDelivered}
                    disabled={bulkUpdateMutation.isPending}
                  >
                    {bulkUpdateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      `Cancel ${selectedOrders.size} Order${selectedOrders.size > 1 ? 's' : ''}`
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={deliveredFilters}
                onFiltersChange={setDeliveredFilters}
                orders={validOrders}
              />
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <OrdersTable
                  orders={filteredOrders}
                  selectionMode={true}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                  onEditRbSupplied={setEditingRbOrder}
                  onViewDesignImage={handleViewDesignImage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hallmark Orders</CardTitle>
                  <CardDescription>
                    {filteredOrders.length} orders • {metrics.totalQty} qty • {metrics.totalWeight.toFixed(2)}g
                  </CardDescription>
                </div>
                {selectedOrders.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHallmarkAction('return_hallmark')}
                    disabled={hallmarkMutation.isPending}
                  >
                    {hallmarkMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Returning...
                      </>
                    ) : (
                      `Return ${selectedOrders.size} from Hallmark`
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={hallmarkFilters}
                onFiltersChange={setHallmarkFilters}
                orders={validOrders}
              />
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <OrdersTable
                  orders={filteredOrders}
                  selectionMode={true}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                  onEditRbSupplied={setEditingRbOrder}
                  onViewDesignImage={handleViewDesignImage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Total Orders</CardTitle>
                  <CardDescription>
                    {filteredOrders.length} orders • {metrics.totalQty} qty • {metrics.totalWeight.toFixed(2)}g
                  </CardDescription>
                </div>
                {selectedOrders.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleHallmarkAction('update_status')}
                      disabled={hallmarkMutation.isPending}
                    >
                      {hallmarkMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        `Send ${selectedOrders.size} to Hallmark`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={totalFilters}
                onFiltersChange={setTotalFilters}
                orders={validOrders}
              />
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <OrdersTable
                  orders={filteredOrders}
                  selectionMode={true}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                  onEditRbSupplied={setEditingRbOrder}
                  onViewDesignImage={handleViewDesignImage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="co" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <CardDescription>
                {filteredOrders.length} orders • {metrics.totalQty} qty • {metrics.totalWeight.toFixed(2)}g
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                filters={coFilters}
                onFiltersChange={setCoFilters}
                orders={validOrders}
              />
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <OrdersTable
                  orders={filteredOrders}
                  selectionMode={true}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                  onEditRbSupplied={setEditingRbOrder}
                  onViewDesignImage={handleViewDesignImage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4">
          {!selectedKarigar ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {karigarStats.map((stat) => (
                <Card
                  key={stat.karigarName}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedKarigar(stat.karigarName)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{formatKarigarName(stat.karigarName)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders:</span>
                      <span className="font-medium">{stat.totalOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Qty:</span>
                      <span className="font-medium">{stat.totalQty}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Weight:</span>
                      <span className="font-medium">{stat.totalWeight.toFixed(2)}g</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{formatKarigarName(selectedKarigar)}</CardTitle>
                    <CardDescription>
                      {filteredOrders.length} orders • {metrics.totalQty} qty • {metrics.totalWeight.toFixed(2)}g
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <KarigarDrilldownExportBar
                      karigarName={selectedKarigar}
                      allOrders={filteredOrders}
                      selectedDate={selectedDate}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedKarigar(null)}
                    >
                      Back to All Karigars
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrdersFiltersBar
                  filters={karigarFilters}
                  onFiltersChange={setKarigarFilters}
                  orders={validOrders}
                />
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <OrdersTable
                    orders={filteredOrders}
                    selectionMode={true}
                    selectedOrders={selectedOrders}
                    onSelectionChange={setSelectedOrders}
                    onEditRbSupplied={setEditingRbOrder}
                    onViewDesignImage={handleViewDesignImage}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {editingRbOrder && (
        <RbSuppliedQtyEditDialog
          order={editingRbOrder}
          open={!!editingRbOrder}
          onOpenChange={(open) => !open && setEditingRbOrder(null)}
        />
      )}

      {viewingDesignCode && (
        <DesignImageViewerDialog
          designCode={viewingDesignCode}
          open={!!viewingDesignCode}
          onOpenChange={(open) => !open && setViewingDesignCode(null)}
        />
      )}

      <TotalQtyBreakdownDialog
        open={totalQtyDialogOpen}
        onOpenChange={setTotalQtyDialogOpen}
        breakdownData={breakdownData}
      />
    </div>
  );
}
