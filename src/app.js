import cors from 'cors';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import express from 'express';
import joi from 'joi';
import { MongoClient } from 'mongodb';

//configuração do servidor
const app = express();
app.use(express.json());
app.use(cors());

//configuração do dotenv
dotenv.config();
const { DATABASE_URL, PORT } = process.env;

//configuração do mongodb(bando de dados)
const mongoClient = new MongoClient(DATABASE_URL);
try {
  await mongoClient.connect();
  console.log(`Conectado ao banco ${DATABASE_URL}`);
} catch ({message}) {
  console.log(message);
}
const db = mongoClient.db();

//POST participants
app.post('/participants', async (req, res) => {
  const { name } = req.body;

  const schema = joi.string().required();
  const { error } = schema.validate(name);
  if (error) return res.status(422).send(error.message);

  try {
    const participant = await db.collection('participants').findOne({ name })
    if (participant) return res.sendStatus(409);

    await db.collection('participants').insertOne({ name, lastStatus: Date.now() });
    await db.collection('messages').insertOne(
      { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(Date.now()).format('HH:mm:ss') }
    );
    res.sendStatus(201);

  } catch ({message}) {
    res.status(500).send(message);
  }
});

//GET participants
app.get('/participants', async (req, res) => {
  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch ({message}) {
    res.status(500).send(message);
  }
});

//POST messages
app.post('/messages', async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;

  const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.valid('message','private_message')
  });
  const {error} = messageSchema.validate({to, text, type});

  try {
    const participant = await db.collection('participants').findOne({ name: user });
    if (!participant || error) return res.sendStatus(422);

    db.collection('messages').insertOne(
      {from: user, to, text, type, time: dayjs(Date.now()).format('HH:mm:ss')}
    );
    res.sendStatus(201);

  } catch ({message}){
    res.status(500).send(message);
  }
});

//GET messages
app.get('/messages', async (req, res) => {
  const { user } = req.headers;
  const { limit } = req.query;

  try {
    const messages = await db.collection('messages').find( 
      { $or: [
        { from: user },
        { to: { $in: ['Todos', user] } }
      ]}
    ).toArray();

    if (limit){
      const limitSchema = joi.number().min(1);
      const { error } = limitSchema.validate(limit);
      if (error) return res.status(422).send(error.message);
      
      return res.send(messages.slice(-limit));
    }
    res.send(messages);
    
  } catch ({message}){
    res.status(500).send(message);
  }
});

//POST status
app.post('/status', async (req, res) => {
  const {user} = req.headers;

  try {
    const participant = await db.collection('participants').findOne({ name: user });
    if (!user || !participant) return res.sendStatus(404);

    await db.collection('participants').updateOne(
      { name: user },
      { $set : { lastStatus: Date.now() } }
    );
    res.sendStatus(200);

  } catch ({message}){
    res.status(500).send(message);
  }
})

app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));