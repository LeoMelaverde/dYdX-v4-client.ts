// constants.ts
import {Orders} from "./orderClient";
import {
    OrderFlags,
    OrderSide,
    OrderStatus,
    OrderTimeInForce,
    OrderType,
    PositionStatus
} from "@dydxprotocol/v4-client-js";

/*
========== TRADING SYMBOL ==========
 */
export const Symbol = "ETH-USD"
export const CollateralSymbol = "USDC"
// Add more symbols as needed

/*
========== ENDPOINTS ==========
 */
export enum Endpoint {
    Indexer = "https://indexer.dydx.trade/",
    WebSocket = "wss://indexer.dydx.trade/v4/ws",
    Validator = "https://dydx-dao-archive-rpc.polkachu.com", // find more @ https://docs.dydx.trade/networks/network1/resources
    ChainId = "dydx-mainnet-1",
    Mainnet = "mainnet"
}

/*
========== VALIDATOR CONFIG ==========
 */
export enum DenomConfig {
    Usdc = "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5",
    UsdcGas = "uusdc",
    ChainToken = "adydx"
}
export enum DecimalConfig {
    Usdc = 6,
    ChainTokenDecimals = 18
}

/*
========== SOCKET HANDLER ==========
 */
export type Subscription = {
    "type": string,
    "channel": string,
    "id"?: string
}
export enum WebSocketEvent {
    Open = 'open',
    Message = 'message',
    Error = 'error',
    Close = 'close',
}
export interface InitSocketMessage {
    type: SubscriptionTypes.Connected,
    connection_id: string,
    message_id: number
}

export enum SubscriptionTypes {
    Connected = "connected",
    Subscribed = "subscribed",
    ChannelData = "channel_data"
}

export enum ChannelTypes {
    Markets = "v4_markets",
    Orderbook = "v4_orderbook",
    Subaccounts = "v4_subaccounts"
}

export function subMarkets() {
    return {
        'type': 'subscribe',
        'channel': ChannelTypes.Markets
    }
}

export function subOrderbook(symbol: string) {
    return {
        'type': 'subscribe',
        'channel': ChannelTypes.Orderbook,
        'id': `${symbol}`
    }
}

export function subAccount(address: string) {
    return {
        'type': 'subscribe',
        'channel': ChannelTypes.Subaccounts,
        'id': `${address}/0`
    }
}

// All object types for each stream
export type AllObjectTypes = MarketsMessageType | ObMessageType | AccountMessageType
export type MessageCallback = (data: AllObjectTypes) => void;

/*
========== MARKETS HANDLER ==========
 */
export interface InitMarketMessage {
    type: SubscriptionTypes.Subscribed,
    connection_id: string,
    message_id: number,
    channel: ChannelTypes.Markets,
    contents: {
        markets: MarketDataContents,
    }
}

interface MarketDataContents {
    [ticker: string]: MarketData
}

export type MarketData = {
    clobPairId: string;
    ticker: string;
    status: string;
    lastPrice: string;
    oraclePrice: string;
    priceChange24H: string;
    volume24H: string;
    trades24H: string;
    nextFundingRate: string;
    initialMarginFraction: string;
    maintenanceMarginFraction: string;
    basePositionNotional: string;
    openInterest: string;
    atomicResolution: number;
    quantumConversionExponent: number;
    tickSize: string;
    stepSize: string;
    stepBaseQuantums: number;
    subticksPerTick: number;
}

export interface MarketChannelData {
    type: SubscriptionTypes.ChannelData,
    connection_id: string,
    message_id: number,
    channel: ChannelTypes.Markets,
    version: string,
    contents: MarketMessageContents,
}

interface MarketMessageContents {
    trading?: TradingMarketMessageContents,
    oraclePrices?: OraclePriceMarketMessageContentsMapping,
}

type TradingMarketMessageContents = {
    [ticker: string]: TradingPerpetualMarketMessage
};

interface TradingPerpetualMarketMessage {
    id?: string;
    clobPairId?: string;
    ticker?: string;
    marketId?: number;
    status?: PerpetualMarketStatus;
    baseAsset?: string;
    quoteAsset?: string;
    initialMarginFraction?: string;
    maintenanceMarginFraction?: string;
    basePositionNotional?: string;
    basePositionSize?: string;
    incrementalPositionSize?: string;
    maxPositionSize?: string;
    openInterest?: string;
    quantumConversionExponent?: number;
    atomicResolution?: number;
    subticksPerTick?: number;
    minOrderBaseQuantums?: number;
    stepBaseQuantums?: number;
    lastPrice?: string;
    priceChange24H?: string;
    volume24H?: string;
    trades24H?: number;
    nextFundingRate?: string;
}

export enum PerpetualMarketStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    CANCEL_ONLY = "CANCEL_ONLY",
    POST_ONLY = "POST_ONLY"
}

