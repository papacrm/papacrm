import mongoose, { Schema, Document, Model, Types } from "mongoose";

// One row per time a "Save to Database" step runs — holds whatever the
// current step context's body was at that point (e.g. the fields a person
// just submitted through an Input Form step upstream).
export interface IWorkflowRecord extends Document {
    workflow: Types.ObjectId;
    node: string; // id of the "Save to Database" node that wrote this row
    data: any;
    createdAt: Date;
}

const WorkflowRecordSchema = new Schema<IWorkflowRecord>(
    {
        workflow: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
        node: { type: String, required: true },
        data: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: { createdAt: true, updatedAt: false } },
);

// Prevent model recompilation during hot reload
const WorkflowRecord: Model<IWorkflowRecord> = mongoose.models.WorkflowRecord ?? mongoose.model<IWorkflowRecord>("WorkflowRecord", WorkflowRecordSchema);

export default WorkflowRecord;