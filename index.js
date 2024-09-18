require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
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

connectToDatabase();
// ----------------user route start-------------------
// routes for users
app.post('/new-user', async (req, res) => {
  const newUser = req.body;
  const result = await usersCollection.insertOne(newUser);
  res.send(result);
});
//get user 
app.get('/users', async (req, res) => {
  const result = await usersCollection.find({}).toArray();
  res.send(result);
}); 
// user get by id
app.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.findOne(query);
  res.send(result);
});
// user get by email
app.get('/user/:email', async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const result = await usersCollection.findOne(query);
  res.send(result);
});
// delete user by id
app.delete('/delete-user/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});
// user uodate one by one
app.put('/update-user/:id', async (req, res) => {
  const id = req.params.id;
  const updatedUser = req.body;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updateDoc = {
    $set: {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.option,
      address: updatedUser.address,
      about: updatedUser.about,
      photoUrl: updatedUser.photoUrl,
      skills: updatedUser.skills ? updatedUser.skills : null,
    },
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});
// -------------user route end---------------

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Gracefully handle process termination
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});
