const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("../utils/validator");
const aws_config = require("../utils/aws-config");
const userModel = require("../model/userModel");
const saltRounds = 10;

/************************************************CREATE USER API*******************************************/

const registerUser = async (req, res) => {
  try {
    let files = req.files;
    let data = req.body;

    // VALIDATIONS STARTS
    if (!validator.isValidRequest(data)) return res.status(400).send({ status: false, message: "Body can not be empty" });

    let { fname, lname, email, profileImage, phone, password, address } = data;

    if (!validator.isValidValue(fname)) return res.status(400).send({ status: false, message: "Fname is required" });

    if (!validator.isValidName(fname)) return res.status(400).send({status: false,message:"Fname may contain only letters. Digits & Spaces are not allowed "});

    if (!validator.isValidValue(lname)) return res.status(400).send({ status: false, message: "Lname is required" });

    if (!validator.isValidName(lname)) return res.status(400).send({status: false,message:"Lname may contain only letters. Digits & Spaces are not allowed"});

    if (!validator.isValidValue(email)) return res.status(400).send({ status: false, message: "Email is required" });

    if (!validator.isValidEmail(email)) return res.status(400).send({ status: false, message: "Entered email is invalid" });

    let emailExist = await userModel.findOne({ email });
    if (emailExist) return res.status(400).send({ status: false, message: "This email already exists" });

    if (!validator.isValidValue(phone)) return res.status(400).send({ status: false, message: "Phone is required" });

    if (!validator.isValidPhone(phone)) return res.status(400).send({ status: false, message: "Entered phone number is invalid" });

    let phoneExist = await userModel.findOne({ phone });
    if (phoneExist) return res.status(400).send({ status: false, message: "Phone number already exists" });

    if (!validator.isValidValue(password)) {
      return res.status(400).send({ status: false, message: "password is required" });
    }

    if (password.length < 8 || password.length > 15) return res.status(400).send({status: false, message: "password length should be between 8 to 15"});
    data.password = await bcrypt.hash(password, saltRounds);

    //ADDRESS VALIDATION
    if (!data.address || !isNaN(data.address)) return res.status(400).send({ status: false, message: "Valid address is required" });
    address = JSON.parse(data.address);

    if (!address.shipping || !address.billing) return res.status(400).send({status: false,message: "shipping and billing address required"});

    if (!address.shipping.street || !address.billing.street) return res.status(400).send({ status: false, message: "street is  required " });
  
    if (!address.shipping.city || !address.billing.city) return res.status(400).send({ status: false, message: "city is  required" });

    if (!address.shipping.pincode || !address.billing.pincode) return res.status(400).send({ status: false, message: "pincode is  required " });

    let Sstreet = address.shipping.street;
    let Scity = address.shipping.city;
    let Spincode = parseInt(address.shipping.pincode); //shipping
    if (Sstreet) {
      let validateStreet = /^[a-zA-Z0-9]/;
      if (!validateStreet.test(Sstreet)) {
        return res.status(400).send({status: false,message: "enter valid street name in shipping",});
      }
    }
    if (Scity) {
      let validateCity = /^[a-zA-Z0-9]/;
      if (!validateCity.test(Scity)) {
        return res.status(400).send({status: false,message: "enter valid city name in shipping",
        });
      }
    }
    if (Spincode) {
      let validatePincode = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/; //must not start with 0,6 digits and space(optional)
      if (!validatePincode.test(Spincode)) {
        return res.status(400).send({ status: false, message: "enter valid pincode in shipping" });
      }
    }

    let Bstreet = address.billing.street;
    let Bcity = address.billing.city;
    let Bpincode = parseInt(address.billing.pincode); //billing
    if (Bstreet) {
      let validateStreet = /^[a-zA-Z0-9]/;
      if (!validateStreet.test(Bstreet)) {
        return res.status(400).send({status: false,message: "enter valid street name in shipping"});
      }
    }
    if (Bcity) {
      let validateCity = /^[a-zA-Z0-9]/;
      if (!validateCity.test(Bcity)) {
        return res.status(400).send({status: false,message: "enter valid city name in shipping"});
      }
    }
    if (Bpincode) {
      let validatePincode = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/; //must not start with 0,6 digits and space(optional)
      if (!validatePincode.test(Bpincode)) {
        return res.status(400).send({ status: false, message: "enter valid pincode in shipping" });
      }
    }

    data.address = address;

    //validation ends

    if (files.length > 0) {
      if (!validator.validFormat(files[0].originalname)) {
        return res.status(400).send({ status: false, message: "only image format is accept" });
      }
      data.profileImage = await aws_config.uploadFile(files[0]);
    } else {
      return res.status(400).send({ status: false, message: "ProfileImage File is required" });
    }
    let savedData = await userModel.create(data);
    savedData = savedData.toObject()
    delete savedData.password
    return res.status(201).send({ status: true, message: "Data created", Data: savedData });
  } 
  catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).send({ status: false, message: "Address should be in Object format" });
    } else {
      return res.status(500).send({ status: false, message: "Error occcured : " + err });
    }
  }
};




