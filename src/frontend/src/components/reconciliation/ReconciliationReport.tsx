import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import type { PersistentOrder } from '../../backend';
import { formatOptionalNumber } from '../../lib/orders/formatOptionalNumber';

interface ReconciliationReportProps {
  matched: PersistentOrder[];
  missing: PersistentOrder[];
  unmapped: PersistentOrder[];
}

export function ReconciliationReport({ matched, missing, unmapped }: ReconciliationReportProps) {
  const [matchedOpen, setMatchedOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(true);
  const [unmappedOpen, setUnmappedOpen] = useState(true);

  return (
    <div className="space-y-4">
      {/* Matched Orders */}
      <Collapsible open={matchedOpen} onOpenChange={setMatchedOpen}>
        <Card className="card-glow-subtle">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Matched Orders
                  <Badge variant="outline" className="ml-2 text-white">
                    {matched.length}
                  </Badge>
                </div>
                {matchedOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {matched.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matched orders</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white">Order No</TableHead>
                        <TableHead className="text-white">Design Code</TableHead>
                        <TableHead className="text-white">Generic Name</TableHead>
                        <TableHead className="text-white">Qty</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matched.map((order, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-white">{order.orderNo}</TableCell>
                          <TableCell className="text-white">{order.designCode}</TableCell>
                          <TableCell className="text-white">{order.genericName}</TableCell>
                          <TableCell className="text-white">{Number(order.qty)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-white">{order.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Missing Orders */}
      <Collapsible open={missingOpen} onOpenChange={setMissingOpen}>
        <Card className="card-glow-subtle">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  Missing Orders
                  <Badge variant="outline" className="ml-2 text-white">
                    {missing.length}
                  </Badge>
                </div>
                {missingOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">No missing orders</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white">Order No</TableHead>
                        <TableHead className="text-white">Design Code</TableHead>
                        <TableHead className="text-white">Generic Name</TableHead>
                        <TableHead className="text-white">Qty</TableHead>
                        <TableHead className="text-white">Weight (g)</TableHead>
                        <TableHead className="text-white">Size</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missing.map((order, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-white">{order.orderNo}</TableCell>
                          <TableCell className="text-white">{order.designCode}</TableCell>
                          <TableCell className="text-white">{order.genericName}</TableCell>
                          <TableCell className="text-white">{Number(order.qty)}</TableCell>
                          <TableCell className="text-white">{formatOptionalNumber(order.weight)}</TableCell>
                          <TableCell className="text-white">{formatOptionalNumber(order.size)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Unmapped Designs */}
      <Collapsible open={unmappedOpen} onOpenChange={setUnmappedOpen}>
        <Card className="card-glow-subtle">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  Unmapped Design Codes
                  <Badge variant="outline" className="ml-2 text-white">
                    {unmapped.length}
                  </Badge>
                </div>
                {unmappedOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {unmapped.length === 0 ? (
                <p className="text-sm text-muted-foreground">No unmapped design codes</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    These design codes don't exist in your master designs. Please create mappings for them before importing.
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-white">Design Code</TableHead>
                          <TableHead className="text-white">Order No</TableHead>
                          <TableHead className="text-white">Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmapped.map((order, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium text-white">{order.designCode}</TableCell>
                            <TableCell className="text-white">{order.orderNo}</TableCell>
                            <TableCell className="text-white">{Number(order.qty)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
