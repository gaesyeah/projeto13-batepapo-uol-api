import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
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
    .then(() => db = mongoClient.db)
    .catch(({message}) => console.log(message))
;



app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));