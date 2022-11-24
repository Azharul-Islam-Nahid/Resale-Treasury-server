const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pepm1no.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const phoneCategories = client.db('resaleTreasury').collection('categories')
        const categoryItems = client.db('resaleTreasury').collection('categoryItems')

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




    }


    finally {

    }
}
run().catch(console.dir)

app.get('/', async (req, res) => {
    res.send('Greetings! From Resale Treasury');
})

app.listen(port, () => console.log(`Resale Treasury Running On Port ${port}`))