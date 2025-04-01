const express = require('express');
const mechanicControllers = require('../controllers/mechanicControllers');
const { authMiddleware } = require('../middleware/authMiddleware');

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
router.get('/info', authMiddleware, getInfo);
router.get('/mechanics', authMiddleware, getMechanics);
router.get('/waiting-appointments', authMiddleware, getWaitingAppointments);
router.get('/appointments', authMiddleware, getAppointments);
router.get('/history-appointments', authMiddleware, getHistoryAppointments);
router.post('/validate-appointment', authMiddleware, validateAppointment);
router.post('/delete-appointment', authMiddleware, deleteAppointment);
router.post('/update-appointment-start-time', authMiddleware, updateAppointmentStartTime);
router.post('/repair', authMiddleware, createRepair);
router.get('/ongoing-repairs', authMiddleware, getOngoingRepairs);
router.post('/add-reparation', authMiddleware, addReparation);
router.post('/update-reparation', authMiddleware, updateReparation);
router.post('/finish-repair', authMiddleware, finishRepair);

module.exports = router;
