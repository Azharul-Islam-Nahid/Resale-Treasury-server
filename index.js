const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const stripe = require('stripe')(process.env.STRIPE_SECRET);



const app = express();

// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pepm1no.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const phoneCategories = client.db('resaleTreasury').collection('categories');
        const categoryItems = client.db('resaleTreasury').collection('categoryItems');
        const usersCollection = client.db('resaleTreasury').collection('users');
        const ordersCollection = client.db('resaleTreasury').collection('orders');
        const paymentsCollection = client.db('resaleTreasury').collection('payment');
        const advertiseCollection = client.db('resaleTreasury').collection('advertise');



        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next();
        }
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next();
        }





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



        // app.get('/categories', async (req, res) => {
        //     const brand = req.body;

        //     const query = {
        //         brand: brand
        //     }
        //     const cursor = categoryItems.find(query)
        //     const phones = await cursor.toArray()
        //     res.send(phones)
        // })



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




        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })



        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })



        app.get('/users/:role', verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.params.role;
            const query = { role }
            const cursor = usersCollection.find(query)
            const usersRole = await cursor.toArray()
            res.send(usersRole)
        })

        app.get('/getProduct', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const products = await categoryItems.find(query).toArray();
            res.send(products);
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



        app.post('/addProduct', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await categoryItems.insertOne(product);
            res.send(result);
        })




        app.post('/addProductTohome', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await advertiseCollection.insertOne(product);
            res.send(result);
        })




        app.post('/orders', verifyJWT, async (req, res) => {
            const buyer = req.body;
            const query = {
                product: buyer.product
            }

            const alreadyBooked = await ordersCollection.find(query).toArray();

            if (alreadyBooked.length) {
                const message = `This product is already booked`
                return res.send({ acknowledged: false, message })
            }

            const result = await ordersCollection.insertOne(buyer);
            res.send(result);
        })



        app.post('/create-payment-intent', async (req, res) => {
            const orderDetails = req.body;
            const price = orderDetails.price;
            const amount = price * 100;


            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                'payment_method_types': [
                    'card'
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });



        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await ordersCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })




        app.get('/orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const orders = await ordersCollection.find(query).toArray();
            res.send(orders);
        })


        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const orders = await ordersCollection.findOne(query);
            res.send(orders);
        })



        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter);
            return res.send(result);
        })
        app.delete('/deleteProduct/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const result = await categoryItems.deleteOne(filter);
            return res.send(result);
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