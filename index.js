require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.PAYMENT_SECRET);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3001;
// verify that token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: 'Invalid authorization' });
  }
  const token = authorization?.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
};



const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  CURSOR_FLAGS,
} = require("mongodb");
//connection mongodb
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
// token create by jwt
app.post("/api/set-token", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_SECRET, {
    expiresIn: "24h"
  });

  res.send(token);
});

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
app.get("/classes",verifyJWT, async (req, res) => {
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
// -------------cart route start---------------
// cart collection
app.post("/add-to-cart", async (req, res) => {
  const newCartItem = req.body;
  const result = await cartCollection.insertOne(newCartItem);
  res.send(result);
});
// cart item get by id
app.get("/cart-item/:id", async (req, res) => {
  const id = req.params.id;
  const email = req.body.email;
  const query = {
    classId: id,
    email: email,
  };
  const projection = { classId: 1 };
  const result = await cartCollection.findOne(query, { projection });
  res.send(result);
});

// cart item get by email address
app.get("/cart/:email", async (req, res) => {
  const { email } = req.params;
  const query = { userMail: email };
  const projection = { classId: 1 };

  const carts = await cartCollection.find(query, { projection }).toArray();
  const classIds = carts.map((cart) => new ObjectId(cart.classId));
  const query2 = { _id: { $in: classIds } };
  const result = await classesCollection.find(query2).toArray();

  res.send(result);
});
// DELETE route for removing a cart item
app.delete("/delete-cart-item/:id", async (req, res) => {
  const id = req.params.id;
  const query = { classId: id };
  const result = await cartCollection.deleteOne(query);
  res.send(result);
});
// -------------cart route end---------------
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
// -------------enrolled route start---------------
// enrolledment routes
app.get("/popular-classes", async (req, res) => {
  const result = await classesCollection
    .find()
    .sort({ totalEnrolled: -1 })
    .limit(6)
    .toArray();
  res.send(result);
});
// -------------enrolled route end---------------
// -------------instructors route start---------------
//popular instructure
app.get("/popular-instructors", async (req, res) => {
  const pipeline = [
    {
      $group: {
        _id: "$instructorEmail",
        totalEnrolled: { $sum: "$totalEnrolled" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "email",
        as: "instructor",
      },
    },
    {
      $project: {
        _id: 0,
        instructor: { $arrayElemAt: ["$instructor", 0] },
        totalEnrolled: 1,
      },
    },
    {
      $sort: { totalEnrolled: -1 },
    },
    {
      $limit: 6,
    },
  ];
  const result = await classesCollection.aggregate(pipeline).toArray();
  res.send(result);
});
// admin status
app.get("/admin-stats", async (req, res) => {
  const approvedClasses = (
    await classesCollection.find({ status: "approved" })
  ).toArray().length;
  const pendingClasses = (
    await classesCollection.find({ status: "pending" })
  ).toArray().length;
  const instructors = (
    await usersCollection.find({ role: "instructor" })
  ).toArray().length;
  const totalClasses = (await classesCollection.find()).toArray().length;
  const totalEnrolled = (await enrolledCollection.find()).toArray().length;
  const result = {
    approvedClasses,
    pendingClasses,
    instructors,
    totalClasses,
    totalEnrolled,
  };
  res.send(result);
});
app.get('/enrolled-classes/:email', async (req, res) => {
  const email = req.params.email;
  const query = { userEail: email };
  const pipeline = [
    {
      $match: query
    },
    {
      $lookup: {
        from: "classes",
        localField: "classesId",
        foreignField: "_id",
        as: "classes"
      }
    },
    {
      $unwind: "$classes"
    },
    {
      $lookup: {
        from: "users",
        localField: "classes.instructorEmail",
        foreignField: "email",
        as: "instructor"
      }
    },
    {
      $project: {
        _id: 0,
        instructor: {
          $arrayElemAt: ["$instructor", 0]
        },
        classes: 1
      }
    }
  ];
  const result = await enrolledCollection.aggregate(pipeline).toArray();
  res.send(result);
  });
// appliend for instructors
app.post('/ass-instructor', async (req, res) => {
  const data = req.body;
  const result = await appliedCollection.insertOne(data);
  res.send(result);
});
// instructor get by email  address
app.get('/applied-instructors/:email', async (req, res) => {
  const email = req.params.email;
  const result = await appliedCollection.findOne({ email });
  res.send(result);
});
// -------------instructor route end---------------


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// Gracefully handle process termination
process.on("SIGINT", async () => {
  await client.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});