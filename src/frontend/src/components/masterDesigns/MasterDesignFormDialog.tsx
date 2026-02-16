import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveMasterDesigns } from '../../hooks/useQueries';
import { toast } from 'sonner';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDesign?: { code: string; entry: MasterDesignEntry | null } | null;
}

export function MasterDesignFormDialog({ open, onOpenChange, editingDesign }: MasterDesignFormDialogProps) {
  const saveMutation = useSaveMasterDesigns();
  const [designCode, setDesignCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [karigarName, setKarigarName] = useState('');

  useEffect(() => {
    if (editingDesign) {
      setDesignCode(editingDesign.code);
      setGenericName(editingDesign.entry?.genericName || '');
      setKarigarName(editingDesign.entry?.karigarName || '');
    } else {
      setDesignCode('');
      setGenericName('');
      setKarigarName('');
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
    } catch (error) {
      console.error('Failed to save design:', error);
      toast.error('Failed to save design');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingDesign ? 'Edit Design Mapping' : 'Add Design Mapping'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="designCode">Design Code *</Label>
            <Input
              id="designCode"
              value={designCode}
              onChange={(e) => setDesignCode(e.target.value)}
              placeholder="e.g., D001"
              disabled={!!editingDesign}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genericName">Generic Name *</Label>
            <Input
              id="genericName"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder="e.g., Ring"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="karigarName">Karigar Name *</Label>
            <Input
              id="karigarName"
              value={karigarName}
              onChange={(e) => setKarigarName(e.target.value)}
              placeholder="e.g., Ramesh"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
