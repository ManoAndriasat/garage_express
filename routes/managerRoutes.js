const express = require('express');
const managerControllers = require('../controllers/managerControllers');
const { authMiddleware, roleMiddleware, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

const {
  register,
  login,
  mechanicRegister,
  mechanicUpdate,
  mechanicDelete,
  createExistingCar,
  getExistingCars,
  updateExistingCar,
  deleteExistingCar,
  deleteExistingCarModel,
  createMaterial,
  getMaterials,
  getMaterial,
  updateMaterial,
  deleteMaterial,
  getDashboardOverview,
  getMechanicRevenue
} = managerControllers;

router.post('/register', register);
router.post('/login', login);

router.post('/mechanic-register', authMiddleware, roleMiddleware([ROLES.MANAGER]), mechanicRegister);
router.put('/mechanics/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]), mechanicUpdate);
router.delete('/mechanics/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]), mechanicDelete);

router.post('/existing-cars',authMiddleware, roleMiddleware([ROLES.MANAGER]), createExistingCar);
router.get('/existing-cars', getExistingCars);
router.put('/existing-cars/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]),updateExistingCar);
router.delete('/existing-cars/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]),deleteExistingCar);
router.delete('/existing-cars/:id/model', authMiddleware, roleMiddleware([ROLES.MANAGER]), deleteExistingCarModel);

router.post('/materials', authMiddleware, roleMiddleware([ROLES.MANAGER]), createMaterial);
router.get('/materials', authMiddleware, getMaterials);
router.get('/materials/:id', authMiddleware, getMaterial);
router.put('/materials/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]), updateMaterial);
router.delete('/materials/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]), deleteMaterial);

router.get('/dashboard/overview', authMiddleware, roleMiddleware([ROLES.MANAGER]), getDashboardOverview);
router.get('/analytics/mechanic-revenue', authMiddleware, roleMiddleware([ROLES.MANAGER]), getMechanicRevenue);

module.exports = router;