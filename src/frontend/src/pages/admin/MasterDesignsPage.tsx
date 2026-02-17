import { useState } from 'react';
import { useGetMasterDesigns } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MasterDesignFormDialog } from '../../components/masterDesigns/MasterDesignFormDialog';
import { MasterDesignImportDialog } from '../../components/masterDesigns/MasterDesignImportDialog';
import { MasterDesignsTable } from '../../components/masterDesigns/MasterDesignsTable';
import { AddKarigarDialog } from '../../components/karigar/AddKarigarDialog';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { Plus, Upload, Search, UserPlus } from 'lucide-react';

export function MasterDesignsPage() {
  const { data: masterDesigns = [], isLoading, error, refetch } = useGetMasterDesigns();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddKarigarDialog, setShowAddKarigarDialog] = useState(false);
  const [editingDesign, setEditingDesign] = useState<{ code: string; entry: any } | null>(null);

  const filteredDesigns = masterDesigns.filter(([code, entry]) => {
    const query = searchQuery.toLowerCase();
    return (
      code.toLowerCase().includes(query) ||
      entry.genericName.toLowerCase().includes(query) ||
      entry.karigarName.toLowerCase().includes(query)
    );
  });

  if (error) {
    return (
      <InlineErrorState
        title="Failed to load master designs"
        message="Unable to fetch master designs from the backend."
        onRetry={() => refetch()}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Master Designs</h1>
          <p className="text-muted-foreground">Manage design code mappings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddKarigarDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Karigar
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Design Mappings</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by design code, generic name, or karigar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            </div>
          ) : (
            <MasterDesignsTable
              designs={filteredDesigns}
              onEdit={(code, entry) => setEditingDesign({ code, entry })}
            />
          )}
        </CardContent>
      </Card>

      <MasterDesignFormDialog
        open={showAddDialog || !!editingDesign}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingDesign(null);
          }
        }}
        editingDesign={editingDesign}
      />

      <MasterDesignImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      <AddKarigarDialog
        open={showAddKarigarDialog}
        onOpenChange={setShowAddKarigarDialog}
      />
    </div>
  );
}
