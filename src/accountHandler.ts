// accountHandler.ts
import {
    AccountMessageType,
    ChannelDataAssetPosition,
    ChannelDataFill,
    ChannelDataMessage,
    ChannelDataOrder,
    ChannelDataPerpetualPosition,
    defaultCollateralProperties,
    defaultFilledOrderProperties,
    defaultOpenOrderProperties,
    defaultPositionProperties,
    InitAccountMessage,
    InitAccountMessageAssetPosition,
    InitAccountMessageOpenPerpPositions,
    InitAccountMessageOrders,
    InitOrder,
    InitPerpetualPosition,
    Collateral,
    FilledOrders,
    OpenOrders,
    OpenPosition,
    OrderInfo,
    PositionData,
    Settings,
    PositionSide,
    Resolutions,
    SubscriptionTypes,
    Symbol,
    CollateralSymbol,
    oneHour
} from "./constants";

import {Clients} from "./dydxClient";
import {IndexerClient, OrderSide, OrderStatus, PositionStatus, TickerType} from "@dydxprotocol/v4-client-js";

/**
 * Handles and processes account-related data and updates, including orders,
 * positions, and collateral for a given symbol and asset.
 */
export class AccountHandler {
    private readonly symbol: string;
    private readonly asset: string;
    private clients: Clients = new Clients();
    private indexerClient?: IndexerClient;
    private openOrders: OpenOrders;
    private filledOrders: FilledOrders;
    private perpetualPosition: OpenPosition;
    private assetPosition: Collateral;
    private position: PositionData;
    private longTermFill: boolean[];

    /**
     * Constructs an AccountHandler instance.
     * @param symbol - The trading symbol (e.g., "ETH-USD").
     * @param asset - The asset type (e.g., "USDC").
     * @param openOrders - Initial state of open orders.
     * @param filledOrders - Initial state of filled orders.
     * @param perpetualPosition - Initial state of perpetual positions.
     * @param assetPosition - Initial state of asset positions.
     * @param position - General account data.
     * @param longTermFill - Order fill flag.
     */
    constructor(
        symbol: string = Symbol,
        asset: string = CollateralSymbol,
        openOrders: OpenOrders = defaultOpenOrderProperties(),
        filledOrders: FilledOrders = defaultFilledOrderProperties(),
        perpetualPosition: OpenPosition = defaultPositionProperties(),
        assetPosition: Collateral = defaultCollateralProperties(),
        position: PositionData = [defaultOpenOrderProperties(), defaultFilledOrderProperties(), defaultPositionProperties(), defaultCollateralProperties(), [false]],
        longTermFill: boolean[] = [false]
    ) {
        this.symbol = symbol;
        this.asset = asset;
        this.openOrders = openOrders;
        this.filledOrders = filledOrders;
        this.perpetualPosition = perpetualPosition;
        this.assetPosition = assetPosition;
        this.position = position;
        this.longTermFill = longTermFill;
    }

    /**
     * Initializes indexer client for fetching account data.
     */
    public async initializeClient(): Promise<void> {
        this.indexerClient = this.clients.createIndexerClient()
    }

    /**
     * Converts ISO date/time to epoch seconds.
     * @param isoTime - The ISO date/time string.
     * @returns The corresponding epoch time in seconds.
     */
    private isoToEpochSeconds(isoTime: string): number {
        // Convert iso time to epoch seconds
        const date = new Date(isoTime);
        return Math.floor(date.getTime() / 1000);
    }

    /**
     * Checks if an object is empty (has no enumerable properties).
     * @param obj - The object to check.
     * @returns True if the object is empty, false otherwise.
     */
    private isObjectEmpty(obj: Object): boolean {
        // Confirm whether the object is empty
        return Object.keys(obj).length === 0;
    }

