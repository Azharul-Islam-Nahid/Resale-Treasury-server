const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
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

        app.get('/categories', async (req, res) => {
            const query = {}
            const category = await phoneCategories.find(query).toArray();
            res.send(category)
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