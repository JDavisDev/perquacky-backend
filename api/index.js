const express = require("express");
const app = express();
const cron = require("node-cron");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("./env.js");
require("dotenv").config();
app.use(cors());

const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri);
async function addTodaysDateToDb() {
  try {
    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("days");
    // official current puzzle day
    const options = {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const easternTime = formatter.format(new Date());

    const doc = { date: easternTime };
    const result = await collection.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
    // Ensures that the client will close when you finish/error
  }
}

cron.schedule("0 0 * * *", setTodayLetters, { timezone: "America/New_York" });

app.get("/", (req, res) => {
  res.send("Express on Vercel");
});

app.get("/today", (req, res) => {
  getTodaysDateEastern(res);
});

async function getTodaysDateEastern(res) {
  console.log("entered get todays date eastern");

  try {
    await addTodaysDateToDb().catch(console.dir);
    res.status(200).send("done");
  } catch (e) {
    console.error(e);
  }
}

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

function setTodayLetters() {
  console.log("running set today letters");
  const today = getToday();
  const letters = generateLetterSet();
  // insert letters into today if they are unique

  console.log(`today letters are: ${today} : ${letters.join("")}`);
}

async function setLettersInDb() {
  try {
    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("days");
    const letters = generateLetterSet();

    const doc = { letters: letters.join("") };
    const result = await collection.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
    // Ensures that the client will close when you finish/error
  }
}

function generateLetterSet() {
  const vowels = ["A", "E", "I", "O", "U"];
  const consonants = [
    "B",
    "C",
    "D",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    "M",
    "N",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "V",
    "W",
    "X",
    "Y",
  ];
  const alphabetWithoutZ = [...vowels, ...consonants];

  // Randomly determine the number of vowels (between 2 and 5)
  const numVowels = Math.floor(Math.random() * 4) + 2; // 2 to 5 vowels
  const numConsonants = 9 - numVowels;

  // Randomly pick vowels
  const selectedVowels = [];
  while (selectedVowels.length < numVowels) {
    const randomVowel = vowels[Math.floor(Math.random() * vowels.length)];
    selectedVowels.push(randomVowel);
  }

  // Randomly pick consonants, ensuring Q includes U
  const selectedConsonants = [];
  let hasQ = false;

  while (selectedConsonants.length < numConsonants) {
    const randomConsonant =
      consonants[Math.floor(Math.random() * consonants.length)];
    if (randomConsonant === "Q") {
      if (!selectedVowels.includes("U")) selectedVowels.push("U"); // Ensure U is added with Q
      hasQ = true;
    }
    selectedConsonants.push(randomConsonant);
  }

  // Combine and shuffle letters
  const selectedLetters = [...selectedVowels, ...selectedConsonants];
  for (let i = selectedLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedLetters[i], selectedLetters[j]] = [
      selectedLetters[j],
      selectedLetters[i],
    ];
  }

  if (selectedConsonants.length === numConsonants + numVowels + 1) {
    // If we have an extra letter, remove it
    selectedConsonants
      .filter((letter) => letter !== "Q" && letter !== "U")
      .pop();
  }

  return selectedLetters;
}

async function onLettersGet(res) {
  try {
    await setLettersInDb().catch(console.dir);
    res.status(200).send("done");
  } catch (e) {
    console.error(e);
  }
}

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
module.exports = app;
