const express = require('express');
const userControllers = require('../controllers/userControllers');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const {
    register,
    login,
    getUserInfo,
    addCar,
    getAllCars,
    getMechanicUnavailableSlots,
    requestAppointment,
    getAppointments,
    validateAppointment,
    deleteAppointment,
    getRepairProgress,
    getInvoiceHistory,
    acceptReparation,
    getOngoingRepairs
} = userControllers;

router.post('/register', register);
router.post('/login', login);

router.get('/info', authMiddleware, getUserInfo);
router.post('/car', authMiddleware, addCar);
router.get('/cars', authMiddleware, getAllCars);
router.get('/unavailable-slots/:mechanic_id', authMiddleware, getMechanicUnavailableSlots);
router.post('/appointment', authMiddleware, requestAppointment);
router.get('/appointments', authMiddleware, getAppointments);
router.post('/validate-appointment', authMiddleware, validateAppointment);
router.post('/cancel-appointment', authMiddleware, deleteAppointment);
router.get('/repair-progress/:car_id', authMiddleware, getRepairProgress);
router.get('/invoices', authMiddleware, getInvoiceHistory);
router.post('/accept-reparation', authMiddleware, acceptReparation);
router.get('/ongoing-repairs', authMiddleware, getOngoingRepairs);

module.exports = router;
