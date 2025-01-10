const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("./env.js");
require("dotenv").config();
app.use(cors());
const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri);


export default function cron() {
    console.log("entering cron")
     setTodayLetters();
    console.log("exit cron");
    return;
}

async function setTodayLetters() {
    console.log("running set today letters");
    const today = getToday();
    const letters = generateLetterSet();
    // insert letters into today if they are unique
    await addLettersToDb(letters, today);
    console.log(`today letters are: ${today} : ${letters.join("")}`);
    return;
  }
  
  async function addLettersToDb(letters, today) {
    try {
      await client.connect();
      const db = client.db("quackle");
      const collection = db.collection("days");
  
      const doc = { date: today, letters: letters.join("") };
      const result = await collection.insertOne(doc);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
    } finally {
      // Ensures that the client will close when you finish/error
      client.close();
    }
  }