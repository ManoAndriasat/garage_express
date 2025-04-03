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
  getDashboardOverview,
  getMechanicRevenue
} = managerControllers;

router.post('/register', register);
router.post('/login', login);

router.post('/mechanic-register', authMiddleware, mechanicRegister);
router.put('/mechanics/:id', authMiddleware, mechanicUpdate);
router.delete('/mechanics/:id', authMiddleware, mechanicDelete);

router.get('/dashboard/overview', authMiddleware, getDashboardOverview);
router.get('/analytics/mechanic-revenue', authMiddleware, getMechanicRevenue);

module.exports = router;