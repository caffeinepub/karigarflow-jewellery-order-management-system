import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useListKarigars } from '../../hooks/useQueries';
import { Search, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineErrorState } from '../errors/InlineErrorState';

interface TotalKarigarListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectKarigar?: (karigarId: string) => void;
}

export function TotalKarigarListDialog({ open, onOpenChange, onSelectKarigar }: TotalKarigarListDialogProps) {
  const { data: karigars = [], isLoading, error, refetch } = useListKarigars();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort karigars
  const filteredKarigars = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // Filter out empty/whitespace-only names
    const validKarigars = karigars.filter(k => k.name.trim() !== '');
    
    if (!query) {
      return validKarigars;
    }
    
    return validKarigars.filter(k => 
      k.name.toLowerCase().includes(query) || k.id.toLowerCase().includes(query)
    );
  }, [karigars, searchQuery]);

  const handleKarigarClick = (karigarId: string) => {
    if (onSelectKarigar) {
      onSelectKarigar(karigarId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] sm:max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <Users className="h-5 w-5" />
            Total Karigar List
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
          {/* Search Bar */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search karigars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Content Area with proper scrolling */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-muted-foreground">Loading karigars...</p>
              </div>
            ) : error ? (
              <InlineErrorState
                title="Failed to load karigars"
                message="Unable to fetch the karigar list from the backend."
                onRetry={() => refetch()}
                error={error}
              />
            ) : filteredKarigars.length === 0 ? (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="py-12">
                  <div className="text-center space-y-2">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No karigars match your search' : 'No karigars found'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 mb-2">
                  <p className="text-sm text-muted-foreground">
                    {filteredKarigars.length} {filteredKarigars.length === 1 ? 'karigar' : 'karigars'} found
                  </p>
                </div>
                <div className="grid gap-2">
                  {filteredKarigars.map((karigar, index) => (
                    <Card 
                      key={`${karigar.id}-${index}`}
                      className={`border-amber-100 dark:border-amber-900 hover:border-amber-300 dark:hover:border-amber-700 transition-colors ${
                        onSelectKarigar ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20' : ''
                      }`}
                      onClick={() => handleKarigarClick(karigar.id)}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-amber-900 dark:text-amber-100">
                            {karigar.name}
                          </span>
                          {!karigar.isActive && (
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
