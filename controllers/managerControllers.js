const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');
const Mechanic = require('../models/Mechanic');
const Appointment = require('../models/Appointment');
const Repair = require('../models/Repair');
const Invoice = require('../models/Invoice');
const ExistingCar = require('../models/ExistingCar');
const Material = require('../models/Material');
const moment = require('moment');

exports.register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, contact } = req.body;

        let manager = await Manager.findOne({ email });
        if (manager) return res.status(400).json({ msg: "Manager already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        manager = new Manager({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            contact
        });
        await manager.save();

        res.status(201).json({ msg: "Manager registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { contact, password } = req.body;

        let manager = await Manager.findOne({ contact });
        if (!manager) return res.status(400).json({ msg: "Manager not found" });

        const isMatch = await bcrypt.compare(password, manager.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign(
            { 
                id: manager._id, 
                role: 10
            },
            process.env.JWT_SECRET,
            { expiresIn: "20h" }
        );
        res.json({
            token,
            manager: {
                firstname: manager.firstname, 
                lastname: manager.lastname, 
                email: manager.email, 
                contact: manager.contact
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.mechanicRegister = async (req, res) => {
    try {
        const { firstname, lastname, email, password, contact, speciality, minHour, maxHour } = req.body;

        let mechanic = await Mechanic.findOne({ contact });
        if (mechanic) return res.status(400).json({ msg: "Mechanic already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        mechanic = new Mechanic({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            contact,
            speciality,
            minHour,
            maxHour
        });
        await mechanic.save();

        res.status(201).json({ msg: "Mechanic registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.mechanicUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedMechanic = await Mechanic.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedMechanic) {
            return res.status(404).json({ msg: "Mechanic not found" });
        }

        res.json({
            msg: "Mechanic updated successfully",
            mechanic: {
                _id: updatedMechanic._id,
                firstname: updatedMechanic.firstname,
                lastname: updatedMechanic.lastname,
                email: updatedMechanic.email,
                contact: updatedMechanic.contact,
                speciality: updatedMechanic.speciality,
                minHour: updatedMechanic.minHour,
                maxHour: updatedMechanic.maxHour
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.mechanicDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedMechanic = await Mechanic.findByIdAndDelete(id);

        if (!deletedMechanic) {
            return res.status(404).json({ msg: "Mechanic not found" });
        }

        res.json({ msg: "Mechanic deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createExistingCar = async (req, res) => {
    try {
        const { brand, model } = req.body;

        let existingCar = await ExistingCar.findOne({ brand });

        if (existingCar) {
            const newModels = model.filter(m => !existingCar.model.includes(m));
            if (newModels.length > 0) {
                existingCar.model = [...existingCar.model, ...newModels];
                await existingCar.save();
                return res.status(200).json({ 
                    success: true,
                    message: "New models added to existing brand successfully",
                    data: existingCar
                });
            }
            return res.status(400).json({ 
                success: false,
                message: "Models already exist for this brand" 
            });
        }

        existingCar = new ExistingCar({ brand, model });
        await existingCar.save();
        res.status(201).json({ 
            success: true,
            message: "Car brand and models created successfully",
            data: existingCar
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to create car brand",
            error: err.message 
        });
    }
};

exports.getExistingCars = async (req, res) => {
    try {
        const existingCars = await ExistingCar.find().sort({ brand: 1 });
        res.json({ 
            success: true,
            message: existingCars.length > 0 
                ? "Car brands retrieved successfully" 
                : "No car brands found",
            count: existingCars.length,
            data: existingCars
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to retrieve car brands",
            error: err.message 
        });
    }
};

exports.updateExistingCar = async (req, res) => {
    try {
        const { id } = req.params;
        const { brand, model } = req.body;
        
        const existingCar = await ExistingCar.findById(id);
        if (!existingCar) return res.status(404).json({ 
            success: false,
            message: "Car brand not found" 
        });

        if (brand && brand !== existingCar.brand) {
            const brandExists = await ExistingCar.findOne({ brand });
            if (brandExists) return res.status(400).json({ 
                success: false,
                message: "Brand already exists" 
            });
            existingCar.brand = brand;
        }

        if (model) {
            existingCar.model = [...new Set([...existingCar.model, ...model])];
        }

        await existingCar.save();
        res.json({ 
            success: true,
            message: "Car brand updated successfully",
            data: existingCar
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to update car brand",
            error: err.message 
        });
    }
};

exports.deleteExistingCar = async (req, res) => {
    try {
        const { id } = req.params;
        const existingCar = await ExistingCar.findByIdAndDelete(id);
        
        if (!existingCar) return res.status(404).json({ 
            success: false,
            message: "Car brand not found" 
        });

        res.json({ 
            success: true,
            message: "Car brand deleted successfully",
            deletedBrand: existingCar.brand
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to delete car brand",
            error: err.message 
        });
    }
};

exports.deleteExistingCarModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { model } = req.body;
        
        const existingCar = await ExistingCar.findById(id);
        if (!existingCar) return res.status(404).json({ 
            success: false,
            message: "Car brand not found" 
        });

        const initialCount = existingCar.model.length;
        existingCar.model = existingCar.model.filter(m => m !== model);
        
        if (existingCar.model.length === initialCount) {
            return res.status(404).json({
                success: false,
                message: "Model not found in this brand"
            });
        }

        await existingCar.save();
        res.json({ 
            success: true,
            message: "Car model deleted successfully",
            data: existingCar
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to delete car model",
            error: err.message 
        });
    }
};

exports.createMaterial = async (req, res) => {
    try {
        const { ref, name, price } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({ 
                success: false,
                message: "Name and price are required" 
            });
        }

        if (price <= 0) {
            return res.status(400).json({ 
                success: false,
                message: "Price must be a positive number" 
            });
        }

        if (ref) {
            const existingMaterial = await Material.findOne({ ref });
            if (existingMaterial) {
                return res.status(400).json({ 
                    success: false,
                    message: "Material with this reference already exists" 
                });
            }
        }

        const material = new Material({
            ref,
            name,
            price,
            priceHistory: [{ price }]
        });

        await material.save();

        res.status(201).json({
            success: true,
            message: "Material created successfully",
            data: material
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to create material",
            error: err.message 
        });
    }
};

exports.getMaterials = async (req, res) => {
    try {
        const materials = await Material.find().sort({ _id: 1 });
        
        res.json({
            success: true,
            message: materials.length > 0 
                ? "Materials retrieved successfully" 
                : "No materials found",
            count: materials.length,
            data: materials
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to retrieve materials",
            error: err.message
        });
    }
};

exports.getMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const material = await Material.findById(id);
        
        if (!material) {
            return res.status(404).json({ 
                success: false,
                message: "Material not found" 
            });
        }

        let lastPriceEntry = null;
        if (material.priceHistory && material.priceHistory.length > 0) {
            lastPriceEntry = [...material.priceHistory].sort((a, b) => b.date - a.date)[0];
        }

        const materialWithLastPrice = {
            ...material.toObject(),
            lastPrice: lastPriceEntry ? lastPriceEntry.price : material.price,
            lastPriceDate: lastPriceEntry ? lastPriceEntry.date : null
        };

        res.json({
            success: true,
            message: "Material retrieved successfully",
            data: materialWithLastPrice
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to retrieve material",
            error: err.message 
        });
    }
};

exports.updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { ref, name, price } = req.body;
        
        const material = await Material.findById(id);
        if (!material) {
            return res.status(404).json({ 
                success: false,
                message: "Material not found" 
            });
        }

        if (ref && ref !== material.ref) {
            const existingMaterial = await Material.findOne({ ref });
            if (existingMaterial) {
                return res.status(400).json({ 
                    success: false,
                    message: "Reference already used by another material" 
                });
            }
        }

        if (price && price !== material.price) {
            material.priceHistory.push({ price });
            material.price = price;
        }

        if (ref) material.ref = ref;
        if (name) material.name = name;

        await material.save();

        res.json({
            success: true,
            message: "Material updated successfully",
            data: material
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to update material",
            error: err.message 
        });
    }
};

exports.deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        
        const material = await Material.findByIdAndDelete(id);
        if (!material) {
            return res.status(404).json({ 
                success: false,
                message: "Material not found" 
            });
        }

        res.json({
            success: true,
            message: "Material deleted successfully",
            deletedMaterial: {
                _id: material._id,
                name: material.name,
                ref: material.ref
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false,
            message: "Failed to delete material",
            error: err.message 
        });
    }
};

exports.getDashboardOverview = async (req, res) => {
    try {
        const [appointments, repairs, invoices] = await Promise.all([
            Appointment.find().lean(),
            Repair.find().lean(),
            Invoice.find().lean()
        ]);

        const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

        res.json({
            totalAppointments: appointments.length,
            totalRevenue,
            pendingAppointments: appointments.filter(a => !a.status.mechanic).length,
            completedRepairs: repairs.filter(r => r.isfinished.mechanic).length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMechanicRevenue = async (req, res) => {
    try {
        const { mechanicId, year } = req.query;

        if (!mechanicId) {
            return res.status(400).json({ msg: "Mechanic ID is required" });
        }

        const mechanic = await Mechanic.findById(mechanicId);
        if (!mechanic) {
            return res.status(404).json({ msg: "Mechanic not found" });
        }

        const filter = { 'mechanic._id': mechanicId };
        let result;

        if (year) {
            filter.date = { $regex: new RegExp(`^${year}`) };
            const invoices = await Invoice.find(filter);

            const monthlyRevenue = Array(12).fill(0).reduce((acc, _, index) => {
                acc[index + 1] = 0;
                return acc;
            }, {});

            invoices.forEach(invoice => {
                const month = moment(invoice.date).month() + 1;
                monthlyRevenue[month] += invoice.total;
            });

            result = {
                mechanic: `${mechanic.firstname} ${mechanic.lastname}`,
                year,
                monthlyRevenue
            };
        } else {
            const invoices = await Invoice.find(filter);
            
            const yearlyRevenue = invoices.reduce((acc, invoice) => {
                const year = moment(invoice.date).year();
                acc[year] = (acc[year] || 0) + invoice.total;
                return acc;
            }, {});

            result = {
                mechanic: `${mechanic.firstname} ${mechanic.lastname}`,
                yearlyRevenue
            };
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};