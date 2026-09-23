export type StockStatus = "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface MedicineStockItem {
  id: string;
  hospitalId: string;
  hospitalName: string;
  medicineName: string;
  genericName?: string;
  category: string;
  dosageForm: string;
  stockStatus: StockStatus;
  quantity: number;
  updatedAt: string;
}

export interface UpdateMedicineStockRequest {
  hospitalId: string;
  medicineName: string;
  stockStatus: StockStatus;
  quantity?: number;
}
