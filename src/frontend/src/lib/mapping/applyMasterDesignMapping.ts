import type { Order, DesignCode, MasterDesignEntry } from '../../backend';

export interface MappingResult {
  mappedOrders: Order[];
  unmappedOrders: Order[];
  unmappedDesignCodes: string[];
}

export function applyMasterDesignMapping(
  rawOrders: Order[],
  masterDesigns: [DesignCode, MasterDesignEntry][]
): MappingResult {
  const designMap = new Map(masterDesigns);
  const mappedOrders: Order[] = [];
  const unmappedOrders: Order[] = [];
  const unmappedCodes = new Set<string>();

  rawOrders.forEach((order) => {
    const mapping = designMap.get(order.designCode);
    
    if (mapping) {
      mappedOrders.push({
        ...order,
        genericName: mapping.genericName,
        karigarName: mapping.karigarName,
      });
    } else {
      unmappedCodes.add(order.designCode);
      unmappedOrders.push(order);
    }
  });

  return {
    mappedOrders,
    unmappedOrders,
    unmappedDesignCodes: Array.from(unmappedCodes),
  };
}