    /**
     * Retrieves the current price for the symbol.
     * @returns The current price.
     * @throws Will throw an error if no candle data is available.
     */
    private async getPrice(): Promise<number> {
        if (!this.indexerClient) return 1;

        // Get the current price
        const candles = await this.indexerClient.markets.getPerpetualMarketCandles(this.symbol, Resolutions.OneDay);

        if (candles.candles && candles.candles.length > 0) {
            const mostRecentCandle = candles.candles[0];
            return parseFloat(mostRecentCandle.close);
        }

        throw new Error("No candle data available");
    }

    /**
     * Handles incoming account messages and updates account data accordingly.
     * @param obj - The account message to handle.
     * @returns The updated account data.
     */
    public async handler(obj: AccountMessageType): Promise<PositionData> {
        switch (obj.type) {
            case SubscriptionTypes.Connected:
                console.log("Account Connected.");
                break;

            case SubscriptionTypes.Subscribed:
                console.log("Account Subscribed. Initializing Data.")
                await this.initializeAccount(obj);
                this.assignPosition();
                break;

            case SubscriptionTypes.ChannelData:
                this.longTermFill = [];
                await this.updateAccount(obj);
                this.assignPosition();
                break;

            default:
                console.error("Unhandled message type AccountHandler:", obj);
        }
        return this.position
    }

    /**
     * Initializes account data based on an initial account message.
     * @param obj - The initial account message containing order, position, and collateral data.
     */
    private async initializeAccount(obj: InitAccountMessage): Promise<void> {
        // Initialize open orders
        const initOrders = obj.contents.orders
        this.initializeOpenOrders(initOrders)

        // Initialize position
        const initPosition = obj.contents.subaccount.openPerpetualPositions
        await this.initializePosition(initPosition)

        // Initialize fills
        await this.initializeFills(obj.id)

        // Initialize collateral
        const assetPosition = obj.contents.subaccount.assetPositions
        this.assignCollateral(assetPosition)
    }

    /**
     * Initializes open orders from account data.
     * @param initOrders - Initial order data from the account message.
     */
    private initializeOpenOrders(initOrders: InitAccountMessageOrders | []): void {
        if (initOrders.length === 0) return;

        for (const order of initOrders) {
            const key = order.clientId

            if (order.side === OrderSide.BUY && (order.status === OrderStatus.OPEN || order.status === OrderStatus.BEST_EFFORT_OPENED)) {
                this.openOrders.bids[key] =
                    this.generateOrderDict(order)

            } else if (order.side === OrderSide.SELL && (order.status === OrderStatus.OPEN || order.status === OrderStatus.BEST_EFFORT_OPENED)) {
                this.openOrders.asks[key] =
                    this.generateOrderDict(order)
            }
        }
    }

    /**
     * Generates a dictionary representation of an order.
     * @param order - The order to update.
     * @returns A dictionary containing order information.
     */
    private generateOrderDict(order: InitOrder | ChannelDataOrder): OrderInfo {
        if (order.status === OrderStatus.OPEN && order.goodTilBlockTime) {
            return {
                price: parseFloat(order.price),
                size: parseFloat(order.size),
                goodTilTime: this.isoToEpochSeconds(order.goodTilBlockTime),
                longTermFill: true
            }
        } else {
            if (order.status != OrderStatus.BEST_EFFORT_OPENED) {
                console.log("Unexpected order status:", order.status)
            }
            return {
                price: parseFloat(order.price),
                size: parseFloat(order.size),
                longTermFill: false
            }
        }
    }

    /**
     * Initializes position data from account data.
     * @param initPosition - Initial position data from the account message.
     */
    private async initializePosition(initPosition: InitAccountMessageOpenPerpPositions): Promise<void> {
        if (this.isObjectEmpty(initPosition)) return;

        const price = await this.getPrice();
        const position = initPosition[this.symbol];

        if (position.status === PositionStatus.OPEN) {
            this.assignNonNullPositionData(position, price);
            this.perpetualPosition.unrealizedPnl = parseFloat(position.unrealizedPnl);
            this.perpetualPosition.realizedPnl = parseFloat(position.realizedPnl);
            this.handleNullExitPrice(position);
        }
    }

