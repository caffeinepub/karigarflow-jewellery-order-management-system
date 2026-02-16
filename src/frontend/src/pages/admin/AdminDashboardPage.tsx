import { useMemo, useState, useEffect } from 'react';
import { useGetOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { CalendarIcon, Package, Weight, Hash, AlertCircle, FileDown, Image } from 'lucide-react';
import { format } from 'date-fns';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { isOrderOnDate } from '../../lib/orders/getOrderTimestamp';
import { downloadKarigarPDF, downloadKarigarJPEG } from '../../lib/exports/karigarOrdersDownloads';
import { toast } from 'sonner';
import type { Order } from '../../backend';

const SELECTED_DATE_KEY = 'adminDashboard_selectedDate';

export function AdminDashboardPage() {
  const { data: orders = [], isLoading, error, refetch, isFetching } = useGetOrders();
  
  // Restore selected date from sessionStorage or default to today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const stored = sessionStorage.getItem(SELECTED_DATE_KEY);
    if (stored) {
      try {
        return new Date(stored);
      } catch {
        return new Date();
      }
    }
    return new Date();
  });

  // Persist selected date to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(SELECTED_DATE_KEY, selectedDate.toISOString());
  }, [selectedDate]);

  const sortedOrders = useMemo(() => sortOrdersDesignWise(orders), [orders]);

  // Filter orders for selected date using shared timestamp utility
  const selectedDateOrders = useMemo(() => {
    return sortedOrders.filter((order) => isOrderOnDate(order, selectedDate));
  }, [sortedOrders, selectedDate]);

  // Only compute metrics when we have stable data (not during refetch)
  const metrics = useMemo(() => {
    // If we're refetching and have no orders yet, return zeros but mark as loading
    if (isFetching && selectedDateOrders.length === 0) {
      return {
        totalOrders: 0,
        totalWeight: 0,
        totalQty: 0,
        coOrders: 0,
        karigarWise: {},
        isLoading: true,
      };
    }
    return {
      ...deriveMetrics(selectedDateOrders),
      isLoading: false,
    };
  }, [selectedDateOrders, isFetching]);

  // Convert karigarWise object to array for rendering
  const karigarWiseArray = useMemo(() => {
    return Object.entries(metrics.karigarWise).map(([karigarName, data]) => ({
      karigarName,
      orderCount: selectedDateOrders.filter(o => 
        (o.karigarName || 'Unassigned') === karigarName
      ).length,
      totalWeight: data.weight,
      totalQty: data.qty,
    }));
  }, [metrics.karigarWise, selectedDateOrders]);

  const handleKarigarDownload = async (karigarName: string, format: 'pdf' | 'jpeg') => {
    const karigarOrders = selectedDateOrders.filter(
      (order) => order.karigarName === karigarName || (karigarName === 'Unassigned' && !order.karigarName.trim())
    );

    if (karigarOrders.length === 0) {
      toast.error(`No orders found for ${karigarName} on selected date`);
      return;
    }

    try {
      if (format === 'pdf') {
        downloadKarigarPDF({
          karigarName,
          orders: karigarOrders,
          selectedDate,
        });
        toast.success(`Opening print dialog for ${karigarName} orders`);
      } else {
        await downloadKarigarJPEG({
          karigarName,
          orders: karigarOrders,
          selectedDate,
        });
        toast.success(`Downloaded ${karigarName} orders as JPEG`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download orders');
    }
  };

  if (error) {
    return (
      <InlineErrorState
        title="Failed to load orders"
        message="Unable to fetch orders from the backend"
        error={error}
        onRetry={refetch}
      />
    );
  }

  const showLoadingSkeleton = isLoading || (isFetching && orders.length === 0);
  const showEmptyState = !showLoadingSkeleton && selectedDateOrders.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of orders and operations</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'MMMM do, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {showLoadingSkeleton ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
                <Weight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalWeight.toFixed(2)}g</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalQty}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CO Orders</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.coOrders}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Karigar-wise Summary</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Orders grouped by karigar for {format(selectedDate, 'MMMM do, yyyy')}
                </p>
              </div>
              <ExportActions selectedDate={selectedDate} filteredOrders={selectedDateOrders} />
            </CardHeader>
            <CardContent>
              {showEmptyState ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders for selected date</p>
                  <p className="text-sm mt-2">Try selecting a different date or upload new orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {karigarWiseArray.map((karigar) => (
                    <div
                      key={karigar.karigarName}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{karigar.karigarName}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Orders: {karigar.orderCount}</span>
                          <span>Weight: {karigar.totalWeight.toFixed(2)}g</span>
                          <span>Qty: {karigar.totalQty}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKarigarDownload(karigar.karigarName, 'pdf')}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKarigarDownload(karigar.karigarName, 'jpeg')}
                        >
                          <Image className="h-4 w-4 mr-2" />
                          JPEG
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {showEmptyState ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders found</p>
                </div>
              ) : (
                <OrdersTable orders={selectedDateOrders} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
