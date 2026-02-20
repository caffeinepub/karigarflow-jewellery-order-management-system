import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarIcon, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ORDER_STATUS, getStatusLabel } from '../../lib/orders/statusConstants';
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
}: OrdersFiltersBarProps) {
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const hasActiveFilters = searchQuery || fromDate || toDate || selectedKarigar || selectedStatus || showCOOnly || showRBOnly;

  const statusOptions = [
    { value: ORDER_STATUS.PENDING, label: getStatusLabel(ORDER_STATUS.PENDING) },
    { value: ORDER_STATUS.DELIVERED, label: getStatusLabel(ORDER_STATUS.DELIVERED) },
    { value: ORDER_STATUS.GIVEN_TO_HALLMARK, label: getStatusLabel(ORDER_STATUS.GIVEN_TO_HALLMARK) },
    { value: ORDER_STATUS.RETURNED_FROM_HALLMARK, label: getStatusLabel(ORDER_STATUS.RETURNED_FROM_HALLMARK) },
    { value: ORDER_STATUS.BILLED, label: getStatusLabel(ORDER_STATUS.BILLED) },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">From:</Label>
              <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-w-[140px]">
                    <CalendarIcon className="h-4 w-4" />
                    {fromDate ? format(fromDate, 'PP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <div className="fixed inset-0 bg-black/20 z-[9998]" onClick={() => setFromDateOpen(false)} />
                  <div className="relative z-[9999] bg-card">
                    <Calendar
                      mode="single"
                      selected={fromDate || undefined}
                      onSelect={(date) => {
                        onFromDateChange(date || null);
                        setFromDateOpen(false);
                      }}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">To:</Label>
              <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-w-[140px]">
                    <CalendarIcon className="h-4 w-4" />
                    {toDate ? format(toDate, 'PP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                  <div className="fixed inset-0 bg-black/20 z-[9998]" onClick={() => setToDateOpen(false)} />
                  <div className="relative z-[9999] bg-card">
                    <Calendar
                      mode="single"
                      selected={toDate || undefined}
                      onSelect={(date) => {
                        onToDateChange(date || null);
                        setToDateOpen(false);
                      }}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Karigar Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Karigar:</Label>
              <Select value={selectedKarigar || 'all'} onValueChange={(v) => onKarigarChange(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
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
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Status:</Label>
              <Select value={selectedStatus || 'all'} onValueChange={(v) => onStatusChange(v === 'all' ? null : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="co-only"
                checked={showCOOnly}
                onCheckedChange={onCOOnlyChange}
              />
              <Label htmlFor="co-only" className="text-sm cursor-pointer">
                Customer Orders Only
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="rb-only"
                checked={showRBOnly}
                onCheckedChange={onRBOnlyChange}
              />
              <Label htmlFor="rb-only" className="text-sm cursor-pointer">
                RB Orders Only
              </Label>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
