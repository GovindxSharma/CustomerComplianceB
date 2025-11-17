import { IUser } from "../../models/user.model"; // adjust path

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // or partial fields like { role: string, id: string } if you prefer
    }

    interface User {
      _id: Types.ObjectId;
      role: string;
      company_id?: Types.ObjectId;
    }
  }
}
