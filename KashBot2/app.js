/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');

var Client = require('coinbase').Client;
var cbClient = new Client({
  'apiKey': 'tVjOciCzNUr2DZly',
  'apiSecret': 'iA89VSplTj7LChsP8cfOGsGl5DEKiCi2',
  'version':'2017-09-16'
});

var xecdApiClient = require('@xe/xecd-rates-client')

var xecdConfig = {
  username: 'kashbot100261902',
  password: '4jh97ep2863amuek9e926jndn1',
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
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
bot.dialog('/', intents);   
intents.matches('Send', function(session, args, next) {
    var name = builder.EntityRecognizer.findEntity(args.entities, 'recipient').entity;
    var amount = builder.EntityRecognizer.findEntity(args.entities, 'amount').entity;
    var primaryAccount;
    
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
                    'to': "kallentu@hotmail.ca",
                    'amount': '0.0002',
                    'currency': "BTC",
                }, function(error, tx) {
                   if (!error) {
                       session.send("Ok, I'm sending " + truncatedAmount + " BTC to " + name);
                       session.send("Transaction successful!");
                   } else {
                       session.send("Something went wrong :(");
                       session.send("Please try again later.");
                   }
                });
         });
        }, "CAD", "XBT", amount);
    });
    
})

intents.matches('Balance', function(session) {
    cbClient.getAccounts({}, function(err, accounts) {
        accounts.forEach(function(acct) {
            if (acct.balance.currency == "BTC" && acct.name == "BTC Wallet") {
                session.send(acct.name + ': ' + acct.balance.amount + ' ' + acct.balance.currency);
            }
        });
    });
})

intents.matches('Rate', function(session) {
    xeClient.convertFrom(function(err,data){
        session.send("1 CAD = " + data.to[0].mid + " BTC");
    }, "CAD", "XBT");
})

intents.matches('Help', function(session) {
    session.send("Here's what I can do:");
    session.send("Send money to someone by telling me the name and amount");
    session.send("Tell you the current exchange rate");
    session.send("Tell you your Coinbase balance");
})

intents.matches('Hi', function (session) {
    session.send("Hey! I'm your KashBot teller. How can I help you today?");
})

intents.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});