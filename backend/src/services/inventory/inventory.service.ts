import { firestore } from '../../config/firebase';
import { InventoryItem, InventorySearchResult, InventoryStockStatus, MedicineCategory } from '../../models/inventory.model';
import { AppError } from '../../utils/AppError';

// Calculate distance using Haversine formula
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// In-memory fallback / seed store
class InMemoryInventoryStore {
  private items: Map<string, InventoryItem> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    const defaultFacilities = [
      {
        id: 'hosp-martha-blr',
        name: "St. Martha's Hospital ER",
        lat: 12.9716,
        lng: 77.5946,
        phone: '+91-80-2227-3100',
      },
      {
        id: 'hosp-fortis-blr',
        name: 'Fortis Hospital Pharmacy & ER',
        lat: 12.9352,
        lng: 77.6146,
        phone: '+91-80-6621-4444',
      },
      {
        id: 'hosp-apollo-blr',
        name: 'Apollo Hospital & 24/7 Pharmacy',
        lat: 12.9116,
        lng: 77.6389,
        phone: '+91-80-2630-4050',
      },
      {
        id: 'pharm-medplus-blr',
        name: 'MedPlus 24/7 Pharmacy - Koramangala',
        lat: 12.9341,
        lng: 77.6185,
        phone: '+91-80-4112-9876',
      },
      {
        id: 'hosp-aiims-delhi',
        name: 'AIIMS Apex Trauma Pharmacy',
        lat: 28.5672,
        lng: 77.21,
        phone: '+91-11-2658-8500',
      },
    ];

    const medicinesSeed: Array<{
      name: string;
      category: MedicineCategory;
      quantity: number;
      unit: string;
      threshold: number;
      price: number;
    }> = [
      { name: 'Adrenaline (Epinephrine) 1mg/ml', category: 'EMERGENCY_DRUG', quantity: 45, unit: 'Ampoules', threshold: 20, price: 120 },
      { name: 'Atropine Sulphate 0.6mg/ml', category: 'EMERGENCY_DRUG', quantity: 18, unit: 'Ampoules', threshold: 25, price: 95 },
      { name: 'Paracetamol 650mg (Dolo)', category: 'TABLET', quantity: 150, unit: 'Strips', threshold: 30, price: 32 },
      { name: 'Insulin Glargine 100IU/ml', category: 'INJECTION', quantity: 12, unit: 'Vials', threshold: 15, price: 580 },
      { name: 'Normal Saline (0.9% NaCl) 500ml', category: 'IV_FLUID', quantity: 80, unit: 'Bottles', threshold: 25, price: 65 },
      { name: 'Aspirin (Disprin) 325mg', category: 'EMERGENCY_DRUG', quantity: 110, unit: 'Strips', threshold: 30, price: 20 },
      { name: 'Sorbitrate 5mg (Sublingual)', category: 'EMERGENCY_DRUG', quantity: 60, unit: 'Strips', threshold: 20, price: 45 },
      { name: 'Pantoprazole 40mg IV', category: 'INJECTION', quantity: 5, unit: 'Vials', threshold: 20, price: 115 },
      { name: 'Augmentin 625mg (Amoxicillin)', category: 'TABLET', quantity: 40, unit: 'Strips', threshold: 15, price: 195 },
      { name: 'Ascoril-D Cough Syrup 100ml', category: 'SYRUP', quantity: 28, unit: 'Bottles', threshold: 10, price: 110 },
    ];

