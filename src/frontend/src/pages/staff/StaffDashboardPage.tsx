import { useState, useMemo } from 'react';
import { useGetOrders, useListKarigarReference } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { isCustomerOrder } from '../../lib/orders/isCustomerOrder';
import { isTodayOrder } from '../../lib/orders/isTodayOrder';
import { normalizeStatus } from '../../lib/orders/normalizeStatus';
import { ORDER_STATUS } from '../../lib/orders/statusConstants';
import { startOfDay, endOfDay } from 'date-fns';
import type { PersistentOrder } from '../../backend';

type TabValue = 'today' | 'total' | 'hallmark' | 'customer';

interface OrderFilters {
  searchQuery: string;
  fromDate: Date | null;
  toDate: Date | null;
  selectedKarigar: string | null;
  selectedStatus: string | null;
  showCOOnly: boolean;
  showRBOnly: boolean;
}

export function StaffDashboardPage() {
  const { data: allOrders = [], isLoading, error, refetch } = useGetOrders();
  const { data: karigars = [] } = useListKarigarReference();
  const [activeTab, setActiveTab] = useState<TabValue>('today');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Individual filter states per tab
  const [totalFilters, setTotalFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: new Date(),
    toDate: new Date(),
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
  });

  const [hallmarkFilters, setHallmarkFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: new Date(),
    toDate: new Date(),
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
  });

  const [customerFilters, setCustomerFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: new Date(),
    toDate: new Date(),
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
  });

  // Apply filters to a dataset
  const applyFilters = (orders: PersistentOrder[], filters: OrderFilters): PersistentOrder[] => {
    return orders.filter((order) => {
      // Date filter
      if (filters.fromDate || filters.toDate) {
        const orderDate = getOrderTimestamp(order);
        if (filters.fromDate && orderDate < startOfDay(filters.fromDate)) return false;
        if (filters.toDate && orderDate > endOfDay(filters.toDate)) return false;
      }

      // Order type filter
      if (filters.showCOOnly && !isCustomerOrder(order.orderType)) return false;
      if (filters.showRBOnly && order.orderType !== 'RB') return false;

      // Karigar filter
      if (filters.selectedKarigar && order.karigarId !== filters.selectedKarigar) {
        return false;
      }

      // Status filter with normalized comparison
      if (filters.selectedStatus) {
        const normalizedFilterStatus = normalizeStatus(filters.selectedStatus);
        const normalizedOrderStatus = normalizeStatus(order.status);
        if (normalizedOrderStatus !== normalizedFilterStatus) {
          return false;
        }
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          order.orderNo.toLowerCase().includes(query) ||
          order.designCode.toLowerCase().includes(query) ||
          order.genericName.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  // Today's orders (includes orders with activity today)
  const todayOrders = useMemo(() => {
    return allOrders.filter((order) => isTodayOrder(order));
  }, [allOrders]);

  // Tab-specific datasets
  const totalOrders = useMemo(() => {
    return applyFilters(allOrders, totalFilters);
  }, [allOrders, totalFilters]);

  const hallmarkOrders = useMemo(() => {
    const baseOrders = allOrders.filter((o) => o.status === ORDER_STATUS.GIVEN_TO_HALLMARK);
    return applyFilters(baseOrders, hallmarkFilters);
  }, [allOrders, hallmarkFilters]);

  const customerOrders = useMemo(() => {
    const baseOrders = allOrders.filter((o) => isCustomerOrder(o.orderType));
    return applyFilters(baseOrders, customerFilters);
  }, [allOrders, customerFilters]);

  // Compute metrics for the active tab
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return todayOrders;
      case 'total':
        return totalOrders;
      case 'hallmark':
        return hallmarkOrders;
      case 'customer':
        return customerOrders;
      default:
        return [];
    }
  }, [activeTab, todayOrders, totalOrders, hallmarkOrders, customerOrders]);

  const metrics = useMemo(() => deriveMetrics(activeDataset), [activeDataset]);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        <InlineErrorState
          title="Failed to load orders"
          message="Unable to fetch orders from the backend."
          onRetry={() => refetch()}
          error={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        <ExportActions filteredOrders={activeDataset} />
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="admin-tabs-list">
          <TabsTrigger value="today" className="admin-tabs-trigger">
            Today
          </TabsTrigger>
          <TabsTrigger value="total" className="admin-tabs-trigger">
            Total Orders ({totalOrders.length})
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tabs-trigger">
            Hallmark ({hallmarkOrders.length})
          </TabsTrigger>
          <TabsTrigger value="customer" className="admin-tabs-trigger">
            Customer Orders ({customerOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Today's Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : todayOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No orders found for today</div>
              ) : (
                <OrdersTable
                  orders={todayOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total" className="space-y-4">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Total Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                searchQuery={totalFilters.searchQuery}
                onSearchChange={(query) => setTotalFilters({ ...totalFilters, searchQuery: query })}
                fromDate={totalFilters.fromDate}
                toDate={totalFilters.toDate}
                onFromDateChange={(date) => setTotalFilters({ ...totalFilters, fromDate: date })}
                onToDateChange={(date) => setTotalFilters({ ...totalFilters, toDate: date })}
                selectedKarigar={totalFilters.selectedKarigar}
                onKarigarChange={(id) => setTotalFilters({ ...totalFilters, selectedKarigar: id })}
                selectedStatus={totalFilters.selectedStatus}
                onStatusChange={(status) => setTotalFilters({ ...totalFilters, selectedStatus: status })}
                showCOOnly={totalFilters.showCOOnly}
                onCOOnlyChange={(value) => setTotalFilters({ ...totalFilters, showCOOnly: value })}
                showRBOnly={totalFilters.showRBOnly}
                onRBOnlyChange={(value) => setTotalFilters({ ...totalFilters, showRBOnly: value })}
                karigars={karigars}
                onClearFilters={() => setTotalFilters({
                  searchQuery: '',
                  fromDate: new Date(),
                  toDate: new Date(),
                  selectedKarigar: null,
                  selectedStatus: null,
                  showCOOnly: false,
                  showRBOnly: false,
                })}
              />
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : totalOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No orders found</div>
              ) : (
                <OrdersTable
                  orders={totalOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Hallmark Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                searchQuery={hallmarkFilters.searchQuery}
                onSearchChange={(query) => setHallmarkFilters({ ...hallmarkFilters, searchQuery: query })}
                fromDate={hallmarkFilters.fromDate}
                toDate={hallmarkFilters.toDate}
                onFromDateChange={(date) => setHallmarkFilters({ ...hallmarkFilters, fromDate: date })}
                onToDateChange={(date) => setHallmarkFilters({ ...hallmarkFilters, toDate: date })}
                selectedKarigar={hallmarkFilters.selectedKarigar}
                onKarigarChange={(id) => setHallmarkFilters({ ...hallmarkFilters, selectedKarigar: id })}
                selectedStatus={hallmarkFilters.selectedStatus}
                onStatusChange={(status) => setHallmarkFilters({ ...hallmarkFilters, selectedStatus: status })}
                showCOOnly={hallmarkFilters.showCOOnly}
                onCOOnlyChange={(value) => setHallmarkFilters({ ...hallmarkFilters, showCOOnly: value })}
                showRBOnly={hallmarkFilters.showRBOnly}
                onRBOnlyChange={(value) => setHallmarkFilters({ ...hallmarkFilters, showRBOnly: value })}
                karigars={karigars}
                onClearFilters={() => setHallmarkFilters({
                  searchQuery: '',
                  fromDate: new Date(),
                  toDate: new Date(),
                  selectedKarigar: null,
                  selectedStatus: null,
                  showCOOnly: false,
                  showRBOnly: false,
                })}
              />
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : hallmarkOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hallmark orders found</div>
              ) : (
                <OrdersTable
                  orders={hallmarkOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                searchQuery={customerFilters.searchQuery}
                onSearchChange={(query) => setCustomerFilters({ ...customerFilters, searchQuery: query })}
                fromDate={customerFilters.fromDate}
                toDate={customerFilters.toDate}
                onFromDateChange={(date) => setCustomerFilters({ ...customerFilters, fromDate: date })}
                onToDateChange={(date) => setCustomerFilters({ ...customerFilters, toDate: date })}
                selectedKarigar={customerFilters.selectedKarigar}
                onKarigarChange={(id) => setCustomerFilters({ ...customerFilters, selectedKarigar: id })}
                selectedStatus={customerFilters.selectedStatus}
                onStatusChange={(status) => setCustomerFilters({ ...customerFilters, selectedStatus: status })}
                showCOOnly={customerFilters.showCOOnly}
                onCOOnlyChange={(value) => setCustomerFilters({ ...customerFilters, showCOOnly: value })}
                showRBOnly={customerFilters.showRBOnly}
                onRBOnlyChange={(value) => setCustomerFilters({ ...customerFilters, showRBOnly: value })}
                karigars={karigars}
                onClearFilters={() => setCustomerFilters({
                  searchQuery: '',
                  fromDate: new Date(),
                  toDate: new Date(),
                  selectedKarigar: null,
                  selectedStatus: null,
                  showCOOnly: false,
                  showRBOnly: false,
                })}
              />
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No customer orders found</div>
              ) : (
                <OrdersTable
                  orders={customerOrders}
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
