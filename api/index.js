import express from "express";
const app = express();
import cors from "cors";
import { MongoClient } from "mongodb";
import "./env.js";
app.use(cors());
require("dotenv").config();

const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri);

app.get("/", (req, res) => {
  res.send("Express on Vercel");
});

function getToday() {
  // official current puzzle day
  const options = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  return formatter.format(new Date());
}

// Function to get random characters
function getRandomCharacters(matrix) {
  const returnArray = [];
  matrix.forEach((element) => {
    if (Array.isArray(element) && element.length > 0) {
      // Select a random index
      const randomIndex = Math.floor(Math.random() * element.length);
      // Return the random element
      returnArray.push(element[randomIndex]);
    }
  });

  return returnArray;
}

async function getLettersInDb() {
  try {
    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("days");
    const today = getToday();
    const result = await collection.findOne({ date: today });
    console.log(result);
    if (result !== null && result.letters !== null) {
      return result.letters;
    } else {
      const options = {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const today = new Date();
      const yesterday = today.setDate(today.getDate() - 1);
      const yesterdayString = formatter.format(yesterday);
      const resultTwo = await collection.findOne({ date: yesterdayString });
      console.log(resultTwo);
      return resultTwo.letters;
    }
  } finally {
    // Ensures that the client will close when you finish/error
  }
}

async function onLettersGet(res) {
  try {
    const letters = await getLettersInDb().catch(console.dir);
    res.status(200).send(letters);
  } catch (e) {
    console.error(e);
  }
}

app.get("/testAlgo", (req, res) => {
  const diceOne = ["A", "A", "A", "E", "E", "E"];
  const diceTwo = ["A", "A", "A", "E", "E", "E"];
  const diceThree = ["B", "H", "I", "K", "R", "T"];
  const diceFour = ["F", "H", "I", "R", "S", "U"];
  const diceFive = ["G", "I", "M", "R", "S", "U"];
  const diceSix = ["E", "J", "Q", "V", "X", "Z"];
  const diceSeven = ["F", "I", "N", "P", "T", "U"];
  const diceEight = ["C", "M", "O", "O", "P", "W"];
  const diceNine = ["D", "L", "N", "O", "R", "T"];
  const diceTen = ["B", "L", "O", "O", "W", "Y"];
  const allDice = [
    diceOne,
    diceTwo,
    diceThree,
    diceFour,
    diceFive,
    diceSix,
    diceSeven,
    diceEight,
    diceNine,
    diceTen,
  ];
  const result = getRandomCharacters(allDice);
  res.status(200).send(result);
});

app.get("/letters", (req, res) => {
  // fetch Db for today's letters
  onLettersGet(res);
});

app.get("/time", (req, res) => {
  res.send("90");
});

app.post("/score", (req, res) => {
  const score = req.score;
  // insert into db for today
});

app.get("/scores", (req, res) => {
  // return db score list for today
});

app.listen(4000, () => console.log("Server ready on port 4000."));
export default app;
