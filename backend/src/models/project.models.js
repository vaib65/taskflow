import mongoose, { Schema } from "mongoose";

const ProjectSchema = new Schema({
    project_name: { type: String, required: true },
    description: { type: String, default:"" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true},
    members:[{type:Schema.Types.ObjectId,ref:"User"}]
}, { timestamps: true })

export const Project = mongoose.model("Project", ProjectSchema);