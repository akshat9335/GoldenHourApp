import { firestore } from "../../config/firebase";
import { MedicineStockItem, StockStatus, UpdateMedicineStockRequest } from "../../types/medicine";
import { AppError } from "../../utils/AppError";

class MedicineService {
  private inMemoryInventory: Map<string, MedicineStockItem> = new Map();

  constructor() {
    this.seedPrayagrajMedicineInventory();
  }

  private seedPrayagrajMedicineInventory(): void {
    const hospitals = [
      { id: "hosp-srn-prayagraj", name: "Swaroop Rani Nehru (SRN) Hospital" },
      { id: "hosp-medanta-prayagraj", name: "Medanta Super Specialty Hospital" },
      { id: "hosp-mln-prayagraj", name: "Motilal Nehru (MLN) Hospital" },
      { id: "hosp-kamla-prayagraj", name: "Kamla Nehru Memorial Hospital" },
    ];

    const standardMedicines = [
      { name: "Atropine Injection (0.6mg)", category: "Emergency / Resuscitation", dosageForm: "1ml Ampoule", qty: 45, status: "AVAILABLE" as StockStatus },
      { name: "Adrenaline / Epinephrine (1mg)", category: "Emergency / Resuscitation", dosageForm: "1ml Ampoule", qty: 28, status: "AVAILABLE" as StockStatus },
      { name: "Aspirin (300mg / Dispersible)", category: "Cardiac / Antiplatelet", dosageForm: "Tablet", qty: 250, status: "AVAILABLE" as StockStatus },
      { name: "Atorvastatin (80mg)", category: "Cardiac / Lipid", dosageForm: "Tablet", qty: 180, status: "AVAILABLE" as StockStatus },
      { name: "Paracetamol IV Infusion (100ml)", category: "Analgesic / Antipyretic", dosageForm: "IV Bottle", qty: 120, status: "AVAILABLE" as StockStatus },
      { name: "Paracetamol 650mg", category: "Analgesic / Antipyretic", dosageForm: "Tablet", qty: 500, status: "AVAILABLE" as StockStatus },
      { name: "Normal Saline 0.9% (500ml)", category: "IV Fluids / Trauma", dosageForm: "IV Bag", qty: 340, status: "AVAILABLE" as StockStatus },
      { name: "Regular Human Insulin (40 IU/ml)", category: "Endocrine / Diabetes", dosageForm: "10ml Vial", qty: 15, status: "LOW_STOCK" as StockStatus },
      { name: "Pantoprazole IV (40mg)", category: "Gastrointestinal / Antacid", dosageForm: "Vial", qty: 95, status: "AVAILABLE" as StockStatus },
      { name: "Ceftriaxone Injection (1g)", category: "Antibiotic", dosageForm: "Vial", qty: 60, status: "AVAILABLE" as StockStatus },
      { name: "Salbutamol Respirator Solution", category: "Respiratory / Bronchodilator", dosageForm: "Respules", qty: 0, status: "OUT_OF_STOCK" as StockStatus },
    ];

    for (const h of hospitals) {
      for (const m of standardMedicines) {
        const id = `${h.id}_${m.name.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const item: MedicineStockItem = {
          id,
          hospitalId: h.id,
          hospitalName: h.name,
          medicineName: m.name,
          category: m.category,
          dosageForm: m.dosageForm,
          stockStatus: m.status,
          quantity: m.qty,
          updatedAt: new Date().toISOString(),
        };
        this.inMemoryInventory.set(id, item);
      }
    }
  }

  public async searchMedicines(query?: string, hospitalId?: string): Promise<MedicineStockItem[]> {
    const q = (query || "").trim().toLowerCase();
    const results: MedicineStockItem[] = [];

    // Optional Firestore read if exists
    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        let collQuery: any = firestore.collection("medicineInventory");
        if (hospitalId) {
          collQuery = collQuery.where("hospitalId", "==", hospitalId);
        }
        const snap = await collQuery.limit(50).get();
        for (const doc of snap.docs) {
          const item = doc.data() as MedicineStockItem;
          if (item && item.id) {
            this.inMemoryInventory.set(item.id, item);
          }
        }
      } catch (err) {
        console.warn("[MedicineService] Firestore search error:", err);
      }
    }

    for (const item of this.inMemoryInventory.values()) {
      if (hospitalId && item.hospitalId !== hospitalId && !item.hospitalId.includes(hospitalId) && !hospitalId.includes(item.hospitalId)) {
        continue;
      }
      if (!q || item.medicineName.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)) {
        results.push(item);
      }
    }

    return results;
  }

  public async getHospitalInventory(hospitalId: string): Promise<MedicineStockItem[]> {
    return this.searchMedicines("", hospitalId);
  }

  public async updateStock(data: UpdateMedicineStockRequest): Promise<MedicineStockItem> {
    const key = Array.from(this.inMemoryInventory.keys()).find((k) =>
      k.includes(data.hospitalId) && k.toLowerCase().includes(data.medicineName.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_"))
    );

    let item: MedicineStockItem;
    const now = new Date().toISOString();

    if (key && this.inMemoryInventory.has(key)) {
      item = this.inMemoryInventory.get(key)!;
      item.stockStatus = data.stockStatus;
      if (typeof data.quantity === "number") item.quantity = data.quantity;
      item.updatedAt = now;
    } else {
      const id = `${data.hospitalId}_${data.medicineName.replace(/[^a-zA-Z0-9]/g, "_")}`;
      item = {
        id,
        hospitalId: data.hospitalId,
        hospitalName: "Hospital Center",
        medicineName: data.medicineName,
        category: "Essential Medical Stock",
        dosageForm: "Standard Unit",
        stockStatus: data.stockStatus,
        quantity: data.quantity ?? 10,
        updatedAt: now,
      };
      this.inMemoryInventory.set(id, item);
    }

    if (firestore && process.env.NODE_ENV !== "test") {
      try {
        await firestore.collection("medicineInventory").doc(item.id).set(item, { merge: true });
      } catch (err) {
        console.warn("[MedicineService] Firestore update error:", err);
      }
    }

    return item;
  }
}

export const medicineService = new MedicineService();
