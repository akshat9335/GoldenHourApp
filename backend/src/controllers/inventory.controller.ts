import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/inventory/inventory.service';

export async function searchInventoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { query, lat, lng, radius } = req.query;
    const results = await inventoryService.search(
      query ? String(query) : undefined,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
      radius ? Number(radius) : undefined
    );

    res.status(200).json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFacilityInventoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { facilityId } = req.params;
    const items = await inventoryService.getByFacility(facilityId);

    res.status(200).json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateInventoryStockController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { itemId } = req.params;
    const { quantity, lowStockThreshold, price, facilityId } = req.body;

    const updated = await inventoryService.updateStock(
      itemId,
      { quantity, lowStockThreshold, price },
      facilityId
    );

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Inventory stock updated successfully.',
    });
  } catch (err) {
    next(err);
  }
}

export async function addInventoryItemController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = (req as any).user;
    const facilityId =
      req.body.facilityId || (user ? user.hospitalId || user.uid : 'hosp-default');

    const newItem = await inventoryService.addItem(facilityId, req.body);

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Medicine item added to inventory successfully.',
    });
  } catch (err) {
    next(err);
  }
}
