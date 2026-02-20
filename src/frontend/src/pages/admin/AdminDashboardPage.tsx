import { useState, useMemo } from 'react';
import { useGetOrders, useListKarigarReference, useCancelDeliveredOrders, useMarkGivenToHallmark, useReturnFromHallmark, useProcessPartialFulfillment } from '../../hooks/useQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { OrdersFiltersBar } from '../../components/orders/OrdersFiltersBar';
import { KarigarSummaryCards } from '../../components/admin/KarigarSummaryCards';
import { TotalQtyBreakdownDialog } from '../../components/admin/TotalQtyBreakdownDialog';
import { MetricsChart } from '../../components/admin/MetricsChart';
import { ExportActions } from '../../components/exports/ExportActions';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';
import { isCustomerOrder } from '../../lib/orders/isCustomerOrder';
import { isTodayOrder } from '../../lib/orders/isTodayOrder';
import { normalizeStatus } from '../../lib/orders/normalizeStatus';
import { ORDER_STATUS } from '../../lib/orders/statusConstants';
import { Info, X, FileDown, Send, RotateCcw, Ban } from 'lucide-react';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { downloadKarigarPDF, downloadKarigarJPEG } from '../../lib/exports/karigarOrdersDownloads';
import { exportOrders } from '../../lib/exports/ordersExport';
import type { PersistentOrder, PartialFulfillmentRequest } from '../../backend';
import { PartialFulfillmentDialog } from '../../components/orders/PartialFulfillmentDialog';

type TabValue = 'today' | 'delivered' | 'hallmark' | 'total' | 'customer' | 'karigars';
type HallmarkFilterType = 'all' | 'given' | 'returned';

interface OrderFilters {
  searchQuery: string;
  fromDate: Date | null;
  toDate: Date | null;
  selectedKarigar: string | null;
  selectedStatus: string | null;
  showCOOnly: boolean;
  showRBOnly: boolean;
  showGivenToHallmark: boolean;
}

