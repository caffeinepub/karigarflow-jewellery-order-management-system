import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MasterDesignsTable } from '../../components/masterDesigns/MasterDesignsTable';
import { MasterDesignFormDialog } from '../../components/masterDesigns/MasterDesignFormDialog';
import { MasterDesignImportDialog } from '../../components/masterDesigns/MasterDesignImportDialog';
import { TotalKarigarListDialog } from '../../components/karigar/TotalKarigarListDialog';
import { useGetMasterDesigns, useListKarigarReference } from '../../hooks/useQueries';
import { Plus, Upload, Search, Users } from 'lucide-react';
import type { MasterDesignEntry } from '../../backend';

export function MasterDesignsPage() {
  const { data: masterDesigns = [], isLoading } = useGetMasterDesigns();
  const { data: karigars = [] } = useListKarigarReference();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isKarigarListOpen, setIsKarigarListOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<{ code: string; entry: MasterDesignEntry } | null>(null);
  const [selectedKarigarFilter, setSelectedKarigarFilter] = useState<string | null>(null);

  const filteredDesigns = useMemo(() => {
    let filtered = masterDesigns;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        ([code, entry]) =>
          code.toLowerCase().includes(query) ||
          entry.genericName.toLowerCase().includes(query) ||
          entry.karigarId.toLowerCase().includes(query)
      );
    }

    if (selectedKarigarFilter) {
      filtered = filtered.filter(([, entry]) => entry.karigarId === selectedKarigarFilter);
    }

    return filtered;
  }, [masterDesigns, searchQuery, selectedKarigarFilter]);

  const handleEdit = (code: string, entry: MasterDesignEntry) => {
    setEditingDesign({ code, entry });
  };

  const handleCloseEditDialog = () => {
    setEditingDesign(null);
  };

  const handleSelectKarigar = (karigarId: string) => {
    setSelectedKarigarFilter(karigarId);
    setIsKarigarListOpen(false);
  };

  const handleClearKarigarFilter = () => {
    setSelectedKarigarFilter(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading master designs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <Card className="w-full overflow-visible">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Title and primary actions row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 min-w-0">
              <CardTitle className="text-2xl font-bold flex-shrink-0">Master Designs</CardTitle>
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="flex-shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Design
                </Button>
                <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm" className="flex-shrink-0">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
                <Button onClick={() => setIsKarigarListOpen(true)} variant="outline" size="sm" className="flex-shrink-0">
                  <Users className="mr-2 h-4 w-4" />
                  Total Karigar List
                </Button>
              </div>
            </div>

            {/* Filter badge row */}
            {selectedKarigarFilter && (
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm text-muted-foreground flex-shrink-0">Filtered by:</span>
                <Badge variant="secondary" className="gap-2 flex-shrink-0">
                  <span className="truncate max-w-[200px]">
                    {karigars.find((k) => k.id === selectedKarigarFilter)?.name || selectedKarigarFilter}
                  </span>
                  <button
                    onClick={handleClearKarigarFilter}
                    className="ml-1 hover:text-destructive flex-shrink-0"
                    aria-label="Clear filter"
                  >
                    ×
                  </button>
                </Badge>
              </div>
            )}

            {/* Search row */}
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by design code, generic name, or karigar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-visible">
          <MasterDesignsTable designs={filteredDesigns} onEdit={handleEdit} />
        </CardContent>
      </Card>

      <MasterDesignFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      <MasterDesignFormDialog
        open={!!editingDesign}
        onOpenChange={(open) => {
          if (!open) handleCloseEditDialog();
        }}
        editingDesign={editingDesign}
      />

      <MasterDesignImportDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />

      <TotalKarigarListDialog
        open={isKarigarListOpen}
        onOpenChange={setIsKarigarListOpen}
        onSelectKarigar={handleSelectKarigar}
      />
    </div>
  );
}
