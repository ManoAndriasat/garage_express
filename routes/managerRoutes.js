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
  getDashboardOverview,
  getMechanicRevenue
} = managerControllers;

router.post('/register', register);
router.post('/login', login);

router.post('/mechanic-register', authMiddleware, roleMiddleware([ROLES.MANAGER]), mechanicRegister);
router.put('/mechanics/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]), mechanicUpdate);
router.delete('/mechanics/:id', authMiddleware, roleMiddleware([ROLES.MANAGER]), mechanicDelete);

router.post('/existing-cars', createExistingCar);
router.get('/existing-cars', getExistingCars);
router.put('/existing-cars/:id', updateExistingCar);
router.delete('/existing-cars/:id', deleteExistingCar);
router.delete('/existing-cars/:id/model', deleteExistingCarModel);

router.get('/dashboard/overview', authMiddleware, roleMiddleware([ROLES.MANAGER]), getDashboardOverview);
router.get('/analytics/mechanic-revenue', authMiddleware, roleMiddleware([ROLES.MANAGER]), getMechanicRevenue);

module.exports = router;