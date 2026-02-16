import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGetDesignImageMappings, useSaveDesignImageMappings } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { DesignImageMappingsTable } from '../../components/designImages/DesignImageMappingsTable';
import { parseDesignImageMappingsFromWorkbook } from '../../lib/parsers/excel/parseDesignImageMappingsFromWorkbook';
import { ExternalBlob } from '../../backend';
import type { DesignImageMapping } from '../../backend';

interface ParsedRow {
  slNo: string;
  designCode: string;
  imageBytes: Uint8Array;
  isValid: boolean;
  error?: string;
}

export function DesignImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string>('');

  const { identity } = useInternetIdentity();
  const { data: existingMappings, isLoading: loadingMappings } = useGetDesignImageMappings();
  const saveMutation = useSaveDesignImageMappings();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedRows([]);
      setParseError('');
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsParsing(true);
    setParseError('');
    setParsedRows([]);

    try {
      const rows = await parseDesignImageMappingsFromWorkbook(file);
      setParsedRows(rows);
      
      const validCount = rows.filter(r => r.isValid).length;
      const invalidCount = rows.length - validCount;
      
      if (validCount === 0) {
        toast.error('No valid rows found in the file');
      } else if (invalidCount > 0) {
        toast.warning(`Parsed ${validCount} valid rows, ${invalidCount} invalid rows`);
      } else {
        toast.success(`Successfully parsed ${validCount} rows`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to parse file';
      setParseError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!identity) {
      toast.error('You must be logged in to save mappings');
      return;
    }

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows to save');
      return;
    }

    try {
      // Convert ParsedRow[] to DesignImageMapping[]
      const mappings: DesignImageMapping[] = validRows.map(row => ({
        designCode: row.designCode,
        genericName: row.designCode, // Use design code as generic name since we don't have it
        image: ExternalBlob.fromBytes(new Uint8Array(row.imageBytes.buffer) as Uint8Array<ArrayBuffer>),
        createdBy: identity.getPrincipal(),
        createdAt: BigInt(Date.now() * 1_000_000), // Convert to nanoseconds
      }));

      await saveMutation.mutateAsync(mappings);
      toast.success(`Successfully saved ${validRows.length} design image mappings`);
      setParsedRows([]);
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save mappings';
      toast.error(errorMsg);
    }
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const invalidRowsCount = parsedRows.length - validRowsCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Design Images</h1>
        <p className="text-muted-foreground mt-2">
          Upload an Excel file to map design codes to product images
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Design Images</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx) with exactly 3 columns: Sl no, Design code, and Image (embedded in Excel)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The Excel file must contain exactly 3 columns: <strong>Sl no</strong>, <strong>Design code</strong>, and <strong>Image</strong>. 
              Images must be embedded directly in the Excel file (not URLs). The app will extract the embedded images from the Excel file.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Excel File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isParsing || saveMutation.isPending}
            />
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={!file || isParsing || saveMutation.isPending}
            >
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Parse File
                </>
              )}
            </Button>

            {parsedRows.length > 0 && validRowsCount > 0 && (
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !identity}
                variant="default"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save {validRowsCount} Mappings
                  </>
                )}
              </Button>
            )}
          </div>

          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 dark:text-green-400">
                  ✓ Valid: {validRowsCount}
                </span>
                {invalidRowsCount > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    ✗ Invalid: {invalidRowsCount}
                  </span>
                )}
              </div>

              <div className="rounded-md border overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Sl No</th>
                      <th className="px-4 py-2 text-left">Design Code</th>
                      <th className="px-4 py-2 text-left">Image</th>
                      <th className="px-4 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? '' : 'bg-red-50 dark:bg-red-950/20'}
                      >
                        <td className="px-4 py-2">
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </td>
                        <td className="px-4 py-2">{row.slNo}</td>
                        <td className="px-4 py-2 font-mono">{row.designCode}</td>
                        <td className="px-4 py-2">
                          {row.isValid ? (
                            <span className="text-green-600">✓ Image found ({(row.imageBytes.length / 1024).toFixed(1)} KB)</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-red-600">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Mappings</CardTitle>
          <CardDescription>
            Current design code to image mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMappings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DesignImageMappingsTable mappings={existingMappings || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
