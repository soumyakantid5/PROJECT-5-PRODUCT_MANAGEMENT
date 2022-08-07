const aws_config = require("../utils/aws-config");
const validator = require("../utils/validator");
const productModel = require("../model/productModel");



/**********************************************GET PRODUCT BY ID API*******************************************/

const createProduct = async (req, res) => {
  try {
    let files = req.files;
    let data = req.body;

    if (!validator.isValidRequest(data)) {
      return res
        .status(400)
        .send({ status: false, message: "Body can not be empty" });
    }
    let {
      title,
      description,
      price,
      currencyId,
      currencyFormat,
      isFreeShipping,
      style,
      productImage,
      availableSizes,
      installments,
    } = data;

    if (!validator.isValidValue(title)) {
      return res
        .status(400)
        .send({ status: false, message: "title is required" });
    }

    if (validator.isValidNumber(title)) {
      return res
        .status(400)
        .send({ status: false, message: "title must contain letters" });
    }
    const isDuplicate = await productModel.find({ title });

    if (isDuplicate.length > 0) {
      return res.status(400).send({
        status: false,
        message: "This title is already present ",
      });
    }

    if (!validator.isValidValue(description)) {
      return res
        .status(400)
        .send({ status: false, message: "description is required" });
    }

    if(!isNaN(description)) {
      return res.status(400).send({status: false, message: "The description must not contain only numbers"})
    }


    
    if (!validator.isValidNumber(price) || price < 0) {
      return res.status(400).send({
        status: false,
        message: "price is required & its value should be more than Zero",
      });
    }
    
    if (Object.keys(data).includes("currencyId")) {
      if (!validator.isValidValue(currencyId)) {
        return res
          .status(400)
          .send({ status: false, message: "currencyId is required" });
      }
      if (currencyId !== "INR") {
        return res
          .status(400)
          .send({ status: false, message: "currencyId must be INR" });
      }
  }
  else
    data.currencyId = "INR"


    if (currencyFormat) {
      if (currencyFormat !== "₹") {
        return res
          .status(400)
          .send({ status: false, message: "currencyFormat must be ₹ " });
      }
    }
    else
    data.currencyFormat = "₹"
    

    if (files.length > 0) {
      data.productImage = await aws_config.uploadFile(files[0]);
    } else {
      return res
        .status(400)
        .send({ status: false, message: "ProductImage File is required" });
    }

    if (Object.keys(data).includes("style")) {
      if (!validator.isValidValue(style)) {
        return res
          .status(400)
          .send({ status: false, message: "Style can not be empty" });
      }
    }

    if (Object.keys(data).includes("isFreeShipping")) {
      if (data.isFreeShipping !== "true" && data.isFreeShipping !== "false") {
        return res.status(400).send({
          status: false,
          message: "Not a valid value. isFreeShipping must be a boolean value",
        });
      }
    }

    if (Object.keys(data).includes("installments")) {
      if (!validator.isValidNumber(installments) || installments<0) {
        return res.status(400).send({
          status: false,
          message: "installments must be a valid number",
        });
      }
    }

    if (!validator.isValidValue(availableSizes)) {
      return res
        .status(400)
        .send({ status: false, message: "availableSizes is required" });
    }

    if (availableSizes) {
      let sizesArray = availableSizes.split(",").map(x=>x.toUpperCase()).map((x) => x.trim());

      for (let i = 0; i < sizesArray.length; i++) {
        if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizesArray[i])) {
          return res.status(400).send({
            status: false,
            message:
              "AvailableSizes should be among ['S','XS','M','X','L','XXL','XL']",
          });
        }
      }

      if (Array.isArray(sizesArray)) {
        data["availableSizes"] = [...new Set(sizesArray)];
      }
    }

    let savedData = await productModel.create(data);
    return res
      .status(201)
      .send({ status: true, message: "Data created", Data: savedData });
  } catch (err) {
    return res
      .status(500)
      .send({ status: false, message: "Error occcured : " + err });
  }
};




/**********************************************GET PRODUCT BY ID API*******************************************/

