import { useState } from 'react';
import { useGetUnmappedDesignCodes } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InlineErrorState } from '../../components/errors/InlineErrorState';
import { MasterDesignFormDialog } from '../../components/masterDesigns/MasterDesignFormDialog';
import { Search, Plus } from 'lucide-react';

export function UnmappedDesignCodesPage() {
  const { data: unmappedOrders = [], isLoading, error, refetch } = useGetUnmappedDesignCodes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Group by design code
  const groupedByCode = unmappedOrders.reduce((acc, order) => {
    if (!acc[order.designCode]) {
      acc[order.designCode] = [];
    }
    acc[order.designCode].push(order);
    return acc;
  }, {} as Record<string, typeof unmappedOrders>);

  const filteredCodes = Object.keys(groupedByCode).filter((code) =>
    code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <InlineErrorState
        title="Failed to load unmapped design codes"
        message="Unable to fetch unmapped design codes from the backend."
        onRetry={() => refetch()}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Unmapped Design Codes</h1>
        <p className="text-muted-foreground">
          Design codes that need to be added to master designs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unmapped Codes ({Object.keys(groupedByCode).length})</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by design code..."
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
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No matching design codes found' : 'No unmapped design codes'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCodes.map((code) => {
                const orders = groupedByCode[code];
                return (
                  <div
                    key={code}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-mono font-medium">{code}</p>
                      <p className="text-sm text-muted-foreground">
                        {orders.length} order{orders.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedCode(code)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Mapping
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <MasterDesignFormDialog
        open={!!selectedCode}
        onOpenChange={(open) => {
          if (!open) setSelectedCode(null);
        }}
        editingDesign={
          selectedCode
            ? {
                code: selectedCode,
                entry: { genericName: '', karigarId: '', isActive: true },
              }
            : null
        }
      />
    </div>
  );
}