    for (const fac of defaultFacilities) {
      for (let i = 0; i < medicinesSeed.length; i++) {
        const seed = medicinesSeed[i];
        // Introduce some variation per facility
        const qtyVariance = Math.floor((i % 3 === 0 ? 0.3 : 1.2) * seed.quantity);
        const qty = i === 1 && fac.id === 'hosp-fortis-blr' ? 0 : qtyVariance;
        const status: InventoryStockStatus =
          qty === 0 ? 'OUT_OF_STOCK' : qty <= seed.threshold ? 'LOW_STOCK' : 'IN_STOCK';

        const id = `item-${fac.id}-${i + 1}`;
        this.items.set(id, {
          id,
          facilityId: fac.id,
          facilityName: fac.name,
          facilityLocation: { latitude: fac.lat, longitude: fac.lng },
          facilityPhone: fac.phone,
          medicineName: seed.name,
          category: seed.category,
          quantity: qty,
          unit: seed.unit,
          lowStockThreshold: seed.threshold,
          status,
          price: seed.price,
          lastUpdated: new Date().toISOString(),
          batchNumber: `BATCH-${2026}${100 + i}`,
          expiryDate: '2027-12-31',
        });
      }
    }
  }

  getAll(): InventoryItem[] {
    return Array.from(this.items.values());
  }

  getByFacility(facilityId: string): InventoryItem[] {
    return Array.from(this.items.values()).filter(
      (item) => item.facilityId === facilityId || item.facilityId === `hosp-${facilityId}`
    );
  }

  getById(itemId: string): InventoryItem | undefined {
    return this.items.get(itemId);
  }

  set(item: InventoryItem): void {
    this.items.set(item.id, item);
  }
}

const localStore = new InMemoryInventoryStore();

