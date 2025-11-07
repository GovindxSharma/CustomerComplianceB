import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Roles } from "../commons/roles"; // use common Roles enum

interface JwtPayloadCustom {
  id: string;
  role: Roles;
  company_id: string;
}

// Extend Express Request to include `user`
declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayloadCustom;
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");
      
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "id" in decoded &&
      "role" in decoded &&
      "company_id" in decoded &&
      Object.values(Roles).includes((decoded as any).role)
    ) {
      req.user = {
        id: (decoded as any).id,
        role: (decoded as any).role,
        company_id: (decoded as any).company_id,
      };
      next();
    } else {
      return res.status(401).json({ message: "Invalid token payload" });
    }
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid token" });
  }
};
