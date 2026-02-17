import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveMasterDesigns, useListKarigars } from '../../hooks/useQueries';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDesign?: { code: string; entry: MasterDesignEntry | null } | null;
}

export function MasterDesignFormDialog({ open, onOpenChange, editingDesign }: MasterDesignFormDialogProps) {
  const saveMutation = useSaveMasterDesigns();
  const { data: karigars = [], isLoading: karigarsLoading, error: karigarsError, refetch: refetchKarigars } = useListKarigars();
  const [designCode, setDesignCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [karigarName, setKarigarName] = useState('');
  const [originalKarigarName, setOriginalKarigarName] = useState('');

  useEffect(() => {
    if (editingDesign) {
      setDesignCode(editingDesign.code);
      setGenericName(editingDesign.entry?.genericName || '');
      const existingKarigar = editingDesign.entry?.karigarName || '';
      setOriginalKarigarName(existingKarigar);
      setKarigarName(existingKarigar);
    } else {
      setDesignCode('');
      setGenericName('');
      setKarigarName('');
      setOriginalKarigarName('');
    }
  }, [editingDesign, open]);

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
      toast.success(editingDesign ? 'Design updated successfully' : 'Design added successfully');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save design:', error);
      toast.error(error?.message || 'Failed to save design');
    }
  };

  // Check if the original karigar exists in the current list
  const originalKarigarExists = originalKarigarName && karigars.some(k => k.name === originalKarigarName);
  const showKarigarNotFoundWarning = editingDesign && originalKarigarName && !originalKarigarExists && !karigarsLoading;
  
  // Check if the currently selected karigar is valid (exists in the list)
  const selectedKarigarIsValid = karigarName && karigars.some(k => k.name === karigarName);

  // Determine if save should be disabled - ensure it's always a boolean
  const isSaveDisabled: boolean = 
    !designCode.trim() ||
    !genericName.trim() ||
    !karigarName.trim() ||
    saveMutation.isPending ||
    karigarsLoading ||
    karigars.length === 0 ||
    Boolean(karigarsError) ||
    // CRITICAL: When editing with missing original karigar, require a valid selection from the list
    Boolean(showKarigarNotFoundWarning && !selectedKarigarIsValid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
              <div className="text-sm text-muted-foreground py-2">Loading karigars...</div>
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
                      <p className="font-medium">Current karigar not found</p>
                      <p className="text-xs mt-1">
                        The current karigar "{originalKarigarName}" is not in the list. Please select an existing karigar from the dropdown before saving.
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
                    {karigars.map((karigar) => (
                      <SelectItem key={karigar.name} value={karigar.name}>
                        {karigar.name}
                      </SelectItem>
                    ))}
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