/************************************************LOGIN API**********************************************/

let login = async (req, res) => {
  try {
    let data = req.body;
    const { email, password } = data;

    if (!validator.isValidRequest(data)) return res.status(400).send({ status: false, message:"Enter email & password"});

    if (!validator.isValidValue(email)) return res.status(400).send({ status: false, messgage: "Enter Email" });
    let checkemail = await userModel.findOne({ email: email });
    if (!checkemail) return res.status(404).send({ status: false, message: "Email not found" });

    if (!validator.isValidValue(password)) return res.status(400).send({ status: false, messsge: "Enter Password"});
    // Load hash from your password DB.
    let decryptPassword = await bcrypt.compare(password, checkemail.password);
    if (!decryptPassword) return res.status(401).send({ status: false, message: "Password is not correct" });

    //GENERATE TOKEN
    let date = Date.now();
    let createTime = Math.floor(date / 1000);
    let expTime = createTime + 60*60;

    let token = jwt.sign(
      {
        userId: checkemail._id.toString(),
        iat: createTime,
        exp: expTime,
      },
      "group40"
    );

    res.setHeader("x-api-key", token);
    return res.status(200).send({status: true,message: "Login successful",data:{ userId: checkemail._id, token: token}});
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};



/************************************************GET USER API*********************************************/

const getUserDetails = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!validator.isValidObjectId(userId)) return res.status(400).send({status: false,message: "Please enter a valid User Id"});

    let profile = await userModel.findOne({ _id: userId });

    if (!profile) return res.status(404).send({status: false,message: "User Id doesn't exist.Please enter another Id"});
    profile = profile.toObject()
    delete profile.password
    return res.status(200).send({status: true,message: "User record found",data: profile});
  } catch (err) {
    return res.status(500).send({ status: false, message: "Error occcured : " + err });
  }
};



/************************************************UPDATE API*********************************************/

