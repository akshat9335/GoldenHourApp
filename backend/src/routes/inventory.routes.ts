import { Router } from 'express';
import {
  searchInventoryController,
  getFacilityInventoryController,
  updateInventoryStockController,
  addInventoryItemController,
} from '../controllers/inventory.controller';

const router = Router();

// Search medicines across nearby facilities
router.get('/search', searchInventoryController);

// Get hospital / facility stock inventory
router.get('/facility/:facilityId', getFacilityInventoryController);

// Update medicine quantity/threshold
router.patch('/items/:itemId', updateInventoryStockController);

// Add new medicine to facility inventory
router.post('/items', addInventoryItemController);

export default router;
