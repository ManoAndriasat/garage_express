const express = require('express');
const userControllers = require('../controllers/userControllers');
const { authMiddleware,  roleMiddleware, ROLES } = require('../middleware/authMiddleware');

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
    acceptReparation,
    getOngoingRepairs,
    finishRepair,
    getClientInvoices,
downloadInvoicePDF,
} = userControllers;

router.post('/register', register);
router.post('/login', login);

router.get('/info', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getUserInfo);
router.post('/car', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), addCar);
router.get('/cars', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getAllCars);
router.get('/unavailable-slots/:mechanic_id', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getMechanicUnavailableSlots);
router.post('/appointment', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), requestAppointment);
router.get('/appointments', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getAppointments);
router.post('/validate-appointment', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), validateAppointment);
router.post('/cancel-appointment', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), deleteAppointment);
router.get('/repair-progress/:car_id', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getRepairProgress);
router.post('/accept-reparation', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), acceptReparation);
router.get('/ongoing-repairs', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getOngoingRepairs);
router.post('/finish-repair', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), finishRepair);
router.get('/invoices', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), getClientInvoices);
router.post('/download-invoice', authMiddleware, roleMiddleware([ROLES.CUSTOMER]), downloadInvoicePDF);

module.exports = router;
