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

const momp_CONTRACT_SOURCE = contractUtils.getContractContent('./contracts/merged_momp.aes');
let momp_contract = null

const keyPair = { // SUPER SECRET, CREATE ENV BEFORE SENDING TO GITHUB... BY JEEVANJOT
  "publicKey": process.env.OWNER_PUBLIC_KEY,
  "secretKey": process.env.OWNER_PRIVATE_KEY
}

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

  momp_contract = await client.getContractInstance(momp_CONTRACT_SOURCE, { contractAddress: "ct_2Wjd1vVHYLzJdU3UiBcogpb7vCUryrCPqmQy2Dn94g8kHBer7L" });


}
initNode()



app.post('/register', async (req, res) => {

  console.log("Registration ----------------------------")
  var fees_status = await momp_contract.methods.get_registration_fee_paid_or_not(get_sha256_in_bytes(req.body.user_email))
  
  console.log("Fee paid by " + req.body.user_email + " : ")
  console.log(fees_status.decodedResult)

  if(!fees_status.decodedResult) {
    res.send("ba0001: Register fees not paid!")
    return
  }

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

  let otp_original = crypto.randomBytes(4).toString("hex");
  let created_otp = get_sha256_in_bytes(get_sha256("jeevanjotsingh@yandex.com").toUpperCase() + otp_original + second_user)
  console.log("Otp created in bytes: " + created_otp)

  // Register account ...
  console.log("Account registration:-------")
  console.log("Email:- " + req.body.user_email)
  console.log("Public Key:- " + req.body.public_key)
  console.log("Otp original:- " + created_otp)
  console.log("Otp plain:- " + created_otp)
  
  try {
    var register_account = await momp_contract.methods.add_email(get_sha256_in_bytes(req.body.user_email), req.body.public_key, created_otp)
    console.log(register_account.decodedResult)
  } catch (e) {
    console.log(e)
    res.send("ba0010: " + "Error in register transaction")
    return
  }
  let args = [
    'MOMP Network',
    req.body.user_email,
    "About added, your original OTP",
    `
    <h1 class="code-line" data-line-start=0 data-line-end=1 ><a id="Your_account_is_added_into_the_blockchain_0"></a>Your account is added into the blockchain!</h1>
    <p class="has-line-data" data-line-start="2" data-line-end="3">Your account is added into the blockchain network. You need to verify your account to withdraw any existing asset from smart contract under your email or to use it further. To verify account use this OTP : <b>${otp_original}</b> at the website’s confirmation step.</p>
    <blockquote>
    <p class="has-line-data" data-line-start="4" data-line-end="5">This OTP will never expire for this account, You can verify this OTP at any time using MOMP website.</p>
    </blockquote>
    `
  ]
  try {
    // result = "myResultByJeevanjot"
    result = await smtp.main({ _sender: args[0], _to: args[1], _subject: args[2] }, __public_key, otp_original)
  } catch (e) {
    console.log(e)
    result = "error: Wrong values!"
  }
  console.log("---------------------------- Registration")
  res.send(req.body)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})