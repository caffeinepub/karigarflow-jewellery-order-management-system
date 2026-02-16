import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { Upload, Package } from 'lucide-react';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import type { Order } from '../../backend';

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, error, refetch, isFetching } = useGetOrders();

  const [filters, setFilters] = useState({
    karigar: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    coOnly: false,
    status: '',
  });

  const sortedOrders = useMemo(() => sortOrdersDesignWise(orders), [orders]);

  const filteredOrders = useMemo(() => {
    let result = sortedOrders;

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Orders</CardTitle>
          <ExportActions
            filteredOrders={filteredOrders}
            selectedKarigar={filters.karigar}
            fromDate={filters.dateFrom || undefined}
            toDate={filters.dateTo || undefined}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <OrdersFiltersBar
            orders={orders}
            filters={filters}
            onFiltersChange={setFilters}
          />

          {showLoadingSkeleton ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                <p className="text-muted-foreground">Loading orders...</p>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
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
            <OrdersTable orders={filteredOrders} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
