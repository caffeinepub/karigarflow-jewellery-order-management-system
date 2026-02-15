import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportOrders } from '../../lib/exports/ordersExport';
import { Download } from 'lucide-react';
import type { Order } from '../../backend';

interface ExportActionsProps {
  orders: Order[];
}

export function ExportActions({ orders }: ExportActionsProps) {
  const handleExport = (type: 'all' | 'karigar' | 'co' | 'daily') => {
    exportOrders(orders, type);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('all')}>
          Export All Orders
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('karigar')}>
          Export Karigar-wise
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('co')}>
          Export CO Orders Only
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('daily')}>
          Export Daily Sheet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
