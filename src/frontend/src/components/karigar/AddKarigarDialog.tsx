import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateKarigar } from '../../hooks/useQueries';
import { toast } from 'sonner';

interface AddKarigarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddKarigarDialog({ open, onOpenChange }: AddKarigarDialogProps) {
  const createMutation = useCreateKarigar();
  const [karigarName, setKarigarName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!karigarName.trim()) return;

    try {
      await createMutation.mutateAsync({
        name: karigarName.trim(),
        isActive: true,
      });
      toast.success('Karigar added successfully');
      setKarigarName('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to add karigar:', error);
      toast.error(error?.message || 'Failed to add karigar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Karigar</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="karigarName">Karigar Name</Label>
            <Input
              id="karigarName"
              value={karigarName}
              onChange={(e) => setKarigarName(e.target.value)}
              placeholder="Enter karigar name"
              disabled={createMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!karigarName.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
