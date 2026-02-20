import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useSaveMasterDesigns, useUpdateOrdersForNewKarigar, useListKarigars } from '../../hooks/useQueries';
import { AddKarigarDialog } from '../karigar/AddKarigarDialog';
import { toast } from 'sonner';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDesign?: { code: string; entry: MasterDesignEntry } | null;
}

export function MasterDesignFormDialog({ open, onOpenChange, editingDesign }: MasterDesignFormDialogProps) {
  const [designCode, setDesignCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [selectedKarigarId, setSelectedKarigarId] = useState('');
  const [showAddKarigarDialog, setShowAddKarigarDialog] = useState(false);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [pendingKarigarId, setPendingKarigarId] = useState('');

  const saveMutation = useSaveMasterDesigns();
  const reassignMutation = useUpdateOrdersForNewKarigar();
  const { data: karigars = [], isLoading: loadingKarigars } = useListKarigars();

  const isEditMode = !!editingDesign;

  useEffect(() => {
    if (editingDesign) {
      setDesignCode(editingDesign.code);
      setGenericName(editingDesign.entry.genericName);
      setSelectedKarigarId(editingDesign.entry.karigarId);
    } else {
      setDesignCode('');
      setGenericName('');
      setSelectedKarigarId('');
    }
  }, [editingDesign, open]);

  const handleKarigarChange = (newKarigarId: string) => {
    if (isEditMode && newKarigarId !== editingDesign?.entry.karigarId) {
      setPendingKarigarId(newKarigarId);
      setShowReassignConfirm(true);
    } else {
      setSelectedKarigarId(newKarigarId);
    }
  };

  const handleConfirmReassign = () => {
    setSelectedKarigarId(pendingKarigarId);
    setShowReassignConfirm(false);
  };

  const handleCancelReassign = () => {
    setPendingKarigarId('');
    setShowReassignConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!designCode.trim() || !genericName.trim() || !selectedKarigarId) {
      toast.error('Please fill in all fields');
      return;
    }

    const selectedKarigar = karigars.find(k => k.id === selectedKarigarId);
    if (!selectedKarigar) {
      toast.error('Selected karigar does not exist. Please select a valid karigar from the list.');
      return;
    }

    try {
      const entry: MasterDesignEntry = {
        genericName: genericName.trim(),
        karigarId: selectedKarigarId,
        isActive: true,
      };

      await saveMutation.mutateAsync({
        masterDesigns: [[designCode.trim(), entry]],
      });

      if (isEditMode && selectedKarigarId !== editingDesign?.entry.karigarId) {
        await reassignMutation.mutateAsync({
          designCode: designCode.trim(),
          newKarigarId: selectedKarigarId,
        });
        toast.success('Master design updated and orders reassigned');
      } else {
        toast.success(isEditMode ? 'Master design updated' : 'Master design created');
      }

      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save master design';
      toast.error(errorMessage);
    }
  };

  const handleAddKarigarSuccess = () => {
    setShowAddKarigarDialog(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Master Design' : 'Add Master Design'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update the master design mapping' : 'Create a new master design mapping'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="designCode">Design Code</Label>
              <Input
                id="designCode"
                value={designCode}
                onChange={(e) => setDesignCode(e.target.value)}
                placeholder="Enter design code"
                disabled={isEditMode}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genericName">Generic Name</Label>
              <Input
                id="genericName"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="Enter generic name"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="karigar">Karigar</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setShowAddKarigarDialog(true)}
                  className="h-auto p-0 text-xs"
                >
                  + Add New Karigar
                </Button>
              </div>
              <Select
                value={selectedKarigarId}
                onValueChange={handleKarigarChange}
                disabled={loadingKarigars}
              >
                <SelectTrigger id="karigar">
                  <SelectValue placeholder={loadingKarigars ? 'Loading karigars...' : 'Select karigar'} />
                </SelectTrigger>
                <SelectContent>
                  {karigars.map((karigar) => (
                    <SelectItem key={karigar.id} value={karigar.id}>
                      {karigar.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || reassignMutation.isPending}>
                {(saveMutation.isPending || reassignMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showReassignConfirm} onOpenChange={setShowReassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Karigar Reassignment</AlertDialogTitle>
            <AlertDialogDescription>
              You are changing the karigar for this design. This will reassign all pending orders with this design code to the new karigar. Orders already sent to hallmark will not be affected.
              <br /><br />
              Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReassign}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReassign}>Confirm Reassignment</AlertDialogAction>
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
