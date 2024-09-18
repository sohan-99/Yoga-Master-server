require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");

const port = process.env.PORT || 3001;

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  CURSOR_FLAGS,
} = require("mongodb");

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}/?retryWrites=true&w=majority&appName=${process.env.MONGODB_DB}`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

let classesCollection;
let cartCollection;
let paymentCollection;
let appliedCollection;
let enrolledCollection;
let usersCollection;

async function connectToDatabase() {
  try {
    await client.connect();
    const database = client.db("ecommercebackend");
    usersCollection = database.collection("users");
    classesCollection = database.collection("classes");
    cartCollection = database.collection("cart");
    paymentCollection = database.collection("payments");
    enrolledCollection = database.collection("enrolled");
    appliedCollection = database.collection("applied");
    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}








app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Gracefully handle process termination
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
