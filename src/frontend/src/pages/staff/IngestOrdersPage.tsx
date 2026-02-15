import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUploadParsedOrders, useGetMasterDesigns } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IngestionPreviewTable } from '../../components/orders/IngestionPreviewTable';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { parseOrderFile } from '../../lib/parsers/orderParser';
import { applyMasterDesignMapping } from '../../lib/mapping/applyMasterDesignMapping';
import { toast } from 'sonner';
import { Upload, CalendarIcon, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '../../backend';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getStoppedCanisterMessage, presentError } from '@/utils/errorPresentation';

export function IngestOrdersPage() {
  const navigate = useNavigate();
  const { data: masterDesigns = [], isLoading: masterDesignsLoading, isFetched: masterDesignsFetched } = useGetMasterDesigns();
  const uploadMutation = useUploadParsedOrders();
  const { copyToClipboard, getButtonLabel } = useCopyToClipboard();
  
  const [uploadDate, setUploadDate] = useState<Date>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [rawOrders, setRawOrders] = useState<Order[]>([]); // Store raw parsed orders
  const [mappedOrders, setMappedOrders] = useState<Order[]>([]);
  const [unmappedOrders, setUnmappedOrders] = useState<Order[]>([]);
  const [unmappedCodes, setUnmappedCodes] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Automatically remap when master designs finish loading or update
  useEffect(() => {
    if (rawOrders.length > 0 && masterDesignsFetched && !masterDesignsLoading) {
      console.log('[IngestOrders] Remapping orders with updated master designs');
      const { mappedOrders: mapped, unmappedOrders: unmapped, unmappedDesignCodes } = applyMasterDesignMapping(rawOrders, masterDesigns);
      
      setMappedOrders(mapped);
      setUnmappedOrders(unmapped);
      setUnmappedCodes(unmappedDesignCodes);
    }
  }, [rawOrders, masterDesigns, masterDesignsFetched, masterDesignsLoading]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const parsedOrders = await parseOrderFile(selectedFile, uploadDate);
      
      if (parsedOrders.length === 0) {
        throw new Error('No orders found in the file. Please check the file format.');
      }

      // Store raw orders for potential remapping
      setRawOrders(parsedOrders);

      // Apply normalized mapping (preserves PDF-derived karigarName)
      const { mappedOrders: mapped, unmappedOrders: unmapped, unmappedDesignCodes } = applyMasterDesignMapping(parsedOrders, masterDesigns);
      
      setMappedOrders(mapped);
      setUnmappedOrders(unmapped);
      setUnmappedCodes(unmappedDesignCodes);
      
      // Count orders with PDF-derived karigar names
      const ordersWithKarigar = [...mapped, ...unmapped].filter(o => o.karigarName && o.karigarName.trim() !== '').length;
      
      if (ordersWithKarigar > 0) {
        toast.success(`Parsed ${parsedOrders.length} orders. ${ordersWithKarigar} have karigar assignments from PDF sections.`);
      } else {
        toast.success(`Parsed ${parsedOrders.length} orders.`);
      }
      
      if (unmappedDesignCodes.length > 0) {
        toast.info(`${unmappedDesignCodes.length} design code(s) not found in master designs. These will be available in the Unmapped Design Codes workflow.`);
      }

      // Warn if master designs are still loading
      if (masterDesignsLoading) {
        toast.info('Master designs are still loading. Mapping will update automatically when ready.');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      setParseError(error.message || 'Failed to parse file. Please check the format.');
      setRawOrders([]);
      setMappedOrders([]);
      setUnmappedOrders([]);
      setUnmappedCodes([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    const totalOrders = mappedOrders.length + unmappedOrders.length;
    if (totalOrders === 0) return;

    try {
      // Upload all orders (both mapped and unmapped)
      const allOrders = [...mappedOrders, ...unmappedOrders];
      await uploadMutation.mutateAsync(allOrders);
      
      if (mappedOrders.length > 0) {
        toast.success(`Successfully uploaded ${mappedOrders.length} mapped order(s)!`);
      }
      
      if (unmappedOrders.length > 0) {
        toast.info(`${unmappedOrders.length} order(s) with unmapped design codes are available in the Unmapped Design Codes page.`);
      }
      
      navigate({ to: '/staff' });
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Check if this is a stopped-canister error
      const stoppedMessage = getStoppedCanisterMessage(error);
      if (stoppedMessage) {
        const presentation = presentError(error);
        toast.error(stoppedMessage, {
          description: 'Copy error details for diagnostics',
          action: {
            label: getButtonLabel(),
            onClick: () => copyToClipboard(presentation.rawErrorString),
          },
        });
      } else {
        toast.error('Failed to upload orders. Please try again.');
      }
    }
  };

  const totalOrders = mappedOrders.length + unmappedOrders.length;
  const hasOrders = totalOrders > 0;
  const ordersWithKarigar = [...mappedOrders, ...unmappedOrders].filter(o => o.karigarName && o.karigarName.trim() !== '').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ingest Orders</h1>
        <p className="text-muted-foreground">Upload daily order files (PDF or Excel)</p>
      </div>

      {masterDesignsLoading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Loading master designs...</AlertTitle>
          <AlertDescription>
            Please wait while master designs are being loaded. You can still upload a file, and the mapping will update automatically.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
                disabled={isParsing || uploadMutation.isPending}
              />
            </div>
          </div>

          {isParsing && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Parsing file...</AlertTitle>
              <AlertDescription>
                Please wait while we extract and validate the order data.
              </AlertDescription>
            </Alert>
          )}

          {parseError && (
            <InlineErrorState
              message={parseError}
              error={new Error(parseError)}
              onRetry={() => {
                setParseError(null);
                setFile(null);
              }}
            />
          )}
        </CardContent>
      </Card>

      {hasOrders && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preview & Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold">{totalOrders}</div>
                  <div className="text-sm text-muted-foreground">Total Orders</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-green-600">{mappedOrders.length}</div>
                  <div className="text-sm text-muted-foreground">Mapped</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-2xl font-bold text-orange-600">{unmappedOrders.length}</div>
                  <div className="text-sm text-muted-foreground">Unmapped</div>
                </div>
              </div>

              {ordersWithKarigar > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle>Karigar Assignment from PDF</AlertTitle>
                  <AlertDescription>
                    {ordersWithKarigar} order(s) have karigar assignments detected from PDF section headers. 
                    These assignments will be preserved and not overwritten by master design mappings.
                  </AlertDescription>
                </Alert>
              )}

              {unmappedOrders.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Unmapped Design Codes</AlertTitle>
                  <AlertDescription>
                    {unmappedOrders.length} order(s) have design codes not found in master designs. 
                    You can map them later from the Unmapped Design Codes page.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <IngestionPreviewTable
                orders={[...mappedOrders, ...unmappedOrders]}
                unmappedCodes={unmappedCodes}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/staff' })}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {totalOrders} Order{totalOrders !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
