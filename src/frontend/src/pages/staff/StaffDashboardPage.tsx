import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useOrdersCache } from '../../hooks/useOrdersCache';
import { useBulkUpdateOrderStatus } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { Upload, Package, WifiOff, Send, CalendarIcon } from 'lucide-react';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';

type HallmarkViewMode = 'all' | 'daywise';

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const {
    orders,
    isLoading,
    error,
    refetch,
  } = useOrdersCache();
  
  const bulkUpdateMutation = useBulkUpdateOrderStatus();

  const [filters, setFilters] = useState({
    karigar: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    coOnly: false,
    status: '',
  });

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [hallmarkViewMode, setHallmarkViewMode] = useState<HallmarkViewMode>('all');
  const [hallmarkDate, setHallmarkDate] = useState<Date>(new Date());

  const sortedOrders = useMemo(() => sortOrdersDesignWise(orders), [orders]);

  // Filter orders for Total Orders tab (exclude given_to_hallmark)
  const totalOrders = useMemo(() => {
    let result = sortedOrders.filter(o => o.status !== 'given_to_hallmark');

    // Filter by karigar
    if (filters.karigar) {
      result = result.filter((order) => {
        const formattedName = formatKarigarName(order.karigarName);
        return formattedName === filters.karigar;
      });
    }

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      result = result.filter((order) => {
        const orderDate = getOrderTimestamp(order);
        const fromMatch = !filters.dateFrom || orderDate >= filters.dateFrom;
        const toMatch = !filters.dateTo || orderDate <= filters.dateTo;
        return fromMatch && toMatch;
      });
    }

    // Filter by CO
    if (filters.coOnly) {
      result = result.filter((order) => order.isCustomerOrder);
    }

    // Filter by status
    if (filters.status) {
      result = result.filter((order) => order.status === filters.status);
    }

    return result;
  }, [sortedOrders, filters]);

  // Hallmark orders
  const hallmarkOrders = useMemo(() => {
    let result = orders.filter(o => o.status === 'given_to_hallmark');
    
    if (hallmarkViewMode === 'daywise') {
      const start = startOfDay(hallmarkDate);
      const end = endOfDay(hallmarkDate);
      result = result.filter((order) => {
        const orderDate = getOrderTimestamp(order);
        return orderDate >= start && orderDate <= end;
      });
    }
    
    return sortOrdersDesignWise(result);
  }, [orders, hallmarkViewMode, hallmarkDate]);

  const handleBulkMarkAsHallmark = async () => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus: 'given_to_hallmark',
      });
      toast.success(`${selectedOrders.size} order(s) marked as given to hallmark`);
      setSelectedOrders(new Set());
    } catch (error) {
      console.error('Failed to update orders:', error);
      toast.error('Failed to update order status');
    }
  };

  // Show backend error with cached data if available
  const isBackendError = !!error;
  if (isBackendError && orders.length > 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-muted-foreground">Manage and view all orders</p>
          </div>
          <Button onClick={() => navigate({ to: '/staff/ingest' })}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Orders
          </Button>
        </div>

        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Backend Unavailable</AlertTitle>
          <AlertDescription>
            Showing cached data. The backend is currently unreachable. Changes will not be saved until connection is restored.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="total-orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="total-orders">Total Orders</TabsTrigger>
            <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          </TabsList>

          <TabsContent value="total-orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Orders (Cached)</CardTitle>
                <ExportActions filteredOrders={totalOrders} />
              </CardHeader>
              <CardContent className="space-y-4">
                <OrdersFiltersBar
                  orders={orders}
                  filters={filters}
                  onFiltersChange={setFilters}
                />

                {totalOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders found</p>
                    {(filters.karigar || filters.dateFrom || filters.dateTo || filters.coOnly || filters.status) && (
                      <Button 
                        variant="link" 
                        onClick={() => setFilters({
                          karigar: '',
                          dateFrom: null,
                          dateTo: null,
                          coOnly: false,
                          status: '',
                        })} 
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <OrdersTable orders={totalOrders} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hallmark">
            <Card>
              <CardHeader>
                <CardTitle>Hallmark Orders (Cached)</CardTitle>
              </CardHeader>
              <CardContent>
                <OrdersTable 
                  orders={hallmarkOrders}
                  emptyMessage="No orders marked as given to hallmark"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Show error without cached data
  if (isBackendError && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-muted-foreground">Manage and view all orders</p>
          </div>
          <Button onClick={() => navigate({ to: '/staff/ingest' })}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Orders
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertTitle>Failed to load orders</AlertTitle>
          <AlertDescription>
            Unable to fetch orders from the backend and no cached data is available. Please check your connection and try again.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Available</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              We couldn't load your orders. Please try refreshing the page or check your connection.
            </p>
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showLoadingSkeleton = isLoading;
  const showEmptyState = !isLoading && orders.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Staff Dashboard</h1>
          <p className="text-muted-foreground">Manage and view all orders</p>
        </div>
        <Button onClick={() => navigate({ to: '/staff/ingest' })}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Orders
        </Button>
      </div>

      {showLoadingSkeleton && (
        <Card>
          <CardHeader>
            <CardTitle>Loading orders...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showEmptyState && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Get started by uploading your first order file.
            </p>
            <Button onClick={() => navigate({ to: '/staff/ingest' })}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Orders
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !showEmptyState && (
        <Tabs defaultValue="total-orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="total-orders">Total Orders</TabsTrigger>
            <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          </TabsList>

          <TabsContent value="total-orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Total Orders</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedOrders.size > 0 && (
                    <Button 
                      onClick={handleBulkMarkAsHallmark}
                      disabled={bulkUpdateMutation.isPending}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Mark {selectedOrders.size} as Hallmark
                    </Button>
                  )}
                  <ExportActions filteredOrders={totalOrders} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrdersFiltersBar
                  orders={orders}
                  filters={filters}
                  onFiltersChange={setFilters}
                />

                {totalOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders match the current filters</p>
                    <Button 
                      variant="link" 
                      onClick={() => setFilters({
                        karigar: '',
                        dateFrom: null,
                        dateTo: null,
                        coOnly: false,
                        status: '',
                      })} 
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <OrdersTable 
                    orders={totalOrders}
                    selectionMode
                    selectedOrders={selectedOrders}
                    onSelectionChange={setSelectedOrders}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hallmark">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Hallmark Orders</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={hallmarkViewMode} onValueChange={(v) => setHallmarkViewMode(v as HallmarkViewMode)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="daywise">Day-wise</SelectItem>
                    </SelectContent>
                  </Select>
                  {hallmarkViewMode === 'daywise' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(hallmarkDate, 'MMM d, yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={hallmarkDate}
                          onSelect={(date) => date && setHallmarkDate(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <OrdersTable 
                  orders={hallmarkOrders}
                  emptyMessage="No orders marked as given to hallmark"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
