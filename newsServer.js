const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') });

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const apiKey = process.env.API_KEY;

const express = require("express");
const app = express();
const bodyParser = require("body-parser");//for post
const pathApp = require("path"); //for mac and windows compatibility with the slashes for paths.
const fetch = require("node-fetch");

const portNum =  process.argv.at(2);
if(isNaN(portNum)){
    console.log("You must put in a port number.");
    process.exit(0);
}

//Prepare the database
const { MongoClient, ServerApiVersion } = require('mongodb');
const { render } = require("ejs");
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const uri = `mongodb+srv://${userName}:${password}@cluster0.4ymuutq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, 
    { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function initiateClient() {

    try {
        await client.connect();
    } catch (e) {
        console.error(e);
    } finally {
    }

}
initiateClient().catch(console.error);

async function addArticle(cl, d, article){

    let result = await lookupArticle(client, databaseAndCollection, article.title);
    //console.log("the result value is.... " + result);
    if(result === false){

        //console.log("adding to database");
        const result = 
    await cl.db(d.db).collection(d.collection).insertOne(article);
    
    }
}

async function getArticles(cl,d){
    let filter = {};
    const cursor = await cl.db(d.db).collection(d.collection).find(filter);
    const result = cursor.toArray();
    //console.log(result);
    return result;
}

async function lookupArticle (cl, d, title) {

    let filter2 = {title: title};
    const result = await cl.db(d.db).collection(d.collection).findOne(filter2);
    //console.log("showing the result " +result);
    if(result === null){
        //console.log("returning falsy.");
        return false;
    }
    else if(result.title === null){
        //console.log("returning falsy...")
        return false;
    }
    return true;

}



app.set("views", pathApp.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(__dirname + '/public')); //to let ejs files use css files in public folder.

app.get("/", (request, response)=> {
    response.render("index");
});

app.post("/currentHeadlines", async (req, resp) => {
    let {keyWord} = req.body;
    let url = `https://newsapi.org/v2/everything?q=${keyWord}&apiKey=${apiKey}`
    let renderVars = {
        resultList: ""
    }

    let result = await fetch(url);
    let JSON = await result.json();
    let articlesToDisplay = "";
    //console.log(JSON);
    articleArray = JSON.articles;
    articleArray.length = 5;
    
    articleArray.forEach(async (curr) => {

        let currTitle = curr.title;
        let currUrl = curr.url;
        let currArticle = {title: currTitle, url: currUrl};
        articlesToDisplay += `<a href = ${currUrl} target = "blank">${currTitle}</a><br><br>`
        await addArticle(client, databaseAndCollection, currArticle);
    });

    renderVars.resultList = articlesToDisplay;

    resp.render("currentHeadlines", renderVars);

});

app.get("/pastHeadlines", async (req, resp) => {


    resultArray = await getArticles(client, databaseAndCollection);
    let renderVars = {
        history: "No Links Displayed."
    };
    let allArticles = "";
    resultArray.forEach(curr => {
        let currUrl = curr.url;
        let currTitle = curr.title;
        allArticles += `<a href = ${currUrl} target = "blank">${currTitle}</a><br><br>`

    });

    if(allArticles.length != 0){
        renderVars.history = allArticles;
    }

    resp.render("pastHeadlines", renderVars);

});

app.post("/pastHeadlines", async (req, resp) => {

    let renderVars = {
        history: "No Links Displayed."
    };

    const result = await client.db(databaseAndCollection.db).
    collection(databaseAndCollection.collection).deleteMany({});

    resp.render("pastHeadlines", renderVars);






});

app.listen(portNum);
console.log("Web server started and running at http://localhost:" + portNum);
process.stdin.setEncoding("utf8");
process.stdout.write("Stop to shutdown the server: ");
process.stdin.on('readable', async () => {  /* on is like the addEventListener */
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();

        if (command === "stop" || command === "Stop") {
            process.stdout.write("Shutting down the server");
            await client.close();
            process.exit(0);
        } 
    
    
        process.stdin.resume();
    }
})    




