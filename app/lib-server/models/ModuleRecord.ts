import mongoose, { Schema, Document, Model, Types } from "mongoose";

// One row per time a "Save to Database" node runs — holds whatever the
// current node context's body was at that point (e.g. the fields a person
// just submitted through an Input Form node upstream).
export interface IModuleRecord extends Document {
    module: Types.ObjectId;
    node: string; // id of the "Save to Database" node that wrote this row
    data: any;
    createdAt: Date;
}

const ModuleRecordSchema = new Schema<IModuleRecord>(
    {
        module: { type: Schema.Types.ObjectId, ref: "Module", required: true, index: true },
        node: { type: String, required: true },
        data: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

// Prevent model recompilation during hot reload
const ModuleRecord: Model<IModuleRecord> = mongoose.models.ModuleRecord ?? mongoose.model<IModuleRecord>("ModuleRecord", ModuleRecordSchema);

export default ModuleRecord;