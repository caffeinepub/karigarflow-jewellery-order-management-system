import { useState } from 'react';
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
import { Upload, CalendarIcon, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '../../backend';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getStoppedCanisterMessage, presentError } from '@/utils/errorPresentation';

export function IngestOrdersPage() {
  const navigate = useNavigate();
  const { data: masterDesigns = [] } = useGetMasterDesigns();
  const uploadMutation = useUploadParsedOrders();
  const { copyToClipboard, getButtonLabel } = useCopyToClipboard();
  
  const [uploadDate, setUploadDate] = useState<Date>(new Date());
  const [file, setFile] = useState<File | null>(null);
  const [mappedOrders, setMappedOrders] = useState<Order[]>([]);
  const [unmappedOrders, setUnmappedOrders] = useState<Order[]>([]);
  const [unmappedCodes, setUnmappedCodes] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const rawOrders = await parseOrderFile(selectedFile, uploadDate);
      
      if (rawOrders.length === 0) {
        throw new Error('No orders found in the file. Please check the file format.');
      }

      // Apply normalized mapping (preserves PDF-derived karigarName)
      const { mappedOrders: mapped, unmappedOrders: unmapped, unmappedDesignCodes } = applyMasterDesignMapping(rawOrders, masterDesigns);
      
      setMappedOrders(mapped);
      setUnmappedOrders(unmapped);
      setUnmappedCodes(unmappedDesignCodes);
      
      if (unmappedDesignCodes.length > 0) {
        toast.info(`${unmappedDesignCodes.length} design code(s) not found in master designs. These will be available in the Unmapped Design Codes workflow.`);
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      setParseError(error.message || 'Failed to parse file. Please check the format.');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ingest Orders</h1>
        <p className="text-muted-foreground">Upload daily order files (PDF or Excel)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Upload Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(uploadDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={uploadDate}
                    onSelect={(date) => date && setUploadDate(date)}
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
                disabled={isParsing}
              />
            </div>
          </div>

          {isParsing && (
            <div className="text-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Parsing file...</p>
            </div>
          )}

          {parseError && (
            <InlineErrorState
              title="Parse Error"
              message={parseError}
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
          {unmappedOrders.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Unmapped Design Codes Detected</AlertTitle>
              <AlertDescription>
                {unmappedOrders.length} order(s) contain design codes that are not in the master designs list. 
                These orders will be uploaded and available in the <strong>Unmapped Design Codes</strong> page, 
                where you can add the missing mappings. Once mapped, they will automatically appear in the main orders list.
              </AlertDescription>
            </Alert>
          )}

          {mappedOrders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mapped Orders ({mappedOrders.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <IngestionPreviewTable orders={mappedOrders} unmappedCodes={[]} />
              </CardContent>
            </Card>
          )}

          {unmappedOrders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Unmapped Orders ({unmappedOrders.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <IngestionPreviewTable orders={unmappedOrders} unmappedCodes={unmappedCodes} />
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setMappedOrders([]);
                setUnmappedOrders([]);
                setUnmappedCodes([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
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