export function AdminDashboardPage() {
  const { data: allOrders = [], isLoading, error, refetch } = useGetOrders();
  const { data: karigars = [] } = useListKarigarReference();
  const [activeTab, setActiveTab] = useState<TabValue>('today');
  const [showBreakdownDialog, setShowBreakdownDialog] = useState(false);
  const [selectedKarigar, setSelectedKarigar] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [hallmarkFilter, setHallmarkFilter] = useState<HallmarkFilterType>('all');
  const [showPartialDialog, setShowPartialDialog] = useState(false);

  const cancelDeliveredMutation = useCancelDeliveredOrders();
  const markGivenToHallmarkMutation = useMarkGivenToHallmark();
  const returnFromHallmarkMutation = useReturnFromHallmark();
  const partialFulfillmentMutation = useProcessPartialFulfillment();

  // Individual filter states per tab
  const [deliveredFilters, setDeliveredFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: new Date(),
    toDate: new Date(),
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
    showGivenToHallmark: false,
  });

  const [hallmarkFilters, setHallmarkFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: new Date(),
    toDate: new Date(),
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
    showGivenToHallmark: false,
  });

  const [totalFilters, setTotalFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: null,
    toDate: null,
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
    showGivenToHallmark: false,
  });

  const [customerFilters, setCustomerFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: null,
    toDate: null,
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
    showGivenToHallmark: false,
  });

  const [karigarFilters, setKarigarFilters] = useState<OrderFilters>({
    searchQuery: '',
    fromDate: null,
    toDate: null,
    selectedKarigar: null,
    selectedStatus: null,
    showCOOnly: false,
    showRBOnly: false,
    showGivenToHallmark: false,
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

  // Tab-specific datasets
  const todayOrders = useMemo(() => {
    return allOrders.filter((order) => isTodayOrder(order));
  }, [allOrders]);

  const deliveredOrders = useMemo(() => {
    const baseOrders = allOrders.filter((o) => {
      const orderDate = getOrderTimestamp(o);
      const isInRange = orderDate >= startOfDay(deliveredFilters.fromDate || new Date()) && 
                       orderDate <= endOfDay(deliveredFilters.toDate || new Date());
      return normalizeStatus(o.status) === normalizeStatus(ORDER_STATUS.DELIVERED) && isInRange;
    });
    return applyFilters(baseOrders, deliveredFilters);
  }, [allOrders, deliveredFilters]);

  const hallmarkOrders = useMemo(() => {
    let baseOrders = allOrders.filter((o) => {
      const orderDate = getOrderTimestamp(o);
      const isInRange = orderDate >= startOfDay(hallmarkFilters.fromDate || new Date()) && 
                       orderDate <= endOfDay(hallmarkFilters.toDate || new Date());
      const normalizedStatus = normalizeStatus(o.status);
      return (normalizedStatus === normalizeStatus(ORDER_STATUS.GIVEN_TO_HALLMARK) || 
              normalizedStatus === normalizeStatus(ORDER_STATUS.RETURNED_FROM_HALLMARK)) && isInRange;
    });

    // Apply hallmark-specific filter
    if (hallmarkFilter === 'given') {
      baseOrders = baseOrders.filter(o => normalizeStatus(o.status) === normalizeStatus(ORDER_STATUS.GIVEN_TO_HALLMARK));
    } else if (hallmarkFilter === 'returned') {
      baseOrders = baseOrders.filter(o => normalizeStatus(o.status) === normalizeStatus(ORDER_STATUS.RETURNED_FROM_HALLMARK));
    }

    return applyFilters(baseOrders, hallmarkFilters);
  }, [allOrders, hallmarkFilters, hallmarkFilter]);

  const totalOrders = useMemo(() => {
    // Include only Pending and Returned from Hallmark orders
    const baseOrders = allOrders.filter((o) => {
      const normalizedStatus = normalizeStatus(o.status);
      return normalizedStatus === normalizeStatus(ORDER_STATUS.PENDING) || 
             normalizedStatus === normalizeStatus(ORDER_STATUS.RETURNED_FROM_HALLMARK);
    });
    
    return applyFilters(baseOrders, totalFilters);
  }, [allOrders, totalFilters]);

  const customerOrders = useMemo(() => {
    const baseOrders = allOrders.filter((o) => {
      const normalizedStatus = normalizeStatus(o.status);
      return isCustomerOrder(o.orderType) && normalizedStatus === normalizeStatus(ORDER_STATUS.PENDING);
    });
    return applyFilters(baseOrders, customerFilters);
  }, [allOrders, customerFilters]);

  const karigarOrders = useMemo(() => {
    let baseOrders = selectedKarigar
      ? allOrders.filter((o) => o.karigarId === selectedKarigar)
      : allOrders;
    
    // When a karigar is selected, show only pending and returned_from_hallmark orders
    if (selectedKarigar) {
      baseOrders = baseOrders.filter((o) => {
        const normalizedStatus = normalizeStatus(o.status);
        return normalizedStatus === normalizeStatus(ORDER_STATUS.PENDING) || 
               normalizedStatus === normalizeStatus(ORDER_STATUS.RETURNED_FROM_HALLMARK);
      });
    }
    
    return applyFilters(baseOrders, karigarFilters);
  }, [allOrders, selectedKarigar, karigarFilters]);

  // Compute active dataset for metrics
  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'today':
        return todayOrders;
      case 'delivered':
        return deliveredOrders;
      case 'hallmark':
        return hallmarkOrders;
      case 'total':
        return totalOrders;
      case 'customer':
        return customerOrders;
      case 'karigars':
        return karigarOrders;
      default:
        return [];
    }
  }, [activeTab, todayOrders, deliveredOrders, hallmarkOrders, totalOrders, customerOrders, karigarOrders]);

  // Breakdown data for dialog
  const breakdownData = useMemo(() => {
    return {
      delivered: deliveredOrders.reduce((sum, o) => sum + Number(o.qty), 0),
      hallmark: hallmarkOrders.reduce((sum, o) => sum + Number(o.qty), 0),
      totalOrders: totalOrders.reduce((sum, o) => sum + Number(o.qty), 0),
      customerOrders: customerOrders.reduce((sum, o) => sum + Number(o.qty), 0),
      karigars: karigarOrders.reduce((sum, o) => sum + Number(o.qty), 0),
    };
  }, [deliveredOrders, hallmarkOrders, totalOrders, customerOrders, karigarOrders]);

  const handleKarigarSelect = (karigarId: string) => {
    setSelectedKarigar(karigarId);
    setActiveTab('karigars');
    setSelectedOrders([]);
  };

  const handleKarigarDeselect = () => {
    setSelectedKarigar(null);
    setSelectedOrders([]);
  };

  // Bulk action handlers
  const handleCancelDelivered = async () => {
    if (selectedOrders.length === 0) return;
    
    const confirmed = window.confirm(`Cancel ${selectedOrders.length} selected order(s)?`);
    if (!confirmed) return;

    try {
      await cancelDeliveredMutation.mutateAsync(selectedOrders);
      toast.success(`${selectedOrders.length} order(s) cancelled successfully`);
      setSelectedOrders([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel orders');
    }
  };

  const handleGivenToHallmark = async () => {
    if (selectedOrders.length === 0) return;

    // Check if any selected orders are RB type
    const selectedOrdersData = allOrders.filter(o => selectedOrders.includes(o.orderNo));
    const hasRBOrders = selectedOrdersData.some(o => o.orderType === 'RB');

    if (hasRBOrders) {
      // Show partial fulfillment dialog for RB orders
      setShowPartialDialog(true);
    } else {
      // Directly mark as given to hallmark
      try {
        await markGivenToHallmarkMutation.mutateAsync(selectedOrders);
        toast.success(`${selectedOrders.length} order(s) marked as given to hallmark`);
        setSelectedOrders([]);
      } catch (error: any) {
        toast.error(error.message || 'Failed to mark orders');
      }
    }
  };

  const handleReturnFromHallmark = async () => {
    if (selectedOrders.length === 0) return;

    try {
      await returnFromHallmarkMutation.mutateAsync(selectedOrders);
      toast.success(`${selectedOrders.length} order(s) returned from hallmark`);
      setSelectedOrders([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to return orders');
    }
  };

  const handlePartialFulfillmentConfirm = async (quantities: Map<string, number>) => {
    try {
      const entries = Array.from(quantities.entries()).map(([orderNo, suppliedQty]) => ({
        orderNo,
        suppliedQty: BigInt(suppliedQty),
      }));

      const request: PartialFulfillmentRequest = { entries };
      await partialFulfillmentMutation.mutateAsync(request);
      
      toast.success('Orders processed successfully');
      setSelectedOrders([]);
      setShowPartialDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process orders');
    }
  };

  // Karigar export handlers
  const handleKarigarExport = (format: 'pdf' | 'jpeg' | 'excel') => {
    if (!selectedKarigar || karigarOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const karigarData = karigars.find(k => k.id === selectedKarigar);
    const karigarName = karigarData?.name || 'Unknown';

    try {
      if (format === 'pdf') {
        downloadKarigarPDF({
          karigarName,
          orders: karigarOrders,
          exportScope: 'total',
        });
        toast.success('PDF export initiated');
      } else if (format === 'jpeg') {
        downloadKarigarJPEG({
          karigarName,
          orders: karigarOrders,
          exportScope: 'total',
        });
        toast.success('JPEG export started');
      } else if (format === 'excel') {
        exportOrders(karigarOrders, 'karigar');
        toast.success('Excel export completed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
    setSelectedOrders([]);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
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
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowBreakdownDialog(true)} className="gap-2">
            <Info className="h-4 w-4" />
            Total Qty Breakdown
          </Button>
          <ExportActions filteredOrders={activeDataset} />
        </div>
      </div>

      {/* Metrics Chart */}
      <MetricsChart orders={activeDataset} />

      {/* Karigar Summary Cards - Only show in Total Orders and Karigars tabs */}
      {(activeTab === 'total' || activeTab === 'karigars') && (
        <KarigarSummaryCards
          orders={activeDataset}
          selectedKarigar={selectedKarigar}
          onKarigarSelect={handleKarigarSelect}
          onKarigarDeselect={handleKarigarDeselect}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="admin-tabs-list w-full justify-start overflow-x-auto">
          <TabsTrigger value="today" className="admin-tabs-trigger min-h-[44px]">
            Today
          </TabsTrigger>
          <TabsTrigger value="delivered" className="admin-tabs-trigger min-h-[44px]">
            Delivered
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="admin-tabs-trigger min-h-[44px]">
            Hallmark
          </TabsTrigger>
          <TabsTrigger value="total" className="admin-tabs-trigger min-h-[44px]">
            Total Orders
          </TabsTrigger>
          <TabsTrigger value="customer" className="admin-tabs-trigger min-h-[44px]">
            Customer Orders
          </TabsTrigger>
          <TabsTrigger value="karigars" className="admin-tabs-trigger min-h-[44px]">
            By Karigar
          </TabsTrigger>
        </TabsList>

        {/* Today Tab */}
        <TabsContent value="today" className="space-y-6 tab-content-slide">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Today's Orders</h3>
                  <span className="text-sm text-muted-foreground">
                    {todayOrders.length} order(s)
                  </span>
                </div>
                <OrdersTable
                  orders={todayOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivered Tab */}
        <TabsContent value="delivered" className="space-y-6 tab-content-slide">
          <OrdersFiltersBar
            searchQuery={deliveredFilters.searchQuery}
            onSearchChange={(query) => setDeliveredFilters({ ...deliveredFilters, searchQuery: query })}
            fromDate={deliveredFilters.fromDate}
            toDate={deliveredFilters.toDate}
            onFromDateChange={(date) => setDeliveredFilters({ ...deliveredFilters, fromDate: date })}
            onToDateChange={(date) => setDeliveredFilters({ ...deliveredFilters, toDate: date })}
            selectedKarigar={deliveredFilters.selectedKarigar}
            onKarigarChange={(karigarId) => setDeliveredFilters({ ...deliveredFilters, selectedKarigar: karigarId })}
            selectedStatus={deliveredFilters.selectedStatus}
            onStatusChange={(status) => setDeliveredFilters({ ...deliveredFilters, selectedStatus: status })}
            showCOOnly={deliveredFilters.showCOOnly}
            onCOOnlyChange={(value) => setDeliveredFilters({ ...deliveredFilters, showCOOnly: value })}
            showRBOnly={deliveredFilters.showRBOnly}
            onRBOnlyChange={(value) => setDeliveredFilters({ ...deliveredFilters, showRBOnly: value })}
            karigars={karigars}
            onClearFilters={() => setDeliveredFilters({
              searchQuery: '',
              fromDate: new Date(),
              toDate: new Date(),
              selectedKarigar: null,
              selectedStatus: null,
              showCOOnly: false,
              showRBOnly: false,
              showGivenToHallmark: false,
            })}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-lg font-semibold">Delivered Orders</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {deliveredOrders.length} order(s)
                    </span>
                    {selectedOrders.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelDelivered}
                        disabled={cancelDeliveredMutation.isPending}
                        className="gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Cancel ({selectedOrders.length})
                      </Button>
                    )}
                  </div>
                </div>
                <OrdersTable
                  orders={deliveredOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hallmark Tab */}
        <TabsContent value="hallmark" className="space-y-6 tab-content-slide">
          <OrdersFiltersBar
            searchQuery={hallmarkFilters.searchQuery}
            onSearchChange={(query) => setHallmarkFilters({ ...hallmarkFilters, searchQuery: query })}
            fromDate={hallmarkFilters.fromDate}
            toDate={hallmarkFilters.toDate}
            onFromDateChange={(date) => setHallmarkFilters({ ...hallmarkFilters, fromDate: date })}
            onToDateChange={(date) => setHallmarkFilters({ ...hallmarkFilters, toDate: date })}
            selectedKarigar={hallmarkFilters.selectedKarigar}
            onKarigarChange={(karigarId) => setHallmarkFilters({ ...hallmarkFilters, selectedKarigar: karigarId })}
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
              showGivenToHallmark: false,
            })}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">Hallmark Orders</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="hallmark-filter" className="text-sm">Filter:</Label>
                      <Select value={hallmarkFilter} onValueChange={(v) => setHallmarkFilter(v as HallmarkFilterType)}>
                        <SelectTrigger id="hallmark-filter" className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="given">Given to Hallmark</SelectItem>
                          <SelectItem value="returned">Returned from Hallmark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {hallmarkOrders.length} order(s)
                    </span>
                    {selectedOrders.length > 0 && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleGivenToHallmark}
                          disabled={markGivenToHallmarkMutation.isPending}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4" />
                          Given to Hallmark ({selectedOrders.length})
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleReturnFromHallmark}
                          disabled={returnFromHallmarkMutation.isPending}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Return from Hallmark ({selectedOrders.length})
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <OrdersTable
                  orders={hallmarkOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Total Orders Tab */}
        <TabsContent value="total" className="space-y-6 tab-content-slide">
          <OrdersFiltersBar
            searchQuery={totalFilters.searchQuery}
            onSearchChange={(query) => setTotalFilters({ ...totalFilters, searchQuery: query })}
            fromDate={totalFilters.fromDate}
            toDate={totalFilters.toDate}
            onFromDateChange={(date) => setTotalFilters({ ...totalFilters, fromDate: date })}
            onToDateChange={(date) => setTotalFilters({ ...totalFilters, toDate: date })}
            selectedKarigar={totalFilters.selectedKarigar}
            onKarigarChange={(karigarId) => setTotalFilters({ ...totalFilters, selectedKarigar: karigarId })}
            selectedStatus={totalFilters.selectedStatus}
            onStatusChange={(status) => setTotalFilters({ ...totalFilters, selectedStatus: status })}
            showCOOnly={totalFilters.showCOOnly}
            onCOOnlyChange={(value) => setTotalFilters({ ...totalFilters, showCOOnly: value })}
            showRBOnly={totalFilters.showRBOnly}
            onRBOnlyChange={(value) => setTotalFilters({ ...totalFilters, showRBOnly: value })}
            karigars={karigars}
            onClearFilters={() => setTotalFilters({
              searchQuery: '',
              fromDate: null,
              toDate: null,
              selectedKarigar: null,
              selectedStatus: null,
              showCOOnly: false,
              showRBOnly: false,
              showGivenToHallmark: false,
            })}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-lg font-semibold">Total Orders (Pending + Returned from Hallmark)</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {totalOrders.length} order(s)
                    </span>
                    {selectedOrders.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleGivenToHallmark}
                        disabled={markGivenToHallmarkMutation.isPending}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4" />
                        Given to Hallmark ({selectedOrders.length})
                      </Button>
                    )}
                  </div>
                </div>
                <OrdersTable
                  orders={totalOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Orders Tab */}
        <TabsContent value="customer" className="space-y-6 tab-content-slide">
          <OrdersFiltersBar
            searchQuery={customerFilters.searchQuery}
            onSearchChange={(query) => setCustomerFilters({ ...customerFilters, searchQuery: query })}
            fromDate={customerFilters.fromDate}
            toDate={customerFilters.toDate}
            onFromDateChange={(date) => setCustomerFilters({ ...customerFilters, fromDate: date })}
            onToDateChange={(date) => setCustomerFilters({ ...customerFilters, toDate: date })}
            selectedKarigar={customerFilters.selectedKarigar}
            onKarigarChange={(karigarId) => setCustomerFilters({ ...customerFilters, selectedKarigar: karigarId })}
            selectedStatus={customerFilters.selectedStatus}
            onStatusChange={(status) => setCustomerFilters({ ...customerFilters, selectedStatus: status })}
            showCOOnly={customerFilters.showCOOnly}
            onCOOnlyChange={(value) => setCustomerFilters({ ...customerFilters, showCOOnly: value })}
            showRBOnly={customerFilters.showRBOnly}
            onRBOnlyChange={(value) => setCustomerFilters({ ...customerFilters, showRBOnly: value })}
            karigars={karigars}
            onClearFilters={() => setCustomerFilters({
              searchQuery: '',
              fromDate: null,
              toDate: null,
              selectedKarigar: null,
              selectedStatus: null,
              showCOOnly: false,
              showRBOnly: false,
              showGivenToHallmark: false,
            })}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Customer Orders</h3>
                  <span className="text-sm text-muted-foreground">
                    {customerOrders.length} order(s)
                  </span>
                </div>
                <OrdersTable
                  orders={customerOrders}
                  karigars={karigars}
                  selectedOrders={selectedOrders}
                  onSelectionChange={setSelectedOrders}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Karigar Tab */}
        <TabsContent value="karigars" className="space-y-6 tab-content-slide">
          {selectedKarigar && (
            <>
              <OrdersFiltersBar
                searchQuery={karigarFilters.searchQuery}
                onSearchChange={(query) => setKarigarFilters({ ...karigarFilters, searchQuery: query })}
                fromDate={karigarFilters.fromDate}
                toDate={karigarFilters.toDate}
                onFromDateChange={(date) => setKarigarFilters({ ...karigarFilters, fromDate: date })}
                onToDateChange={(date) => setKarigarFilters({ ...karigarFilters, toDate: date })}
                selectedKarigar={karigarFilters.selectedKarigar}
                onKarigarChange={(karigarId) => setKarigarFilters({ ...karigarFilters, selectedKarigar: karigarId })}
                selectedStatus={karigarFilters.selectedStatus}
                onStatusChange={(status) => setKarigarFilters({ ...karigarFilters, selectedStatus: status })}
                showCOOnly={karigarFilters.showCOOnly}
                onCOOnlyChange={(value) => setKarigarFilters({ ...karigarFilters, showCOOnly: value })}
                showRBOnly={karigarFilters.showRBOnly}
                onRBOnlyChange={(value) => setKarigarFilters({ ...karigarFilters, showRBOnly: value })}
                karigars={karigars}
                onClearFilters={() => setKarigarFilters({
                  searchQuery: '',
                  fromDate: null,
                  toDate: null,
                  selectedKarigar: null,
                  selectedStatus: null,
                  showCOOnly: false,
                  showRBOnly: false,
                  showGivenToHallmark: false,
                })}
              />

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          Orders for {karigars.find(k => k.id === selectedKarigar)?.name || 'Unknown'}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={handleKarigarDeselect}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {karigarOrders.length} order(s)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKarigarExport('excel')}
                          className="gap-2"
                        >
                          <FileDown className="h-4 w-4" />
                          Excel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKarigarExport('pdf')}
                          className="gap-2"
                        >
                          <FileDown className="h-4 w-4" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKarigarExport('jpeg')}
                          className="gap-2"
                        >
                          <FileDown className="h-4 w-4" />
                          JPEG
                        </Button>
                      </div>
                    </div>
                    <OrdersTable
                      orders={karigarOrders}
                      karigars={karigars}
                      selectedOrders={selectedOrders}
                      onSelectionChange={setSelectedOrders}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!selectedKarigar && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Select a karigar from the summary cards above to view their orders
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TotalQtyBreakdownDialog
        open={showBreakdownDialog}
        onOpenChange={setShowBreakdownDialog}
        breakdownData={breakdownData}
      />

      <PartialFulfillmentDialog
        open={showPartialDialog}
        onOpenChange={setShowPartialDialog}
        orders={allOrders.filter(o => selectedOrders.includes(o.orderNo))}
        onConfirm={handlePartialFulfillmentConfirm}
        isSubmitting={partialFulfillmentMutation.isPending}
      />
    </div>
  );
}
