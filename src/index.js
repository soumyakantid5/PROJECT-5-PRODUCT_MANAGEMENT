const express=require("express");
const mongoose=require("mongoose");
const multer=require('multer')
//const aws = require('aws-sdk')
const route=require("./route/route");

const app=express();

app.use(express.json())
app.use(multer().any())

mongoose.connect("mongodb+srv://soumya-db:afdbyZgt3CyQporD@cluster0.gvqtfzu.mongodb.net/Project5_Shopping-Cart",
                {useNewUrlParser:true})

.then(()=>console.log("MongooDB Connected ✔✅✔"))
.catch((error)=>console.log(error))

app.use('/',route)


app.listen(3000, function(){
    console.log("Express app running on Port 3000")
})