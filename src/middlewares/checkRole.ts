import { Request, Response, NextFunction } from "express";
import { Roles } from "../commons/roles";

// allowedRoles is an array of strings from Roles enum
export const checkRole = (allowedRoles: Roles[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // assume req.user is set after auth middleware (decoded JWT)
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }

    next();
  };
};
