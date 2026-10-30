import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const port = 5000;

const client = new MongoClient(process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());

export async function connectToMongoDB() {
  try {
    await client.connect();
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("WonderLast");
const destinationCollection = db.collection("destination");
const bookingCollection = db.collection("booking");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

  try {
    const {payload} = await jwtVerify(token, JWKS)
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  
};

app.get("/", (req, res) => {
  res.send("Welcome to WonderLast server!");
});

// http://localhost:5000/destinations
app.get("/destinations", async (req, res) => {
  const cursor = destinationCollection.find({});
  const destinations = await cursor.toArray();
  res.send(destinations);
});

// http://localhost:5000/featured-destinations
app.get('/featured-destinations/', async (req, res) => {
  const result = await destinationCollection.find().limit(5).toArray();
  res.send(result);
});


// http://localhost:5000/destinations/:id
app.get("/destinations/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const destination = await destinationCollection.findOne(query);
  res.send(destination);
});


// http://localhost:5000/destinations/:id
app.delete("/destinations/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await destinationCollection.deleteOne(query);
  res.send(result);
});

// http://localhost:5000/add-destination
app.post("/add-destination",verifyToken, async (req, res) => {
  const data = req.body;
  const result = await destinationCollection.insertOne(data);
  res.send(result);
});

app.patch("/destinations/:id",verifyToken, async (req, res) => {
  const id = req.params.id;
  const { _id, ...updatedData } = req.body;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: updatedData,
  };
  const result = await destinationCollection.updateOne(filter, updateDoc);
  res.send(result);
});

app.post("/bookings", async (req, res) => {
  const data = req.body;
  const result = await bookingCollection.insertOne(data);
  res.send(result);
});

// http://localhost:5000/my-bookings/:userEmail
app.get("/my-bookings/:userEmail",verifyToken, async (req, res) => {
  const userEmail = req.params.userEmail;
  const query = { userEmail: userEmail };
  const bookings = await bookingCollection.find(query).toArray();
  res.send(bookings);
});

app.delete("/my-bookings/:id", async (req, res) => {
  const { id } = req.params;
  const result = await bookingCollection.deleteOne({ _id: id });
  res.send(result);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;