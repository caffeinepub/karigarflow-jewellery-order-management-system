import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useGetOrders } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { Upload } from 'lucide-react';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';

export function StaffDashboardPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, error, refetch } = useGetOrders();
  const [filters, setFilters] = useState({
    karigar: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
    coOnly: false,
    status: '',
  });

  const filteredAndSortedOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      // Use formatted karigar name for comparison - must match the dropdown values exactly
      if (filters.karigar) {
        const orderKarigar = formatKarigarName(order.karigarName);
        if (orderKarigar !== filters.karigar) return false;
      }
      
      if (filters.coOnly && !order.isCustomerOrder) return false;
      if (filters.status && order.status !== filters.status) return false;
      
      if (filters.dateFrom || filters.dateTo) {
        const orderDate = new Date(Number(order.uploadDate) / 1000000);
        if (filters.dateFrom && orderDate < filters.dateFrom) return false;
        if (filters.dateTo && orderDate > filters.dateTo) return false;
      }
      
      return true;
    });

    return sortOrdersDesignWise(filtered);
  }, [orders, filters]);

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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Orders</CardTitle>
            <ExportActions orders={filteredAndSortedOrders} />
          </div>
          <OrdersFiltersBar
            orders={orders}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            </div>
          ) : (
            <OrdersTable orders={filteredAndSortedOrders} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