type OraclePriceMarketMessageContentsMapping = {
    [ticker: string]: OraclePriceMarket,
};

interface OraclePriceMarket {
    price: string,
    effectiveAt: IsoString,
    effectiveAtHeight: string,
    marketId: number,
}

type IsoString = string;

export type TradeData = {
    priceRound: number,
    sizeRound: number,
    tickSize: string,
    stepSize: string,
    minQty: number
}

export type MarketsMessageType = InitSocketMessage | InitMarketMessage | MarketChannelData

export interface MarketTradeData {
    [key: string]: {
        priceRound: number;
        sizeRound: number;
        tickSize: string;
        stepSize: string;
        minQty: number;
    }
}

/*
========== ORDERBOOK HANDLER ==========
 */
export interface InitOrderbook {
    type: SubscriptionTypes.Subscribed,
    connection_id: string,
    message_id: number,
    channel: ChannelTypes.Orderbook,
    id: string,
    contents: InitOrderbookMessageContents
}

export interface InitOrderbookMessageContents {
    bids: InitPriceLevel,
    asks: InitPriceLevel
}

export type InitPriceLevel = { price: string; size: string }[];

export interface UpdateOrderbook {
    type: SubscriptionTypes.ChannelData,
    connection_id: string,
    message_id: number,
    channel: ChannelTypes.Orderbook,
    id: string,
    version: string,
    contents: UpdateOrderbookMessageContents
}

export interface UpdateOrderbookMessageContents {
    bids?: UpdatePriceLevel[],
    asks?: UpdatePriceLevel[]
}

type UpdatePriceLevel = [string, string];

export type PriceLevel = {
    price: number;
    size: number;
};

export type ObMessageType = InitSocketMessage | InitOrderbook | UpdateOrderbook;

export interface Orderbook {
    bids: PriceLevel[];
    asks: PriceLevel[];
}

export interface OrderbookData {
    [key: string]: {
        bids: PriceLevel[];
        asks: PriceLevel[];
    }
}

export enum BookSide {
    BIDS = "bids",
    ASKS = "asks"
}

/*
========== ACCOUNT HANDLER ==========
 */
export const oneHour = 3600000

export interface InitAccountMessage {
    type: SubscriptionTypes.Subscribed;
    connection_id: string;
    message_id: number;
    channel: ChannelTypes.Subaccounts;
    id: string;
    contents: InitAccountMessageContents
}

export interface InitAccountMessageContents {
    subaccount: InitAccountMessageSubAccount;
    orders: InitAccountMessageOrders | [];
}

export interface InitAccountMessageSubAccount {
    address: string;
    subaccountNumber: string;
    equity: string;
    freeCollateral: string;
    openPerpetualPositions: InitAccountMessageOpenPerpPositions | {};
    assetPositions: InitAccountMessageAssetPosition;
    marginEnabled: boolean;
}

export interface InitAccountMessageOpenPerpPositions {
    [key: string]: InitPerpetualPosition;
}

export interface InitPerpetualPosition {
    market: string;
    status: PositionStatus;
    side: PositionSide;
    size: string;
    maxSize: string;
    entryPrice: string;
    exitPrice: string | null;
    realizedPnl: string;
    unrealizedPnl: string;
    createdAt: string;
    createdAtHeight: string;
    closedAt: string | null;
    sumOpen: string;
    sumClose: string;
    netFunding: string;
}

export interface InitAccountMessageAssetPosition {
    [key: string]: InitAssetPosition;
}

export interface InitAssetPosition {
    size: string;
    symbol: string;
    side: PositionSide.LONG;
    assetId: string;
}

export type InitAccountMessageOrders = InitOrder[];

export interface InitOrder {
    id: string;
    subaccountId: string;
    clientId: string;
    clobPairId: string;
    side: OrderSide
    size: string;
    totalFilled: string;
    price: string;
    type: OrderType
    status: OrderStatus;
    timeInForce: OrderTimeInForce;
    reduceOnly: boolean;
    goodTilBlock?: string;
    orderFlags: OrderFlags;
    goodTilBlockTime?: string;
    createdAtHeight: string;
    clientMetadata: string;
    updatedAt?: string;
    updatedAtHeight?: string;
    postOnly: boolean;
    ticker: string;
}

export interface ChannelDataMessage {
    type: SubscriptionTypes.ChannelData;
    connection_id: string;
    message_id: number;
    id: string;
    channel: ChannelTypes.Subaccounts;
    version: string;
    contents: ChannelDataContents;
}

export interface ChannelDataContents {
    orders?: ChannelDataOrder[];
    fills?: ChannelDataFill[];
    perpetualPositions?: ChannelDataPerpetualPosition[];
    assetPositions?: ChannelDataAssetPosition
}

