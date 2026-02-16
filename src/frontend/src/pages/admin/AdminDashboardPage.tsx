import { useState, useEffect, useMemo } from 'react';
import { useOrdersCache } from '../../hooks/useOrdersCache';
import { useBulkUpdateOrderStatus } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { KarigarDrilldownExportBar } from '../../components/exports/KarigarDrilldownExportBar';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { sortOrdersKarigarWise } from '../../lib/orders/sortOrdersKarigarWise';
import { CalendarIcon, Package, ArrowLeft, Send } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import type { PersistentOrder } from '../../backend';

type SortOption = 'default' | 'design' | 'karigar';
type HallmarkViewMode = 'all' | 'daywise';

export function AdminDashboardPage() {
  const { orders, isLoading, error } = useOrdersCache();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  
  // Initialize selectedDate from sessionStorage or default to today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const stored = sessionStorage.getItem('adminDashboardSelectedDate');
    if (stored) {
      try {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // Fall through to default
      }
    }
    return new Date();
  });

  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [hallmarkViewMode, setHallmarkViewMode] = useState<HallmarkViewMode>('all');
  const [hallmarkDate, setHallmarkDate] = useState<Date>(new Date());
  
  const [filters, setFilters] = useState({
    karigar: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    coOnly: false,
    status: '',
  });

  // Persist selectedDate to sessionStorage whenever it changes
  useEffect(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    sessionStorage.setItem('adminDashboardSelectedDate', dateKey);
  }, [selectedDate]);

  const filteredOrders = useMemo(() => {
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    
    return orders.filter((order) => {
      const orderDate = getOrderTimestamp(order);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, selectedDate]);

  const sortedOrders = useMemo(() => {
    switch (sortOption) {
      case 'design':
        return sortOrdersDesignWise(filteredOrders);
      case 'karigar':
        return sortOrdersKarigarWise(filteredOrders);
      default:
        return filteredOrders;
    }
  }, [filteredOrders, sortOption]);

  // Filter orders for Total Orders tab (exclude given_to_hallmark)
  const totalOrders = useMemo(() => {
    let result = sortedOrders.filter(o => o.status !== 'given_to_hallmark');
    
    // Apply filters
    if (filters.karigar) {
      result = result.filter((order) => {
        const formattedName = formatKarigarName(order.karigarName);
        return formattedName === filters.karigar;
      });
    }

    if (filters.dateFrom || filters.dateTo) {
      result = result.filter((order) => {
        const orderDate = getOrderTimestamp(order);
        const fromMatch = !filters.dateFrom || orderDate >= filters.dateFrom;
        const toMatch = !filters.dateTo || orderDate <= filters.dateTo;
        return fromMatch && toMatch;
      });
    }

    if (filters.coOnly) {
      result = result.filter((order) => order.isCustomerOrder);
    }

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

  const customerOrders = useMemo(() => 
    sortedOrders.filter(order => order.isCustomerOrder),
    [sortedOrders]
  );

  const metrics = useMemo(() => deriveMetrics(sortedOrders), [sortedOrders]);

  const karigarNames = useMemo(() => {
    const names = Array.from(
      new Set(sortedOrders.map(o => formatKarigarName(o.karigarName)))
    ).sort();
    return names;
  }, [sortedOrders]);

  const selectedKarigarOrders = useMemo(() => {
    if (!selectedKarigar) return [];
    return sortedOrders.filter(o => formatKarigarName(o.karigarName) === selectedKarigar);
  }, [sortedOrders, selectedKarigar]);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of all orders and operations</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of all orders and operations</p>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error Loading Orders</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of all orders and operations</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWeight.toFixed(2)}g</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQty}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customer Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.customerOrdersCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="total-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="total-orders">Total Orders</TabsTrigger>
          <TabsTrigger value="hallmark">Hallmark</TabsTrigger>
          <TabsTrigger value="total-weight">Total Weight</TabsTrigger>
          <TabsTrigger value="total-quantity">Total Quantity</TabsTrigger>
          <TabsTrigger value="customer-orders">Customer Orders</TabsTrigger>
          <TabsTrigger value="karigars">Karigars</TabsTrigger>
        </TabsList>

        <TabsContent value="total-orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Total Orders</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="design">Design-wise</SelectItem>
                      <SelectItem value="karigar">Karigar-wise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selectedOrders.size > 0 && (
                <Button 
                  onClick={handleBulkMarkAsHallmark}
                  disabled={bulkUpdateMutation.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Mark {selectedOrders.size} as Hallmark
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <OrdersFiltersBar
                orders={orders}
                filters={filters}
                onFiltersChange={setFilters}
              />
              <OrdersTable 
                orders={totalOrders}
                selectionMode
                selectedOrders={selectedOrders}
                onSelectionChange={setSelectedOrders}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hallmark" className="space-y-4">
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

        <TabsContent value="total-weight" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Weight: {metrics.totalWeight.toFixed(2)}g</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={sortedOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="total-quantity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Quantity: {metrics.totalQty}</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={sortedOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Orders ({customerOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={customerOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="karigars" className="space-y-4">
          {selectedKarigar ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedKarigar(null)}
                    className="mb-2"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Karigars
                  </Button>
                  <CardTitle>{selectedKarigar} Orders</CardTitle>
                </div>
                <KarigarDrilldownExportBar
                  karigarName={selectedKarigar}
                  allOrders={selectedKarigarOrders}
                  selectedDate={selectedDate}
                />
              </CardHeader>
              <CardContent>
                <OrdersTable orders={selectedKarigarOrders} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {karigarNames.map((karigarName) => {
                const karigarOrders = sortedOrders.filter(
                  o => formatKarigarName(o.karigarName) === karigarName
                );
                const karigarMetrics = deriveMetrics(karigarOrders);

                return (
                  <Card
                    key={karigarName}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedKarigar(karigarName)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{karigarName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Orders:</span>
                        <span className="font-medium">{karigarMetrics.totalOrders}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="font-medium">{karigarMetrics.totalWeight.toFixed(2)}g</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-medium">{karigarMetrics.totalQty}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CO:</span>
                        <span className="font-medium">{karigarMetrics.customerOrdersCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
