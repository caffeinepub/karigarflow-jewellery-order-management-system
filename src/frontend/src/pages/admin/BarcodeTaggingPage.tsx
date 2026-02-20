import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Scan } from 'lucide-react';
import { FastScannerView } from '../../components/barcode/FastScannerView';
import { BatchScannerView } from '../../components/barcode/BatchScannerView';

export function BarcodeTaggingPage() {
  const [activeTab, setActiveTab] = useState<'fast' | 'batch'>('fast');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Barcode Tagging</h1>
        <p className="text-muted-foreground">
          Scan Code 128 barcodes to mark orders as "Given for Hallmark"
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-white">
          This feature requires camera permissions. On mobile devices, the camera will open once and stay active for continuous scanning.
        </AlertDescription>
      </Alert>

      <Card className="card-glow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Scan className="h-5 w-5" />
            Barcode Scanner
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose between Fast Scanner (continuous) or Batch Scanner (review before marking)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fast' | 'batch')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fast" className="text-white">Fast Scanner</TabsTrigger>
              <TabsTrigger value="batch" className="text-white">Batch Scanner</TabsTrigger>
            </TabsList>
            <TabsContent value="fast" className="mt-6">
              <FastScannerView />
            </TabsContent>
            <TabsContent value="batch" className="mt-6">
              <BatchScannerView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
