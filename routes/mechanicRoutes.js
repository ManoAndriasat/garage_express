const express = require('express');
const mechanicControllers = require('../controllers/mechanicControllers');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', mechanicControllers.register);
router.post('/login', mechanicControllers.login);
router.get('/info', authMiddleware, mechanicControllers.getInfo);
router.get('/mechanics', authMiddleware, mechanicControllers.getMechanics);
router.get('/waiting-appointments', authMiddleware, mechanicControllers.getWaitingAppointments);
router.post('/validate-appointment', authMiddleware, mechanicControllers.validateAppointment);
router.post('/delete-appointment', authMiddleware, mechanicControllers.deleteAppointment);
router.post('/update-appointment-start-time', authMiddleware, mechanicControllers.updateAppointmentStartTime);

module.exports = router;