const getProductById = async (req, res) => {
  try {
    let productId = req.params.productId;

    if (!validator.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "Invalid Product Id" });
    }

    let productData = await productModel.findOne({ _id: productId });

    if (!productData) {
      return res
        .status(404)
        .send({ status: false, message: "No product found " });
    }

    return res
      .status(200)
      .send({ status: true, message: "Product details", data: productData });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

/**********************************************GET PRODUCT BY FILTERS API*******************************************/

const getProductsByFilters = async (req, res) => {
  try {
    let data = req.query;
    let { size, title, priceGreaterThan, priceLessThan, priceSort } = data;
    const filterData = { isDeleted: false };


    if (size) {
      let allowedSizes = ["S", "XS", "M", "X", "L", "XXL", "XL"];

      if (!validator.isValidValue(size)) {
        return res
          .status(400)
          .send({ status: false, message: "Enter a valid size" });
      }

      size = size.toUpperCase();

      let check = true;
      let sizes = size
        .trim()
        .split(",")
        .map((e) => e.trim());

      sizes.map((e) => {
        if (!allowedSizes.includes(e)) return (check = false);
      });
      if (!check)
        return res.status(400).send({
          status: false,
          message: "Sizes can only be S, XS, M, X, L, XL, XXL",
        });

      filterData.availableSizes = { $in: sizes };
    }



    if (data.hasOwnProperty("title")) {
      if (!validator.isValidValue(title)) {
        return res
          .status(400)
          .send({ status: false, message: "Enter a valid title" });
      } else {
        filterData.title = title;
      }
    }

    if (data.hasOwnProperty("priceGreaterThan")) {
      if (Number(priceGreaterThan) == NaN) {
        return res.status(400).send({
          status: false,
          message: "priceGreaterThan should be a valid Number ",
        });
      }

      if (priceGreaterThan <= 0) {
        return res.status(400).send({
          status: false,
          message: "priceGreaterThan should be a greater than Zero ",
        });
      }
      if (!filterData.hasOwnProperty("price")) {
        filterData["price"] = {};
      }
      filterData["price"]["$gte"] = Number(priceGreaterThan);
    }

    if (data.hasOwnProperty("priceLessThan")) {
      if (Number(priceLessThan) == NaN) {
        return res.status(400).send({
          status: false,
          message: "priceLessThan should be a valid Number ",
        });
      }

      if (priceLessThan <= 0) {
        return res.status(400).send({
          status: false,
          message: "priceLessThan should be a greater than Zero ",
        });
      }

      if (!filterData.hasOwnProperty("price")) {
        filterData["price"] = {};
      }
      filterData["price"]["$lte"] = Number(priceLessThan);
    }

    if (data.hasOwnProperty("priceSort")) {
      if (!(priceSort == 1 || priceSort == -1)) {
        return res
          .status(400)
          .send({ status: false, message: `priceSort should be 1 or -1 ` });
      }
    }

    let findData = await productModel
      .find(filterData)
      .sort({ price: priceSort });

    if (findData.length === 0) {
      return res
        .status(404)
        .send({ status: false, message: "No Product found" });
    }

    res.status(200).send({ status: true, Data: findData });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: false, message: error.message });
  }
};





/**********************************************UPDATE PRODUCT API*******************************************/

