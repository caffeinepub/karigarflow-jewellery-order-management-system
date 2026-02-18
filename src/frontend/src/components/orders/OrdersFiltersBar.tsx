import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface OrdersFiltersBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  fromDate: Date | null;
  toDate: Date | null;
  onFromDateChange: (date: Date | null) => void;
  onToDateChange: (date: Date | null) => void;
  selectedKarigar: string | null;
  onKarigarChange: (value: string | null) => void;
  selectedStatus: string | null;
  onStatusChange: (value: string | null) => void;
  showCOOnly: boolean;
  onCOOnlyChange: (value: boolean) => void;
  showRBOnly: boolean;
  onRBOnlyChange: (value: boolean) => void;
  karigars?: Array<{ id: string; name: string }>;
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
  karigars = [],
}: OrdersFiltersBarProps) {
  // Controlled state for calendar popovers - only one can be open at a time
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

  const handleClearFilters = () => {
    onSearchChange('');
    onFromDateChange(null);
    onToDateChange(null);
    onKarigarChange(null);
    onStatusChange(null);
    onCOOnlyChange(false);
    onRBOnlyChange(false);
  };

  // Mutual exclusivity: opening one closes the other
  const handleFromDateOpenChange = (open: boolean) => {
    if (open && toDateOpen) {
      setToDateOpen(false);
    }
    setFromDateOpen(open);
  };

  const handleToDateOpenChange = (open: boolean) => {
    if (open && fromDateOpen) {
      setFromDateOpen(false);
    }
    setToDateOpen(open);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row gap-2 w-full">
        <Input
          placeholder="Search by order number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleClearFilters} className="flex-shrink-0">
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Karigar Filter */}
        {karigars.length > 0 && (
          <Select value={selectedKarigar || 'all'} onValueChange={(v) => onKarigarChange(v === 'all' ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All Karigars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Karigars</SelectItem>
              {karigars.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status Filter */}
        <Select value={selectedStatus || 'all'} onValueChange={(v) => onStatusChange(v === 'all' ? null : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="given_to_hallmark">Given to Hallmark</SelectItem>
          </SelectContent>
        </Select>

        {/* From Date - controlled popover with mutual exclusivity */}
        <Popover open={fromDateOpen} onOpenChange={handleFromDateOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, 'PPP') : 'From Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="start"
            sideOffset={8}
            collisionPadding={16}
          >
            <Calendar
              mode="single"
              selected={fromDate || undefined}
              onSelect={(date) => {
                onFromDateChange(date || null);
                setFromDateOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* To Date - controlled popover with mutual exclusivity */}
        <Popover open={toDateOpen} onOpenChange={handleToDateOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, 'PPP') : 'To Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="start"
            sideOffset={8}
            collisionPadding={16}
          >
            <Calendar
              mode="single"
              selected={toDate || undefined}
              onSelect={(date) => {
                onToDateChange(date || null);
                setToDateOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Order Type Checkboxes */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="co-only" checked={showCOOnly} onCheckedChange={onCOOnlyChange} />
          <Label htmlFor="co-only" className="text-sm font-normal cursor-pointer">
            Customer Orders Only
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="rb-only" checked={showRBOnly} onCheckedChange={onRBOnlyChange} />
          <Label htmlFor="rb-only" className="text-sm font-normal cursor-pointer">
            RB Orders Only
          </Label>
        </div>
      </div>
    </div>
  );
}