const updateUser = async (req, res) => {
  try {
    let userId = req.params.userId;

    if (!validator.isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Enter valid ObjectId in params" });

    const profile = await userModel.findOne({ _id: userId });

    if (!profile)
      return res.status(404).send({status: false,message: "User Id doesn't exist.Please enter another Id",});

    let data = req.body;
    let files = req.files;

    if (!validator.isValidRequest(data) && !files) return res.status(400).send({ status: false, message: "Nothing to update" });

    let { fname, lname, email, phone, password,address} = data;
    let updatedData = {};

    if (Object.keys(data).includes("profileImage")) {
      if (files.length == 0) {
        return res.status(400).send({status: false,message: "There is no file to update"});
      }
    }

    if(req.files.length){
    if (files.length > 0 &&  validator.validFormat(files[0].originalname) ) {
      let uploadFileUrl = await aws_config.uploadFile(files[0]);
      updatedData.profileImage = uploadFileUrl;
    } else {
      return res.status(400).send({ status: false, message: "Profile Image can not be updated" });
    }
  }

    if (Object.keys(data).includes("fname")) {
      if (!validator.isValidValue(fname)) {
        return res.status(400).send({ status: false, message: "Fname can not be empty" });
      }
      if (!validator.isValidName(fname)) {
        return res.status(400).send({status: false,message:"Fname may contain only letters. Digits & Spaces are not allowed"});
      }
      updatedData.fname = fname;
    }

    if (Object.keys(data).includes("lname")) {
      if (!validator.isValidValue(lname)) {
        return res.status(400).send({ status: false, message: "Lname can not be empty" });
      }
      if (!validator.isValidName(lname)) {
        return res.status(400).send({status: false,message:"Lname may contain only letters. Digits & Spaces are not allowed"});
      }
      updatedData.lname = lname;
    }

    if (Object.keys(data).includes("email")) {
      if (!validator.isValidEmail(email)) {
        return res.status(400).send({status: false,message: "Entered email is invalid or empty"});
      }
      let emailExist = await userModel.findOne({ email });
      if (emailExist) {
        return res.status(400).send({ status: false, message: "This email already exists" });
      }
      updatedData.email = email;
    }

    if (Object.keys(data).includes("phone")) {
      if (!validator.isValidPhone(phone)) {
        return res.status(400).send({status: false,message: "Entered phone number is invalid or empty"});
      }
      let phoneExist = await userModel.findOne({ phone });
      if (phoneExist) {
        return res.status(400).send({ status: false, message: "This phone number already exists" });
      }
      updatedData.phone = phone;
    }

    if (Object.keys(data).includes("password")) {
      if (!validator.isValidValue(password)) {
        return res.status(400).send({ status: false, message: "Password can not be empty" });
      }
      if (password.length < 8 || password.length > 15) {
        return res.status(400).send({status: false,message: "password length should be between 8 to 15"});
      }
      password = await bcrypt.hash(password, saltRounds);
      updatedData.password = password;
    }

    let validateStreet = /^[a-zA-Z0-9]/;
    let validateCity = /^[a-zA-Z0-9]/;
    let validatePincode = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/;

    if (Object.keys(data).includes("address")) {
      let addr = JSON.parse(address)
     
      if (addr) {
        if (typeof addr !== "object" || Array.isArray(addr) || Object.keys(addr).length == 0)
          return res.status(400).send({ status: false, message: "Address not in Valid Object Format..." });

        if (addr.shipping) {
          const { street, city, pincode } = addr.shipping;

          if (street) {
            if (!validator.isValidValue(street) || !validateStreet.test(street))
              return res.status(400).send({ status: false, message: "Invalid shipping street" });
            profile.address.shipping.street = street;
          }

          if (city) {
            if (!validator.isValidValue(city) || !validateCity.test(city))
              return res.status(400).send({ status: false, message: "Invalid shipping city" });
            profile.address.shipping.city = city;
          }

          if (pincode) {
            if (!validator.isValidValue(pincode) || !validatePincode.test(pincode))
              return res.status(400).send({ status: false, message: "Invalid shipping pincode " });
            profile.address.shipping.pincode = pincode;
          }
        }

        
        if (addr.billing) {
          const { street, city, pincode } = addr.billing;

          if (street) {
            if (!validator.isValidValue(street) || !validateStreet.test(street))
              return res.status(400).send({ status: false, message: "Invalid billing street" });
            profile.address.billing.street = street;
          }

          if (city) {
            if (!validator.isValidValue(city) || !validateCity.test(city))
              return res.status(400).send({ status: false, message: "Invalid billing city" });
            profile.address.billing.city = city;
          }

          if (pincode) {
            if (!validator.isValidValue(pincode) || !validatePincode.test(pincode))
              return res.status(400).send({ status: false, message: "Invalid billing pincode" });
            profile.address.billing.pincode = pincode;
          }
        }
        updatedData["address"] = profile.address;
      }
    }
   

    let modifiedData = await userModel.findByIdAndUpdate({ _id: userId },updatedData,{ new: true, upsert: true });
    modifiedData = modifiedData.toObject()
    delete modifiedData.password

    return res.status(200).send({status: true,message: "User profile updated",Data: modifiedData});
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).send({status: false,message: "Address is not in valid Object format "});
    }
    res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = { registerUser, login, getUserDetails, updateUser };
