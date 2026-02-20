import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CameraOff, Upload, Trash2 } from 'lucide-react';
import { useGetOrders, useMarkGivenToHallmark } from '../../hooks/useQueries';
import { parseBarcodeData } from '../../lib/barcode/parseBarcodeData';
import { normalizeDesignCode } from '../../lib/mapping/normalizeDesignCode';
import { normalizeStatus } from '../../lib/orders/normalizeStatus';
import { BatchOrdersTable } from './BatchOrdersTable';
import type { SavedOrder } from '../../backend';
import { toast } from 'sonner';

export function BatchScannerView() {
  const { data: orders = [], isLoading } = useGetOrders();
  const markHallmarkMutation = useMarkGivenToHallmark();

  const [cameraActive, setCameraActive] = useState(false);
  const [batchOrders, setBatchOrders] = useState<SavedOrder[]>([]);
  const [manualInput, setManualInput] = useState('');

  // Filter out billed orders
  const availableOrders = orders.filter(
    order => normalizeStatus(order.status) !== 'billed'
  );

  const handleBarcodeScanned = (barcodeText: string) => {
    const parsed = parseBarcodeData(barcodeText);
    if (!parsed) {
      toast.error('Invalid barcode format');
      return;
    }

    const { designCode, orderNumber } = parsed;
    const normalizedDesignCode = normalizeDesignCode(designCode);

    // Find matching order
    const matchingOrder = availableOrders.find(
      order =>
        normalizeDesignCode(order.designCode) === normalizedDesignCode &&
        order.orderNo === orderNumber
    );

    if (!matchingOrder) {
      toast.error(`Order not found: ${designCode} ${orderNumber}`);
      return;
    }

    // Check if already in batch
    if (batchOrders.some(o => o.orderNo === matchingOrder.orderNo)) {
      toast.warning('Order already in batch');
      return;
    }

    // Add to batch
    setBatchOrders(prev => [...prev, matchingOrder]);
    toast.success(`Added ${matchingOrder.orderNo} to batch`);
  };

  const handleRemoveFromBatch = (orderNo: string) => {
    setBatchOrders(prev => prev.filter(o => o.orderNo !== orderNo));
  };

  const handleMarkAllForHallmark = async () => {
    if (batchOrders.length === 0) return;

    try {
      const orderNos = batchOrders.map(o => o.orderNo);
      await markHallmarkMutation.mutateAsync(orderNos);
      toast.success(`Marked ${batchOrders.length} orders as Given for Hallmark`);
      setBatchOrders([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark orders');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleBarcodeScanned(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Status */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-3">
          {cameraActive ? (
            <Camera className="h-5 w-5 text-green-400" />
          ) : (
            <CameraOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium text-white">
              {cameraActive ? 'Scanner Active' : 'Scanner Inactive'}
            </p>
            <p className="text-xs text-muted-foreground">
              Batch: {batchOrders.length} items
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCameraActive(!cameraActive)}
          variant={cameraActive ? 'destructive' : 'default'}
          className="text-white"
        >
          {cameraActive ? 'Stop Scanner' : 'Start Scanner'}
        </Button>
      </div>

      {/* Camera Preview Placeholder */}
      {cameraActive && (
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Camera className="h-16 w-16 text-white/50 mx-auto" />
              <p className="text-white/70">Camera preview would appear here</p>
              <p className="text-sm text-white/50">
                Integrate html5-qrcode or ZXing library for actual barcode scanning
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input for Testing */}
      <form onSubmit={handleManualSubmit} className="space-y-2">
        <label className="text-sm font-medium text-white">Manual Barcode Input (for testing)</label>
        <div className="flex gap-2">
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter barcode (e.g., CHIMN40103 1308)"
            className="flex-1 text-white"
          />
          <Button type="submit" className="text-white">Add to Batch</Button>
        </div>
      </form>

      {/* Batch Orders Table */}
      {batchOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Scanned Batch ({batchOrders.length} orders)
            </h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setBatchOrders([])}
                variant="outline"
                size="sm"
                className="text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Batch
              </Button>
              <Button
                onClick={handleMarkAllForHallmark}
                disabled={markHallmarkMutation.isPending}
                size="sm"
                className="text-white"
              >
                {markHallmarkMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Mark All for Hallmark
                  </>
                )}
              </Button>
            </div>
          </div>
          <BatchOrdersTable
            orders={batchOrders}
            onRemove={handleRemoveFromBatch}
          />
        </div>
      )}

      {batchOrders.length === 0 && (
        <Alert>
          <AlertDescription className="text-white">
            Scan barcodes to add orders to the batch. Once you've scanned all items, click "Mark All for Hallmark" to process them together.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
