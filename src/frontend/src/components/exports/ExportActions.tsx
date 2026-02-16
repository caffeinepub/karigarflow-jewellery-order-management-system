import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Download, FileDown, Image } from 'lucide-react';
import { exportOrders } from '../../lib/exports/ordersExport';
import { downloadKarigarPDF, downloadKarigarJPEG } from '../../lib/exports/karigarOrdersDownloads';
import { toast } from 'sonner';
import type { Order } from '../../backend';

interface ExportActionsProps {
  selectedDate?: Date;
  filteredOrders?: Order[];
  selectedKarigar?: string;
  fromDate?: Date;
  toDate?: Date;
}

export function ExportActions({ selectedDate, filteredOrders, selectedKarigar, fromDate, toDate }: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      exportOrders(filteredOrders || [], 'all', selectedDate);
      toast.success('All orders exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportKarigarWise = async () => {
    setIsExporting(true);
    try {
      exportOrders(filteredOrders || [], 'karigar', selectedDate);
      toast.success('Karigar-wise export completed');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCOOnly = async () => {
    setIsExporting(true);
    try {
      exportOrders(filteredOrders || [], 'co', selectedDate);
      toast.success('CO orders exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDailySheet = async () => {
    setIsExporting(true);
    try {
      exportOrders(filteredOrders || [], 'daily', selectedDate);
      toast.success('Daily sheet exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  const handleKarigarExport = async (karigarName: string, format: 'pdf' | 'jpeg') => {
    if (!filteredOrders) {
      toast.error('No orders available for export');
      return;
    }

    const karigarOrders = filteredOrders.filter(
      (order) => order.karigarName === karigarName || (karigarName === 'Unassigned' && !order.karigarName.trim())
    );

    if (karigarOrders.length === 0) {
      toast.error(`No orders found for ${karigarName} with current filters`);
      return;
    }

    setIsExporting(true);
    try {
      if (format === 'pdf') {
        downloadKarigarPDF({
          karigarName,
          orders: karigarOrders,
          dateLabel: fromDate && toDate 
            ? `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`
            : fromDate
            ? `From ${fromDate.toLocaleDateString()}`
            : toDate
            ? `Until ${toDate.toLocaleDateString()}`
            : undefined,
        });
        toast.success(`Opening print dialog for ${karigarName} orders`);
      } else {
        await downloadKarigarJPEG({
          karigarName,
          orders: karigarOrders,
          dateLabel: fromDate && toDate 
            ? `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`
            : fromDate
            ? `From ${fromDate.toLocaleDateString()}`
            : toDate
            ? `Until ${toDate.toLocaleDateString()}`
            : undefined,
        });
        toast.success(`Downloaded ${karigarName} orders as JPEG`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  // For Staff Dashboard: show per-Karigar exports if we have filtered orders
  const showKarigarExports = filteredOrders && filteredOrders.length > 0;
  const karigarList = showKarigarExports 
    ? Object.keys(
        filteredOrders.reduce((acc, order) => {
          const name = order.karigarName || 'Unassigned';
          acc[name] = true;
          return acc;
        }, {} as Record<string, boolean>)
      ).sort()
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportAll}>
          All Orders (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportKarigarWise}>
          Karigar-wise (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCOOnly}>
          CO Only (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportDailySheet}>
          Daily Sheet (CSV)
        </DropdownMenuItem>
        
        {showKarigarExports && karigarList.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Per-Karigar Exports</DropdownMenuLabel>
            {karigarList.map((karigarName) => (
              <DropdownMenuSub key={karigarName}>
                <DropdownMenuSubTrigger>
                  {karigarName}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleKarigarExport(karigarName, 'pdf')}>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF (Print)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleKarigarExport(karigarName, 'jpeg')}>
                    <Image className="mr-2 h-4 w-4" />
                    JPEG (Download)
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
