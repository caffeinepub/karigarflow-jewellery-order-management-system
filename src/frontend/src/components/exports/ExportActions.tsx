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
import { exportOrders } from '../../lib/exports/ordersExport';
import { downloadKarigarPDF, downloadKarigarJPEG } from '../../lib/exports/karigarOrdersDownloads';
import { deriveMetrics } from '../../lib/orders/deriveMetrics';
import { toast } from 'sonner';
import type { PersistentOrder } from '../../backend';
import { format as formatDate } from 'date-fns';

interface ExportActionsProps {
  filteredOrders: PersistentOrder[];
  selectedDate?: Date;
}

export function ExportActions({ filteredOrders, selectedDate }: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'all' | 'co' | 'daily') => {
    setIsExporting(true);
    try {
      exportOrders(filteredOrders, type, selectedDate);
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleKarigarExport = async (karigarName: string, exportFormat: 'pdf' | 'jpeg') => {
    setIsExporting(true);
    try {
      const karigarOrders = filteredOrders.filter(
        (order) => order.karigarName === karigarName || (order.karigarName.trim() === '' && karigarName === 'Unassigned')
      );

      if (karigarOrders.length === 0) {
        toast.error(`No orders found for ${karigarName}`);
        return;
      }

      const dateLabel = selectedDate ? formatDate(selectedDate, 'MMMM do, yyyy') : undefined;

      if (exportFormat === 'pdf') {
        downloadKarigarPDF({
          karigarName,
          orders: karigarOrders,
          selectedDate,
          dateLabel,
        });
        toast.success(`PDF export initiated for ${karigarName}`);
      } else {
        await downloadKarigarJPEG({
          karigarName,
          orders: karigarOrders,
          selectedDate,
          dateLabel,
        });
        toast.success(`JPEG downloaded for ${karigarName}`);
      }
    } catch (error) {
      console.error('Karigar export failed:', error);
      toast.error('Failed to export karigar orders');
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = deriveMetrics(filteredOrders);
  const karigarNames = Object.keys(metrics.byKarigar).sort();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || filteredOrders.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleExport('all')}>
          <FileText className="h-4 w-4 mr-2" />
          All Orders (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('co')}>
          <FileText className="h-4 w-4 mr-2" />
          Customer Orders Only (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('daily')}>
          <FileText className="h-4 w-4 mr-2" />
          Daily Sheet (CSV)
        </DropdownMenuItem>

        {karigarNames.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FileText className="h-4 w-4 mr-2" />
                Karigar PDF
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {karigarNames.map((karigarName) => (
                  <DropdownMenuItem
                    key={karigarName}
                    onClick={() => handleKarigarExport(karigarName, 'pdf')}
                  >
                    {karigarName} ({metrics.byKarigar[karigarName].count})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Image className="h-4 w-4 mr-2" />
                Karigar JPEG
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {karigarNames.map((karigarName) => (
                  <DropdownMenuItem
                    key={karigarName}
                    onClick={() => handleKarigarExport(karigarName, 'jpeg')}
                  >
                    {karigarName} ({metrics.byKarigar[karigarName].count})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
