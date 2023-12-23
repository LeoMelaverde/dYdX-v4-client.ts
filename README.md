# <p align="center">dYdX-V4 Client</p>
<p align="center">
  <img src="images/mv.jpeg" width="650" height="140"  alt=""/>
</p>

## Table of Contents
- [Prerequisites](#Prerequisites)
- [Setup](#Setup)
- [Custom Websocket Client](#custom-websocket-client)
- [Markets Stream](#markets-stream)
- [Orderbook Stream](#orderbook-stream)
- [Account Stream](#account-stream)
    - [Orders](#1-orders)
    - [Fills](#2-fills)
    - [Perpetual Position](#3-perpetual-positions)
    - [Asset Position](#4-asset-positions)
- [Order Client](#order-client)
- [Building a Main File](#building-a-main-file)

## Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) version 20.9.0 or higher
- [TypeScript](https://www.typescriptlang.org/) version 5.3.3 or higher
- [pnpm](https://pnpm.io/) version 8.12.0 or higher

You can check the versions of these tools on your system by running the following commands in your terminal:

```bash
node --version
tsc --version
pnpm --version
```

## Setup

To set up your development environment for this project, follow these steps:<br><br>

1. **Install Dependencies**:
   First, install the required project dependencies using `pnpm`. Run the following command in your project directory:

   ```bash
   pnpm install
   ```
   <br><br>

2. **Setup ***.env*** File**:
   Second, you will need to add your private keys to the .env file.

   We used two different wallets for our trading strategy. If you are only using one, you can leave the "_B" variables empty.

   MNEMONIC is your 24 word secret that you can find by clicking "export secret phrase" in the wallet section of your account.
   ***Make sure to NEVER share this with anyone.***

    ```.env
    MNEMONIC_A=your secret phrase here
    MNEMONIC_B=your secret phrase here
    ```

   <br><br>ADDRESS is your dYdX wallet address which you will generate after creating a dYdX account. Your address will always start
   with "dydx".

    ```.env
    ADDRESS_A=dydx...
    ADDRESS_B=dydx...
    ```

   <br><br>ACCOUNT is your dYdX wallet address follow by /(subaccount number). You subaccount number will be 0 by default.

    ```.env
    ACCOUNT_A=dydx.../0
    ACCOUNT_B=dydx.../0
    ```

   <br><br>METAMASK is your Metamask wallet address.

    ```.env
    METAMASK_A=0x...
    METAMASK_B=0x...
    ```

   <br><br>DISCORD_URL is a discord webhook URL which you can create in your own discord servers. We use this to send messages
   directly to our team discord to notify us of important logs.

   To do this for yourself, you will need to create your own discord server. Create a Channel -> Edit Channel -> Integrations -> Create Webhook.
   Copy and paste the webhook url here. If you do not want to use discord bot, you will need to remove all instances where we call
   "await sendDiscordNotification" to avoid any errors.

    ```.env
    DISCORD_URL=your-discord-url
    ```
   <br><br>

3. **Build the project**
   Open your terminal in your IDE and run:

    ```bash
    pnpm run build
    ```

   This will build all JS files in the dist/ directory.

## Custom Websocket Client
### Overview
We built a websocket client to customize error handling, reconnection logic and to be able to subscribe to multiple
streams simultaneously. You may use this instead of the SDK Client, although we set up connections using the SDK and provide an
example in dydxClient.ts
<br><br>

### Features
- **WebSocket Connection Management:** Establishes and maintains WebSocket connections, handles reconnections and disconnections.
- **Message Handling:** Processes incoming WebSocket messages and passes them to the specified callback function for further processing.
- **Error Management:** Manages errors encountered during WebSocket communication, including logging and notifying via Discord.
- **Subscription Management:** Subscribes to different data streams based on specified subscriptions.
  <br><br>

### Methods and Functionality
- **[run](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/socketHandler.ts#L261):**
  The primary method to initiate the WebSocket connection and manage data streams.
- **sendDisconnectCallback:** Returns the disconnection message.
- **handleWebsocketMessage:** Returns the websocket object to the main file.
- **onDisconnect:** Sets a callback to be invoked upon WebSocket disconnection.
  <br><br>

### Helper Functions
- **subscribeToChannels:** Subscribes to specified channels on the WebSocket.
- **startDisconnectTimer:** Sets a timer for automatic WebSocket disconnection.
- **startPingInterval:** Maintains the WebSocket connection by sending periodic ping messages.
- **'onError'**, **'onClose'**, **'clearIntervals'** and **'attemptReconnect'**: Handle various aspects of WebSocket stability and reconnection logic.
  <br><br>

```typescript
// Example usage
const subOrderbook = {
    'type': 'subscribe',
    'channel': 'v4_orderbook',
    'id': 'ETHUSD'
}

socketHandler = new SocketHandler(subscriptions, handleMessage.bind(this));
socketHandler.onDisconnect(handleDisconnect.bind(this));

async function handleMessage(obj: AllObjectTypes): Promise<void> {
    // Data handling here:
    console.log(obj)
    marketsHandler.handler(obj)
    orderbookHandler.handler(obj)
    accountHandler.handler(obj)
}

async function handleDisconnect(): Promise<void> {
    await sendDiscordNotification("Cleanup on disconnect");
    // Your cleanup logic...
    marketsHandler.cleanupMarkets();
    orderbookHandler.cleanupOb();
    accountHandlerA.cleanupAccount();
    accountHandlerB.cleanupAccount();
}

socketHandler.run()
  .then(() => console.log("WebSocket is running"))
  .catch(error => console.error("WebSocket encountered an error:", error));
```
### Websocket Integration:
The **'SocketHandler'** class can be seamlessly integrated with other components of your trading system. <br>
For instance, incoming data can be directed to the **'AccountHandler'** for account updates, or to the **'MarketsHandler'** for market data updates.
<br><br>

## Markets Stream

### Overview
MarketsHandler is designed to handle market data and updates for various symbols in a financial or trading context. Its role is managing real-time market information, such as price and trade volume data, for specified market symbols.
<br><br>
#### Interaction Between Methods<br>
- The **[constructor](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/marketsHandler.ts#L21)**
  is used to initialize the **'MarketsHandler'** with a list of symbols and set up their initial trade data.<br><br>
- **[initializeTradeDataForSymbol](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/marketsHandler.ts#L31)**
  is called within the constructor for each symbol to set initial trade data values.<br><br>
- **[handler](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/marketsHandler.ts#L67)**
  is the primary function that processes incoming market messages. It uses:
    - **[initializeMarkets](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/marketsHandler.ts#L95)**
      to set up market data when a subscription is established.
    - **[updateTradeDataForSymbol](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/marketsHandler.ts#L52)**
      to update the trade data for a specific symbol when new market data arrives.
    - **[cleanupMarkets](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/marketsHandler.ts#L111)**
      can be called to reset the trade data to its initial state, using initializeTradeDataForSymbol.
      <br><br>

```typescript
// Example usage
const marketSymbols = ["BTCUSD", "ETHUSD"];
const marketHandler = new MarketsHandler(marketSymbols);

// Simulating incoming market message
const marketMessage: MarketsMessageType = { /*...*/ }; // See below link for Market stream example

// Access updated trade data
const tradeData = marketHandler.handler(marketMessage);
console.log(tradeData);
```
Example Market Message:<br>
[Market Stream Example](https://docs.dydx.exchange/developers/indexer/indexer_websocket#example-4)

## Orderbook Stream
### Overview
The OrderbookHandler class is designed to manage and update order book data for different financial market symbols. This class is crucial in a trading system for maintaining an up-to-date view of the market's bid and ask prices for various assets.<br><br>

### Class Structure<br>

#### Interaction Between Methods
- The **[constructor](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L26)** initializes each symbol's order book data structure.<br><br>
- **[initializeOrderbookDataForSymbol](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L32)** is called within the constructor to set up empty bid and ask arrays for each symbol.<br><br>
- **[handler](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L41)**
  is the primary function that processes incoming order book messages. It delegates tasks to:<br>
    - **[initializeBook](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L67)**
      for setting up initial order book data.
    - **[updateBook](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L102)**
      for incorporating new updates into the order book.<br><br>
- **[mapAndSortOrders](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L88)**
  is used within **[initializeBook](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L67)**
  to format and sort the initial order book data.<br><br>
- **[updateBook](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L102)**
  and **[updateBookSide](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L123)**
  work together to integrate updates into the existing order book.<br><br>
- **[manageOrderUpdates](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L153)**
  handles the addition, update, or removal of individual orders in the order book.<br><br>
- **[cleanupOrderbook](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L224)**
  and **[cleanupOb](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderbookHandler.ts#L272)**
  are used to maintain the integrity of the order book by removing invalid orders and resetting the book to its initial state.<br><br>

```typescript
// Example usage
const symbols = ["BTC", "ETH"];
const orderbookHandler = new OrderbookHandler(symbols);

// Simulating incoming order book message
const orderbookMessage: ObMessageType = { /*...*/ }; // See Below Link for orderbook stream example
const updatedOrderbook = orderbookHandler.handler(orderbookMessage);

// Accessing the updated order book data
console.log(updatedOrderbook);
```
[Orderbook Stream Example](https://docs.dydx.exchange/developers/indexer/indexer_websocket#initial-response-1)

## Account Stream
### Overview
The **'AccountHandler'** class is designed for managing and processing account-related data in a financial trading context,
focusing on Orders, Fills, Perpetual Positions, and Asset Positions.<br><br>

### Core Functionality
The handler function is the central dispatcher in the AccountHandler class. It processes incoming account messages and directs them to the relevant subsections: Orders, Fills, Perpetual Positions, and Asset Positions.

### 1. Orders
#### Overview
This section handles the management of open and filled orders.<br><br>

#### Key Methods
- **[initializeOpenOrders](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L199)**
    - Initializes open orders from the account data.<br><br>
- **[updateOrders](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L370)**
    - Updates the orders based on new order data.<br><br>
- **[generateOrderDict](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L221)**
    - Generates a dictionary representation of an order.<br><br>

### 2. Fills
#### Overview
Manages the tracking and updating of filled orders.<br><br>

#### Key Methods
- **[initializeFills](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L289)**
    - Initializes fills to the filled orders object.<br><br>
- **[updateFills](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L409)**
    - Updates fills based on new data.<br><br>
- **[storeFills](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L319)**
    - Stores and organizes fills.<br><br>

### 3. Perpetual Positions
#### Overview
Handles the management of perpetual positions including entry, exit, size, and PnL calculations.<br><br>

#### Key Methods
- **[initializePosition](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L245)**
    - Initializes position data from account data.<br><br>
- **[updatePosition](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L423)**
    - Updates position data based on new data.<br><br>
- **[assignNonNullPositionData](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L273)**
    - Assigns non-null data to a position.<br><br>

### 4. Asset Positions
#### Overview
Asset position is your collateral currency (USDC).<br><br>

#### Key Methods
- **[assignCollateral](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L338)**
    - Assigns collateral data.<br><br>
- **[updateCollateral](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L456)**
    - Updates collateral data based on new asset position data.<br><br>

#### Helper and Utility Functions
- Several helper functions are used across these subsections for data processing and management, such as **[isoToEpochSeconds](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L96)**,
  **[isObjectEmpty](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L107)**,
  and **[getPrice](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/accountHandler.ts#L117)**.
  <br><br>

```typescript
// Example usage with dYdX SDK
const accountHandler = new AccountHandler("ETH-USD", "USDC");
await accountHandler.initializeClient();

// Receiving and processing an Account websocket message from dYdX
const accountMessage: AccountMessageType = { /*...*/ }; // See link below for Account Message Type Example
const updatedPositionData = await accountHandler.handler(accountMessage);

// Accessing updated account data
console.log(updatedPositionData);

```
[Orderbook Stream Example](https://docs.dydx.exchange/developers/indexer/indexer_websocket#example-1)

## Order Client
### Overview
The 'Orders' class provides methods to interact with the dYdX Protocol, enabling the placement and cancellation of orders.
It is particularly designed for use within trading algorithms, allowing for flexible order management based on different trading strategies.<br><br>

### Features
The class facilitates connections to the dYdX Composite Client, handling operations such as sending and canceling orders or creating transactions. Key aspects of the class include:

### Methods and Functionality
- **[shortTermOrder](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L74C18-L74C32)**:
  Places a short-term limit order, using a calculated 'good til' block height.
- **[marketOrder](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L109)**:
  Places a short-term market order with a specific execution strategy.
- **[limitOrder](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L145)**:
  Places a long-term limit order, providing greater control over the order's life span.
- **[cancelOrderLongTerm](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L183)**:
  Cancels a long-term order, ensuring that orders no longer needed are appropriately withdrawn.<br><br>

### Helper Functions
- **[getRandomNumber](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L40)**:
  Generates a random number to be used as a client ID for order identification.
- **[getEpochNow](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L48)**:
  Gets the current time in epoch seconds, useful for timestamping.
- **[calculateGoodTilBlock](https://github.com/ricciutelli/dydx-v4-deployment/blob/0945632769a920a703c1154d8a438bbd9a51753f/src/orderClient.ts#L56)**: .
  Calculates a future block height, determining the lifespan of short-term orders.<br><br>

```typescript
// Create your composite and validator client, as well as your subaccount as seen in dydxClient.ts
const compositeClient = new CompositeClient(/*...*/); 
const subAccountClient = new SubaccountClient(/*...*/);
const validatorClient = new ValidatorClient(/*...*/);

const orders = new Orders(compositeClient, subAccountClient, validatorClient); // Set up new Orders Instance

// Placing a short-term limit order
await orders.shortTermOrder(
    "ETH-USD", 
    OrderSide.BUY, 
    2500, 
    1
    /** 
     * Note: ClientId, GoodTilBlock, OrderTimeInForce & ReduceOnly Parameters are left blank because they are 
     * kept constant for our use. If you need to change you can take out default values from orderClient and set when 
     * calling the function
    */
);

// Cancelling a long-term order
await orders.cancelOrderLongTerm(orderId, "ETH-USD", goodTillTime);
// OrderId and goodTillTime always needed to cancel long term orders. Make sure you save these for easy recall.
```

## Building a Main File
### Overview
Your main class should maintain the operations of your trading application by routing data from the websocket to the
appropriate handler. The data can then be used to develop your trading strategy.<br><br>

### Example Constructor
In the constructor, you will pass the symbol(s), websocket socket subscription(s), and subaccount(s). Call all necessary
data handlers, and set up the websocket call backs for incoming messages and potential disconnections.<br><br>

```typescript
constructor(Symbols: string[], Subscriptions: Subscription[], SubaccountA: string, SubaccountB: string) {
    this.symbols = Symbols;
    this.subscriptions = Subscriptions;
    this.subAccountA = SubaccountA;
    this.subAccountB = SubaccountB;
    this.marketsHandler = new MarketsHandler(this.symbols);
    this.orderbookHandler = new OrderbookHandler(this.symbols);
    this.accountHandlerA = new AccountHandler();
    this.accountHandlerB = new AccountHandler();
    this.marketMaker = new MarketMaker(this.symbols[0]);
    this.socketHandler = new SocketHandler(this.subscriptions, this.handleMessage.bind(this));
    this.socketHandler.onDisconnect(this.handleDisconnect.bind(this));
}
```

### Handle Callbacks from the Socket
Build methods for handling the callbacks from the socket handler. Validate and route the data to the appropriate handler.
From here, you can pass the data to your trading strategy.<br><br>

```typescript
private async handleMessage(obj: AllObjectTypes): Promise<void> {

    /**
     *  Note: handleMarketMessage, handleOrderbookMessage, and handleAccountMessage
     *  are methods to validate the data to ensure proper handling. Build these 
     *  based on your strategy.
     */
    const marketDataTask = this.handleMarketMessage(obj);
    const orderbookDataTask = this.handleOrderbookMessage(obj);
    const accountDataTasks = this.handleAccountMessage(obj);

    // Once you have successfully validated and routed the data, use it for your trading strategy
    this.yourTradingStrategy(marketDataTask, orderbookDataTask, accountDataTasks);
}

// Cleanup the data before reconnecting to the socket 
private async handleDisconnect(): Promise<void> {
    // Your cleanup logic...
    this.marketsHandler.cleanupMarkets();
    this.orderbookHandler.cleanupOb();
    this.accountHandlerA.cleanupAccount();
    this.accountHandlerB.cleanupAccount();
}
```

### Calling the Main Class
Once you have built methods for handling callback messages, data routing, and any necessary handling for your trading
strategy, define a "run" method and call your class.

"Run" Method:
```typescript
public async run(): Promise<void> {
    try {
        await this.accountHandlerA.initializeClient();
        await this.accountHandlerB.initializeClient();
        await this.marketMaker.initializeClients();
        await this.socketHandler.run();
        console.log('Trader is running');
    } catch (error) {
        console.error('Error running Trader:', error);
    }
}
```

Start:
```typescript
// Define your address and subaccount
const walletAddressA: string = process.env.ADDRESS_A as string;
const walletAddressB: string = process.env.ADDRESS_B as string;
const subAccountA: string = process.env.ACCOUNT_A as string;
const subAccountB: string = process.env.ACCOUNT_B as string;

// Subscribe to necessary streams
const subscriptions = [
    subMarkets(),
    subOrderbook(Symbol),
    subAccount(walletAddressA),
    subAccount(walletAddressB)
];

// Main execution block
(async () => {
    const trader = new Trader([Symbol], subscriptions, subAccountA, subAccountB);
    await trader.run();
})();
```