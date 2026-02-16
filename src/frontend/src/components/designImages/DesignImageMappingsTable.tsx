import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DesignImageMapping } from '../../backend';
import { format } from 'date-fns';

interface DesignImageMappingsTableProps {
  mappings: DesignImageMapping[];
}

export function DesignImageMappingsTable({ mappings }: DesignImageMappingsTableProps) {
  if (mappings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No design image mappings found
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Design Code</TableHead>
            <TableHead>Generic Name</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map((mapping) => (
            <TableRow key={mapping.designCode}>
              <TableCell className="font-mono text-sm">{mapping.designCode}</TableCell>
              <TableCell>{mapping.genericName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  Image Available
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(Number(mapping.createdAt) / 1000000), 'MMM d, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
