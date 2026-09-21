import { describe, expect, it } from 'vitest';
import { inventoryService } from '../src/services/inventory/inventory.service';
import { diagnosticService } from '../src/services/diagnostics/diagnostic.service';

describe('Inventory Service', () => {
  it('searches for medicines by query and returns nearby results with distance and status', async () => {
    const results = await inventoryService.search('paracetamol', 12.9352, 77.6146);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    const item = results[0];
    expect(item.medicineName.toLowerCase()).toContain('paracetamol');
    expect(item.distanceKm).toBeGreaterThanOrEqual(0);
    expect(item.status).toBeDefined();
  });

  it('searches for emergency drugs like Adrenaline and Atropine', async () => {
    const adrenalineResults = await inventoryService.search('adrenaline', 12.93, 77.61);
    expect(adrenalineResults.length).toBeGreaterThan(0);
    expect(adrenalineResults[0].category).toBe('EMERGENCY_DRUG');
  });

  it('fetches inventory items for a facility', async () => {
    const items = await inventoryService.getByFacility('hosp-martha-blr');
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.medicineName.includes('Paracetamol'))).toBe(true);
  });

  it('updates stock quantity and automatically updates status to LOW_STOCK or OUT_OF_STOCK', async () => {
    const items = await inventoryService.getByFacility('hosp-martha-blr');
    const firstItem = items[0];

    // Update to 0 => OUT_OF_STOCK
    const updatedZero = await inventoryService.updateStock(firstItem.id, { quantity: 0 });
    expect(updatedZero.quantity).toBe(0);
    expect(updatedZero.status).toBe('OUT_OF_STOCK');

    // Update to 15 with threshold 20 => LOW_STOCK
    const updatedLow = await inventoryService.updateStock(firstItem.id, {
      quantity: 15,
      lowStockThreshold: 20,
    });
    expect(updatedLow.quantity).toBe(15);
    expect(updatedLow.status).toBe('LOW_STOCK');

    // Update to 50 with threshold 20 => IN_STOCK
    const updatedNormal = await inventoryService.updateStock(firstItem.id, {
      quantity: 50,
      lowStockThreshold: 20,
    });
    expect(updatedNormal.quantity).toBe(50);
    expect(updatedNormal.status).toBe('IN_STOCK');
  });

  it('adds a new medicine to inventory', async () => {
    const newItem = await inventoryService.addItem('hosp-test-1', {
      medicineName: 'Epinephrine Auto-Injector 0.3mg',
      category: 'EMERGENCY_DRUG',
      quantity: 25,
      unit: 'Pens',
      lowStockThreshold: 10,
      price: 1500,
    });
    expect(newItem.id).toBeDefined();
    expect(newItem.medicineName).toBe('Epinephrine Auto-Injector 0.3mg');
    expect(newItem.status).toBe('IN_STOCK');
  });
});

describe('Diagnostic Service', () => {
  it('returns the diagnostic catalog with cardiac, pathology, and radiology tests', () => {
    const catalog = diagnosticService.getCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(6);
    expect(catalog.some((c) => c.category === 'CARDIOLOGY')).toBe(true);
    expect(catalog.some((c) => c.category === 'RADIOLOGY')).toBe(true);
    expect(catalog.some((c) => c.category === 'PATHOLOGY')).toBe(true);
    expect(catalog.some((c) => c.isEmergency)).toBe(true);
  });

  it('books a diagnostic test and places it in REQUESTED status', async () => {
    const booking = await diagnosticService.bookTest({
      patientUid: 'user-test-patient',
      patientName: 'Kavita Patel',
      patientPhone: '+91-98765-11223',
      facilityId: 'hosp-martha-blr',
      facilityName: "St. Martha's Hospital ER",
      testName: 'Troponin-I Rapid Quantitative (Cardiac Biomarker)',
      category: 'CARDIOLOGY',
      scheduledDate: '2026-09-22',
      slotTime: '11:00 AM',
    });

    expect(booking.id).toBeDefined();
    expect(booking.status).toBe('REQUESTED');
    expect(booking.patientName).toBe('Kavita Patel');
  });

  it('fetches facility requests queue for the hospital lab desk', async () => {
    const queue = await diagnosticService.getFacilityRequests('hosp-martha-blr');
    expect(queue.length).toBeGreaterThan(0);
  });

  it('allows hospital lab technician to upload report and mark report ready', async () => {
    const queue = await diagnosticService.getFacilityRequests('hosp-martha-blr');
    const firstBooking = queue[0];

    const updated = await diagnosticService.uploadReport(firstBooking.id, {
      reportUrl: 'https://example.com/reports/troponin-result.pdf',
      reportSummary: 'Troponin-I is within normal limits (<0.04 ng/mL). No acute myocardial damage detected.',
      status: 'REPORT_READY',
    });

    expect(updated.status).toBe('REPORT_READY');
    expect(updated.reportSummary).toContain('normal limits');
    expect(updated.reportUrl).toBe('https://example.com/reports/troponin-result.pdf');
  });
});
