import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
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
import { Upload, CalendarIcon, CheckCircle, AlertCircle, Info, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { PersistentOrder } from '../../backend';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
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
  const queryClient = useQueryClient();
  const { effectiveRole } = useEffectiveAppRole();
  const { data: masterDesigns = [], isLoading: masterDesignsLoading, isFetched: masterDesignsFetched } = useGetMasterDesigns();
  const uploadMutation = useUploadParsedOrdersBatched();
  const { copyToClipboard, getButtonLabel } = useCopyToClipboard();
  
  const [uploadDate, setUploadDate] = useState<Date>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [rawOrders, setRawOrders] = useState<PersistentOrder[]>([]); // Store raw parsed orders
  const [previewOrders, setPreviewOrders] = useState<PersistentOrder[]>([]); // Orders with mapping applied for preview
  const [mappedOrders, setMappedOrders] = useState<PersistentOrder[]>([]);
  const [unmappedOrders, setUnmappedOrders] = useState<PersistentOrder[]>([]);
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
      setPreviewOrders(result.previewOrders);
    }
  }, [rawOrders, masterDesigns, masterDesignsFetched]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setRawOrders([]);
    setPreviewOrders([]);
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
      setPreviewOrders(result.previewOrders);
      
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

  const handleNavigateToDashboard = async () => {
    // Store upload date in sessionStorage so dashboard opens on this date
    const dateKey = format(uploadDate, 'yyyy-MM-dd');
    sessionStorage.setItem('adminDashboardSelectedDate', dateKey);
    
    // Ensure orders and unmapped queries are refetched before navigation
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['orders'] }),
      queryClient.refetchQueries({ queryKey: ['unmappedDesignCodes'] }),
    ]);
    
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
    setPreviewOrders([]);
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
            <div className="flex flex-wrap gap-3">
              {(uploadResult.state === 'success' || uploadResult.state === 'partial-success') && (
                <Button onClick={handleNavigateToDashboard}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              )}
              
              {(uploadResult.state === 'error' || uploadResult.state === 'partial-success') && (
                <Button variant="outline" onClick={handleRetry}>
                  Retry Upload
                </Button>
              )}
              
              <Button variant="outline" onClick={handleReset}>
                Upload New File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Upload Section */}
      {!showUploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Order File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uploadDate">Upload Date</Label>
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
              <Label htmlFor="file">Order File (PDF or Excel)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isParsing || isUploading}
              />
            </div>

            {parseError && (
              <InlineErrorState
                title="Parse Error"
                message={parseError}
                error={new Error(parseError)}
              />
            )}

            {isParsing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing file...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Orders:</span>{' '}
                <span className="font-semibold">{rawOrders.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mapped:</span>{' '}
                <span className="font-semibold text-green-600">{mappedOrders.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Unmapped:</span>{' '}
                <span className="font-semibold text-yellow-600">{unmappedOrders.length}</span>
              </div>
            </div>

            {unmappedCodes.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Unmapped Design Codes</AlertTitle>
                <AlertDescription>
                  {unmappedCodes.length} design code(s) are not in the master designs list. These orders will be stored as unmapped.
                </AlertDescription>
              </Alert>
            )}

            {/* Upload Controls - Above Table */}
            <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={mappedOrders.length === 0 || isUploading}
                  className="flex-1 sm:flex-none"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {mappedOrders.length} Order{mappedOrders.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset} disabled={isUploading}>
                  Cancel
                </Button>
              </div>

              {uploadProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Batch {uploadProgress.currentBatch} of {uploadProgress.totalBatches}
                    </span>
                    <span>
                      {uploadProgress.uploadedOrders} / {uploadProgress.totalOrders} orders
                    </span>
                  </div>
                  <Progress
                    value={(uploadProgress.uploadedOrders / uploadProgress.totalOrders) * 100}
                  />
                </div>
              )}
            </div>

            {/* Preview Table */}
            <IngestionPreviewTable orders={previewOrders} unmappedCodes={unmappedCodes} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
