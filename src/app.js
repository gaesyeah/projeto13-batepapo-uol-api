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
const {DATABASE_URL, PORT} = process.env;

//configuração do mongodb(bando de dados)
const mongoClient = new MongoClient(DATABASE_URL);
let db;
mongoClient.connect()
    .then(() => {
        db = mongoClient.db();
        console.log(`Conectado ao banco ${DATABASE_URL}`)
    })
    .catch(({message}) => console.log(message))
;

//POST participants
app.post('/participants', (req, res) => {
    const {name} = req.body;
    
    const schema = joi.string().required();
    const {error} = schema.validate(name);
    if (error){
        return res.status(422).send(error.message);
    }

    db.collection('participants').findOne({name})
        .then(resp => {
            if (resp){
                return res.sendStatus(409)
            }

            db.collection('participants').insertOne({name, lastStatus: Date.now()})
                .then(() => {
                    db.collection('messages').insertOne(
                        {from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(Date.now()).format('HH:mm:ss')}
                    )
                        .then(() => res.sendStatus(201))
                        .catch(({message}) => res.status(500).send(message))
                    ;  
                })
                .catch(({message}) => res.status(500).send(message))
        })
        .catch(({message}) => res.status(500).send(message))
    ;
});

//GET participants
app.get('/participants', (req, res) => {
    db.collection('participants').find().toArray()
        .then(data => res.send(data))
        .catch(({message}) => res.status(500).send(message))
    ;  
});

/* //POST messages
app.get('/messages', (req, res) => {
    const {to, text, type} = req.body;
    const {User} = req.headers;

    //fazer verificações com a biblioteca joi
}); */

app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));