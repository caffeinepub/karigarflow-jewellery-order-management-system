import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useGetActiveOrdersForKarigar, useIsCallerApproved, useRequestApproval, useBulkUpdateOrderStatus } from '../../hooks/useQueries';
import { OrdersTable } from '../../components/orders/OrdersTable';
import { KarigarExportControls } from '../../components/exports/KarigarExportControls';
import { KarigarOrderViewDialog } from '../../components/karigar/KarigarOrderViewDialog';
import { sortOrdersDesignWise } from '../../lib/orders/sortOrdersDesignWise';
import { downloadKarigarPDF, downloadKarigarJPEG } from '../../lib/exports/karigarOrdersDownloads';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { toast } from 'sonner';
import type { PersistentOrder } from '../../backend';

export function KarigarDashboardPage() {
  const { userProfile } = useCurrentUser();
  const { data: isApproved, isLoading: checkingApproval } = useIsCallerApproved();
  const { data: orders, isLoading: loadingOrders, isError, error } = useGetActiveOrdersForKarigar();
  const requestApprovalMutation = useRequestApproval();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [viewOrder, setViewOrder] = useState<PersistentOrder | null>(null);

  const handleRequestApproval = async () => {
    try {
      await requestApprovalMutation.mutateAsync();
      toast.success('Approval request submitted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request approval');
    }
  };

  const handleMarkAsDelivered = async () => {
    if (selectedOrders.size === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: Array.from(selectedOrders),
        newStatus: 'delivered',
      });
      toast.success(`Marked ${selectedOrders.size} orders as delivered`);
      setSelectedOrders(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update orders');
    }
  };

  const handleExport = async (format: 'pdf' | 'jpeg', filteredOrders: PersistentOrder[], scope: string) => {
    if (!userProfile?.karigarName) {
      toast.error('Karigar name not found');
      return;
    }

    try {
      if (format === 'pdf') {
        downloadKarigarPDF({
          karigarName: userProfile.karigarName,
          orders: filteredOrders,
          dateLabel: scope,
          exportScope: 'daily',
        });
        toast.success('PDF export initiated');
      } else {
        await downloadKarigarJPEG({
          karigarName: userProfile.karigarName,
          orders: filteredOrders,
          dateLabel: scope,
          exportScope: 'daily',
        });
        toast.success('JPEG downloaded successfully');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    }
  };

  if (checkingApproval || loadingOrders) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <Card>
          <CardHeader>
            <CardTitle>Approval Required</CardTitle>
            <CardDescription>
              Your account is pending approval from an administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please request approval to access your orders. An administrator will review your request.
              </AlertDescription>
            </Alert>
            <Button
              onClick={handleRequestApproval}
              disabled={requestApprovalMutation.isPending}
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

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load orders'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedOrders = sortOrdersDesignWise(orders || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground mt-2">
          {sortedOrders.length} active orders
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders:</span>
                <span className="font-medium">{sortedOrders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected:</span>
                <span className="font-medium">{selectedOrders.size}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <KarigarExportControls
          orders={sortedOrders}
          onExport={handleExport}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
          <CardDescription>
            Select orders to mark as delivered
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleMarkAsDelivered}
              disabled={selectedOrders.size === 0 || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
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
            karigarMode
            onViewOrder={setViewOrder}
          />
        </CardContent>
      </Card>

      <KarigarOrderViewDialog
        order={viewOrder}
        open={!!viewOrder}
        onOpenChange={(open) => !open && setViewOrder(null)}
      />
    </div>
  );
}
