import http from "http";
import url from "url";
import fs from "fs";
import express from "express";

const PORT = 3000;
const app = express();

let paginaErr: string;

//MONGO
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config({path: ".env"});
const connectionString = process.env.connectionStringAtlas;
const DB_NAME = process.env.dbName;
console.log(connectionString);

//la callback di create server viene eseguita ad ogni richiesta giunta dal client
http.createServer(app).listen(PORT, () => {
    console.log("Server listening on port: " + PORT);
});

function init()
{
    fs.readFile("./static/error.html", (err, data)=>{
        if(!err)
        {
            paginaErr=data.toString();
        }
        else
        {
            paginaErr="<h1>Not Found</h1>"
        }
    })
}

//Middleware
//1. Request log
app.use("/", (req: any, res: any, next: any) => {
    console.log(req.method + ": " + req.originalUrl);
    next();
});

//2. Static resource
app.use("/", express.static("./static"));

//3. Buddy params
//Queste due entry ervono per agganciare i parametri nel body
app.use("/", express.json({limit: "50mb"})); 
app.use("/", express.urlencoded({limit: "50mb", extended: true})); 

//4. Params log
app.use("/", (req: any, res: any, next: any) => {
    if(Object.keys(req.query).length>0)
    {
        console.log("--> parametri  GET: " + JSON.stringify(req.query));
    }
    if(Object.keys(req.body).length>0)
    {
        console.log("--> parametri  BODY: " + JSON.stringify(req.body));
    }
    next();
});

//Client routes

app.get("/api/getCollection", async (req: any, res: any, next: any) => {
    const client = new MongoClient(connectionString);
    await client.connect();
    const db = client.db(DB_NAME);
    db.listCollections().toArray()
    .catch(err => {
        res.status(500).send("Collections access error: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

app.get("/api/:collection", async (req: any, res: any, next: any) => {
    const filter = req.query;

    let collectionName = req.params.collection;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DB_NAME).collection(collectionName);

    collection.find(filter).toArray()
    .catch(err => {
        res.status(500).send("Error in query execution: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

app.get("/api/:collection/:id", async (req: any, res: any, next: any) => {
    let collectionName = req.params.collection;
    let id = req.params.id;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DB_NAME).collection(collectionName);

    let _id = new ObjectId(id);

    collection.findOne({_id})
    .catch(err => {
        res.status(500).send("Error in query execution: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

app.post("/api/:collection", async (req: any, res: any, next: any) => {
    const newRecord = req.body;

    let collectionName = req.params.collection;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DB_NAME).collection(collectionName);

    collection.insertOne(newRecord)
    .catch(err => {
        res.status(500).send("Error in query execution: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

app.delete("/api/:collection/:id", async (req: any, res: any, next: any) => {
    // let collectionName = req.params.collection;
    // let id = req.params.id;
    let {id: _id, collection: collectionName} = req.params;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DB_NAME).collection(collectionName);

    _id = new ObjectId(_id);

    collection.deleteOne({_id})
    .catch(err => {
        res.status(500).send("Error in query execution: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

app.put("/api/:collection/:id", async (req: any, res: any, next: any) => {
    let {id: _id, collection: collectionName} = req.params;
    const {values: action} = req.body;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DB_NAME).collection(collectionName);

    _id = new ObjectId(_id);

    collection.updateOne({_id}, action)
    .catch(err => {
        res.status(500).send("Error in query execution: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

app.patch("/api/:collection/:id", async (req: any, res: any, next: any) => {
    let {id: _id, collection: collectionName} = req.params;
    const {values: action} = req.body;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DB_NAME).collection(collectionName);

    _id = new ObjectId(_id);

    collection.updateOne({_id}, {$set: action})
    .catch(err => {
        res.status(500).send("Error in query execution: " + err);
    })
    .then(data => {
        res.send(data);
    })
    .finally(() => {
        client.close();
    });
});

//Default Route & Error Handler
app.use("/", (req: any, res: any, next: any) => {
    res.status(404);
    if(!req.originalUrl.startsWith("/api/"))
    {
        res.send(paginaErr);
    }
    else
    {
        res.send("Not Found: Resource " + req.originalUrl);
    }
});

app.use((err: any, req: any, res: any, next: any) => {
    console.log(err.stack);
    res.status(500).send(err.message);
});