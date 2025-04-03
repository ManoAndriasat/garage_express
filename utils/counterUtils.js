const Counter = require('../models/Counter');

const getNextId = async (sequenceName) => {
  try {
    const sequenceDocument = await Counter.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { sequence_value: 1 } },
      { new: true }
    );
    
    if (!sequenceDocument) {
      throw new Error(`The sequence ${sequenceName} does not exist`);
    }
    
    return sequenceDocument.sequence_value;
  } catch (error) {
    console.error(`Error while generating the next ID: ${error.message}`);
    throw error;
  }
};

const initializeCounters = async () => {
  try {
    const counters = [
      { _id: "user_id", sequence_value: 0 },
      { _id: "car_id", sequence_value: 0 },
      { _id: "material_id", sequence_value: 0 },
      { _id: "mechanic_id", sequence_value: 0 },
      { _id: "manager_id", sequence_value: 0 },
      { _id: "appointment_id", sequence_value: 0 },
      { _id: "repair_id", sequence_value: 0 },
      { _id: "invoice_id", sequence_value: 0 },
    ];

    for (const counter of counters) {
      const exists = await Counter.findOne({ _id: counter._id });
      if (!exists) {
        await Counter.create(counter);
        console.log(`Counter ${counter._id} created`);
      }
    }
    console.log('All counters have been initialized');
  } catch (error) {
    console.error('Error while initializing the counters:', error);
    throw error;
  }
};

module.exports = {
  getNextId,
  initializeCounters
};