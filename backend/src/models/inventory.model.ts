export type MedicineCategory =
  | 'TABLET'
  | 'INJECTION'
  | 'SYRUP'
  | 'IV_FLUID'
  | 'EMERGENCY_DRUG';

export type InventoryStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItem {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityLocation: {
    latitude: number;
    longitude: number;
  };
  facilityPhone?: string;
  medicineName: string;
  category: MedicineCategory;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  status: InventoryStockStatus;
  price: number;
  lastUpdated: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface InventorySearchResult extends InventoryItem {
  distanceKm: number;
  etaMinutes: number;
}