export interface ChannelDataOrder {
    id: string;
    subaccountId: string;
    clientId: string;
    clobPairId: string;
    side: OrderSide;
    size: string;
    totalOptimisticFilled?: string;
    price: string;
    status: OrderStatus;
    type: OrderType;
    timeInForce: OrderTimeInForce;
    postOnly: boolean;
    reduceOnly: boolean;
    orderFlags: OrderFlags;
    goodTilBlockTime: string;
    ticker: string;
    removalReason?: string;
    createdAtHeight: string;
    updatedAt: string;
    updatedAtHeight: string;
    clientMetadata: string;
    totalFilled?: string;
    goodTilBlock?: string | null;
    triggerPrice?: string | null;
    transactionHash?: string;
}

export interface ChannelDataFill {
    id: string;
    fee: string;
    side: OrderSide;
    size: string;
    type: OrderType;
    price: string;
    eventId: string;
    orderId: string;
    createdAt: string;
    liquidity: "MAKER" | "TAKER";
    clobPairId: string;
    quoteAmount: string;
    subaccountId: string;
    clientMetadata: string;
    createdAtHeight: string;
    transactionHash: string;
    ticker: string;
}

export interface ChannelDataPerpetualPosition {
    address: string;
    subaccountNumber: number;
    positionId: string;
    market: string;
    side: PositionSide;
    status: PositionStatus;
    size: string;
    maxSize: string;
    netFunding: string;
    entryPrice: string;
    exitPrice: string | null;
    sumOpen: string;
    sumClose: string;
    realizedPnl?: string,
    unrealizedPnl?: string,
}

export type ChannelDataAssetPosition = AssetPosition[];

interface AssetPosition {
    address: string;
    subaccountNumber: number;
    positionId: string;
    assetId: string;
    symbol: string;
    side: PositionSide.LONG;
    size: string;
}

export type AccountMessageType = InitSocketMessage | InitAccountMessage | ChannelDataMessage

export interface OpenOrders {
    bids: { [key: string]: OrderInfo };
    asks: { [key: string]: OrderInfo };
}

export type FilledOrders = Map<string, number>;

export interface OrderInfo {
    price: number;
    size: number;
    goodTilTime?: number;
    longTermFill: boolean;
}

export interface OpenPosition {
    symbol: string;
    direction: PositionSide;
    averageEntry: number;
    averageExit: number;
    positionSizeBase: number;
    positionSizeUsd: number;
    sumOpen: number;
    sumExit: number;
    realizedPnl: number;
    unrealizedPnl: number;
}

export interface Collateral {
    symbol: string;
    size: number;
}

export type PositionData = [OpenOrders, FilledOrders, OpenPosition, Collateral, boolean[]]

export enum PositionSide {
    LONG = "LONG",
    SHORT = "SHORT",
    NONE = "NONE"
}

export interface Fill {
    "id": "string",
    "side": OrderSide,
    "liquidity": "MAKER" | "TAKER",
    "type": OrderType,
    "market": "string",
    "marketType": "PERPETUAL",
    "price": "string",
    "size": "string",
    "fee": "string",
    "createdAt": "string",
    "createdAtHeight": "string",
    "orderId": "string",
    "clientMetadata": "string"
}

/*
========== DEFAULT CONSTANTS ==========
 */
export enum Settings {
    MaxFills = 200,
    OrderbookLength = 20,
    GTT = 300
}

export function defaultOpenOrderProperties() {
    return { bids: {}, asks: {} };
}
export function defaultFilledOrderProperties() {
    return new Map<string, number>();
}
export function defaultPositionProperties() {
    return {
        symbol: "",
        direction: PositionSide.NONE,
        averageEntry: 0,
        averageExit: 0,
        positionSizeBase: 0,
        positionSizeUsd: 0,
        sumOpen: 0,
        sumExit: 0,
        realizedPnl: 0,
        unrealizedPnl: 0,
    };
}
export function defaultCollateralProperties() {
    return { symbol: "", size: 0 };
}

/*
========== CANDLES ==========
 */
interface CandleResponse {
    candles: Candle[];
}

interface Candle {
    startedAt: string;
    ticker: string;
    resolution: Resolutions;
    low: string;
    high: string;
    open: string;
    close: string;
    baseTokenVolume: string;
    usdVolume: string;
    trades: number;
    startingOpenInterest: string;
    id: string;
}

export enum Resolutions {
    OneMinute = "1MIN",
    FiveMinutes = "5MIN",
    FifteenMinutes = "15MIN",
    ThirtyMinutes = "30MIN",
    OneHour = "1HOUR",
    FourHours = "4HOURS",
    OneDay = "1DAY",
}

/*
========== ORDERS ==========
 */
export interface Order {
    symbol: string;
    orderSide: OrderSide;
    orderPrice: number;
    orderSize: number;
    goodTilTime: Settings.GTT;
    orderClient: Orders;
}