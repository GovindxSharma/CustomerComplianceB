import { Request, Response, NextFunction } from "express";
import { Roles } from "../commons/roles";

export const checkRole = (allowedRoles: Roles[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // TS now knows this exists
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: Access denied" });
    }

    next();
  };
};
