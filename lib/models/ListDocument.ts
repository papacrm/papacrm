import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IListDocument extends Document {
    list: Types.ObjectId;
    owner: Types.ObjectId; // denormalized so documents can be scoped/secured without a join
    data: Record<string, any>; // keyed by the owning list's field `key`s
    createdAt: Date;
    updatedAt: Date;
}

const ListDocumentSchema = new Schema<IListDocument>(
    {
        list: { type: Schema.Types.ObjectId, ref: "List", required: true, index: true },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        data: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
);

// Prevent model recompilation during hot reload
const ListDocument: Model<IListDocument> =
    mongoose.models.ListDocument ?? mongoose.model<IListDocument>("ListDocument", ListDocumentSchema);

export default ListDocument;
