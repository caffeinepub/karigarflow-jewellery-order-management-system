import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveMasterDesigns, useListKarigars } from '../../hooks/useQueries';
import { toast } from 'sonner';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDesign?: { code: string; entry: MasterDesignEntry | null } | null;
}

export function MasterDesignFormDialog({ open, onOpenChange, editingDesign }: MasterDesignFormDialogProps) {
  const saveMutation = useSaveMasterDesigns();
  const { data: karigars = [], isLoading: karigarsLoading, error: karigarsError } = useListKarigars();
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
    } catch (error: any) {
      console.error('Failed to save design:', error);
      toast.error(error?.message || 'Failed to save design');
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
              <div className="text-sm text-muted-foreground">Loading karigars...</div>
            ) : karigarsError ? (
              <div className="text-sm text-destructive">Failed to load karigars. Please try again.</div>
            ) : karigars.length === 0 ? (
              <div className="text-sm text-muted-foreground">No karigars available. Please add a karigar first.</div>
            ) : (
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
              disabled={
                !designCode.trim() ||
                !genericName.trim() ||
                !karigarName.trim() ||
                saveMutation.isPending ||
                karigarsLoading ||
                karigars.length === 0
              }
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
