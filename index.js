const express = require('express')
const app = express()
const port = 8080
var cors = require('cors')
var crypto = require('crypto');
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())

const { Universal, Node, MemoryAccount, Ae } = require('@aeternity/aepp-sdk');
const smtp = require('./smtp_module.js')
const __path = require('path');
require('dotenv').config({path:__path.resolve(__dirname, ".env")})
var fs = require('fs');

let momp_CONTRACT_SOURCE = fs.readFileSync('./contracts/merged_momp.aes', 'utf-8')

let momp_contract = null

let url = "https://testnet.aeternity.io"
let Compilerurl = "https://latest.compiler.aepps.com"

const keyPair = { // SUPER SECRET, CREATE ENV BEFORE SENDING TO GITHUB... BY JEEVANJOT
  "publicKey": process.env.OWNER_PUBLIC_KEY,
  "secretKey": process.env.OWNER_PRIVATE_KEY
}

var client_node = null
async function initNode () {
  client_node = await Universal({
    nodes: [
      {
        name: 'node',
        instance: await Node({
          url: url,
          internalUrl: url,
        }),
      }],
    accounts: [MemoryAccount({ keypair: keyPair })],
    compilerUrl: Compilerurl
  });


  momp_contract = await client_node.getContractInstance(momp_CONTRACT_SOURCE, { contractAddress: process.env.MOMP_ADDRESS });



}
initNode()



app.post('/register', async (req, res) => {

  console.log("Registration ----------------------------")

  console.log("Email:- " + req.body.user_email)
  console.log("Public Key:- " + req.body.public_key)


  function get_sha256 (val) {
    return crypto.createHash('sha256').update(val).digest('hex')
  }
  function get_sha256_in_bytes (data, upper) {
    if (upper) {
      var hash = crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
    } else {
      var hash = crypto.createHash('sha256').update(data).digest('hex');
    }
    // console.log("Hashed data: " + hash)

    _hashed_data_in_bytes = []
    for (let index = 0; index < 64; index = index + 2) {
      if (hash[index] == undefined) {
        _hashed_data_in_bytes.push("0x" + 00)
        continue
      }
      const element = hash[index].toString(16);
      const element2 = hash[index + 1].toString(16);
      _hashed_data_in_bytes.push("0x" + element + element2)
    }
    // console.log("Hased data in Bytes(32) : " + _hashed_data_in_bytes)
    return _hashed_data_in_bytes
  }



  var fees_status = null
  try {
    console.log("Checking fee status.")
    fees_status = await momp_contract.methods.get_registration_fee_paid_or_not(get_sha256_in_bytes(req.body.user_email))
  } catch (e) {
    console.log (e)
    res.send("r0009: Contract call failed")
    return
  }
  
  console.log("Fee paid by " + req.body.user_email + " : ")
  console.log(fees_status.decodedResult)

  let otp_original = crypto.randomBytes(4).toString("hex");
  let created_otp = get_sha256_in_bytes(get_sha256("jeevanjotsingh@yandex.com").toUpperCase() + otp_original + this.public_key)
  console.log("Otp created in bytes: " + created_otp)

  // Register account ...
  console.log("Account registration with:-")
  console.log("Otp original:- " + created_otp)
  console.log("Otp plain:- " + created_otp)
  
  try {
    console.log("Registering account.")
    var register_account = await momp_contract.methods.add_email(get_sha256_in_bytes(req.body.user_email), req.body.public_key, created_otp)
    console.log(register_account.decodedResult)
  } catch (e) {
    console.log(e)
    res.send("w0001: Error in register transaction")
    return
  }

  var __public_key = req.body.public_key
  // try {
  //   console.log("Getting client public key.")

  //   try {
  //     console.log("Getting client public key from new state.")
  //     __public_key = await momp_contract.methods.clients_new_pub_key(get_sha256_in_bytes(req.body.user_email))
  //   } catch (e) {
  //     console.log("Getting client public key from stable state.")
  //     console.log(e)
  //     __public_key = await momp_contract.methods.clients_pub_key(get_sha256_in_bytes(req.body.user_email))
  //   }
  // } catch (e) {
  //   console.log (e)
  //   res.send("r0010: Contract call failed")
  //   return
  // }
  let args = [
    'MOMP Network',
    req.body.user_email,
    "About added, your original OTP"
  ]
  try {
    console.log("Sending Email...")
    // result = "myResultByJeevanjot"
    result = await smtp.main({ _sender: args[0], _to: args[1], _subject: args[2] }, __public_key, otp_original)
  } catch (e) {
    console.log(e)
    result = "error: Wrong values!"
  }
  console.log("---------------------------- Registration")
  try {
    console.log("Set Registration fee to false, asnwer: ")
    let fees_paid = await momp_contract.methods.registration_fee_used(get_sha256_in_bytes(req.body.user_email))
    console.log(fees_paid.decodedResult)
  } catch (e) {
    console.log(e)
  }
  res.send(result)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})