const updateProduct = async (req, res) => {
  try {
    let productId = req.params.productId;

    if (!validator.isValidObjectId(productId))
      return res
        .status(400)
        .send({ status: false, message: "Product Id is not a valid Id" });

    let data = req.body;
    let files = req.files;


    if (!validator.isValidRequest(data) && !req.files) {
      return res
        .status(400)
        .send({ status: false, message: "Specify Parameters to Update" });
    }


    if (Object.keys(data).includes("title")) {
      if (!validator.isValidValue(data.title)) {
        return res
          .status(400)
          .send({ status: false, message: "title can not be empty" });
      }

      if (validator.isValidNumber(data.title)) {
        return res
          .status(400)
          .send({ status: false, message: "title must contain letters" });
      }
      const isDuplicate = await productModel.findOne({ title: data.title });

      if (isDuplicate) {
        return res.status(400).send({
          status: false,
          message: "This title is already present ",
        });
      }
    }

    if (Object.keys(data).includes("description")) {
      if (!validator.isValidValue(data.description) || !isNaN(data.description)) {
        return res
          .status(400)
          .send({ status: false, message: "description is not valid" });
      }
    }

    if (Object.keys(data).includes("price")) {
      if (!validator.isValidNumber(data.price) || data.price < 0) {
        return res
          .status(400)
          .send({ status: false, message: "price is not valid" });
      }
    }

    if (Object.keys(data).includes("style")) {
      if (!validator.isValidValue(data.style) || validator.isValidNumber(data.style)) {
        return res
          .status(400)
          .send({ status: false, message: "Style is not valid" });
      }
    }

    if (Object.keys(data).includes("isFreeShipping")) {
      if (data.isFreeShipping !== "true" && data.isFreeShipping !== "false") {
        return res.status(400).send({
          status: false,
          message: "Not a valid value. isFreeShipping must be a boolean value",
        });
      }
    }


      if (Object.keys(data).includes("installments")) {
        if (!validator.isValidNumber(data.installments) || data.installments<0) {
          return res.status(400).send({
            status: false,
            message: "installments must be a valid number",
          });
        }
      }

  
      if (Object.keys(data).includes("isDeleted")) {
        if (data.isDeleted!="false") {
          return res.status(400).send({
            status: false,
            message: "isDeleted must be false",
          });
        }
      }


      if (Object.keys(data).includes("currencyFormat")) {
        if (data.currencyFormat!="INR") {
          return res.status(400).send({
            status: false,
            message: "currency Format must be INR",
          });
        }
      }
      


      if (Object.keys(data).includes("currencyId")) {
        if (data.currencyId!="₹") {
          return res.status(400).send({
            status: false,
            message: "currencyId must be ₹",
          });
        }
      }




    if (Object.keys(data).includes("availableSizes")) {
      if (!validator.isValidValue(data.availableSizes)) {
        return res.status(400).send({
          status: false,
          message: "availableSizes can not be blank",
        });
      }
    

      let sizesArray = data.availableSizes.split(",").map(x=>x.toUpperCase()).map((x) => x.trim());

      for (let i = 0; i < sizesArray.length; i++) {
        if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(sizesArray[i])) {
          return res.status(400).send({
            status: false,
            message:
              "AvailableSizes should be among ['S','XS','M','X','L','XXL','XL']",
          });
        }
      }

      if (Array.isArray(sizesArray)) {
        // delete data.availableSizes
        // data["$set"]={}
        //data["$set"]["availableSizes"] = [...new Set(sizesArray)];
        data["availableSizes"] = [...new Set(sizesArray)];
      }
    }

   

    if (Object.keys(data).includes("productImage")) {
      if (files.length == 0) {
        return res.status(400).send({
          status: false,
          message: "There is no file to update",
        });
      }
      
    }

    if(req.files.length){
      if (files.length > 0 &&  validator.validFormat(files[0].originalname) ) {
        let uploadFileUrl = await aws_config.uploadFile(files[0]);
        data["productImage"] = uploadFileUrl;
        console.log(data.productImage)
      } else {
        return res
        .status(400)
        .send({ status: false, message: "Product Image can not be updated" });
      }
    }



    let updateData = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false },data,{ new: true });

    if (!updateData)
      return res
        .status(404)
        .send({ status: false, message: "product not found" });

    return res
      .status(200)
      .send({ status: true, message: "product is updated", data: updateData });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};






/**********************************************DELETE PRODUCT API*******************************************/

const deleteByProductId = async (req, res) => {
  try {
    let productId = req.params.productId;
    if (!validator.isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "Product Id is not valid" });
    }

    let deleteProduct = await productModel.findOneAndUpdate(
      { _id: productId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: Date.now() } }
    );
    if (!deleteProduct)
      return res.status(404).send({
        status: false,
        message: `No product with id ${productId} found`,
      });

    res
      .status(200)
      .send({ status: true, message: "Product deleted successfully." });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};


module.exports = {
  createProduct,
  getProductsByFilters,
  getProductById,
  updateProduct,
  deleteByProductId,
};
