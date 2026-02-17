import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveMasterDesigns, useListKarigars, useUpdateOrdersForNewKarigar } from '../../hooks/useQueries';
import { AddKarigarDialog } from '../karigar/AddKarigarDialog';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw, Plus } from 'lucide-react';
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
  const updateOrdersMutation = useUpdateOrdersForNewKarigar();
  const { data: karigars = [], isLoading: karigarsLoading, error: karigarsError, refetch: refetchKarigars } = useListKarigars();
  const [designCode, setDesignCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [karigarName, setKarigarName] = useState('');
  const [originalKarigarName, setOriginalKarigarName] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAddKarigarDialog, setShowAddKarigarDialog] = useState(false);

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

    // Validate that the selected karigar exists in the list (normalized comparison)
    const normalizedSelected = normalizeKarigarName(karigarName);
    const matchingKarigar = karigars.find(k => normalizeKarigarName(k.name) === normalizedSelected);
    
    if (!matchingKarigar) {
      toast.error(`Karigar name '${karigarName}' does not exist. Please create the karigar first.`);
      return;
    }

    const normalizedOriginal = normalizeKarigarName(originalKarigarName);
    const normalizedNew = normalizeKarigarName(matchingKarigar.name);
    const karigarHasChanged = editingDesign && originalKarigarName && normalizedOriginal !== normalizedNew;

    // Show confirmation dialog if karigar has changed
    if (karigarHasChanged) {
      setShowConfirmation(true);
      return;
    }

    // Otherwise, proceed with save
    await performSave();
  };

  const performSave = async () => {
    try {
      // Always use the canonical name from the karigar list
      const normalizedSelected = normalizeKarigarName(karigarName);
      const matchingKarigar = karigars.find(k => normalizeKarigarName(k.name) === normalizedSelected);
      
      if (!matchingKarigar) {
        toast.error(`Karigar name '${karigarName}' does not exist. Please create the karigar first.`);
        return;
      }

      const canonicalKarigarName = matchingKarigar.name;

      const entry: MasterDesignEntry = {
        genericName: genericName.trim(),
        karigarName: canonicalKarigarName,
        isActive: true,
      };

      // Save the master design first
      await saveMutation.mutateAsync([[designCode.trim(), entry]]);
      
      // Check if karigar has changed
      const normalizedOriginal = normalizeKarigarName(originalKarigarName);
      const normalizedNew = normalizeKarigarName(canonicalKarigarName);
      const karigarHasChanged = editingDesign && originalKarigarName && normalizedOriginal !== normalizedNew;
      
      // If karigar changed, perform bulk update
      if (karigarHasChanged) {
        await updateOrdersMutation.mutateAsync({
          designCode: designCode.trim(),
          newKarigarName: canonicalKarigarName,
        });
        toast.success(`Design updated successfully. Pending orders for design "${designCode.trim()}" have been reassigned to ${canonicalKarigarName}.`);
      } else {
        toast.success(editingDesign ? 'Design updated successfully' : 'Design added successfully');
      }
      
      setShowConfirmation(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save design:', error);
      toast.error(error?.message || 'Failed to save design');
      setShowConfirmation(false);
    }
  };

  const handleConfirmReassignment = async () => {
    await performSave();
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleAddKarigarSuccess = () => {
    // Refetch karigars after adding a new one
    refetchKarigars();
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
    !selectedKarigarIsValid ||
    saveMutation.isPending ||
    updateOrdersMutation.isPending ||
    karigarsLoading ||
    karigars.length === 0 ||
    Boolean(karigarsError);

  return (
    <>
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
                disabled={!!editingDesign || saveMutation.isPending || updateOrdersMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genericName">Generic Name</Label>
              <Input
                id="genericName"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="Enter generic name"
                disabled={saveMutation.isPending || updateOrdersMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="karigarName">Karigar Name</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddKarigarDialog(true)}
                  disabled={saveMutation.isPending || updateOrdersMutation.isPending}
                  className="h-auto py-1 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add New
                </Button>
              </div>
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
                    <div className="flex items-start gap-2 p-3 mb-2 text-sm bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 rounded-md border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Karigar reassignment</p>
                        <p className="text-xs mt-1">
                          Saving will reassign only pending orders for design "{designCode}" from {originalKarigarName} to {karigarName}. Orders with status "given_to_hallmark" will not be moved.
                        </p>
                      </div>
                    </div>
                  )}
                  {!selectedKarigarIsValid && karigarName && (
                    <div className="flex items-start gap-2 p-3 mb-2 text-sm bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Karigar name does not exist</p>
                        <p className="text-xs mt-1">
                          Please select a valid karigar from the dropdown or create a new one.
                        </p>
                      </div>
                    </div>
                  )}
                  <Select
                    value={karigarName}
                    onValueChange={setKarigarName}
                    disabled={saveMutation.isPending || updateOrdersMutation.isPending || karigarsLoading}
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
                disabled={saveMutation.isPending || updateOrdersMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaveDisabled}
              >
                {saveMutation.isPending || updateOrdersMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Karigar Reassignment</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to change the karigar for design code <strong>{designCode}</strong> from <strong>{originalKarigarName}</strong> to <strong>{karigarName}</strong>.
              </p>
              <p className="font-medium text-foreground">
                Only pending orders for this design code will be reassigned. Orders with status "given_to_hallmark" will not be moved.
              </p>
              <p className="text-sm">
                This action will affect pending orders with design code {designCode}. Do you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirmation} disabled={saveMutation.isPending || updateOrdersMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReassignment}
              disabled={saveMutation.isPending || updateOrdersMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
            >
              {saveMutation.isPending || updateOrdersMutation.isPending ? 'Reassigning...' : 'Confirm Reassignment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddKarigarDialog
        open={showAddKarigarDialog}
        onOpenChange={setShowAddKarigarDialog}
        onSuccess={handleAddKarigarSuccess}
      />
    </>
  );
}
