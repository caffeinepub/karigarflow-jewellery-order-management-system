import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye } from 'lucide-react';
import { useGetOrders } from '../../hooks/useQueries';
import { useOrdersCache } from '../../hooks/useOrdersCache';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { KarigarDrilldownExportBar } from '../../components/exports/KarigarDrilldownExportBar';
import { PartialFulfillmentDialog } from '../../components/orders/PartialFulfillmentDialog';
import { RbSuppliedQtyEditDialog } from '../../components/orders/RbSuppliedQtyEditDialog';
import { DesignImageViewerDialog } from '../../components/designImages/DesignImageViewerDialog';
import { OrdersDataWarningBanner } from '../../components/orders/OrdersDataWarningBanner';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { sortOrdersKarigarWise } from '../../lib/orders/sortOrdersKarigarWise';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { sanitizeOrders } from '../../lib/orders/validatePersistentOrder';
import type { PersistentOrder } from '../../backend';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

type ActiveTab = 'total' | 'hallmark' | 'co' | 'karigars';

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
  
  // Filters state per tab
  const [totalFilters, setTotalFilters] = useState({ karigar: '', status: '', dateFrom: null as Date | null, dateTo: null as Date | null, orderNoQuery: '', coOnly: false });
  const [hallmarkFilters, setHallmarkFilters] = useState({ karigar: '', status: '', dateFrom: null as Date | null, dateTo: null as Date | null, orderNoQuery: '', coOnly: false });
  const [coFilters, setCoFilters] = useState({ karigar: '', status: '', dateFrom: null as Date | null, dateTo: null as Date | null, orderNoQuery: '', coOnly: false });
  const [karigarFilters, setKarigarFilters] = useState({ karigar: '', status: '', dateFrom: null as Date | null, dateTo: null as Date | null, orderNoQuery: '', coOnly: false });
  
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [partialFulfillmentDialogOpen, setPartialFulfillmentDialogOpen] = useState(false);
  const [rbEditOrder, setRbEditOrder] = useState<PersistentOrder | null>(null);
  const [imageViewerDesignCode, setImageViewerDesignCode] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

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
      if (filters.coOnly && !order.isCustomerOrder) {
        return false;
      }
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

  const totalOrders = applyFilters(orders, totalFilters);
  const hallmarkOrders = applyFilters(
    orders.filter(o => o.designCode.toLowerCase().includes('hallmark') || o.orderNo.endsWith('_hallmark')),
    hallmarkFilters
  );
  const customerOrders = applyFilters(
    orders.filter(o => o.isCustomerOrder),
    coFilters
  );

  const activeOrders = orders.filter(o => o.status === 'pending' && !o.designCode.toLowerCase().includes('hallmark') && !o.orderNo.endsWith('_hallmark'));
  const filteredKarigarOrders = applyFilters(activeOrders, karigarFilters);

  const metrics = deriveMetrics(orders);
  const karigarNames = Object.keys(metrics.byKarigar).sort();

  const handleViewDesignImage = (order: PersistentOrder) => {
    setImageViewerDesignCode(order.designCode);
    setImageViewerOpen(true);
  };

  const handleEditRbSupplied = (order: PersistentOrder) => {
    setRbEditOrder(order);
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.customerOrdersCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Karigars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{karigarNames.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="total">Total Orders</TabsTrigger>
          <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          <TabsTrigger value="co">Customer Orders</TabsTrigger>
          <TabsTrigger value="karigars">Karigars</TabsTrigger>
        </TabsList>

        <TabsContent value="total" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
              <CardDescription>{totalOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={orders}
                filters={totalFilters}
                onFiltersChange={setTotalFilters}
                showOrderNoSearch
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setPartialFulfillmentDialogOpen(true)}
                  disabled={selectedOrders.size === 0}
                >
                  Mark as Delivered ({selectedOrders.size})
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

        <TabsContent value="hallmark" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hallmark Orders</CardTitle>
              <CardDescription>{hallmarkOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={orders}
                filters={hallmarkFilters}
                onFiltersChange={setHallmarkFilters}
                showOrderNoSearch
              />
              <OrdersTable 
                orders={sortOrdersDesignWise(hallmarkOrders)} 
                onViewDesignImage={handleViewDesignImage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="co" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
              <CardDescription>{customerOrders.length} orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={orders}
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

        <TabsContent value="karigars" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Orders by Karigar</CardTitle>
              <CardDescription>{filteredKarigarOrders.length} active orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={orders}
                filters={karigarFilters}
                onFiltersChange={setKarigarFilters}
                showOrderNoSearch
              />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {karigarNames
                  .filter(karigarName => {
                    const matchesFilter = !karigarFilters.karigar || karigarName === karigarFilters.karigar;
                    const hasActiveOrders = filteredKarigarOrders.some(o => 
                      formatKarigarName(o.karigarName) === karigarName
                    );
                    return matchesFilter && hasActiveOrders;
                  })
                  .map((karigarName) => {
                    const count = filteredKarigarOrders.filter(o => formatKarigarName(o.karigarName) === karigarName).length;
                    return (
                      <Card key={karigarName} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedKarigar(karigarName)}>
                        <CardHeader>
                          <CardTitle className="text-lg">{karigarName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Active Orders:</span>
                              <Badge>{count}</Badge>
                            </div>
                            <Button variant="outline" size="sm" className="w-full">
                              <Eye className="mr-2 h-4 w-4" />
                              View Orders
                            </Button>
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

      {partialFulfillmentDialogOpen && selectedOrders.size > 0 && (
        <PartialFulfillmentDialog
          orders={orders.filter(o => selectedOrders.has(o.orderNo))}
          open={partialFulfillmentDialogOpen}
          onOpenChange={setPartialFulfillmentDialogOpen}
          onConfirm={() => {
            setSelectedOrders(new Set());
            setPartialFulfillmentDialogOpen(false);
          }}
          isSubmitting={false}
        />
      )}

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
