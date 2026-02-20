import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useListKarigars } from '../../hooks/useQueries';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDesign: { designCode: string; entry: MasterDesignEntry } | null;
  onSave: (designCode: string, entry: MasterDesignEntry) => void;
}

export function MasterDesignFormDialog({
  open,
  onOpenChange,
  editingDesign,
  onSave,
}: MasterDesignFormDialogProps) {
  const { data: allKarigars = [] } = useListKarigars();
  const [designCode, setDesignCode] = useState('');
  const [genericName, setGenericName] = useState('');
  const [karigarId, setKarigarId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingDesign) {
      setDesignCode(editingDesign.designCode);
      setGenericName(editingDesign.entry.genericName);
      setKarigarId(editingDesign.entry.karigarId);
      setIsActive(editingDesign.entry.isActive);
    } else {
      setDesignCode('');
      setGenericName('');
      setKarigarId('');
      setIsActive(true);
    }
  }, [editingDesign, open]);

  const handleSave = () => {
    if (!designCode.trim() || !genericName.trim() || !karigarId) {
      return;
    }

    const entry: MasterDesignEntry = {
      genericName: genericName.trim(),
      karigarId,
      isActive,
    };

    onSave(designCode.trim(), entry);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingDesign ? 'Edit Master Design' : 'Add Master Design'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="design-code">Design Code</Label>
            <Input
              id="design-code"
              value={designCode}
              onChange={(e) => setDesignCode(e.target.value)}
              placeholder="Enter design code"
              disabled={!!editingDesign}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generic-name">Generic Name</Label>
            <Input
              id="generic-name"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder="Enter generic name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="karigar">Karigar</Label>
            <Select value={karigarId} onValueChange={setKarigarId}>
              <SelectTrigger id="karigar">
                <SelectValue placeholder="Select karigar" />
              </SelectTrigger>
              <SelectContent>
                {allKarigars.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="is-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!designCode.trim() || !genericName.trim() || !karigarId}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
