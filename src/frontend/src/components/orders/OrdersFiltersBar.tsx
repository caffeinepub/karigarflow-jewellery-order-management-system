import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '../../backend';

interface OrdersFiltersBarProps {
  orders: Order[];
  filters: {
    karigar: string;
    dateFrom: Date | null;
    dateTo: Date | null;
    coOnly: boolean;
    status: string;
  };
  onFiltersChange: (filters: any) => void;
}

const ALL_KARIGARS_SENTINEL = '__all_karigars__';
const UNASSIGNED_LABEL = 'Unassigned';

/**
 * Normalize karigar name: treat empty/whitespace-only as "Unassigned"
 */
function normalizeKarigarName(karigarName: string): string {
  const trimmed = karigarName?.trim() || '';
  return trimmed === '' ? UNASSIGNED_LABEL : trimmed;
}

export function OrdersFiltersBar({ orders, filters, onFiltersChange }: OrdersFiltersBarProps) {
  // Normalize karigar names and get unique values
  const uniqueKarigars = Array.from(
    new Set(orders.map((o) => normalizeKarigarName(o.karigarName)))
  ).sort();

  const hasActiveFilters = filters.karigar || filters.dateFrom || filters.dateTo || filters.coOnly || filters.status;

  const clearFilters = () => {
    onFiltersChange({
      karigar: '',
      dateFrom: null,
      dateTo: null,
      coOnly: false,
      status: '',
    });
  };

  // Convert internal filter state to Select value
  const selectValue = filters.karigar === '' ? ALL_KARIGARS_SENTINEL : filters.karigar;

  // Convert Select value to internal filter state
  const handleKarigarChange = (value: string) => {
    const internalValue = value === ALL_KARIGARS_SENTINEL ? '' : value;
    onFiltersChange({ ...filters, karigar: internalValue });
  };

  return (
    <div className="flex flex-wrap gap-4 items-center mt-4">
      <div className="flex-1 min-w-[200px]">
        <Select value={selectValue} onValueChange={handleKarigarChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Karigars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_KARIGARS_SENTINEL}>All Karigars</SelectItem>
            {uniqueKarigars.map((karigar) => (
              <SelectItem key={karigar} value={karigar}>
                {karigar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateFrom ? format(filters.dateFrom, 'MMM d, yyyy') : 'From date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateFrom || undefined}
            onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date || null })}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-start">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateTo ? format(filters.dateTo, 'MMM d, yyyy') : 'To date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.dateTo || undefined}
            onSelect={(date) => onFiltersChange({ ...filters, dateTo: date || null })}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        <Switch
          id="co-only"
          checked={filters.coOnly}
          onCheckedChange={(checked) => onFiltersChange({ ...filters, coOnly: checked })}
        />
        <Label htmlFor="co-only" className="cursor-pointer">CO Only</Label>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
