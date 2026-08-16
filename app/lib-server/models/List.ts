import mongoose, { Schema, Document, Model, Types } from "mongoose";

// The set of field types a list's schema can be built from. Kept in sync
// with app/lib/listTypes.ts on the client side — that's where the editor
// gets its field-type options and default values from.
export type ListFieldType = "text" | "number" | "boolean" | "date" | "select";

export interface IListField {
    key: string; // stable identifier used as the key in a document's `data`
    label: string; // what the person sees in the editor
    type: ListFieldType;
    options?: string[]; // only used when type === "select"
    unique?: boolean; // when true, no two documents in the list may share a value for this field
}

export interface IList extends Document {
    owner: Types.ObjectId;
    name: string;
    fields: IListField[];
    createdAt: number;
    updatedAt: number;
}

const ListFieldSchema = new Schema<IListField>(
    {
        key: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
        type: { type: String, required: true, enum: ["text", "number", "boolean", "date", "select"] },
        options: { type: [String], default: undefined },
        unique: { type: Boolean, default: undefined },
    },
    { _id: false },
);

const ListSchema = new Schema<IList>(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true },
        fields: { type: [ListFieldSchema], default: [] },
        createdAt: { type: Number, default: Date.now },
        updatedAt: { type: Number, default: Date.now },
    },
);

ListSchema.pre("save", function () {
    this.updatedAt = Date.now();
});

// Prevent model recompilation during hot reload
const List: Model<IList> = mongoose.models.List ?? mongoose.model<IList>("List", ListSchema);

export default List;
