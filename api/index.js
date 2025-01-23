import express from "express";
const app = express();
import cors from "cors";
import { MongoClient } from "mongodb";
import "./env.js";
app.use(cors());
require("dotenv").config();

// cron.schedule("0 45 13 * * *", async () => {
//   console.log("entered cron")
//   setTodayLetters();
//   console.log("exit cron");
//  }, { timezone: "America/New_York" });

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

app.get("/", (req, res) => {
  res.send("Express on Vercel");
});

app.get("/today", (req, res) => {
  getTodaysDateEastern(res);
});

async function getTodaysDateEastern(res) {
  try {
    await setTodayLetters();
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

async function setTodayLetters() {
  console.log("running set today letters");
  const today = getToday();
  const letters = generateLetterSet();
  // insert letters into today if they are unique
  await addLettersToDb(letters, today);
  console.log(`today letters are: ${today} : ${letters.join("")}`);
  return;
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

async function getLettersInDb() {
  try {
    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("days");
    const today = getToday();
    const result = await collection.findOne({ date: today });
    if (result.letters != null && result.letters.length > 0) {
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
      const resultTwo = await collection.findOne({ date: yesterdayString})
    }
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
  let selectedLetters = [...selectedVowels, ...selectedConsonants];
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

  selectedLetters = [...selectedVowels, ...selectedConsonants];

  return selectedLetters;
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
