import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { useGetOrders, useListKarigarReference } from '../../hooks/useQueries';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { isCustomerOrder } from '../../lib/orders/isCustomerOrder';
import { Package, CheckCircle, Gem } from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export function StaffDashboardPage() {
  const { data: orders = [], isLoading } = useGetOrders();
  const { data: karigars = [] } = useListKarigarReference();

  // Total Orders tab filters
  const [totalSearchQuery, setTotalSearchQuery] = useState('');
  const [totalFromDate, setTotalFromDate] = useState<Date | null>(new Date());
  const [totalToDate, setTotalToDate] = useState<Date | null>(new Date());
  const [totalSelectedKarigar, setTotalSelectedKarigar] = useState<string | null>(null);
  const [totalSelectedStatus, setTotalSelectedStatus] = useState<string | null>(null);
  const [totalShowCOOnly, setTotalShowCOOnly] = useState(false);
  const [totalShowRBOnly, setTotalShowRBOnly] = useState(false);

  // Hallmark Orders tab filters
  const [hallmarkSearchQuery, setHallmarkSearchQuery] = useState('');
  const [hallmarkFromDate, setHallmarkFromDate] = useState<Date | null>(new Date());
  const [hallmarkToDate, setHallmarkToDate] = useState<Date | null>(new Date());
  const [hallmarkSelectedKarigar, setHallmarkSelectedKarigar] = useState<string | null>(null);
  const [hallmarkShowCOOnly, setHallmarkShowCOOnly] = useState(false);
  const [hallmarkShowRBOnly, setHallmarkShowRBOnly] = useState(false);

  // Customer Orders tab filters
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerFromDate, setCustomerFromDate] = useState<Date | null>(new Date());
  const [customerToDate, setCustomerToDate] = useState<Date | null>(new Date());
  const [customerSelectedKarigar, setCustomerSelectedKarigar] = useState<string | null>(null);
  const [customerSelectedStatus, setCustomerSelectedStatus] = useState<string | null>(null);
  const [customerShowRBOnly, setCustomerShowRBOnly] = useState(false);

  const applyFilters = (
    ordersList: typeof orders,
    searchQuery: string,
    fromDate: Date | null,
    toDate: Date | null,
    selectedKarigar: string | null,
    selectedStatus: string | null,
    showCOOnly: boolean,
    showRBOnly: boolean
  ) => {
    return ordersList.filter((order) => {
      if (searchQuery && !order.orderNo.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      const orderDate = getOrderTimestamp(order);
      if (fromDate && orderDate < startOfDay(fromDate)) return false;
      if (toDate && orderDate > endOfDay(toDate)) return false;

      if (selectedKarigar && order.karigarId !== selectedKarigar) return false;
      if (selectedStatus && order.status !== selectedStatus) return false;

      if (showCOOnly && !isCustomerOrder(order.orderType)) return false;
      if (showRBOnly && order.orderType !== 'RB') return false;

      return true;
    });
  };

  const totalOrders = useMemo(
    () =>
      applyFilters(
        orders,
        totalSearchQuery,
        totalFromDate,
        totalToDate,
        totalSelectedKarigar,
        totalSelectedStatus,
        totalShowCOOnly,
        totalShowRBOnly
      ),
    [orders, totalSearchQuery, totalFromDate, totalToDate, totalSelectedKarigar, totalSelectedStatus, totalShowCOOnly, totalShowRBOnly]
  );

  const hallmarkOrders = useMemo(() => {
    const filtered = orders.filter((o) => o.status === 'given_to_hallmark');
    return applyFilters(
      filtered,
      hallmarkSearchQuery,
      hallmarkFromDate,
      hallmarkToDate,
      hallmarkSelectedKarigar,
      null,
      hallmarkShowCOOnly,
      hallmarkShowRBOnly
    );
  }, [orders, hallmarkSearchQuery, hallmarkFromDate, hallmarkToDate, hallmarkSelectedKarigar, hallmarkShowCOOnly, hallmarkShowRBOnly]);

  const customerOrders = useMemo(() => {
    const filtered = orders.filter((o) => isCustomerOrder(o.orderType));
    return applyFilters(
      filtered,
      customerSearchQuery,
      customerFromDate,
      customerToDate,
      customerSelectedKarigar,
      customerSelectedStatus,
      false,
      customerShowRBOnly
    );
  }, [orders, customerSearchQuery, customerFromDate, customerToDate, customerSelectedKarigar, customerSelectedStatus, customerShowRBOnly]);

  const totalMetrics = useMemo(() => deriveMetrics(totalOrders), [totalOrders]);
  const hallmarkMetrics = useMemo(() => deriveMetrics(hallmarkOrders), [hallmarkOrders]);
  const customerMetrics = useMemo(() => deriveMetrics(customerOrders), [customerOrders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>
      </div>

      <Tabs defaultValue="total" className="w-full">
        <TabsList className="admin-tabs-list w-full sm:w-auto">
          <TabsTrigger value="total" className="admin-tabs-trigger">
            Total Orders
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tabs-trigger">
            Hallmark Orders
          </TabsTrigger>
          <TabsTrigger value="customer" className="admin-tabs-trigger">
            Customer Orders
          </TabsTrigger>
        </TabsList>

        {/* Total Orders Tab */}
        <TabsContent value="total" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="gradient-card-violet">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Orders</CardTitle>
                <Package className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{totalMetrics.totalOrders}</div>
              </CardContent>
            </Card>

            <Card className="gradient-card-gold">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Quantity</CardTitle>
                <CheckCircle className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{totalMetrics.totalQty}</div>
              </CardContent>
            </Card>

            <Card className="gradient-card-green">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Weight</CardTitle>
                <Gem className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{totalMetrics.totalWeight.toFixed(2)}g</div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full overflow-visible">
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
              <OrdersFiltersBar
                searchQuery={totalSearchQuery}
                onSearchChange={setTotalSearchQuery}
                fromDate={totalFromDate}
                toDate={totalToDate}
                onFromDateChange={setTotalFromDate}
                onToDateChange={setTotalToDate}
                selectedKarigar={totalSelectedKarigar}
                onKarigarChange={setTotalSelectedKarigar}
                selectedStatus={totalSelectedStatus}
                onStatusChange={setTotalSelectedStatus}
                showCOOnly={totalShowCOOnly}
                onCOOnlyChange={setTotalShowCOOnly}
                showRBOnly={totalShowRBOnly}
                onRBOnlyChange={setTotalShowRBOnly}
                karigars={karigars}
              />
              <div className="overflow-x-auto">
                <OrdersTable orders={totalOrders} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hallmark Orders Tab */}
        <TabsContent value="hallmark" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="gradient-card-pink">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Hallmark Orders</CardTitle>
                <Package className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{hallmarkMetrics.totalOrders}</div>
              </CardContent>
            </Card>

            <Card className="gradient-card-gold">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Quantity</CardTitle>
                <CheckCircle className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{hallmarkMetrics.totalQty}</div>
              </CardContent>
            </Card>

            <Card className="gradient-card-green">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Weight</CardTitle>
                <Gem className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{hallmarkMetrics.totalWeight.toFixed(2)}g</div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full overflow-visible">
            <CardHeader>
              <CardTitle>Hallmark Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
              <OrdersFiltersBar
                searchQuery={hallmarkSearchQuery}
                onSearchChange={setHallmarkSearchQuery}
                fromDate={hallmarkFromDate}
                toDate={hallmarkToDate}
                onFromDateChange={setHallmarkFromDate}
                onToDateChange={setHallmarkToDate}
                selectedKarigar={hallmarkSelectedKarigar}
                onKarigarChange={setHallmarkSelectedKarigar}
                selectedStatus={null}
                onStatusChange={() => {}}
                showCOOnly={hallmarkShowCOOnly}
                onCOOnlyChange={setHallmarkShowCOOnly}
                showRBOnly={hallmarkShowRBOnly}
                onRBOnlyChange={setHallmarkShowRBOnly}
                karigars={karigars}
              />
              <div className="overflow-x-auto">
                <OrdersTable orders={hallmarkOrders} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Orders Tab */}
        <TabsContent value="customer" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="gradient-card-blue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Customer Orders</CardTitle>
                <Package className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{customerMetrics.totalOrders}</div>
              </CardContent>
            </Card>

            <Card className="gradient-card-gold">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Quantity</CardTitle>
                <CheckCircle className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{customerMetrics.totalQty}</div>
              </CardContent>
            </Card>

            <Card className="gradient-card-green">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">Total Weight</CardTitle>
                <Gem className="h-4 w-4 text-white/70" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{customerMetrics.totalWeight.toFixed(2)}g</div>
              </CardContent>
            </Card>
          </div>

          <Card className="w-full overflow-visible">
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
              <OrdersFiltersBar
                searchQuery={customerSearchQuery}
                onSearchChange={setCustomerSearchQuery}
                fromDate={customerFromDate}
                toDate={customerToDate}
                onFromDateChange={setCustomerFromDate}
                onToDateChange={setCustomerToDate}
                selectedKarigar={customerSelectedKarigar}
                onKarigarChange={setCustomerSelectedKarigar}
                selectedStatus={customerSelectedStatus}
                onStatusChange={setCustomerSelectedStatus}
                showCOOnly={false}
                onCOOnlyChange={() => {}}
                showRBOnly={customerShowRBOnly}
                onRBOnlyChange={setCustomerShowRBOnly}
                karigars={karigars}
              />
              <div className="overflow-x-auto">
                <OrdersTable orders={customerOrders} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
