import express from "express";
const app = express();
import cors from "cors";
import { MongoClient } from "mongodb";
import "./env.js";
app.use(cors());
app.use(express.json());
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
      const data = {
        date: today,
        letters: result.letters,
      };
      return data;
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
      const data = {
        date: yesterdayString,
        letters: resultTwo.letters,
      };
      return data;
    }
  } finally {
    // Ensures that the client will close when you finish/error
  }
}

async function onLettersGet(res) {
  try {
    const letters = await getLettersInDb().catch(console.dir);
    res.status(200).json(letters);
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

// Submit a score
app.post("/scores", async (req, res) => {
  try {
    const { userId, score, wordsPlayed, longestWord } = req.body;

    // Validation
    if (!userId || typeof userId !== "string" || userId.length < 10) {
      return res.status(400).json({ error: "Invalid userId" });
    }
    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ error: "Invalid score" });
    }

    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("scores");

    const today = getToday();

    // Check for existing submission today
    const existing = await collection.findOne({ userId, date: today });
    if (existing) {
      return res.status(409).json({
        error: "Already submitted score today",
        existingScore: existing.score,
      });
    }

    const doc = {
      userId,
      date: today,
      score,
      wordsPlayed: wordsPlayed || 0,
      longestWord: longestWord || "",
      createdAt: new Date(),
    };

    const result = await collection.insertOne(doc);
    res.status(201).json({
      success: true,
      id: result.insertedId,
      date: today,
    });
  } catch (e) {
    console.error("Error submitting score:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get leaderboard for a day
app.get("/scores/leaderboard", async (req, res) => {
  try {
    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("scores");

    const date = req.query.date || getToday();
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const scores = await collection
      .find({ date })
      .sort({ score: -1 })
      .limit(limit)
      .project({ userId: 1, score: 1, wordsPlayed: 1, longestWord: 1, _id: 0 })
      .toArray();

    // Add rank to each entry
    const rankedScores = scores.map((s, index) => ({
      rank: index + 1,
      ...s,
    }));

    res.status(200).json({
      date,
      count: rankedScores.length,
      scores: rankedScores,
    });
  } catch (e) {
    console.error("Error fetching leaderboard:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's score history
app.get("/scores/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId.length < 10) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("scores");

    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    const scores = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .project({ date: 1, score: 1, wordsPlayed: 1, longestWord: 1, _id: 0 })
      .toArray();

    // Calculate statistics
    const stats = {
      totalGames: scores.length,
      averageScore:
        scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
          : 0,
      highScore: scores.length > 0 ? Math.max(...scores.map((s) => s.score)) : 0,
    };

    res.status(200).json({
      userId,
      stats,
      history: scores,
    });
  } catch (e) {
    console.error("Error fetching user history:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's rank for today
app.get("/scores/rank/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const date = req.query.date || getToday();

    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("scores");

    // Get user's score for the day
    const userScore = await collection.findOne({ userId, date });
    if (!userScore) {
      return res.status(404).json({ error: "No score found for this date" });
    }

    // Count how many scores are higher
    const higherCount = await collection.countDocuments({
      date,
      score: { $gt: userScore.score },
    });

    const totalCount = await collection.countDocuments({ date });

    res.status(200).json({
      date,
      rank: higherCount + 1,
      totalPlayers: totalCount,
      score: userScore.score,
    });
  } catch (e) {
    console.error("Error fetching rank:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(4000, () => console.log("Server ready on port 4000."));
export default app;
