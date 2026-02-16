import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSetActiveFlagForMasterDesign } from '../../hooks/useQueries';
import { Edit, Power } from 'lucide-react';
import { toast } from 'sonner';
import type { MasterDesignEntry } from '../../backend';

interface MasterDesignsTableProps {
  designs: [string, MasterDesignEntry][];
  onEdit: (code: string, entry: MasterDesignEntry) => void;
}

export function MasterDesignsTable({ designs, onEdit }: MasterDesignsTableProps) {
  const setActiveMutation = useSetActiveFlagForMasterDesign();

  const handleToggleActive = async (designCode: string, currentActive: boolean) => {
    try {
      await setActiveMutation.mutateAsync({ designCode, isActive: !currentActive });
      toast.success(`Design ${currentActive ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update design status');
    }
  };

  if (designs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No master designs found
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            <TableHead>Karigar Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {designs.map(([code, entry]) => (
            <TableRow key={code}>
              <TableCell className="font-mono font-medium">{code}</TableCell>
              <TableCell>{entry.genericName}</TableCell>
              <TableCell>{entry.karigarName}</TableCell>
              <TableCell>
                <Badge variant={entry.isActive ? 'default' : 'outline'}>
                  {entry.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(code, entry)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(code, entry.isActive)}
                    disabled={setActiveMutation.isPending}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
