import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarIcon, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { ALL_STATUS_OPTIONS, getStatusLabel } from '../../lib/orders/statusConstants';
import { normalizeStatus } from '../../lib/orders/normalizeStatus';
import type { PersistentKarigar } from '../../backend';

interface OrdersFiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fromDate: Date | null;
  toDate: Date | null;
  onFromDateChange: (date: Date | null) => void;
  onToDateChange: (date: Date | null) => void;
  selectedKarigar: string | null;
  onKarigarChange: (karigarId: string | null) => void;
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  showCOOnly: boolean;
  onCOOnlyChange: (value: boolean) => void;
  showRBOnly: boolean;
  onRBOnlyChange: (value: boolean) => void;
  karigars: PersistentKarigar[];
  onClearFilters: () => void;
  availableStatuses?: string[];
}

export function OrdersFiltersBar({
  searchQuery,
  onSearchChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  selectedKarigar,
  onKarigarChange,
  selectedStatus,
  onStatusChange,
  showCOOnly,
  onCOOnlyChange,
  showRBOnly,
  onRBOnlyChange,
  karigars,
  onClearFilters,
  availableStatuses,
}: OrdersFiltersBarProps) {
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const hasActiveFilters =
    searchQuery !== '' ||
    fromDate !== null ||
    toDate !== null ||
    selectedKarigar !== null ||
    selectedStatus !== null ||
    showCOOnly ||
    showRBOnly;

  const handleFromDateSelect = (date: Date | undefined) => {
    onFromDateChange(date || null);
    setFromDateOpen(false);
  };

  const handleToDateSelect = (date: Date | undefined) => {
    onToDateChange(date || null);
    setToDateOpen(false);
  };

  const handleFromDateOpen = (open: boolean) => {
    if (open && toDateOpen) {
      setToDateOpen(false);
    }
    setFromDateOpen(open);
  };

  const handleToDateOpen = (open: boolean) => {
    if (open && fromDateOpen) {
      setFromDateOpen(false);
    }
    setToDateOpen(open);
  };

  // Use provided status options or default to all
  const statusOptions = availableStatuses || ALL_STATUS_OPTIONS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* From Date */}
        <Popover open={fromDateOpen} onOpenChange={handleFromDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[140px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, 'PP') : 'From Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[100]" align="start" collisionPadding={16}>
            <Calendar mode="single" selected={fromDate || undefined} onSelect={handleFromDateSelect} initialFocus />
          </PopoverContent>
        </Popover>

        {/* To Date */}
        <Popover open={toDateOpen} onOpenChange={handleToDateOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[140px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, 'PP') : 'To Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[100]" align="start" collisionPadding={16}>
            <Calendar mode="single" selected={toDate || undefined} onSelect={handleToDateSelect} initialFocus />
          </PopoverContent>
        </Popover>

        {/* Karigar Filter */}
        <Select value={selectedKarigar || 'all'} onValueChange={(v) => onKarigarChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Karigars" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Karigars</SelectItem>
            {karigars.map((karigar) => (
              <SelectItem key={karigar.id} value={karigar.id}>
                {karigar.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={selectedStatus || 'all'} onValueChange={(v) => onStatusChange(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {getStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Order Type Checkboxes */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="co-only" checked={showCOOnly} onCheckedChange={(checked) => onCOOnlyChange(checked === true)} />
          <Label htmlFor="co-only" className="text-sm cursor-pointer">
            Customer Orders Only
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="rb-only" checked={showRBOnly} onCheckedChange={(checked) => onRBOnlyChange(checked === true)} />
          <Label htmlFor="rb-only" className="text-sm cursor-pointer">
            RB Orders Only
          </Label>
        </div>
      </div>
    </div>
  );
}