    /**
     * Assigns the average exit price for a perpetual position.
     * @param position - The position data containing the exit price.
     */
    private handleNullExitPrice(position: InitPerpetualPosition | ChannelDataPerpetualPosition): void {
        this.perpetualPosition.averageExit = position.exitPrice != null ?
            parseFloat(position.exitPrice) : 0
    }

    /**
     * Assigns non-null data to a position.
     * @param position - The position data.
     * @param price - The price associated with the position.
     */
    private assignNonNullPositionData(position: InitPerpetualPosition | ChannelDataPerpetualPosition, price: number): void {
        this.perpetualPosition.symbol = position.market;
        this.perpetualPosition.direction = position.side;
        this.perpetualPosition.averageEntry = parseFloat(position.entryPrice)
        this.perpetualPosition.positionSizeBase = Math.abs(parseFloat(position.size))
        this.perpetualPosition.positionSizeUsd = Math.abs(parseFloat(position.size) * price)
        this.perpetualPosition.sumOpen = parseFloat(position.sumOpen) * price
        this.perpetualPosition.sumExit = parseFloat(position.sumClose)
    }

    /**
     * Initialize fills to our filled orders object.
     * @param id - Wallet address to fetch fills.
     * @param subAccount - Subaccount number (0).
     * @param limit - Number of fills to fetch (max=100).
     */
    private async initializeFills(id: string, subAccount: number=0, limit: number=100): Promise<void> {
        if (!this.indexerClient || !this.hasOpenPosition()) return; // Only store order if the position is open

        // Fetch the fills and define max age of fill
        const fills = await this.indexerClient.account.getSubaccountFills(id.slice(0, -2), subAccount, this.symbol, TickerType.PERPETUAL, limit);
        const oneHourAgo = new Date(Date.now() - oneHour); // 1 hour in milliseconds

        for (const fill of fills.fills) {
            const fillDate = new Date(fill.createdAt);

            if (fillDate > oneHourAgo) { // Only store orders within the time horizon
                const price: string = fill.price;
                const size: string = fill.size;
                this.storeFills(price, size)
            }
        }
    }

    /**
     * Checks to see if we have a position open.
     */
    private hasOpenPosition(): boolean {
        return this.perpetualPosition.positionSizeBase > 0;
    }

    /**
     * Stores an organizes fills.
     * @param price - Price of fill.
     * @param size - Amount filled.
     */
    private storeFills(price: string, size: string): void {
        if (this.filledOrders.has(price)) {
            this.filledOrders.set(price, this.filledOrders.get(price)! + parseFloat(size));
        } else {
            // Check if the limit is reached
            if (this.filledOrders.size >= Settings.MaxFills) {
                // Delete the oldest entry
                const oldestKey = this.filledOrders.keys().next().value;
                this.filledOrders.delete(oldestKey);
            }
            // Add the new fill
            this.filledOrders.set(price, parseFloat(size));
        }
    }

    /**
     * Assigns collateral data.
     * @param collateral - The collateral data.
     */
    private assignCollateral(collateral: InitAccountMessageAssetPosition): void {
        const symbol = collateral[this.asset].symbol
        const size = parseFloat(collateral[this.asset].size)
        this.assetPosition = { symbol: symbol, size: size }
    }

    /**
     * Updates account data based on a channel data message.
     * @param obj - The channel data message.
     */
    private async updateAccount(obj: ChannelDataMessage): Promise<void> {
        // Update orders
        const updateOrders = obj.contents.orders
        this.updateOrders(updateOrders)

        // Update fills
        const updateFills = obj.contents.fills
        this.updateFills(updateFills)

        // Update position
        const updatePosition = obj.contents.perpetualPositions
        await this.updatePosition(updatePosition)

        // Update collateral
        const updateCollateral = obj.contents.assetPositions
        this.updateCollateral(updateCollateral)
    }

