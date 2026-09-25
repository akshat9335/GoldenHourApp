import { Router } from "express";
import { medicineController } from "../controllers/medicine.controller";

const router = Router();

router.get("/search", medicineController.searchMedicines);
router.get("/hospital/:hospitalId", medicineController.getHospitalInventory);
router.post("/update-stock", medicineController.updateStock);
router.post("/add", medicineController.addMedicine);
router.delete("/:id", medicineController.deleteMedicine);

export default router;
