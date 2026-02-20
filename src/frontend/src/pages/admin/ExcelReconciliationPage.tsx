import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useGetOrders, useGetMasterDesigns, useUploadParsedOrders } from '../../hooks/useQueries';
import { parseOrdersFromWorkbook } from '../../lib/parsers/excel/parseOrdersFromWorkbook';
import { readWorkbookFromFile } from '../../lib/parsers/excel/readWorkbookFromFile';
import { compareOrdersWithExcel } from '../../lib/reconciliation/compareOrdersWithExcel';
import { ReconciliationReport } from '../../components/reconciliation/ReconciliationReport';
import { ReconciliationFileUpload } from '../../components/reconciliation/ReconciliationFileUpload';
import type { PersistentOrder } from '../../backend';
import { toast } from 'sonner';

export function ExcelReconciliationPage() {
  const { data: orders = [], isLoading: ordersLoading } = useGetOrders();
  const { data: masterDesigns = [], isLoading: masterDesignsLoading } = useGetMasterDesigns();
  const uploadMutation = useUploadParsedOrders();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<PersistentOrder[]>([]);
  const [reconciliationResult, setReconciliationResult] = useState<{
    matched: PersistentOrder[];
    missing: PersistentOrder[];
    unmapped: PersistentOrder[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedOrders([]);
    setReconciliationResult(null);
    setParsing(true);

    try {
      // Read workbook
      const workbook = await readWorkbookFromFile(file);
      
      // Parse orders with current date as upload date
      const parseResult = parseOrdersFromWorkbook(workbook, new Date());
      
      if (parseResult.orders.length === 0) {
        setParseError('No valid orders found in the Excel file');
        setParsing(false);
        return;
      }

      setParsedOrders(parseResult.orders);

      // Compare with existing orders
      const result = compareOrdersWithExcel(parseResult.orders, orders, masterDesigns);
      setReconciliationResult(result);

      toast.success(`Parsed ${parseResult.orders.length} orders from Excel`);
    } catch (error: any) {
      console.error('Excel parsing error:', error);
      setParseError(error.message || 'Failed to parse Excel file');
      toast.error('Failed to parse Excel file');
    } finally {
      setParsing(false);
    }
  };

  const handleBulkImport = async () => {
    if (!reconciliationResult || reconciliationResult.missing.length === 0) {
      return;
    }

    try {
      await uploadMutation.mutateAsync(reconciliationResult.missing);
      toast.success(`Successfully imported ${reconciliationResult.missing.length} missing orders`);
      
      // Reset state
      setSelectedFile(null);
      setParsedOrders([]);
      setReconciliationResult(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import orders');
    }
  };

  const isLoading = ordersLoading || masterDesignsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Excel Order Reconciliation</h1>
        <p className="text-muted-foreground">
          Upload customer portal Excel files to compare against existing orders and identify missing entries
        </p>
      </div>

      {isLoading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-white">
            Loading orders and master designs...
          </AlertDescription>
        </Alert>
      )}

      <Card className="card-glow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Upload an Excel file from customer portals to reconcile orders. The system will compare against all orders except those with "Billed" status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReconciliationFileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            parsing={parsing}
            disabled={isLoading}
          />

          {parseError && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-white">{parseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {reconciliationResult && (
        <Card className="card-glow-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5" />
              Reconciliation Summary
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Comparison results between uploaded Excel and existing orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-sm text-muted-foreground mb-1">Matched Orders</div>
                <div className="text-2xl font-bold text-green-400">{reconciliationResult.matched.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Already in system</div>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-sm text-muted-foreground mb-1">Missing Orders</div>
                <div className="text-2xl font-bold text-yellow-400">{reconciliationResult.missing.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Need to be imported</div>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-sm text-muted-foreground mb-1">Unmapped Designs</div>
                <div className="text-2xl font-bold text-red-400">{reconciliationResult.unmapped.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Design codes not in master</div>
              </div>
            </div>

            {reconciliationResult.missing.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleBulkImport}
                  disabled={uploadMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {reconciliationResult.missing.length} Missing Orders
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reconciliationResult && (
        <ReconciliationReport
          matched={reconciliationResult.matched}
          missing={reconciliationResult.missing}
          unmapped={reconciliationResult.unmapped}
        />
      )}
    </div>
  );
}