export class InventoryService {
  /**
   * Search for medicines by name across nearby facilities
   */
  async search(
    query?: string,
    userLat?: number,
    userLng?: number,
    radiusKm: number = 30
  ): Promise<InventorySearchResult[]> {
    const q = (query || '').trim().toLowerCase();
    const lat = userLat ?? 12.9352;
    const lng = userLng ?? 77.6146;

    let items: InventoryItem[] = [];

    if (firestore) {
      try {
        const snapshot = await firestore.collectionGroup('items').get();
        if (!snapshot.empty) {
          items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<InventoryItem, 'id'>),
          }));
        }
      } catch (_err) {
        // Fallback to in-memory store if collectionGroup is empty or rules block
        items = localStore.getAll();
      }
    }

    if (items.length === 0) {
      items = localStore.getAll();
    }

    // Filter by query
    let filtered = items;
    if (q) {
      filtered = items.filter(
        (item) =>
          item.medicineName.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    // Compute distance and ETA
    const results: InventorySearchResult[] = filtered.map((item) => {
      const dist = calculateDistanceKm(
        lat,
        lng,
        item.facilityLocation?.latitude || lat,
        item.facilityLocation?.longitude || lng
      );
      // Rough ETA estimate: 2.5 min per km + 3 min base buffer
      const eta = Math.max(3, Math.round(dist * 2.5 + 3));
      return {
        ...item,
        distanceKm: dist,
        etaMinutes: eta,
      };
    });

    // Filter by radius and sort by distance then availability
    return results
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => {
        // Prefer in-stock first, then nearest
        if (a.status === 'IN_STOCK' && b.status !== 'IN_STOCK') return -1;
        if (b.status === 'IN_STOCK' && a.status !== 'IN_STOCK') return 1;
        return a.distanceKm - b.distanceKm;
      });
  }

  /**
   * Get all stock items for a facility
   */
  async getByFacility(facilityId: string): Promise<InventoryItem[]> {
    if (firestore) {
      try {
        const snapshot = await firestore
          .collection('facilityInventory')
          .doc(facilityId)
          .collection('items')
          .get();

        if (!snapshot.empty) {
          return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<InventoryItem, 'id'>),
          }));
        }
      } catch (_err) {
        // fallback
      }
    }

    // Fallback to local store
    const localItems = localStore.getByFacility(facilityId);
    if (localItems.length > 0) {
      return localItems;
    }

    // If facility has no custom items yet, return default hospital stock mapped to this facility
    return localStore.getByFacility('hosp-martha-blr').map((item) => ({
      ...item,
      id: `${item.id}-${facilityId}`,
      facilityId,
    }));
  }

  /**
   * Add a new medicine to facility stock
   */
  async addItem(facilityId: string, data: Partial<InventoryItem>): Promise<InventoryItem> {
    if (!data.medicineName || data.quantity === undefined) {
      throw new AppError(400, 'INVALID_INPUT', 'Medicine name and quantity are required.');
    }

    const quantity = Math.max(0, Number(data.quantity) || 0);
    const lowStockThreshold = Number(data.lowStockThreshold) || 20;
    const status: InventoryStockStatus =
      quantity === 0
        ? 'OUT_OF_STOCK'
        : quantity <= lowStockThreshold
        ? 'LOW_STOCK'
        : 'IN_STOCK';

    const itemId = data.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newItem: InventoryItem = {
      id: itemId,
      facilityId,
      facilityName: data.facilityName || 'Hospital ER & Pharmacy',
      facilityLocation: data.facilityLocation || { latitude: 12.9716, longitude: 77.5946 },
      facilityPhone: data.facilityPhone || '+91-80-2227-3100',
      medicineName: data.medicineName.trim(),
      category: data.category || 'TABLET',
      quantity,
      unit: data.unit || 'Units',
      lowStockThreshold,
      status,
      price: Number(data.price) || 0,
      lastUpdated: new Date().toISOString(),
      batchNumber: data.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
      expiryDate: data.expiryDate || '2027-12-31',
    };

    if (firestore) {
      try {
        await firestore
          .collection('facilityInventory')
          .doc(facilityId)
          .collection('items')
          .doc(itemId)
          .set(newItem);
      } catch (_err) {
        // Continue with memory store
      }
    }

    localStore.set(newItem);
    return newItem;
  }

  /**
   * Update quantity / stock for an item. Status is auto-calculated.
   */
  async updateStock(
    itemId: string,
    updates: { quantity?: number; lowStockThreshold?: number; price?: number },
    facilityId?: string
  ): Promise<InventoryItem> {
    let existing = localStore.getById(itemId);

    if (firestore && facilityId) {
      try {
        const docRef = firestore
          .collection('facilityInventory')
          .doc(facilityId)
          .collection('items')
          .doc(itemId);
        const doc = await docRef.get();
        if (doc.exists) {
          existing = { id: doc.id, ...(doc.data() as Omit<InventoryItem, 'id'>) };
        }
      } catch (_err) {
        // fallback
      }
    }

    if (!existing) {
      // Look across local items
      existing = localStore.getAll().find((it) => it.id === itemId);
    }

    if (!existing) {
      throw new AppError(404, 'ITEM_NOT_FOUND', `Inventory item with ID ${itemId} not found.`);
    }

    const quantity =
      updates.quantity !== undefined
        ? Math.max(0, Number(updates.quantity))
        : existing.quantity;
    const threshold =
      updates.lowStockThreshold !== undefined
        ? Number(updates.lowStockThreshold)
        : existing.lowStockThreshold;
    const price = updates.price !== undefined ? Number(updates.price) : existing.price;

    const status: InventoryStockStatus =
      quantity === 0
        ? 'OUT_OF_STOCK'
        : quantity <= threshold
        ? 'LOW_STOCK'
        : 'IN_STOCK';

    const updatedItem: InventoryItem = {
      ...existing,
      quantity,
      lowStockThreshold: threshold,
      price,
      status,
      lastUpdated: new Date().toISOString(),
    };

    if (firestore && (facilityId || existing.facilityId)) {
      try {
        await firestore
          .collection('facilityInventory')
          .doc(facilityId || existing.facilityId)
          .collection('items')
          .doc(itemId)
          .set(updatedItem, { merge: true });
      } catch (_err) {
        // fallback
      }
    }

    localStore.set(updatedItem);
    return updatedItem;
  }

  /**
   * Count low-stock and out-of-stock items for a facility
   */
  async countLowStock(facilityId: string): Promise<number> {
    const items = await this.getByFacility(facilityId);
    return items.filter(
      (item) => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK'
    ).length;
  }
}

export const inventoryService = new InventoryService();
