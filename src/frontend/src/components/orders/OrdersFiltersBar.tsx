import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CalendarIcon, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import type { PersistentOrder } from '../../backend';
import { formatKarigarName } from '../../lib/orders/formatKarigarName';
import { sanitizeOrders } from '../../lib/orders/validatePersistentOrder';

interface OrdersFiltersBarProps {
  orders: PersistentOrder[];
  filters: {
    karigar: string;
    dateFrom: Date | null;
    dateTo: Date | null;
    coOnly: boolean;
    status: string;
    orderNoQuery?: string;
  };
  onFiltersChange: (filters: any) => void;
  showOrderNoSearch?: boolean;
}

const ALL_KARIGARS_SENTINEL = '__all_karigars__';
const ALL_STATUS_SENTINEL = '__all_status__';

export function OrdersFiltersBar({ orders, filters, onFiltersChange, showOrderNoSearch = false }: OrdersFiltersBarProps) {
  // Sanitize orders before computing unique values
  const { validOrders } = sanitizeOrders(orders);
  
  // Use shared formatter to get unique karigar names - this ensures dropdown values match filter comparison
  const uniqueKarigars = Array.from(
    new Set(validOrders.map((o) => formatKarigarName(o.karigarName)))
  ).sort();

  const uniqueStatuses = Array.from(
    new Set(validOrders.map((o) => o.status))
  ).sort();

  const hasActiveFilters = filters.karigar || filters.dateFrom || filters.dateTo || filters.coOnly || filters.status || (filters.orderNoQuery && filters.orderNoQuery.length > 0);

  const clearFilters = () => {
    onFiltersChange({
      karigar: '',
      dateFrom: null,
      dateTo: null,
      coOnly: false,
      status: '',
      orderNoQuery: '',
    });
  };

  // Convert internal filter state to Select value
  const selectKarigarValue = filters.karigar === '' ? ALL_KARIGARS_SENTINEL : filters.karigar;
  const selectStatusValue = filters.status === '' ? ALL_STATUS_SENTINEL : filters.status;

  // Convert Select value to internal filter state
  const handleKarigarChange = (value: string) => {
    const internalValue = value === ALL_KARIGARS_SENTINEL ? '' : value;
    onFiltersChange({ ...filters, karigar: internalValue });
  };

  const handleStatusChange = (value: string) => {
    const internalValue = value === ALL_STATUS_SENTINEL ? '' : value;
    onFiltersChange({ ...filters, status: internalValue });
  };

  return (
    <div className="flex flex-wrap gap-4 items-center mt-4">
      {showOrderNoSearch && (
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search order number..."
              value={filters.orderNoQuery || ''}
              onChange={(e) => onFiltersChange({ ...filters, orderNoQuery: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-[200px]">
        <Select value={selectKarigarValue} onValueChange={handleKarigarChange}>
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

      <div className="flex-1 min-w-[200px]">
        <Select value={selectStatusValue} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_SENTINEL}>All Status</SelectItem>
            {uniqueStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
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
