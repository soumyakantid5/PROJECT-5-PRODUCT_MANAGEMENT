const mongoose = require('mongoose')

//request body validation
const isValidRequest = (value) => Object.keys(value).length > 0;

//value validation
const isValidValue = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  if (typeof value === "number") return false;
  return true;
};
const isValidNumber = function (value) {
  if (Number(value) && value!== NaN) return true;
  return false;
};

const isValidObjectId = function(value){
  return mongoose.isValidObjectId(value)
}


const isValidName = function(value){
  return /^\w[a-zA-Z]*$/.test(value)
}

const isValidEmail = function(value){
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value)
}

const isValidPhone = function(value){
  return /^[6-9]\d{9}$/.test(value)
}


const validFormat = function(value){
  return /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(value)
}

const validStatus = function(value){
  return ["pending", "completed", "cancelled"].indexOf(value) !== -1;
}


module.exports={isValidRequest, isValidValue ,isValidNumber , isValidObjectId, isValidName, isValidEmail, isValidPhone, validFormat,validStatus}