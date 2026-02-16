import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useGetOrders, useGetActivityLog } from '../../hooks/useQueries';
import { useOrdersCache } from '../../hooks/useOrdersCache';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { RbSuppliedQtyEditDialog } from '../../components/orders/RbSuppliedQtyEditDialog';
import { DesignImageViewerDialog } from '../../components/designImages/DesignImageViewerDialog';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import type { PersistentOrder } from '../../backend';
import { format, startOfDay, endOfDay } from 'date-fns';

type ActiveTab = 'total' | 'hallmark' | 'co' | 'activity';

export function StaffDashboardPage() {
  const { data: fetchedOrders, isLoading: fetchingOrders, isError, error } = useGetOrders();
  const { orders: cachedOrders, isLoading: loadingCache } = useOrdersCache();
  const { data: activityLog, isLoading: loadingActivity } = useGetActivityLog();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('total');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [totalFilters, setTotalFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: null as Date | null, 
    dateTo: null as Date | null, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  const [hallmarkFilters, setHallmarkFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: null as Date | null, 
    dateTo: null as Date | null, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  const [coFilters, setCoFilters] = useState({ 
    karigar: '', 
    status: '', 
    dateFrom: null as Date | null, 
    dateTo: null as Date | null, 
    orderNoQuery: '', 
    coFilter: false,
    rbFilter: false
  });
  
  const [rbEditOrder, setRbEditOrder] = useState<PersistentOrder | null>(null);
  const [imageViewerDesignCode, setImageViewerDesignCode] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

  const isLoading = fetchingOrders || loadingCache;
  const orders = fetchedOrders || cachedOrders || [];

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
      
      // Separate CO and RB filters
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

  const totalOrders = applyFilters(orders, totalFilters);
  const hallmarkOrders = applyFilters(
    orders.filter(o => o.designCode.toLowerCase().includes('hallmark') || o.orderNo.endsWith('_hallmark')),
    hallmarkFilters
  );
  const customerOrders = applyFilters(
    orders.filter(o => o.isCustomerOrder),
    coFilters
  );

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
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
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
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
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
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
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
              <OrdersTable
                orders={sortOrdersDesignWise(totalOrders)}
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

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent system activities</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(activityLog || []).slice(0, 50).map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm border-b pb-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {entry.action}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-muted-foreground">{entry.details}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(Number(entry.timestamp) / 1000000), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RbSuppliedQtyEditDialog
        order={rbEditOrder!}
        open={!!rbEditOrder}
        onOpenChange={(open) => !open && setRbEditOrder(null)}
      />

      <DesignImageViewerDialog
        designCode={imageViewerDesignCode}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  );
}
