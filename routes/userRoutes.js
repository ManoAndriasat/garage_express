const express = require('express');
const userControllers = require('../controllers/userControllers');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', userControllers.register);
router.post('/login', userControllers.login);

router.get('/info', authMiddleware, userControllers.getUserInfo);
router.post('/car', authMiddleware, userControllers.addCar);
router.get('/cars', authMiddleware, userControllers.getAllCars);
router.get('/unavailable-slots/:mechanic_id', authMiddleware, userControllers.getMechanicUnavailableSlots);
router.post('/appointment', authMiddleware, userControllers.requestAppointment);
router.get('/appointments', authMiddleware, userControllers.getAppointments);
router.post('/validate-appointment', authMiddleware, userControllers.validateAppointment);
router.post('/cancel-appointment', authMiddleware, userControllers.deleteAppointment);
router.get('/repair-progress/:car_id', authMiddleware, userControllers.getRepairProgress);
router.get('/invoices', authMiddleware, userControllers.getInvoiceHistory);

module.exports = router;