    /**
     * Updates the orders based on new order data.
     * @param updateOrder - The new order data.
     */
    private updateOrders(updateOrder?: ChannelDataOrder[]): void {
        if (!updateOrder) return;

        for (const order of updateOrder) {
            const key = order.clientId

            if (order.side === OrderSide.BUY) {
                this.updateOrderSide(this.openOrders.bids, order, key);

            } else if (order.side === OrderSide.SELL) {
                this.updateOrderSide(this.openOrders.asks, order, key);
            }
        }
    }

    /**
     * Updates a specific side of the order book (bids or asks) based on the given order's status.
     * @param orderSide - The side of the order book being updated (either bids or asks).
     * @param order - The order data to be processed.
     * @param key - The unique identifier of the order, used as a key in the order book.
     */
    private updateOrderSide(orderSide: {[key: string]: OrderInfo}, order: ChannelDataOrder, key: string): void {
        // Stores open orders
        if (order.status === OrderStatus.OPEN || order.status === OrderStatus.BEST_EFFORT_OPENED) {
            orderSide[key] = this.generateOrderDict(order);

            // Removes filled or cancelled orders
        } else if (order.status === OrderStatus.FILLED || order.status === OrderStatus.CANCELED || order.status === OrderStatus.BEST_EFFORT_CANCELED) {
            if (orderSide[key]) {
                this.longTermFill.push(orderSide[key].longTermFill);
                delete orderSide[key];
            }
        }
    }

    /**
     * Stores fills to our fill object.
     * @param updateFills - Array of fills to update.
     */
    private updateFills(updateFills?: ChannelDataFill[]): void {
        if (!updateFills) return;

        for (const fill of updateFills) {
            const price: string = fill.price;
            const size: string = fill.size;
            this.storeFills(price, size)
        }
    }

    /**
     * Updates position data based on new position data.
     * @param updatePosition - The new position data.
     */
    private async updatePosition(updatePosition?: ChannelDataPerpetualPosition[]): Promise<void> {
        if (!updatePosition) return;

        const price = await this.getPrice();
        for (const position of updatePosition) {
            if (position.market === this.symbol) {
                this.assignNonNullPositionData(position, price);
                this.handleUndefinedPnl(position, price);
                this.handleNullExitPrice(position);
            }
        }
    }

    /**
     * Handles the assignment of unrealized and realized PnL for a perpetual position.
     * @param position - The position data from which the PnL values are derived.
     * @param price - Current price of the asset.
     */
    private handleUndefinedPnl(position: ChannelDataPerpetualPosition, price: number): void {
        const unrealizedPnlFactor = position.side === PositionSide.LONG ?
            price / parseFloat(position.entryPrice) : parseFloat(position.entryPrice) / price

        this.perpetualPosition.unrealizedPnl = // Manually calculate unrealized PNL to stay up-to-date
            ((unrealizedPnlFactor * this.perpetualPosition.positionSizeUsd) - this.perpetualPosition.positionSizeUsd);

        this.perpetualPosition.realizedPnl = position.realizedPnl != undefined ?
            parseFloat(position.realizedPnl) : this.perpetualPosition.realizedPnl;
    }

    /**
     * Updates collateral data based on new asset position data.
     * @param assetPosition - The new asset position data.
     */
    private updateCollateral(assetPosition?: ChannelDataAssetPosition): void {
        if (!assetPosition) return;
        const symbol = assetPosition[0].symbol
        const size = parseFloat(assetPosition[0].size)
        this.assetPosition = { symbol: symbol, size: size }
    }

    /**
     * Assigns the current account position.
     */
    private assignPosition(): void {
        this.position = [this.openOrders, this.filledOrders, this.perpetualPosition, this.assetPosition, this.longTermFill];
    }

    /**
     * Cleans up and resets all account data to their default states.
     */
    public cleanupAccount(): void {
        this.openOrders = defaultOpenOrderProperties();
        this.filledOrders = defaultFilledOrderProperties();
        this.perpetualPosition = defaultPositionProperties();
        this.assetPosition = defaultCollateralProperties();
        this.position = [defaultOpenOrderProperties(), defaultFilledOrderProperties(), defaultPositionProperties(), defaultCollateralProperties(), [false]];
    }
}