import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveMasterDesigns, useListKarigars } from '../../hooks/useQueries';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDesign?: { code: string; entry: MasterDesignEntry | null } | null;
}

// Helper function to normalize karigar names for comparison
function normalizeKarigarName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function MasterDesignFormDialog({ open, onOpenChange, editingDesign }: MasterDesignFormDialogProps) {
  const saveMutation = useSaveMasterDesigns();
  const { data: karigars = [], isLoading: karigarsLoading, error: karigarsError, refetch: refetchKarigars } = useListKarigars();
  const [designCode, setDesignCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [karigarName, setKarigarName] = useState('');
  const [originalKarigarName, setOriginalKarigarName] = useState('');

  // Refetch karigars whenever the dialog opens
  useEffect(() => {
    if (open) {
      refetchKarigars();
    }
  }, [open, refetchKarigars]);

  useEffect(() => {
    if (editingDesign) {
      setDesignCode(editingDesign.code);
      setGenericName(editingDesign.entry?.genericName || '');
      const existingKarigar = editingDesign.entry?.karigarName || '';
      setOriginalKarigarName(existingKarigar);
      
      // Try to find a matching karigar in the list (normalized comparison)
      const normalizedExisting = normalizeKarigarName(existingKarigar);
      const matchingKarigar = karigars.find(k => normalizeKarigarName(k.name) === normalizedExisting);
      
      // Set to the exact name from the list if found, otherwise keep original
      setKarigarName(matchingKarigar ? matchingKarigar.name : existingKarigar);
    } else {
      setDesignCode('');
      setGenericName('');
      setKarigarName('');
      setOriginalKarigarName('');
    }
  }, [editingDesign, open, karigars]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designCode.trim() || !genericName.trim() || !karigarName.trim()) return;

    try {
      const entry: MasterDesignEntry = {
        genericName: genericName.trim(),
        karigarName: karigarName.trim(),
        isActive: true,
      };

      await saveMutation.mutateAsync([[designCode.trim(), entry]]);
      
      // Show appropriate success message
      const normalizedOriginal = normalizeKarigarName(originalKarigarName);
      const normalizedNew = normalizeKarigarName(karigarName.trim());
      
      if (editingDesign && normalizedOriginal !== normalizedNew) {
        toast.success(`Design updated successfully. All orders for design "${designCode.trim()}" have been reassigned to ${karigarName.trim()}.`);
      } else {
        toast.success(editingDesign ? 'Design updated successfully' : 'Design added successfully');
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save design:', error);
      toast.error(error?.message || 'Failed to save design');
    }
  };

  // Check if the original karigar exists in the current list (normalized comparison)
  const normalizedOriginal = normalizeKarigarName(originalKarigarName);
  const originalKarigarExists = originalKarigarName && karigars.some(k => normalizeKarigarName(k.name) === normalizedOriginal);
  
  // Show warning only if editing, has original karigar, and it's not found in the list
  const showKarigarNotFoundWarning = editingDesign && originalKarigarName && !originalKarigarExists && !karigarsLoading;
  
  // Check if the currently selected karigar is valid (exists in the list)
  const normalizedSelected = normalizeKarigarName(karigarName);
  const selectedKarigarIsValid = karigarName && karigars.some(k => normalizeKarigarName(k.name) === normalizedSelected);

  // Check if karigar has changed (normalized comparison)
  const karigarHasChanged = editingDesign && originalKarigarName && karigarName && normalizedOriginal !== normalizedSelected;

  // Build the options list
  let selectOptions = [...karigars];
  
  // If editing and original karigar is not in the list, add it as a legacy option
  if (showKarigarNotFoundWarning && originalKarigarName) {
    selectOptions = [
      { name: originalKarigarName, isActive: false }, // Legacy option
      ...karigars
    ];
  }

  // Determine if save should be disabled
  const isSaveDisabled: boolean = 
    !designCode.trim() ||
    !genericName.trim() ||
    !karigarName.trim() ||
    saveMutation.isPending ||
    karigarsLoading ||
    karigars.length === 0 ||
    Boolean(karigarsError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDesign ? 'Edit Design Mapping' : 'Add Design Mapping'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="designCode">Design Code</Label>
            <Input
              id="designCode"
              value={designCode}
              onChange={(e) => setDesignCode(e.target.value)}
              placeholder="Enter design code"
              disabled={!!editingDesign || saveMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genericName">Generic Name</Label>
            <Input
              id="genericName"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder="Enter generic name"
              disabled={saveMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="karigarName">Karigar Name</Label>
            {karigarsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading karigars...</span>
              </div>
            ) : karigarsError ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load karigars</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetchKarigars()}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : karigars.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No karigars available. Please add a karigar first.
              </div>
            ) : (
              <>
                {showKarigarNotFoundWarning && (
                  <div className="flex items-start gap-2 p-3 mb-2 text-sm bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 rounded-md border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Legacy karigar</p>
                      <p className="text-xs mt-1">
                        The current karigar "{originalKarigarName}" is not in the standard list. You can keep it selected or choose a different karigar from the dropdown.
                      </p>
                    </div>
                  </div>
                )}
                {karigarHasChanged && (
                  <div className="flex items-start gap-2 p-3 mb-2 text-sm bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200 rounded-md border border-blue-200 dark:border-blue-800">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Karigar reassignment</p>
                      <p className="text-xs mt-1">
                        Saving will move all existing orders for design "{designCode}" from {originalKarigarName} to {karigarName}.
                      </p>
                    </div>
                  </div>
                )}
                <Select
                  value={karigarName}
                  onValueChange={setKarigarName}
                  disabled={saveMutation.isPending || karigarsLoading}
                >
                  <SelectTrigger id="karigarName">
                    <SelectValue placeholder="Select a karigar" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectOptions.map((karigar, index) => {
                      const isLegacy = showKarigarNotFoundWarning && index === 0;
                      return (
                        <SelectItem key={karigar.name} value={karigar.name}>
                          {karigar.name}
                          {isLegacy && <span className="ml-2 text-xs text-muted-foreground">(legacy)</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaveDisabled}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
