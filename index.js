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
// -------------classes route start---------------
// Define routes
app.post("/new-class", async (req, res) => {
  try {
    const newClass = req.body;
    const result = await classesCollection.insertOne(newClass);
    res.send(result);
  } catch (error) {
    res.status(500).send("Error inserting document");
  }
});

// Get all classes
app.get("/classes", async (req, res) => {
  try {
    const approvedClasses = await classesCollection
      .find({ status: "panding" })
      .toArray();
    res.json(approvedClasses);
  } catch (error) {
    res.status(500).send("Error retrieving approved classes");
  }
});

// Get instructor email address
app.get("/classes/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const query = { instructorEmail: email };
    const result = await classesCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).send("Error retrieving classes");
  }
});

// Change class status
app.patch("/change-status/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const status = req.body.status;
    const reason = req.body.reason;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        status: status,
        reason: reason,
      },
    };
    const result = await classesCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send("Error updating class status");
  }
});

// Manage class
app.get("/classes-manage", async (req, res) => {
  try {
    const result = await classesCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send("Error retrieving classes");
  }
});

// Get approved classes
app.get("/approved-classes", async (req, res) => {
  try {
    const approvedClasses = await classesCollection
      .find({ status: "approved" })
      .toArray();
    res.json(approvedClasses);
  } catch (error) {
    res.status(500).send("Error retrieving approved classes");
  }
});

// Get single class
app.get("/class/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await classesCollection.findOne(query);

    if (result) {
      res.json(result);
    } else {
      res.status(404).send("Class not found");
    }
  } catch (error) {
    res.status(500).send("Error retrieving the class");
  }
});

// Update class
app.put("/update-class/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;
    const query = { _id: new ObjectId(id) };

    const updateDoc = {
      $set: {
        name: updatedData.name,
        image: updatedData.image,
        availableSeats: parseInt(updatedData.availableSeats, 10),
        price: parseFloat(updatedData.price),
        videoLink: updatedData.videoLink,
        description: updatedData.description,
        instructorName: updatedData.instructorName,
        instructorEmail: updatedData.instructorEmail,
        status: updatedData.status || "pending",
        submitted: updatedData.submitted,
        totalEnrolled: parseInt(updatedData.totalEnrolled, 10),
        reason: updatedData.reason,
      },
    };

    const result = await classesCollection.updateOne(query, updateDoc, {
      upsert: true,
    });

    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      res.send(result);
    } else {
      res.status(404).send("Class not found or no changes made");
    }
  } catch (error) {
    res.status(500).send("Error updating the class");
  }
});
// -------------classes route end---------------

// -------------payment route start---------------
// payment with stripe
app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price) * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});
// post payment info to DB
app.post("/payment-info", async (req, res) => {
  const paymentInfo = req.body;
  const classesId = paymentInfo.classesId;
  const userEmail = paymentInfo.userEmail;
  const singleClassId = req.query.classId;
  let query;
  if (singleClassId) {
    query = { classId: singleClassId, userMail: userEmail };
  } else {
    query = { classId: { $in: classesId } };
  }

  const classesQuery = {
    _id: { $in: classesId.map((id) => new ObjectId(id)) },
  };
  const classes = await classesCollection.find(classesQuery).toArray();

  const newEnrolledData = {
    userEmail: userEmail,
    classId: singleClassId.map((id) => new ObjectId(id)),
    transactionId: paymentInfo.transactionId,
  };

  const updatedDoc = {
    $set: {
      totalEnrolled:
        classes.reduce((total, current) => total + current.totalEnrolled, 0) +
          1 || 0,
      availableSeats:
        classes.reduce((total, current) => total + current.availableSeats, 0) -
          1 || 0,
    },
  };

  const updatedResult = await classesCollection.updateMany(
    classesQuery,
    updatedDoc,
    { upsert: true }
  );
  const enrolledResult = await enrolledCollection.insertOne(newEnrolledData);
  const deletedResult = await cartCollection.deleteMany(query);
  const paymentResult = await paymentCollection.insertOne(paymentInfo);

  res.send({ paymentResult, deletedResult, enrolledResult, updatedResult });
});
// get payment History
app.get("/payment-history/:email", async (req, res) => {
  const email = req.params.email;
  const query = { userEmail: email };
  const result = await paymentCollection
    .find(query)
    .sort({ date: -1 })
    .toArray();
  res.send(result);
});
// Fetch payment history by email
app.get("/payment-history/:email", async (req, res) => {
  const email = req.params.email;
  const query = { userEmail: email };
  const result = await paymentCollection
    .find(query)
    .sort({ date: -1 })
    .toArray();
  res.send(result);
});

// Fetch payment history length by email
app.get("/payment-history-length/:email", async (req, res) => {
  const email = req.params.email;
  const query = { userEmail: email };
  const total = await paymentCollection.countDocuments(query);
  res.send({ total });
});
// -------------payment route end---------------


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Gracefully handle process termination
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});