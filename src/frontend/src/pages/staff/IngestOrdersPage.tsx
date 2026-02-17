import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadParsedOrdersBatched, useGetMasterDesigns } from '../../hooks/useQueries';
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
import { parseOrderFile } from '../../lib/parsers/orderParser';
import { applyMasterDesignMapping } from '../../lib/mapping/applyMasterDesignMapping';
import { toast } from 'sonner';
import { Upload, CalendarIcon, CheckCircle, AlertCircle, Info, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { PersistentOrder } from '../../backend';
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
  
  const [uploadDate, setUploadDate] = useState<Date>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [rawOrders, setRawOrders] = useState<PersistentOrder[]>([]); // Store raw parsed orders
  const [previewOrders, setPreviewOrders] = useState<PersistentOrder[]>([]); // Orders with mapping applied for preview
  const [mappedOrders, setMappedOrders] = useState<PersistentOrder[]>([]);
  const [unmappedOrders, setUnmappedOrders] = useState<PersistentOrder[]>([]);
  const [unmappedCodes, setUnmappedCodes] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState<number>(0);
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
    setParseWarnings([]);
    setRawOrders([]);
    setPreviewOrders([]);
    setMappedOrders([]);
    setUnmappedOrders([]);
    setUnmappedCodes([]);
    setUploadResult(null);
    setIsParsing(true);

    try {
      const parseResult = await parseOrderFile(selectedFile, uploadDate);
      setRawOrders(parseResult.orders);
      setParseWarnings(parseResult.warnings);
      
      // Apply mapping
      const result = applyMasterDesignMapping(parseResult.orders, masterDesigns);
      setMappedOrders(result.mappedOrders);
      setUnmappedOrders(result.unmappedOrders);
      setUnmappedCodes(result.unmappedDesignCodes);
      setPreviewOrders(result.previewOrders);
      
      toast.success(`Parsed ${parseResult.orders.length} orders from file`);
      
      if (parseResult.warnings.length > 0) {
        toast.warning(`${parseResult.warnings.length} warning(s) found - check details below`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse file';
      setParseError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    if (mappedOrders.length === 0) {
      toast.error('No orders to upload');
      return;
    }

    setUploadProgress(0);
    setUploadResult({
      state: 'uploading',
      successCount: 0,
      totalCount: mappedOrders.length,
      failedBatches: [],
    });

    try {
      await uploadMutation.mutateAsync({
        orders: mappedOrders,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      setUploadResult({
        state: 'success',
        successCount: mappedOrders.length,
        totalCount: mappedOrders.length,
        failedBatches: [],
      });

      toast.success(`Successfully uploaded ${mappedOrders.length} orders`);
      
      // Store upload date in sessionStorage for dashboard navigation
      sessionStorage.setItem('lastUploadDate', uploadDate.toISOString());
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedDesignCodes'] });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setUploadResult({
        state: 'error',
        successCount: 0,
        totalCount: mappedOrders.length,
        failedBatches: [{ batchIndex: 0, error: errorMsg }],
      });
      toast.error(errorMsg);
    }
  };

  const handleNavigateToDashboard = () => {
    if (effectiveRole === AppRole.Admin) {
      navigate({ to: '/admin' });
    } else {
      navigate({ to: '/staff' });
    }
  };

  const isUploading = uploadResult?.state === 'uploading';
  const uploadComplete = uploadResult?.state === 'success' || uploadResult?.state === 'partial-success';
  const uploadFailed = uploadResult?.state === 'error';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Ingest Orders</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-date">Upload Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
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
              <Label htmlFor="file-upload">Order File (PDF or Excel)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.xlsx,.xls"
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
                message={parseError}
                error={new Error(parseError)}
                onRetry={() => {
                  setParseError(null);
                  if (file) {
                    const input = document.getElementById('file-upload') as HTMLInputElement;
                    if (input) {
                      input.value = '';
                      input.click();
                    }
                  }
                }}
              />
            )}

            {parseWarnings.length > 0 && !parseError && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">
                  {parseWarnings.length} Warning(s)
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="mt-2 space-y-1 text-xs max-h-32 overflow-y-auto">
                    {parseWarnings.map((warning, idx) => (
                      <div key={idx}>• {warning}</div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs">
                    These fields will be shown as blank in the portal.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {previewOrders.length > 0 && !uploadComplete && (
              <>
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Orders:</span>
                    <span className="text-sm font-bold">{previewOrders.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Mapped:</span>
                    <span className="text-sm font-bold text-green-600">{mappedOrders.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-600">Unmapped:</span>
                    <span className="text-sm font-bold text-amber-600">{unmappedOrders.length}</span>
                  </div>
                </div>

                {unmappedCodes.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unmapped Design Codes</AlertTitle>
                    <AlertDescription>
                      {unmappedCodes.length} design code(s) need mapping. These orders will be queued for later processing.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={mappedOrders.length === 0 || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading... {uploadProgress.toFixed(0)}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {mappedOrders.length} Order(s)
                    </>
                  )}
                </Button>

                {isUploading && (
                  <Progress value={uploadProgress} className="w-full" />
                )}
              </>
            )}

            {uploadComplete && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 dark:text-green-100">Upload Complete</AlertTitle>
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Successfully uploaded {uploadResult.successCount} order(s).
                </AlertDescription>
              </Alert>
            )}

            {uploadFailed && uploadResult && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload Failed</AlertTitle>
                <AlertDescription>
                  {uploadResult.failedBatches[0]?.error || 'Unknown error occurred'}
                </AlertDescription>
              </Alert>
            )}

            {uploadComplete && (
              <Button
                onClick={handleNavigateToDashboard}
                variant="outline"
                className="w-full"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewOrders.length > 0 ? (
              <IngestionPreviewTable
                previewOrders={previewOrders}
                unmappedCodes={unmappedCodes}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Upload a file to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
