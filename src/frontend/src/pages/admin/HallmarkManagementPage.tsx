import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClipboardCheck, AlertCircle } from 'lucide-react';
import { useGetGivenToHallmarkOrders, useBulkUpdateOrderStatus } from '../../hooks/useQueries';
import { HallmarkOrdersGroupedByDate } from '../../components/hallmark/HallmarkOrdersGroupedByDate';
import { STATUS_BILLED } from '../../lib/orders/statusConstants';
import { toast } from 'sonner';

export function HallmarkManagementPage() {
  const { data: hallmarkOrders = [], isLoading } = useGetGivenToHallmarkOrders();
  const bulkUpdateMutation = useBulkUpdateOrderStatus();

  const [selectedOrderNos, setSelectedOrderNos] = useState<string[]>([]);

  const handleMarkAsBilled = async () => {
    if (selectedOrderNos.length === 0) {
      toast.error('Please select orders to mark as billed');
      return;
    }

    try {
      await bulkUpdateMutation.mutateAsync({
        orderNos: selectedOrderNos,
        newStatus: STATUS_BILLED,
      });
      toast.success(`Marked ${selectedOrderNos.length} orders as Billed`);
      setSelectedOrderNos([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark orders as billed');
    }
  };

  const totalQuantity = useMemo(() => {
    return hallmarkOrders.reduce((sum, order) => sum + Number(order.qty), 0);
  }, [hallmarkOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Hallmark Management</h1>
        <p className="text-muted-foreground">
          Manage orders marked as "Given for Hallmark" and process billing
        </p>
      </div>

      {/* Summary Card */}
      <Card className="card-glow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ClipboardCheck className="h-5 w-5" />
            Hallmark Orders Summary
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Orders currently with hallmark, grouped by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-white">{hallmarkOrders.length}</div>
            </div>
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <div className="text-sm text-muted-foreground mb-1">Total Quantity</div>
              <div className="text-2xl font-bold text-white">{totalQuantity}</div>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="text-sm text-muted-foreground mb-1">Selected</div>
              <div className="text-2xl font-bold text-white">{selectedOrderNos.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedOrderNos.length > 0 && (
        <Alert className="bg-primary/10 border-primary/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between text-white">
            <span>{selectedOrderNos.length} orders selected</span>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedOrderNos([])}
                variant="outline"
                size="sm"
                className="text-white"
              >
                Clear Selection
              </Button>
              <Button
                onClick={handleMarkAsBilled}
                disabled={bulkUpdateMutation.isPending}
                size="sm"
                className="text-white"
              >
                {bulkUpdateMutation.isPending ? 'Processing...' : 'Mark as Billed'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Orders Grouped by Date */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading hallmark orders...</p>
          </div>
        </div>
      ) : hallmarkOrders.length === 0 ? (
        <Alert>
          <AlertDescription className="text-white">
            No orders currently marked as "Given for Hallmark"
          </AlertDescription>
        </Alert>
      ) : (
        <HallmarkOrdersGroupedByDate
          orders={hallmarkOrders}
          selectedOrderNos={selectedOrderNos}
          onSelectionChange={setSelectedOrderNos}
        />
      )}
    </div>
  );
}
