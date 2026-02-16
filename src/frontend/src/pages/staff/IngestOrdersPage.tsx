import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUploadParsedOrdersBatched, useGetMasterDesigns, type BatchUploadProgress } from '../../hooks/useQueries';
import { useEffectiveAppRole } from '../../hooks/useEffectiveAppRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { IngestionPreviewTable } from '../../components/orders/IngestionPreviewTable';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { ErrorDetailsPanel } from '../../components/errors/ErrorDetailsPanel';
import { parseOrderFile } from '../../lib/parsers/orderParser';
import { applyMasterDesignMapping } from '../../lib/mapping/applyMasterDesignMapping';
import { toast } from 'sonner';
import { Upload, CalendarIcon, CheckCircle, AlertCircle, Info, Loader2, ArrowRight, Copy } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '../../backend';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getStoppedCanisterMessage, presentError } from '@/utils/errorPresentation';
import { AppRole } from '../../backend';

type UploadState = 'idle' | 'uploading' | 'success' | 'partial-success' | 'error';

interface UploadResult {
  state: UploadState;
  successCount: number;
  totalCount: number;
  failedBatches: Array<{ batchIndex: number; error: string }>;
}

export function IngestOrdersPage() {
  const navigate = useNavigate();
  const { effectiveRole } = useEffectiveAppRole();
  const { data: masterDesigns = [], isLoading: masterDesignsLoading, isFetched: masterDesignsFetched } = useGetMasterDesigns();
  const uploadMutation = useUploadParsedOrdersBatched();
  const { copyToClipboard, getButtonLabel } = useCopyToClipboard();
  
  const [uploadDate, setUploadDate] = useState<Date>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [rawOrders, setRawOrders] = useState<Order[]>([]); // Store raw parsed orders
  const [mappedOrders, setMappedOrders] = useState<Order[]>([]);
  const [unmappedOrders, setUnmappedOrders] = useState<Order[]>([]);
  const [unmappedCodes, setUnmappedCodes] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Re-apply mapping when master designs change
  useEffect(() => {
    if (rawOrders.length > 0 && masterDesignsFetched) {
      const result = applyMasterDesignMapping(rawOrders, masterDesigns);
      setMappedOrders(result.mappedOrders);
      setUnmappedOrders(result.unmappedOrders);
      setUnmappedCodes(result.unmappedDesignCodes);
    }
  }, [rawOrders, masterDesigns, masterDesignsFetched]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setRawOrders([]);
    setMappedOrders([]);
    setUnmappedOrders([]);
    setUnmappedCodes([]);
    setUploadResult(null);
    setIsParsing(true);

    try {
      const parsedOrders = await parseOrderFile(selectedFile, uploadDate);
      setRawOrders(parsedOrders);
      
      // Apply mapping
      const result = applyMasterDesignMapping(parsedOrders, masterDesigns);
      setMappedOrders(result.mappedOrders);
      setUnmappedOrders(result.unmappedOrders);
      setUnmappedCodes(result.unmappedDesignCodes);
      
      toast.success(`Parsed ${parsedOrders.length} orders from file`);
    } catch (error) {
      console.error('Parse error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      setParseError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    if (mappedOrders.length === 0) {
      toast.error('No orders to upload');
      return;
    }

    setUploadResult(null);
    setUploadProgress(null);

    try {
      await uploadMutation.mutateAsync({
        orders: mappedOrders,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      // Success
      setUploadResult({
        state: 'success',
        successCount: mappedOrders.length,
        totalCount: mappedOrders.length,
        failedBatches: [],
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Check if it's a partial success (some batches succeeded)
      const failedBatches = error?.failedBatches || [];
      const successCount = mappedOrders.length - (failedBatches.length > 0 ? failedBatches.reduce((sum: number, b: any) => sum + (b.orders?.length || 0), 0) : mappedOrders.length);
      
      if (successCount > 0) {
        setUploadResult({
          state: 'partial-success',
          successCount,
          totalCount: mappedOrders.length,
          failedBatches: failedBatches.map((b: any, idx: number) => ({
            batchIndex: idx,
            error: b.error || 'Unknown error',
          })),
        });
      } else {
        setUploadResult({
          state: 'error',
          successCount: 0,
          totalCount: mappedOrders.length,
          failedBatches: [{
            batchIndex: 0,
            error: error instanceof Error ? error.message : 'Upload failed',
          }],
        });
      }
    }
  };

  const handleNavigateToDashboard = () => {
    if (effectiveRole === AppRole.Admin) {
      navigate({ to: '/admin' });
    } else {
      navigate({ to: '/staff' });
    }
  };

  const handleRetry = () => {
    setUploadResult(null);
    setUploadProgress(null);
    handleUpload();
  };

  const handleReset = () => {
    setFile(null);
    setRawOrders([]);
    setMappedOrders([]);
    setUnmappedOrders([]);
    setUnmappedCodes([]);
    setParseError(null);
    setUploadResult(null);
    setUploadProgress(null);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const copyFailedBatchDetails = () => {
    if (!uploadResult || uploadResult.failedBatches.length === 0) return;
    
    const details = uploadResult.failedBatches
      .map(b => `Batch ${b.batchIndex + 1}: ${b.error}`)
      .join('\n');
    
    copyToClipboard(details);
  };

  const isUploading = uploadMutation.isPending;
  const showPreview = rawOrders.length > 0 && !uploadResult;
  const showUploadResult = uploadResult !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ingest Orders</h1>
        <p className="text-muted-foreground">Upload and process order files</p>
      </div>

      {/* Upload Result Panel */}
      {showUploadResult && (
        <Card className={
          uploadResult.state === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          uploadResult.state === 'partial-success' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
          'border-red-500 bg-red-50 dark:bg-red-950'
        }>
          <CardHeader>
            <div className="flex items-start gap-3">
              {uploadResult.state === 'success' && <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />}
              {uploadResult.state === 'partial-success' && <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />}
              {uploadResult.state === 'error' && <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />}
              
              <div className="flex-1">
                <CardTitle className={
                  uploadResult.state === 'success' ? 'text-green-900 dark:text-green-100' :
                  uploadResult.state === 'partial-success' ? 'text-yellow-900 dark:text-yellow-100' :
                  'text-red-900 dark:text-red-100'
                }>
                  {uploadResult.state === 'success' && 'Upload Successful'}
                  {uploadResult.state === 'partial-success' && 'Partial Upload Success'}
                  {uploadResult.state === 'error' && 'Upload Failed'}
                </CardTitle>
                <p className={`text-sm mt-1 ${
                  uploadResult.state === 'success' ? 'text-green-700 dark:text-green-300' :
                  uploadResult.state === 'partial-success' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-red-700 dark:text-red-300'
                }`}>
                  {uploadResult.state === 'success' && `Successfully uploaded ${uploadResult.successCount} orders.`}
                  {uploadResult.state === 'partial-success' && `Uploaded ${uploadResult.successCount} of ${uploadResult.totalCount} orders. ${uploadResult.failedBatches.length} batch(es) failed.`}
                  {uploadResult.state === 'error' && `Failed to upload orders. Please try again.`}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Failed batches details */}
            {uploadResult.failedBatches.length > 0 && (
              <div className="space-y-2">
                <ErrorDetailsPanel
                  rawErrorString={uploadResult.failedBatches.map(b => `Batch ${b.batchIndex + 1}: ${b.error}`).join('\n')}
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {uploadResult.state === 'success' && (
                <>
                  <Button onClick={handleNavigateToDashboard} className="gap-2">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Upload More Orders
                  </Button>
                </>
              )}
              
              {uploadResult.state === 'partial-success' && (
                <>
                  <Button onClick={handleNavigateToDashboard} className="gap-2">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleRetry}>
                    Retry Failed Batches
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Start Over
                  </Button>
                </>
              )}
              
              {uploadResult.state === 'error' && (
                <>
                  <Button onClick={handleRetry}>
                    Retry Upload
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Start Over
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Form - Hide when showing result */}
      {!showUploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Order File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-date">Upload Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(uploadDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={uploadDate}
                    onSelect={(date) => date && setUploadDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Order File (Excel or PDF)</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={handleFileChange}
                disabled={isParsing || isUploading}
              />
            </div>

            {isParsing && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Parsing file...</AlertTitle>
                <AlertDescription>Please wait while we process your file.</AlertDescription>
              </Alert>
            )}

            {parseError && (
              <InlineErrorState
                title="Failed to parse file"
                message={parseError}
                error={new Error(parseError)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Uploading Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Batch {uploadProgress.currentBatch} of {uploadProgress.totalBatches}</span>
                <span>{uploadProgress.uploadedOrders} / {uploadProgress.totalOrders} orders</span>
              </div>
              <Progress value={(uploadProgress.uploadedOrders / uploadProgress.totalOrders) * 100} />
            </div>
            <p className="text-sm text-muted-foreground">
              Please wait while we upload your orders in batches...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Preview - Hide when showing result */}
      {showPreview && (
        <>
          {unmappedCodes.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unmapped Design Codes Found</AlertTitle>
              <AlertDescription>
                {unmappedCodes.length} design code(s) are not mapped to master designs. These orders will be added to the unmapped queue.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Orders</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mappedOrders.length} mapped, {unmappedOrders.length} unmapped
                  </p>
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={mappedOrders.length === 0 || isUploading || masterDesignsLoading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {mappedOrders.length} Orders
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <IngestionPreviewTable
                orders={[...mappedOrders, ...unmappedOrders]}
                unmappedCodes={unmappedCodes}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
