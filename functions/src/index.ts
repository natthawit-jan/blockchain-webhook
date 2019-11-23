import * as functions from "firebase-functions";
import * as request from "request-promise-native";
import * as crypto from "crypto";
const Web3 = require("web3");
const TruffleContract = require("truffle-contract");
const HDWalletProvider = require("@truffle/hdwallet-provider");
const userJson = require("../abi.json");

console.log(userJson);
// 1. Copy your Channel Secret from LINE Developers Console then paste is as a value
const LINE_CHANNEL_SECRET = "ea2b442c9ea05d00a23a68c4e6f645f8";
// 2. Copy your Agent ID from dialogflow then paste is as a value
var web3;
var userContract;
if (!web3) {
  const provider = new HDWalletProvider(
    "device kid mountain library glimpse night coast agree coral exercise tuna coach",
    "https://rinkeby.infura.io/v3/6866ab47e3904ee18ddc89b3dee5cb0d"
  );
  web3 = new Web3(provider);
  console.log(web3);
  userContract = TruffleContract(userJson);
  userContract.setProvider(provider);
}

const dialogflowWebHook =
  "https://bots.dialogflow.com/line/623fc13c-919c-4ae8-8404-6077291b3856/webhook";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/reply";
// create signature from body
const signature = (body: any) =>
  crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64")
    .toString();

const postRequestToDialogflow = (req: functions.https.Request) => {
  req.headers["x-line-signature"] = signature(JSON.stringify(req.body));
  req.headers.host = "bots.dialogflow.com";
  console.log("header", req.headers);
  return request.post({
    uri: dialogflowWebHook,
    headers: req.headers,
    body: JSON.stringify(req.body)
  });
};

const handleLocation = (req: functions.https.Request) => {
  const { latitude, longitude, address } = req.body.events[0].message;
  const headers = {
    "Content-Type": "application/json",
    Authorization:
      "Bearer hwM3ymw21vj2lhcWZhjvxWtN3XizPUctMfdh1tx8RrY5yhL5AYZMLR3dfNBa2RyFIEWmyxToyGXoOoEUwEcaNBjZZvD2eemiFYIcLCRCmRb9ERVhAWa1Olpydc4PGXstmwYBRYUSOOaroHX8VpTTVAdB04t89/1O/w1cDnyilFU="
  };

  var options = {
    method: "GET",
    url: "https://community-open-weather-map.p.rapidapi.com/weather",
    qs: {
      lat: latitude,
      lon: longitude,
      q: "Bangkok"
    },
    headers: {
      "x-rapidapi-host": "community-open-weather-map.p.rapidapi.com",
      "x-rapidapi-key": "2b271da1dbmsh95e03982464d41bp11bfdfjsnbcd35be6c3e8"
    }
  };

  return request(options)
    .then(response => {
      const jsonResponse = JSON.parse(response);
      const { temp } = jsonResponse.main;
      const celsius = temp - 273.2;
      return request.post({
        uri: LINE_MESSAGING_API,
        headers,
        body: JSON.stringify({
          replyToken: req.body.events[0].replyToken,
          messages: [
            {
              type: "flex",
              altText: "Your location Temperature",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: `In ${address}`
                    },
                    {
                      type: "text",
                      text: `The temperature now is`
                    },
                    {
                      type: "text",
                      text: `${celsius} celsius`,
                      size: "xl",
                      weight: "bold"
                    }
                  ]
                }
              }
            }
          ]
        })
      });
    })
    .then(result => {
      console.log("result", result);
    })
    .catch(err => {
      console.log(err);
    });
};

exports.LineAdapter = functions.https.onRequest((req, res) => {
  if (req.method === "POST") {
    let event = req.body.events[0];
    if (event.type === "message" && event.message.type === "text") {
      return postRequestToDialogflow(req)
        .then(result => {
          console.log(result);
          return res.status(200).send(req.method);
        })
        .catch(error => {
          console.error(error);
          return res.status(200).send(req.method);
        });
    } else if (event.type === "message" && event.message.type === "location") {
      return handleLocation(req)
        .then(result => {
          console.log(result);
          return res.status(200).send(req.method);
        })
        .catch(err => {
          console.log(err);
          return res.status(200).send(req.method);
        });
    } else {
      return reply(req)
        .then(result => {
          console.log(result);
          return res.status(200).send(req.method);
        })
        .catch(error => {
          console.error(error);
          return res.status(200).send(req.method);
        });
    }
  }
  return res.status(200).send(req.method);
});

const reply = (req: functions.https.Request) => {
  const headers = {
    "Content-Type": "application/json",
    Authorization:
      "Bearer hwM3ymw21vj2lhcWZhjvxWtN3XizPUctMfdh1tx8RrY5yhL5AYZMLR3dfNBa2RyFIEWmyxToyGXoOoEUwEcaNBjZZvD2eemiFYIcLCRCmRb9ERVhAWa1Olpydc4PGXstmwYBRYUSOOaroHX8VpTTVAdB04t89/1O/w1cDnyilFU="
  };

  console.log("reply header", headers);
  return request.post({
    uri: LINE_MESSAGING_API,
    headers,
    body: JSON.stringify({
      replyToken: req.body.events[0].replyToken,
      messages: [
        {
          type: "text",
          text: JSON.stringify(req.body)
        }
      ]
    })
  });
};
