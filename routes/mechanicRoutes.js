const express = require('express');
const mechanicControllers = require('../controllers/mechanicControllers');
const { authMiddleware, roleMiddleware, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

const {
  register,
  login,
  getInfo,
  getMechanics,
  getWaitingAppointments,
  getAppointments,
  getHistoryAppointments,
  validateAppointment,
  deleteAppointment,
  updateAppointmentStartTime,
  createRepair,
  getOngoingRepairs,
  addReparation,
  updateReparation,
  finishRepair,
} = mechanicControllers;

router.post('/register', register);
router.post('/login', login);
router.get('/info', authMiddleware, roleMiddleware([ROLES.MECHANIC]), getInfo);
router.get('/mechanics', authMiddleware, roleMiddleware([ROLES.MECHANIC]), getMechanics);
router.get('/waiting-appointments', authMiddleware, roleMiddleware([ROLES.MECHANIC]), getWaitingAppointments);
router.get('/appointments', authMiddleware, roleMiddleware([ROLES.MECHANIC]), getAppointments);
router.get('/history-appointments', authMiddleware, roleMiddleware([ROLES.MECHANIC]), getHistoryAppointments);
router.post('/validate-appointment', authMiddleware, roleMiddleware([ROLES.MECHANIC]), validateAppointment);
router.post('/delete-appointment', authMiddleware, roleMiddleware([ROLES.MECHANIC]), deleteAppointment);
router.post('/update-appointment-start-time', authMiddleware, roleMiddleware([ROLES.MECHANIC]), updateAppointmentStartTime);
router.post('/repair', authMiddleware, roleMiddleware([ROLES.MECHANIC]), createRepair);
router.get('/ongoing-repairs', authMiddleware, roleMiddleware([ROLES.MECHANIC]), getOngoingRepairs);
router.post('/add-reparation', authMiddleware, roleMiddleware([ROLES.MECHANIC]), addReparation);
router.post('/update-reparation', authMiddleware, roleMiddleware([ROLES.MECHANIC]), updateReparation);
router.post('/finish-repair', authMiddleware, roleMiddleware([ROLES.MECHANIC]), finishRepair);

module.exports = router;
