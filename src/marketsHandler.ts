// marketsHandler.ts
import {
    InitMarketMessage,
    MarketData,
    MarketsMessageType,
    MarketTradeData,
    SubscriptionTypes
} from "./constants"

/**
 * Handles market data and updates for different symbols.
 */
export class MarketsHandler {
    private readonly symbols: string[];
    private readonly tradeData: MarketTradeData;

    /**
     * Constructs a MarketsHandler instance.
     * @param symbols - Array of market symbols to be handled.
     */
    constructor(symbols: string[]) {
        this.symbols = symbols;
        this.tradeData = {};
        this.symbols.forEach(symbol => this.initializeTradeDataForSymbol(symbol));
    }

    /**
     * Adds default values for each symbol provided to the MarketsHandler.
     * @param symbol
     */
    private initializeTradeDataForSymbol(symbol: string): void {
        this.tradeData[symbol] = {
            priceRound: 0, sizeRound: 0, tickSize: '0', stepSize: '0', minQty: 0
        };
    }

    /**
     * Counts the number of decimal places in a string representation of a number.
     * @param value - The string representation of the number.
     * @returns The number of decimal places.
     */
    private countDecimals(value: string): number {
        if (!value.includes('.')) return 0;
        return value.split('.')[1].length || 0;
    }

    /**
     * Updates trade data for a specific symbol based on market data.
     * @param symbol - The symbol to update.
     * @param symbolData - The market data for the symbol.
     */
    private updateTradeDataForSymbol(symbol: string, symbolData: MarketData): void {
        this.tradeData[symbol] = {
            priceRound: this.countDecimals(symbolData.tickSize),
            sizeRound: this.countDecimals(symbolData.stepSize),
            tickSize: symbolData.tickSize,
            stepSize: symbolData.stepSize,
            minQty: parseFloat(symbolData.stepSize)
        };
    }

    /**
     * Handles incoming market messages and updates trade data accordingly.
     * @param obj - The market message to handle.
     * @returns The updated trade data.
     */
    public handler(obj: MarketsMessageType): MarketTradeData {
        switch (obj.type) {
            case SubscriptionTypes.Connected:
                console.log("Markets Connected.");
                break;

            case SubscriptionTypes.Subscribed:
                console.log("Markets Subscribed. Initializing Data.");
                this.initializeMarkets(obj);
                break;

            case SubscriptionTypes.ChannelData:
                if ('markets' in obj.contents) {
                    console.log("Market data in channel data for market socket.\n", obj);
                }
                break;

            default:
                console.error("Unhandled message type MarketsHandler:", obj);
        }

        return this.tradeData;
    }

    /**
     * Initializes market data from a market initialization message.
     * @param obj - The initialization message containing market data.
     */
    private initializeMarkets(obj: InitMarketMessage): void {
        const data = obj.contents.markets;
        for (const symbol of this.symbols) {
            const symbolData = data[symbol];
            if (symbolData) {
                // Store the data for each symbol
                this.updateTradeDataForSymbol(symbol, symbolData);
            } else {
                console.log(`No data available for symbol ${symbol}`);
            }
        }
    }

    /**
     * Resets the market data to its initial state.
     */
    public cleanupMarkets(): void {
        this.symbols.forEach(symbol => this.initializeTradeDataForSymbol(symbol));
    }
}