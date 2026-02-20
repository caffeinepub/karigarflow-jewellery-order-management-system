import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CameraOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGetOrders, useMarkGivenToHallmark } from '../../hooks/useQueries';
import { parseBarcodeData } from '../../lib/barcode/parseBarcodeData';
import { normalizeDesignCode } from '../../lib/mapping/normalizeDesignCode';
import { normalizeStatus } from '../../lib/orders/normalizeStatus';
import { BarcodeOrdersList } from './BarcodeOrdersList';
import { toast } from 'sonner';

export function FastScannerView() {
  const { data: orders = [], isLoading } = useGetOrders();
  const markHallmarkMutation = useMarkGivenToHallmark();

  const [cameraActive, setCameraActive] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [scannedOrderNos, setScannedOrderNos] = useState<Set<string>>(new Set());
  const [highlightedOrderNo, setHighlightedOrderNo] = useState<string | null>(null);
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

    // Check if already scanned in this session
    if (scannedOrderNos.has(matchingOrder.orderNo)) {
      toast.warning('Order already scanned in this session');
      return;
    }

    // Highlight the order
    setHighlightedOrderNo(matchingOrder.orderNo);
  };

  const handleMarkForHallmark = async () => {
    if (!highlightedOrderNo) return;

    try {
      await markHallmarkMutation.mutateAsync([highlightedOrderNo]);
      setScannedOrderNos(prev => new Set([...prev, highlightedOrderNo]));
      setScannedCount(prev => prev + 1);
      setHighlightedOrderNo(null);
      toast.success('Order marked as Given for Hallmark');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark order');
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
              Scanned: {scannedCount} items
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
          <Button type="submit" className="text-white">Scan</Button>
        </div>
      </form>

      {/* Highlighted Order */}
      {highlightedOrderNo && (
        <Alert className="bg-purple-900/50 border-purple-500">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between text-white">
            <span>Order {highlightedOrderNo} found and ready to mark</span>
            <Button
              onClick={handleMarkForHallmark}
              disabled={markHallmarkMutation.isPending}
              size="sm"
              className="ml-4 text-white"
            >
              {markHallmarkMutation.isPending ? 'Marking...' : 'Mark for Hallmark'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Orders List */}
      <BarcodeOrdersList
        orders={availableOrders}
        highlightedOrderNo={highlightedOrderNo}
        scannedOrderNos={scannedOrderNos}
      />
    </div>
  );
}
