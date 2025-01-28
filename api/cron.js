import { count } from "console";

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

  while (!areLettersValid(letters)) {
    letters = generateLetterSet();
  }

  // insert letters into today if they are unique
  await addLettersToDb(letters, today);
  console.log(`today letters are: ${today} : ${letters.join("")}`);
  return;
}

function areLettersValid(letters) {
 return letters.includes("Q") && !letters.includes("U") && countVowels(letters) <= 4 && countVowels(letters) > 1;
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

function generateLetterSet() {
  const diceOne = ["A", "A", "A", "E", "E", "E"];
  const diceTwo = ["A", "A", "A", "E", "E", "E"];
  const diceThree = ["B", "H", "I", "K", "R", "T"];
  const diceFour = ["F", "H", "I", "R", "S", "U"];
  const diceFive = ["G", "I", "M", "R", "S", "U"];
  const diceSix = ["E", "J", "Q", "V", "X", "Z"];
  const diceSeven = ["F", "I", "N", "P", "T", "E"];
  const diceEight = ["C", "M", "O", "O", "P", "W"];
  const diceNine = ["D", "L", "N", "O", "R", "T"];
  const diceTen = ["B", "L", "O", "M", "W", "Y"];
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

    const doc = { date: today, letters: letters.join("") };
    const result = await collection.insertOne(doc);
    console.log(`A document was inserted with the _id: ${result.insertedId}`);
  } finally {
    // Ensures that the client will close when you finish/error
    client.close();
  }
}
