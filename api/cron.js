const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("./env.js");
require("dotenv").config();
app.use(cors());
const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri);

export default async function cron(req, res) {
  await setTodayLetters();
  res.status(200).send();
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

function generateLetterSet() {
  const diceOne = ["A, A, A, E, E, E"];
  const diceTwo = ["A, A, A, E, E, E"];
  const diceThree = ["B, H, I, K, R, T"];
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
