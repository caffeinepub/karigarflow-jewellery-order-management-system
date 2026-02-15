import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSaveMasterDesigns, useGetMasterDesigns } from '../../hooks/useQueries';
import { parseMasterDesignFile } from '../../lib/parsers/masterDesignParser';
import { toast } from 'sonner';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import type { DesignCode, MasterDesignEntry } from '../../backend';

interface MasterDesignImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MasterDesignImportDialog({ open, onOpenChange }: MasterDesignImportDialogProps) {
  const { data: existingDesigns = [] } = useGetMasterDesigns();
  const saveMutation = useSaveMasterDesigns();
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedDesigns, setParsedDesigns] = useState<[DesignCode, MasterDesignEntry][] | null>(null);
  const [summary, setSummary] = useState<{ created: number; updated: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseError(null);
      setParsedDesigns(null);
      setSummary(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsParsing(true);
    setParseError(null);
    setParsedDesigns(null);

    try {
      const designs = await parseMasterDesignFile(file);
      setParsedDesigns(designs);
      
      const existingCodes = new Set(existingDesigns.map(([code]) => code));
      let created = 0;
      let updated = 0;

      designs.forEach(([code]) => {
        if (existingCodes.has(code)) {
          updated++;
        } else {
          created++;
        }
      });

      setSummary({ created, updated });
    } catch (error: any) {
      console.error('Parse error:', error);
      setParseError(error.message || 'Failed to parse file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedDesigns) return;

    try {
      await saveMutation.mutateAsync(parsedDesigns);
      
      toast.success(`Import complete: ${summary?.created || 0} created, ${summary?.updated || 0} updated`);
      
      setTimeout(() => {
        onOpenChange(false);
        setFile(null);
        setParsedDesigns(null);
        setSummary(null);
      }, 1500);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to save master designs');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFile(null);
    setParsedDesigns(null);
    setSummary(null);
    setParseError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Master Designs</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="import-file">Select File (PDF or Excel)</Label>
            <Input
              id="import-file"
              type="file"
              accept=".pdf,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isParsing || saveMutation.isPending}
            />
          </div>

          {isParsing && (
            <div className="text-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Parsing file...</p>
            </div>
          )}

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">{parseError}</AlertDescription>
            </Alert>
          )}

          {parsedDesigns && summary && (
            <>
              <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Parsed {parsedDesigns.length} designs: {summary.created} new, {summary.updated} updates
                </AlertDescription>
              </Alert>

              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Design Code</TableHead>
                        <TableHead>Generic Name</TableHead>
                        <TableHead>Karigar Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedDesigns.map(([code, entry]) => {
                        const existingCodes = new Set(existingDesigns.map(([c]) => c));
                        const isNew = !existingCodes.has(code);
                        
                        return (
                          <TableRow key={code}>
                            <TableCell className="font-mono text-sm">{code}</TableCell>
                            <TableCell>{entry.genericName || '-'}</TableCell>
                            <TableCell>{entry.karigarName || '-'}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded ${isNew ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isNew ? 'New' : 'Update'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          {!parsedDesigns ? (
            <Button
              onClick={handleParse}
              disabled={!file || isParsing}
            >
              {isParsing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Parse File
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
