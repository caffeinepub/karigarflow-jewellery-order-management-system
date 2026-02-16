import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Image } from 'lucide-react';
import { downloadKarigarPDF, downloadKarigarJPEG } from '../../lib/exports/karigarOrdersDownloads';
import { toast } from 'sonner';
import type { PersistentOrder } from '../../backend';
import { format, startOfDay, endOfDay } from 'date-fns';
import { getOrderTimestamp } from '../../lib/orders/getOrderTimestamp';

interface KarigarDrilldownExportBarProps {
  karigarName: string;
  allOrders: PersistentOrder[];
  selectedDate: Date;
}

export function KarigarDrilldownExportBar({
  karigarName,
  allOrders,
  selectedDate,
}: KarigarDrilldownExportBarProps) {
  const [isExporting, setIsExporting] = useState(false);

  const dailyOrders = allOrders.filter((order) => {
    const orderDate = getOrderTimestamp(order);
    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);
    return orderDate >= start && orderDate <= end;
  });

  const handleExport = async (format: 'pdf' | 'jpeg', scope: 'daily' | 'total') => {
    setIsExporting(true);
    try {
      const ordersToExport = scope === 'daily' ? dailyOrders : allOrders;
      
      if (ordersToExport.length === 0) {
        toast.error(`No ${scope} orders to export`);
        return;
      }

      const exportOptions = {
        karigarName,
        orders: ordersToExport,
        selectedDate: scope === 'daily' ? selectedDate : undefined,
        exportScope: scope,
      };

      if (format === 'pdf') {
        downloadKarigarPDF(exportOptions);
        toast.success(`PDF export initiated for ${scope} orders`);
      } else {
        await downloadKarigarJPEG(exportOptions);
        toast.success(`JPEG downloaded for ${scope} orders`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="h-4 w-4 mr-2" />
            PDF Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleExport('pdf', 'daily')}>
              Daily Orders ({format(selectedDate, 'MMM d')})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf', 'total')}>
              Total Orders (All)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Image className="h-4 w-4 mr-2" />
            JPEG Export
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => handleExport('jpeg', 'daily')}>
              Daily Orders ({format(selectedDate, 'MMM d')})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('jpeg', 'total')}>
              Total Orders (All)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
