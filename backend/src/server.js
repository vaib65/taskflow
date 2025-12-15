import { app } from "./app.js";
import connectDB from "./config/db.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});


const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port: ${PORT}`);
        })
    }).catch((err) => {
        console.log("MongoDb connection error", err);
    })