db.counters.insertMany([
    { _id: "user_id", sequence_value: 0 },
    { _id: "car_id", sequence_value: 0 },
    { _id: "material_id", sequence_value: 0 },
    { _id: "mechanic_id", sequence_value: 0 },
    { _id: "manager_id", sequence_value: 0 },
    { _id: "appointment_id", sequence_value: 0 },
    { _id: "repair_id", sequence_value: 0 }
]);


function getNextId(sequenceName) {
    const sequenceDocument = db.counters.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence_value: 1 } },
        { returnDocument: "after" }
    );
    return sequenceDocument.sequence_value;
}


db.existing_cars.insertMany([
    {
        brand: "Toyota",
        model: [
            "Corolla",
            "Yaris",
            "Camry",
            "RAV4",
            "Land Cruiser",
        ]
    },
    {
        brand: "Honda",
        model: [
            "Civic",
            "Accord",
            "Element",
            "N-VAN",
        ]
    },
]);

db.users.insertOne({
    _id: "CST" + String(getNextId("user_id")).padStart(3, "0"),
    firstname: "John",
    lastname: "Doe",
    email: "john.doe@example.com",
    password: "hashed_password",
    adress: {
        street: "Ankadifotsy",
        city: "Antananarivo",
        lot: "CAVI 211"
    },
    cars: []
});


db.cars.insertOne({
    _id: "C" + String(getNextId("car_id")).padStart(3, "0"),
    owner: "",
    brand: "Toyota",
    model: "Corolla",
    year: 2020
});


db.materials.insertOne({
    _id: "P" + String(getNextId("material_id")).padStart(3, "0"),
    brand: "",
    model: "",
    name: "V8 Engine",
    price: 1000
});


db.mechanics.insertOne({
    _id: "M" + String(getNextId("mechanic_id")).padStart(3, "0"),
    firstname: "John",
    lastname: "Doe",
    email: "",
    password: "hashed_password",
    contact: "CST001456789",
    speciality: "Toyota"
});


db.managers.insertOne({
    _id: "MGR" + String(getNextId("manager_id")).padStart(3, "0"),
    firstname: "John",
    lastname: "Doe",
    email: "",
    password: "hashed_password",
    contact: "CST001456789"
});


db.appointments.insertOne({
    _id: "A" + String(getNextId("appointment_id")).padStart(3, "0"),
    user_id: "",
    car_id: "",
    mechanic_id: "",
    date: "2020-12-12:10:00",
    localisation: "home/garage",
    problem: [
        {
            material: "",
            description: "Engine problem"
        },
        {
            material: "",
            description: "Weird noise"
        }
    ],
    status: {
        mechanic: true,
        manager: true,
        user: true
    }
});


db.repairs.insertOne({
    _id: "R" + String(getNextId("repair_id")).padStart(3, "0"),
    car_id: "",
    mechanic_id: "",
    reparation: [
        {
            type: "fix",
            material: "",
            description: "Engine problem",
            status: {
                mechanic: true,
                user: true
            },
            start: "2020-12-12:10:00",
            end: "2020-12-13:10:00",
        },
        {
            type: "change",
            material: "",
            description: "Brake problem",
            status: {
                mechanic: true,
                user: true
            },
            start: "2020-12-12:10:00",
            end: "2020-12-13:10:00",
        }
    ]
});