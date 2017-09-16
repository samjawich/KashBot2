/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');

var Client = require('coinbase').Client;
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
    session.send(name);
    
    xeClient.convertFrom(function(err,data){
        session.send("Sending " + data.to[0].mid + " BTC to " + name);
    }, "CAD", "XBT", amount);
    
    //Check firebase database to see if that name exists.
    //  if it does, get the wallet ID and send.
    //  if not
        //Ask for wallet ID
        //Make new DB record 
        //Send money
    
    //session.send(session);
})

intents.matches('Rate', function(session) {
    xeClient.convertFrom(function(err,data){
        session.send("1 CAD = " + data.to[0].mid + " BTC");
    }, "CAD", "XBT");
})

intents.matches('Hi', function (session) {
    session.send("Hey! I'm your KashBot teller. How can I help you today?");
})

intents.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

 

