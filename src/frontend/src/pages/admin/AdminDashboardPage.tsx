import { useState, useMemo } from 'react';
import { useGetOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { KarigarSummaryCards } from '../../components/admin/KarigarSummaryCards';
import { TotalQtyBreakdownDialog } from '../../components/admin/TotalQtyBreakdownDialog';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { isCustomerOrder } from '../../lib/orders/isCustomerOrder';
import { CalendarIcon, Download, Info } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { PersistentOrder } from '../../backend';

type TabValue = 'delivered' | 'hallmark' | 'total' | 'customer' | 'karigars';

export function AdminDashboardPage() {
  const { data: allOrders = [], isLoading, error, refetch } = useGetOrders();
  const [activeTab, setActiveTab] = useState<TabValue>('delivered');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBreakdownDialog, setShowBreakdownDialog] = useState(false);
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);

  // Date range: default to today (start of day to end of day)
  const dateRange = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    return { from: start, to: end };
  }, [selectedDate]);

  // Filter orders by date range
  const ordersInDateRange = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return allOrders;
    
    return allOrders.filter((order) => {
      const orderDate = getOrderTimestamp(order);
      return orderDate >= dateRange.from! && orderDate <= dateRange.to!;
    });
  }, [allOrders, dateRange]);

  // Tab-specific datasets
  const deliveredOrders = useMemo(
    () => ordersInDateRange.filter((o) => o.status === 'delivered'),
    [ordersInDateRange]
  );

  const hallmarkOrders = useMemo(
    () => ordersInDateRange.filter((o) => o.status === 'given_to_hallmark'),
    [ordersInDateRange]
  );

  const totalOrders = useMemo(
    () => ordersInDateRange.filter((o) => o.status === 'pending'),
    [ordersInDateRange]
  );

  const customerOrders = useMemo(
    () => ordersInDateRange.filter((o) => isCustomerOrder(o.orderType)),
    [ordersInDateRange]
  );

  // Compute metrics for the active tab
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'delivered':
        return deliveredOrders;
      case 'hallmark':
        return hallmarkOrders;
      case 'total':
        return totalOrders;
      case 'customer':
        return customerOrders;
      case 'karigars':
        return ordersInDateRange;
      default:
        return [];
    }
  }, [activeTab, deliveredOrders, hallmarkOrders, totalOrders, customerOrders, ordersInDateRange]);

  const metrics = useMemo(() => deriveMetrics(activeDataset), [activeDataset]);

  // Compute breakdown data for dialog
  const breakdownData = useMemo(() => {
    const deliveredMetrics = deriveMetrics(deliveredOrders);
    const hallmarkMetrics = deriveMetrics(hallmarkOrders);
    const totalMetrics = deriveMetrics(totalOrders);
    const customerMetrics = deriveMetrics(customerOrders);
    const karigarMetrics = deriveMetrics(ordersInDateRange);

    return {
      delivered: deliveredMetrics.totalQty,
      hallmark: hallmarkMetrics.totalQty,
      totalOrders: totalMetrics.totalQty,
      customerOrders: customerMetrics.totalQty,
      karigars: karigarMetrics.totalQty,
    };
  }, [deliveredOrders, hallmarkOrders, totalOrders, customerOrders, ordersInDateRange]);

  if (error) {
    return (
      <InlineErrorState
        title="Failed to load orders"
        message="Unable to fetch orders from the backend."
        onRetry={() => refetch()}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker with proper z-index */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 z-[100]" 
              align="end"
              sideOffset={8}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <ExportActions filteredOrders={activeDataset} selectedDate={selectedDate} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card-violet">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Weight</CardTitle>
            <Info className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalWeight.toFixed(2)}g</div>
            <p className="text-xs text-white/70">Across all orders</p>
          </CardContent>
        </Card>

        <Card className="gradient-card-pink">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Qty</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setShowBreakdownDialog(true)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalQty}</div>
            <p className="text-xs text-white/70">All orders</p>
          </CardContent>
        </Card>

        <Card className="gradient-card-gold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.totalOrders}</div>
            <p className="text-xs text-white/70">All statuses</p>
          </CardContent>
        </Card>

        <Card className="gradient-card-green">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{deliveredOrders.length}</div>
            <p className="text-xs text-white/70">Completed orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <TabsList className="admin-tabs-list w-full sm:w-auto">
          <TabsTrigger value="delivered" className="admin-tabs-trigger">
            Delivered
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tabs-trigger">
            Hallmark
          </TabsTrigger>
          <TabsTrigger value="total" className="admin-tabs-trigger">
            Total Orders
          </TabsTrigger>
          <TabsTrigger value="customer" className="admin-tabs-trigger">
            Customer Orders
          </TabsTrigger>
          <TabsTrigger value="karigars" className="admin-tabs-trigger">
            Karigars
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivered" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivered Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                </div>
              ) : deliveredOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No delivered orders found</p>
              ) : (
                <OrdersTable orders={deliveredOrders} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hallmark Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                </div>
              ) : hallmarkOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No hallmark orders found</p>
              ) : (
                <OrdersTable orders={hallmarkOrders} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Orders (Pending)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                </div>
              ) : totalOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No pending orders found</p>
              ) : (
                <OrdersTable orders={totalOrders} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                </div>
              ) : customerOrders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No customer orders found</p>
              ) : (
                <OrdersTable orders={customerOrders} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4 mt-4">
          <KarigarSummaryCards 
            orders={ordersInDateRange} 
            selectedKarigar={selectedKarigar}
            onSelectKarigar={setSelectedKarigar}
          />
        </TabsContent>
      </Tabs>

      <TotalQtyBreakdownDialog
        open={showBreakdownDialog}
        onOpenChange={setShowBreakdownDialog}
        breakdownData={breakdownData}
      />
    </div>
  );
}
