import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    email: string;
    otp: string | null; // last OTP issued, cleared once verified
    expired: Date | null; // OTP expiry timestamp
}

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    otp: { type: String, default: null },
    expired: { type: Date, default: null },
});

// Prevent model recompilation during hot reload
const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;