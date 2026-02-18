import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useGetActiveOrdersForKarigar, useIsCallerApproved, useRequestApproval, useBulkMarkOrdersAsDelivered } from '../../hooks/useQueries';
import { useOrdersCache } from '../../hooks/useOrdersCache';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { OrdersDataWarningBanner } from '../../components/orders/OrdersDataWarningBanner';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { sanitizeOrders } from '../../lib/orders/validatePersistentOrder';
import type { PersistentOrder } from '../../backend';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export function KarigarDashboardPage() {
  const { data: fetchedOrders, isLoading: fetchingOrders, isError, error } = useGetActiveOrdersForKarigar();
  const { data: isApproved, isLoading: checkingApproval } = useIsCallerApproved();
  const requestApprovalMutation = useRequestApproval();
  const bulkMarkDeliveredMutation = useBulkMarkOrdersAsDelivered();
  
  const { 
    orders: cachedOrders, 
    isLoading: loadingCache, 
    invalidOrdersSkippedCount,
    clearLocalOrdersCacheAndReload 
  } = useOrdersCache();
  
  // Get today's date for default filtering
  const today = new Date();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(today);
  const [toDate, setToDate] = useState<Date | null>(today);
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showCOOnly, setShowCOOnly] = useState(false);
  const [showRBOnly, setShowRBOnly] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);

  const isLoading = fetchingOrders || loadingCache || checkingApproval;
  
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

  const applyFilters = (ordersList: PersistentOrder[]) => {
    return ordersList.filter(order => {
      if (selectedStatus && order.status !== selectedStatus) {
        return false;
      }
      if (searchQuery && !order.orderNo.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      if (showCOOnly && showRBOnly) {
        if (order.orderType !== 'CO' && order.orderType !== 'RB') {
          return false;
        }
      } else if (showCOOnly) {
        if (order.orderType !== 'CO') {
          return false;
        }
      } else if (showRBOnly) {
        if (order.orderType !== 'RB') {
          return false;
        }
      }
      
      if (fromDate || toDate) {
        const orderDate = getOrderTimestamp(order);
        if (fromDate && orderDate < startOfDay(fromDate)) {
          return false;
        }
        if (toDate && orderDate > endOfDay(toDate)) {
          return false;
        }
      }
      return true;
    });
  };

  const filteredOrders = applyFilters(orders);
  const sortedOrders = sortOrdersDesignWise(filteredOrders);
  const metrics = deriveMetrics(filteredOrders);

  const handleRequestApproval = async () => {
    try {
      await requestApprovalMutation.mutateAsync();
      toast.success('Approval request submitted successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to request approval';
      toast.error(errorMsg);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (selectedOrders.size === 0) return;

    try {
      await bulkMarkDeliveredMutation.mutateAsync(Array.from(selectedOrders));
      toast.success(`${selectedOrders.size} orders marked as delivered`);
      setSelectedOrders(new Set());
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark orders as delivered';
      toast.error(errorMsg);
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Karigar Dashboard</h1>
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
        <h1 className="text-3xl font-bold tracking-tight">Karigar Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Karigar Dashboard</h1>
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <CheckCircle2 className="h-5 w-5" />
              Approval Pending
            </CardTitle>
            <CardDescription className="text-amber-800 dark:text-amber-200">
              Your account is awaiting approval from an administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              To access your orders, please request approval from an administrator.
            </p>
            <Button
              onClick={handleRequestApproval}
              disabled={requestApprovalMutation.isPending}
              className="w-full"
            >
              {requestApprovalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                'Request Approval'
              )}
            </Button>
          </CardContent>
        </Card>
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
        <h1 className="text-3xl font-bold tracking-tight">Karigar Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWeight.toFixed(2)}g</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>{sortedOrders.length} active orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrdersFiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            selectedKarigar={selectedKarigar}
            onKarigarChange={setSelectedKarigar}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            showCOOnly={showCOOnly}
            onCOOnlyChange={setShowCOOnly}
            showRBOnly={showRBOnly}
            onRBOnlyChange={setShowRBOnly}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleMarkAsDelivered}
              disabled={selectedOrders.size === 0 || bulkMarkDeliveredMutation.isPending}
            >
              {bulkMarkDeliveredMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Mark as Delivered (${selectedOrders.size})`
              )}
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
            orders={sortedOrders}
            selectionMode
            selectedOrders={selectedOrders}
            onSelectionChange={setSelectedOrders}
          />
        </CardContent>
      </Card>
    </div>
  );
}
