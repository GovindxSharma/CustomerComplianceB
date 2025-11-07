import { Roles } from "./constants";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Roles;
        // add more fields if needed
      };
    }
  }
}
