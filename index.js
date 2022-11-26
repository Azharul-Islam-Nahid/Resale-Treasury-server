const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pepm1no.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const phoneCategories = client.db('resaleTreasury').collection('categories');
        const categoryItems = client.db('resaleTreasury').collection('categoryItems');
        const usersCollection = client.db('resaleTreasury').collection('users');
        const ordersCollection = client.db('resaleTreasury').collection('orders');

        app.get('/categories', async (req, res) => {
            const query = {}
            const category = await phoneCategories.find(query).toArray();
            res.send(category)
        })


        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { id: id }
            const cursor = categoryItems.find(query)
            const phones = await cursor.toArray()
            res.send(phones)
        })



        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '2d' })
                return res.send({ accessToken: token });

            }
            res.status(403).send({ accessToken: 'Oops!' })
        })


        // const decodedEmail = req.decoded.email;

        // if(email!==decodedEmail){
        //     return res.status(403).send({message:'forbidden access'})
        // }


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })



        app.post('/orders', verifyJWT, async (req, res) => {
            const buyer = req.body;
            const result = await ordersCollection.insertOne(buyer);
            res.send(result);
        })



        app.get('/orders', verifyJWT, async (req, res) => {
            const query = {};
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        })




    }


    finally {

    }
}
run().catch(console.dir)

app.get('/', async (req, res) => {
    res.send('Greetings! From Resale Treasury');
})

app.listen(port, () => console.log(`Resale Treasury Running On Port ${port}`))