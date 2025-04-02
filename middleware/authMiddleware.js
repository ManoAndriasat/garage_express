const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch (err) {
        res.status(401).json({ msg: "Token is not valid" });
    }
};

const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ msg: "User not authenticated" });
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ msg: "Access denied. Insufficient permissions" });
      }
      
      next();
    };
  };
  

  const ROLES = {
    CUSTOMER: 0,
    MECHANIC: 5,
    MANAGER: 10
  };
  
  module.exports = {
    authMiddleware,
    roleMiddleware,
    ROLES
  };