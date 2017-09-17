/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework.
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var config = {
  apiKey: "",
  authDomain: "",
  databaseURL: "https://htnBot.firebaseio.com",
  storageBucket: "gs://htnbot.appspot.com",
};
var Client = require('coinbase').Client;
var cbClient = new Client({
  'apiKey': '',
  'apiSecret': '',
  'version':'2017-09-16'
});
var firebase = require("firebase");
firebase.initializeApp(config);

var xecdApiClient = require('@xe/xecd-rates-client')

var xecdConfig = {
  username: '',
  password: '',
  apiUrl: 'https://xecdapi.xe.com/v1/'
};

var xeClient = new xecdApiClient.XECD(xecdConfig);

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', intents); 


intents.matches('Send', function(session, args, next) {
    var name = builder.EntityRecognizer.findEntity(args.entities, 'recipient').entity;
    var amount = builder.EntityRecognizer.findEntity(args.entities, 'amount').entity;
    session.send(name);
    session.send(amount);
    return;
    var primaryAccount;
    var email;
    function getwallet(name) {
     var database = firebase.database();
     firebase.database().ref('/users/'+name).once('value').then(function(snapshot) {
     if (snapshot.val()!==null) {
        email=snapshot.val().wallet;
        cbClient.getAccounts({}, function(err, accounts) {
            accounts.forEach(function(acct) {
                if (acct.name == "BTC Wallet") {
                    primaryAccount = acct;
                }
        });

        xeClient.convertFrom(function(err,data) {
            var truncatedAmount = Math.floor(data.to[0].mid * 100000000) / 100000000;
            primaryAccount.createAddress(null, function(err, address) {
                primaryAccount.sendMoney({
                    'to': email,
                    'amount': truncatedAmount,
                    'currency': "BTC",
                }, function(error, tx) {
                   if (!error) {
                       session.send("Ok, I'm sending " + truncatedAmount + " BTC to " + name);
                       session.send("Transaction successful!");
                   } else {
                       session.send("Something went wrong :(");
                       session.send("Please try again later.");
                       session.send(error);
                   }
                });
         });
        }, "CAD", "XBT", amount);
    });
     }else{
       session.send("I don't have that person in my records. Can you tell me their email?");
       //send the name entered by user in an array
       function writeUserData(name) {
          firebase.database().ref('raw/').set({
           data: name
            });
        }
        writeUserData(name);
     }
     });

    }
    getwallet(name);
   
})

// email intent
intents.matches('Mail', function(session, args) {

 var mail = args.entities[0].entity; 
    function getStoredName() {
      firebase.database().ref('/raw').once('value').then(function(snapshot) {
        if (snapshot.val() && snapshot.val().data) {
           var  nameToBeRegistered=snapshot.val().data;
        //send the new user
         function newuser(nameToBeRegistered,mail) {
          firebase.database().ref('users/' + nameToBeRegistered).set({
            name: nameToBeRegistered,
             wallet: mail
           });
        }

        newuser(nameToBeRegistered,mail) ;
        session.send('Thanks! You can transfer to that contact now.');
        }else{
            session.send('error');
        }
      });
    }
getStoredName();
});


// intents.matches('Email', function(session) {
//     writeUserData(name, email);
// });

// Writes into the FireBase DB
// function writeUserData(name, email) {
//   firebase.database().set({
//     username: name,
//     email: email,
//   });
// }

intents.matches('Balance', function(session) {
    cbClient.getAccounts({}, function(err, accounts) {
        accounts.forEach(function(acct) {
            if (acct.balance.currency == "BTC" && acct.name == "BTC Wallet") {
                session.send(acct.name + ': ' + acct.balance.amount + ' ' + acct.balance.currency);
            }
        });
    });
});

intents.matches('Rate', function(session) {
    xeClient.convertFrom(function(err,data){
        session.send("1 CAD = " + data.to[0].mid + " BTC");
    }, "CAD", "XBT");
});

intents.matches('Help', function(session) {
    session.send("Here's what I can do:");
    session.send("I can send BTC to someone if you tell me their name and the amount you're sending.");
    session.send("I can also tell you the exchange rate of BTC.");
    session.send("As well, I can tell you your current balance.");
    session.send("And lastly, if you want to know more about Bitcoins, I can tell you about it.");
});

intents.matches('Info', function (session) {
        session.send("So, you wanted to learn more about Bitcoin?");
        session.send("Bitcoin is a digital and global currency. It allows people to send or receive money across the internet, even to people they don't know.");
        session.send("The mathematical field of cryptography is the basis behind Bitcoins security.");
        session.send("There are no physical pieces of Bitcoin, transfers with Bitcoin is documented by a receipt-type of address and a private key.");
});

intents.matches('Bye', function(session) {
    var goodbyes = [
        "See ya later!",
        "Come back soon!",
        "Have a good day!",
        "Take care!",
        "Bye!",
        "So long!"        
     ];
    
    session.send(goodbyes[Math.floor(Math.random() * goodbyes.length)]);
});

intents.matches('Hi', function (session) {
    session.send("Hey, I'm KashBot! Your Bitcoin teller. How can I help you today? Type 'Help' for options.");
});

intents.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'. Can you try again?', session.message.text);
});