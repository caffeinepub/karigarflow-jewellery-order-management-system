import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { PersistentOrder } from '../../backend';

interface KarigarExportControlsProps {
  orders: PersistentOrder[];
  onExport: (format: 'pdf' | 'jpeg', filteredOrders: PersistentOrder[], scope: string) => Promise<void>;
}

export function KarigarExportControls({ orders, onExport }: KarigarExportControlsProps) {
  const [filterType, setFilterType] = useState<'all' | 'date' | 'design'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [designCodeFilter, setDesignCodeFilter] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const getFilteredOrders = (): PersistentOrder[] => {
    let filtered = [...orders];

    if (filterType === 'date' && selectedDate) {
      const targetDate = new Date(selectedDate);
      filtered = filtered.filter(order => {
        const orderDate = new Date(Number(order.uploadDate) / 1000000);
        return format(orderDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd');
      });
    } else if (filterType === 'design' && designCodeFilter.trim()) {
      const normalizedFilter = designCodeFilter.trim().toLowerCase();
      filtered = filtered.filter(order => 
        order.designCode.toLowerCase().includes(normalizedFilter)
      );
    }

    return filtered;
  };

  const handleExport = async (exportFormat: 'pdf' | 'jpeg') => {
    const filteredOrders = getFilteredOrders();
    
    if (filteredOrders.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      let scope = 'All Orders';
      if (filterType === 'date' && selectedDate) {
        scope = `Date: ${format(new Date(selectedDate), 'MMM d, yyyy')}`;
      } else if (filterType === 'design' && designCodeFilter.trim()) {
        scope = `Design: ${designCodeFilter.trim()}`;
      }
      
      await onExport(exportFormat, filteredOrders, scope);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCount = getFilteredOrders().length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Orders</CardTitle>
        <CardDescription>
          Filter and export orders in PDF or JPEG format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Filter Type</Label>
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="design">By Design Code</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filterType === 'date' && (
          <div className="space-y-2">
            <Label htmlFor="date-filter">Select Date</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        )}

        {filterType === 'design' && (
          <div className="space-y-2">
            <Label htmlFor="design-filter">Design Code</Label>
            <Input
              id="design-filter"
              type="text"
              placeholder="Enter design code..."
              value={designCodeFilter}
              onChange={(e) => setDesignCodeFilter(e.target.value)}
            />
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {filteredCount} order{filteredCount !== 1 ? 's' : ''} will be exported
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleExport('pdf')}
            disabled={isExporting || filteredCount === 0}
            className="flex-1"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            onClick={() => handleExport('jpeg')}
            disabled={isExporting || filteredCount === 0}
            variant="outline"
            className="flex-1"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            Export JPEG
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
