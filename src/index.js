// require('dotenv').config({path: '../env'})
// or
import dotenv from "dotenv";
// impoort app 
import {app} from './app.js'
// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";

dotenv.config({
    path: '../env'
})

// 2nd approach write the function in another file then import here 
import connectDB from "./db/index.js";


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️  Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO DB connection failed !!!", err);
})

// First Approach to write the connection of DB in index.js file

/*
import express from "express"
const app = express()

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('error', (error) => {
            console.log("ERR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ", error);
        throw error
    }
})()*/