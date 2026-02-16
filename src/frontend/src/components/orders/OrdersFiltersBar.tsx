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
    coFilter: boolean;
    rbFilter: boolean;
    status: string;
    orderNoQuery?: string;
  };
  onFiltersChange: (filters: any) => void;
  showOrderNoSearch?: boolean;
}

const ALL_KARIGARS_SENTINEL = '__all_karigars__';
const ALL_STATUS_SENTINEL = '__all_status__';

export function OrdersFiltersBar({ orders, filters, onFiltersChange, showOrderNoSearch }: OrdersFiltersBarProps) {
  // Sanitize orders before computing unique values
  const { validOrders } = sanitizeOrders(orders);
  
  const uniqueKarigars = Array.from(
    new Set(validOrders.map(o => formatKarigarName(o.karigarName)))
  ).sort();

  const uniqueStatuses = Array.from(
    new Set(validOrders.map(o => o.status))
  ).sort();

  const hasActiveFilters = 
    filters.karigar !== '' || 
    filters.status !== '' || 
    filters.dateFrom !== null || 
    filters.dateTo !== null || 
    filters.coFilter ||
    filters.rbFilter ||
    (filters.orderNoQuery && filters.orderNoQuery !== '');

  const clearFilters = () => {
    onFiltersChange({
      karigar: '',
      status: '',
      dateFrom: null,
      dateTo: null,
      coFilter: false,
      rbFilter: false,
      orderNoQuery: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {showOrderNoSearch && (
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="order-search" className="text-xs text-muted-foreground mb-1 block">
              Search Order No
            </Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="order-search"
                placeholder="Search by order number..."
                value={filters.orderNoQuery || ''}
                onChange={(e) => onFiltersChange({ ...filters, orderNoQuery: e.target.value })}
                className="pl-8"
              />
            </div>
          </div>
        )}

        <div className="w-[180px]">
          <Label htmlFor="karigar-filter" className="text-xs text-muted-foreground mb-1 block">
            Karigar
          </Label>
          <Select
            value={filters.karigar || ALL_KARIGARS_SENTINEL}
            onValueChange={(value) => 
              onFiltersChange({ 
                ...filters, 
                karigar: value === ALL_KARIGARS_SENTINEL ? '' : value 
              })
            }
          >
            <SelectTrigger id="karigar-filter">
              <SelectValue placeholder="All Karigars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_KARIGARS_SENTINEL}>All Karigars</SelectItem>
              {uniqueKarigars.map(karigar => (
                <SelectItem key={karigar} value={karigar}>
                  {karigar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Label htmlFor="status-filter" className="text-xs text-muted-foreground mb-1 block">
            Status
          </Label>
          <Select
            value={filters.status || ALL_STATUS_SENTINEL}
            onValueChange={(value) => 
              onFiltersChange({ 
                ...filters, 
                status: value === ALL_STATUS_SENTINEL ? '' : value 
              })
            }
          >
            <SelectTrigger id="status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS_SENTINEL}>All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[180px]">
          <Label htmlFor="date-from" className="text-xs text-muted-foreground mb-1 block">
            Date From
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-from"
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, 'PP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom || undefined}
                onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date || null })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="w-[180px]">
          <Label htmlFor="date-to" className="text-xs text-muted-foreground mb-1 block">
            Date To
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-to"
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, 'PP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo || undefined}
                onSelect={(date) => onFiltersChange({ ...filters, dateTo: date || null })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="co-filter"
            checked={filters.coFilter}
            onCheckedChange={(checked) => onFiltersChange({ ...filters, coFilter: checked })}
          />
          <Label htmlFor="co-filter" className="text-sm font-medium cursor-pointer">
            CO Only
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="rb-filter"
            checked={filters.rbFilter}
            onCheckedChange={(checked) => onFiltersChange({ ...filters, rbFilter: checked })}
          />
          <Label htmlFor="rb-filter" className="text-sm font-medium cursor-pointer">
            RB Only
          </Label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8"
          >
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
