import { Request, Response, NextFunction } from "express";
import { medicineService } from "../services/medicine/medicine.service";
import { sendSuccess } from "../utils/response";
import { AppError } from "../utils/AppError";

export class MedicineController {
  public async searchMedicines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.query || req.query.q || "") as string;
      const hospitalId = req.query.hospitalId as string | undefined;

      const items = await medicineService.searchMedicines(query, hospitalId);
      sendSuccess(res, items, `Found ${items.length} medicines matching '${query || "all"}'`);
    } catch (err) {
      next(err);
    }
  }

  public async getHospitalInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospitalId = req.params.hospitalId || req.user?.uid || (req.query.hospitalId as string);
      if (!hospitalId) {
        throw new AppError(400, "MISSING_HOSPITAL_ID", "Hospital ID is required.");
      }
      const items = await medicineService.getHospitalInventory(hospitalId);
      sendSuccess(res, items, `Retrieved ${items.length} inventory items for hospital`);
    } catch (err) {
      next(err);
    }
  }

  public async updateStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hospitalId, medicineName, stockStatus, quantity } = req.body;

      if (!hospitalId || !medicineName || !stockStatus) {
        throw new AppError(400, "MISSING_FIELDS", "hospitalId, medicineName, and stockStatus are required.");
      }

      const updated = await medicineService.updateStock({
        hospitalId,
        medicineName,
        stockStatus,
        quantity: quantity !== undefined ? Number(quantity) : undefined,
      });

      sendSuccess(res, updated, `Medicine stock for '${medicineName}' updated to ${stockStatus}`);
    } catch (err) {
      next(err);
    }
  }

  public async addMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hospitalId, medicineName, category, dosageForm, quantity, stockStatus } = req.body;
      const targetHospitalId = hospitalId || req.user?.uid;
      if (!targetHospitalId || !medicineName) {
        throw new AppError(400, "MISSING_FIELDS", "hospitalId and medicineName are required.");
      }

      const item = await medicineService.addMedicine({
        hospitalId: targetHospitalId,
        medicineName,
        category,
        dosageForm,
        quantity: quantity !== undefined ? Number(quantity) : 50,
        stockStatus: stockStatus || "AVAILABLE",
      });

      sendSuccess(res, item, `Added medicine '${medicineName}' successfully`, 201);
    } catch (err) {
      next(err);
    }
  }

  public async deleteMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      if (!id) {
        throw new AppError(400, "MISSING_ID", "Medicine item ID is required.");
      }
      await medicineService.deleteMedicine(id);
      sendSuccess(res, { id }, `Medicine '${id}' removed from inventory`);
    } catch (err) {
      next(err);
    }
  }
}

export const medicineController = new MedicineController();
