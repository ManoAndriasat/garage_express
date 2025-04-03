const express = require('express');
const managerControllers = require('../controllers/managerControllers');
const { authMiddleware } = require('../middleware/authMiddleware');

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

router.post('/mechanic-register', authMiddleware, mechanicRegister);
router.put('/mechanics/:id', authMiddleware, mechanicUpdate);
router.delete('/mechanics/:id', authMiddleware, mechanicDelete);

router.post('/existing-cars', authMiddleware, createExistingCar);
router.get('/existing-cars', authMiddleware, getExistingCars);
router.put('/existing-cars/:id', authMiddleware, updateExistingCar);
router.delete('/existing-cars/:id', authMiddleware, deleteExistingCar);
router.delete('/existing-cars/:id/model', authMiddleware, deleteExistingCarModel);

router.get('/dashboard/overview', authMiddleware, getDashboardOverview);
router.get('/analytics/mechanic-revenue', authMiddleware, getMechanicRevenue);

module.exports = router;