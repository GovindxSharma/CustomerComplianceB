import { IUser } from "../../models/user.model"; // adjust path

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // or partial fields like { role: string, id: string } if you prefer
    }
  }
}
