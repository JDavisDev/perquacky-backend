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

// Get the start of the current week (Sunday)
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  // Convert to Eastern Time for consistency
  const options = { timeZone: "America/New_York" };
  const etDate = new Date(d.toLocaleString("en-US", options));
  const day = etDate.getDay(); // 0 = Sunday
  etDate.setDate(etDate.getDate() - day);
  etDate.setHours(0, 0, 0, 0);

  // Format as MM/DD/YYYY
  const month = String(etDate.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(etDate.getDate()).padStart(2, "0");
  const year = etDate.getFullYear();
  return `${month}/${dayOfMonth}/${year}`;
}

// Get the end of the week (Saturday)
function getWeekEnd(weekStartStr) {
  const parts = weekStartStr.split("/");
  const d = new Date(parts[2], parts[0] - 1, parts[1]);
  d.setDate(d.getDate() + 6);

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

// Get all dates in a week
function getWeekDates(weekStartStr) {
  const parts = weekStartStr.split("/");
  const startDate = new Date(parts[2], parts[0] - 1, parts[1]);
  const dates = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    dates.push(`${month}/${day}/${year}`);
  }

  return dates;
}

// Get weekly leaderboard
app.get("/scores/weekly", async (req, res) => {
  try {
    await client.connect();
    const db = client.db("quackle");
    const scoresCollection = db.collection("scores");
    const usersCollection = db.collection("users");

    const weekStart = req.query.weekStart || getWeekStart();
    const weekEnd = getWeekEnd(weekStart);
    const weekDates = getWeekDates(weekStart);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    // Aggregate scores for the week
    const weeklyScores = await scoresCollection.aggregate([
      { $match: { date: { $in: weekDates } } },
      {
        $group: {
          _id: "$userId",
          totalScore: { $sum: "$score" },
          gamesPlayed: { $sum: 1 },
          averageScore: { $avg: "$score" }
        }
      },
      { $sort: { totalScore: -1 } },
      { $limit: limit }
    ]).toArray();

    // Get usernames for the top players
    const userIds = weeklyScores.map(s => s._id);
    const users = await usersCollection.find({ userId: { $in: userIds } }).toArray();
    const userMap = {};
    users.forEach(u => { userMap[u.userId] = u.username; });

    // Add rank and username to each entry
    const rankedScores = weeklyScores.map((s, index) => ({
      rank: index + 1,
      userId: s._id,
      username: userMap[s._id] || null,
      totalScore: s.totalScore,
      gamesPlayed: s.gamesPlayed,
      averageScore: Math.round(s.averageScore)
    }));

    res.status(200).json({
      weekStart,
      weekEnd,
      count: rankedScores.length,
      scores: rankedScores,
    });
  } catch (e) {
    console.error("Error fetching weekly leaderboard:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's weekly rank
app.get("/scores/weekly/rank/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const weekStart = req.query.weekStart || getWeekStart();
    const weekEnd = getWeekEnd(weekStart);
    const weekDates = getWeekDates(weekStart);

    await client.connect();
    const db = client.db("quackle");
    const collection = db.collection("scores");

    // Get user's total score for the week
    const userWeeklyStats = await collection.aggregate([
      { $match: { userId, date: { $in: weekDates } } },
      {
        $group: {
          _id: "$userId",
          totalScore: { $sum: "$score" },
          gamesPlayed: { $sum: 1 }
        }
      }
    ]).toArray();

    if (userWeeklyStats.length === 0) {
      return res.status(404).json({ error: "No scores found for this week" });
    }

    const userTotal = userWeeklyStats[0].totalScore;
    const userGames = userWeeklyStats[0].gamesPlayed;

    // Count how many users have higher total scores
    const allWeeklyScores = await collection.aggregate([
      { $match: { date: { $in: weekDates } } },
      {
        $group: {
          _id: "$userId",
          totalScore: { $sum: "$score" }
        }
      }
    ]).toArray();

    const higherCount = allWeeklyScores.filter(s => s.totalScore > userTotal).length;
    const totalPlayers = allWeeklyScores.length;

    res.status(200).json({
      weekStart,
      weekEnd,
      rank: higherCount + 1,
      totalPlayers,
      totalScore: userTotal,
      gamesPlayed: userGames
    });
  } catch (e) {
    console.error("Error fetching weekly rank:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== USER ENDPOINTS ====================

// Username validation regex: 3-20 chars, alphanumeric + underscore
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// Register/update username
app.post("/users/register", async (req, res) => {
  try {
    const { userId, username } = req.body;

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.length < 10) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // Validate username format
    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        error: "INVALID_USERNAME_FORMAT",
        message: "Username must be 3-20 characters (letters, numbers, underscores only)",
      });
    }

    await client.connect();
    const db = client.db("quackle");
    const usersCollection = db.collection("users");

    const usernameLower = username.toLowerCase();

    // Check if username is already taken by another user
    const existingUsername = await usersCollection.findOne({
      usernameLower,
      userId: { $ne: userId },
    });

    if (existingUsername) {
      return res.status(409).json({
        error: "USERNAME_TAKEN",
        message: "This username is already taken",
      });
    }

    // Upsert user with username
    await usersCollection.updateOne(
      { userId },
      {
        $set: {
          username,
          usernameLower,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      username,
    });
  } catch (e) {
    console.error("Error registering username:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check username availability
app.get("/users/check/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ available: false, error: "Invalid username format" });
    }

    await client.connect();
    const db = client.db("quackle");
    const usersCollection = db.collection("users");

    const existing = await usersCollection.findOne({
      usernameLower: username.toLowerCase(),
    });

    res.status(200).json({ available: !existing });
  } catch (e) {
    console.error("Error checking username:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Search users by username
app.get("/users/search", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }

    await client.connect();
    const db = client.db("quackle");
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find({
        usernameLower: { $regex: `^${query.toLowerCase()}` },
      })
      .limit(20)
      .project({ userId: 1, username: 1, _id: 0 })
      .toArray();

    res.status(200).json({ users });
  } catch (e) {
    console.error("Error searching users:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user profile
app.get("/users/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await client.connect();
    const db = client.db("quackle");
    const usersCollection = db.collection("users");
    const scoresCollection = db.collection("scores");

    const user = await usersCollection.findOne({ userId });

    // Get stats from scores
    const scores = await scoresCollection.find({ userId }).toArray();
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
      username: user?.username || null,
      stats,
    });
  } catch (e) {
    console.error("Error fetching user profile:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ==================== FRIENDS ENDPOINTS ====================

// Add a friend
app.post("/friends/add", async (req, res) => {
  try {
    const { userId, friendUserId } = req.body;

    if (!userId || !friendUserId) {
      return res.status(400).json({ error: "Missing userId or friendUserId" });
    }

    if (userId === friendUserId) {
      return res.status(400).json({
        error: "CANNOT_ADD_SELF",
        message: "You cannot add yourself as a friend",
      });
    }

    await client.connect();
    const db = client.db("quackle");
    const friendsCollection = db.collection("friends");
    const usersCollection = db.collection("users");

    // Check if already friends
    const existing = await friendsCollection.findOne({ userId, friendUserId });
    if (existing) {
      return res.status(409).json({
        error: "ALREADY_FRIENDS",
        message: "Already in friends list",
      });
    }

    // Get friend's username if they have one
    const friendUser = await usersCollection.findOne({ userId: friendUserId });

    await friendsCollection.insertOne({
      userId,
      friendUserId,
      friendUsername: friendUser?.username || null,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true });
  } catch (e) {
    console.error("Error adding friend:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Remove a friend
app.post("/friends/remove", async (req, res) => {
  try {
    const { userId, friendUserId } = req.body;

    if (!userId || !friendUserId) {
      return res.status(400).json({ error: "Missing userId or friendUserId" });
    }

    await client.connect();
    const db = client.db("quackle");
    const friendsCollection = db.collection("friends");

    await friendsCollection.deleteOne({ userId, friendUserId });

    res.status(200).json({ success: true });
  } catch (e) {
    console.error("Error removing friend:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get friends list
app.get("/friends/list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await client.connect();
    const db = client.db("quackle");
    const friendsCollection = db.collection("friends");
    const usersCollection = db.collection("users");

    const friendships = await friendsCollection.find({ userId }).toArray();

    // Get current usernames for all friends
    const friends = await Promise.all(
      friendships.map(async (f) => {
        const user = await usersCollection.findOne({ userId: f.friendUserId });
        return {
          userId: f.friendUserId,
          username: user?.username || f.friendUsername || null,
        };
      })
    );

    res.status(200).json({ friends });
  } catch (e) {
    console.error("Error fetching friends:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get friends leaderboard
app.get("/friends/leaderboard/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const date = req.query.date || getToday();

    await client.connect();
    const db = client.db("quackle");
    const friendsCollection = db.collection("friends");
    const scoresCollection = db.collection("scores");
    const usersCollection = db.collection("users");

    // Get friend userIds
    const friendships = await friendsCollection.find({ userId }).toArray();
    const friendUserIds = friendships.map((f) => f.friendUserId);

    // Include self in the leaderboard
    const allUserIds = [userId, ...friendUserIds];

    // Get scores for friends + self
    const scores = await scoresCollection
      .find({ date, userId: { $in: allUserIds } })
      .sort({ score: -1 })
      .toArray();

    // Add usernames and ranks
    const rankedScores = await Promise.all(
      scores.map(async (s, index) => {
        const user = await usersCollection.findOne({ userId: s.userId });
        return {
          rank: index + 1,
          userId: s.userId,
          username: user?.username || null,
          score: s.score,
          wordsPlayed: s.wordsPlayed || 0,
          longestWord: s.longestWord || "",
        };
      })
    );

    res.status(200).json({
      date,
      count: rankedScores.length,
      scores: rankedScores,
    });
  } catch (e) {
    console.error("Error fetching friends leaderboard:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(4000, () => console.log("Server ready on port 4000."));
export default app;
