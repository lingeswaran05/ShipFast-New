import express from 'express';
import {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
  createVehicle,
  getVehicles,
  updateVehicle,
  deleteVehicle
} from '../controllers/adminController.js';

const router = express.Router();

router.post('/branches', createBranch);
router.get('/branches', getBranches);
router.put('/branches/:branchId', updateBranch);
router.delete('/branches/:branchId', deleteBranch);

router.post('/vehicles', createVehicle);
router.get('/vehicles', getVehicles);
router.put('/vehicles/:vehicleId', updateVehicle);
router.delete('/vehicles/:vehicleId', deleteVehicle);

export default router;
