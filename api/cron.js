
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
  const yesterdayLetters = await getYesterdayLetters();
  let letters = generateLetterSet();

  while (!areLettersValid(letters) || letters.join("") === yesterdayLetters) {
    letters = generateLetterSet();
  }

  // insert letters into today if they are unique
  await addLettersToDb(letters, today);
  console.log(`today letters are: ${today} : ${letters.join("")}`);
  if (yesterdayLetters) {
    console.log(`yesterday letters were: ${yesterdayLetters}`);
  }
  return;
}

function areLettersValid(letters) {
  const vowelCount = countVowels(letters);
  return vowelCount <= 4 && vowelCount > 1;
}

function countVowels(arr) {
  // Combine all array elements into a single string
  const str = arr.join('').toLowerCase();
  
  // Define vowels
  const vowels = 'aeiou';
  
  // Count vowels
  let count = 0;
  for (const char of str) {
      if (vowels.includes(char)) {
          count++;
      }
  }

  return count;
}

function getToday() {
  const options = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  return formatter.format(new Date());
}

function getYesterday() {
  const options = {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatter.format(yesterday);
}

async function getYesterdayLetters() {
  try {
    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("days");
    const yesterday = getYesterday();
    const result = await collection.findOne({ date: yesterday });
    return result?.letters || null;
  } catch (e) {
    console.error("Error fetching yesterday's letters:", e);
    return null;
  }
}

function generateLetterSet() {
  const diceOne = ["A", "A", "E", "E", "I", "O"];
  const diceTwo = ["A", "E", "I", "O", "O", "U"];
  const diceThree = ["B", "C", "D", "F", "G", "H"];
  const diceFour = ["H", "K", "L", "M", "N", "P"];
  const diceFive = ["R", "S", "T", "W", "Y", "Z"];
  const diceSix = ["D", "L", "N", "R", "S", "T"];
  const diceSeven = ["E", "I", "N", "R", "S", "T"];
  const diceEight = ["C", "G", "L", "P", "S", "W"];
  const diceNine = ["A", "E", "O", "R", "T", "U"];
  const diceTen = ["B", "F", "M", "N", "V", "Y"];
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
  const returnArray = [];
  allDice.forEach((element) => {
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

    const result = await collection.updateOne(
      { date: today },
      { $setOnInsert: { date: today, letters: letters.join("") } },
      { upsert: true }
    );
    console.log(`Letters for ${today}: ${result.upsertedId ? 'inserted new' : 'already existed'}`);
  } finally {
    client.close();
  }
}
