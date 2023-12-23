// orderbookHandler.ts
import {
    InitOrderbook,
    UpdateOrderbook,
    ObMessageType,
    InitOrderbookMessageContents,
    PriceLevel,
    UpdateOrderbookMessageContents,
    OrderbookData,
    BookSide,
    SubscriptionTypes,
    Settings
} from "./constants";

/**
 * Handles order book data and updates for different symbols.
 */
export class OrderbookHandler {
    private readonly symbols: string[];
    private readonly orderbook: OrderbookData;

    /**
     * Constructs an OrderbookHandler instance.
     * @param symbols - Array of market symbols for the order book.
     */
    constructor(symbols: string[]) {
        this.symbols = symbols;
        this.orderbook = {};
        this.symbols.forEach(symbol => this.initializeOrderbookDataForSymbol(symbol))
    }

    private initializeOrderbookDataForSymbol(symbol: string): void {
        this.orderbook[symbol] = { bids: [], asks: [] };
    }

    /**
     * Handles incoming order book messages and updates the order book data accordingly.
     * @param obj - The order book message to handle.
     * @returns The updated order book data.
     */
    public handler(obj: ObMessageType): OrderbookData {
        switch (obj.type) {
            case SubscriptionTypes.Connected:
                console.log("Orderbook Connected.");
                break;

            case SubscriptionTypes.Subscribed:
                console.log("Orderbook Subscribed. Initializing Data.");
                this.initializeBook(obj);
                break;

            case SubscriptionTypes.ChannelData:
                this.updateBook(obj);
                break;

            default:
                console.error("Unhandled message type in OrderbookHandler:", obj);
        }

        return this.orderbook;
    }

    /**
     * Initializes the order book from a subscription message.
     * @param obj - The initialization order book message.
     */
    private initializeBook(obj: InitOrderbook): void {
        const { id, contents } = obj;
        const symbol = id;

        // Update bids
        if (contents.bids) {
            this.orderbook[symbol].bids = this.mapAndSortOrders(contents, BookSide.BIDS)
        }

        // Update asks
        if (contents.asks) {
            this.orderbook[symbol].asks = this.mapAndSortOrders(contents, BookSide.ASKS)
        }
    }

    /**
     * Maps and sorts order book entries for a given book side.
     * @param contents - The raw order book data containing bids and asks.
     * @param bookSide - The side of the book to process ("bids" or "asks").
     * @returns An array of processed and sorted price levels.
     */
    private mapAndSortOrders(contents: InitOrderbookMessageContents, bookSide: BookSide): PriceLevel[] {
        const initData = bookSide === BookSide.BIDS ? contents.bids : contents.asks

        return initData
            .map(order => ({ price: parseFloat(order.price), size: parseFloat(order.size) }))
            .sort((a, b) =>
                bookSide === BookSide.BIDS ? b.price - a.price : a.price - b.price) // Conditional sorting
            .slice(0, Settings.OrderbookLength); // Keep only the top 20 orders
    }

    /**
     * Updates the order book with new data.
     * @param obj - The update order book message.
     */
    private updateBook(obj: UpdateOrderbook): void {
        const { id, contents } = obj;
        const symbol = id;

        // Update bids
        if (contents.bids) {
            this.updateBookSide(contents, BookSide.BIDS, symbol);
        }

        // Update asks
        if (contents.asks) {
            this.updateBookSide(contents, BookSide.ASKS, symbol);
        }
    }

    /**
     * Updates a specific side (bids or asks) of the order book.
     * @param data - The update data for the order book.
     * @param bookSide - The side of the book to update ("bids" or "asks").
     * @param symbol - The market symbol for which the order book is updated.
     */
    private updateBookSide(data: UpdateOrderbookMessageContents, bookSide: BookSide, symbol: string): void {
        const updateData = bookSide == BookSide.BIDS ? data.bids : data.asks
        const updateOrderbook = bookSide == BookSide.BIDS ? this.orderbook[symbol].bids : this.orderbook[symbol].asks

        if (updateData) {
            for (const order of updateData) {
                const price = parseFloat(order[0]);
                const size = parseFloat(order[1]);
                const index = updateOrderbook.findIndex(p => p.price === price);

                if (bookSide === BookSide.BIDS) {
                    // Update bid side
                    this.orderbook[symbol].bids = this.manageOrderUpdates(price, size, index, bookSide, updateOrderbook)
                } else {
                    // Update ask side
                    this.orderbook[symbol].asks = this.manageOrderUpdates(price, size, index, bookSide, updateOrderbook)
                }
            }
        }
    }

    /**
     * Manages updates to a specific side of the order book.
     * @param price - The price of the order to update.
     * @param size - The size of the order to update. If the size is 0, the order is removed.
     * @param index - The index of the existing order in the order book. If -1, it's a new order.
     * @param bookSide - The side of the book being updated ("bids" or "asks").
     * @param updateOrderbook - The current state of the order book side being updated.
     * @returns The updated and sorted array of price levels.
     */
    private manageOrderUpdates(price: number, size: number, index: number, bookSide: BookSide, updateOrderbook: PriceLevel[]): PriceLevel[] {
        if (size > 0) {
            if (index !== -1) {
                updateOrderbook[index].size = size;
            } else {
                // Insert in sorted order
                const insertionIndex = this.findInsertionIndex(price, updateOrderbook, bookSide);
                updateOrderbook.splice(insertionIndex, 0, { price, size });
            }

            // Ensure only top 20 orders are kept
            if (updateOrderbook.length > Settings.OrderbookLength) {
                updateOrderbook.length = Settings.OrderbookLength; // Trim the order book to 20 elements
            }

        } else if (index !== -1) {
            updateOrderbook.splice(index, 1);
        }

        // No need to sort the entire book here if managed correctly
        return updateOrderbook;
    }

    /**
     * Finds the correct insertion index for a new price level in a sorted order book.
     * This method uses a binary search algorithm to efficiently find the position.
     * @param price The price of the new order to insert.
     * @param orderbook The current state of the order book (bids or asks).
     * @param bookSide The side of the book being updated (bids or asks).
     * @returns The index at which the new price level should be inserted.
     */
    private findInsertionIndex(price: number, orderbook: PriceLevel[], bookSide: BookSide): number {
        let start = 0;
        let end = orderbook.length - 1;

        while (start <= end) {
            const mid = Math.floor((start + end) / 2);
            const midPrice = orderbook[mid].price;

            if (midPrice === price) {
                // Exact match found, return this index
                return mid;
            }

            if (bookSide === BookSide.BIDS) {
                // For bids, the order is descending
                if (price > midPrice) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            } else {
                // For asks, the order is ascending
                if (price < midPrice) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            }
        }

        // If we don't find an exact match, return the start index
        // This is where the new price level should be inserted to maintain order
        return start;
    }

    /**
     * Cleans up the orderbook by removing small orders and correcting inverse orderbook situations.
     * @param symbol - The market symbol for the orderbook to clean up.
     * @param stepSize - The minimum size of an order to be considered valid. Orders smaller than this size are removed.
     */
    public cleanupOrderbook(symbol: string, stepSize: string): void {
        // Remove small orders
        this.removeSmallOrders(symbol, stepSize)

        // Check for and correct inverse orderbook
        if (this.orderbook[symbol].bids.length > 0 && this.orderbook[symbol].asks.length > 0) {
            const highestBid = this.orderbook[symbol].bids[0].price;
            const lowestAsk = this.orderbook[symbol].asks[0].price;

            if (highestBid > lowestAsk) {
                console.warn(`Inverse orderbook detected for ${symbol}. Correcting...`);
                this.correctInverseOrderbook(symbol)
            }
        }
    }

    /**
     * Removes orders from the orderbook that are smaller than the specified step size.
     * This method is used to filter out small orders that are effectively zero but have not been
     * explicitly removed from the orderbook.
     * @param symbol - The market symbol for the orderbook to clean up.
     * @param stepSize - The minimum size of an order to be considered valid. Orders smaller than this size are removed.
     */
    private removeSmallOrders(symbol: string, stepSize: string): void {
        this.orderbook[symbol].bids = this.orderbook[symbol].bids.filter(order => order.size > parseFloat(stepSize));
        this.orderbook[symbol].asks = this.orderbook[symbol].asks.filter(order => order.size > parseFloat(stepSize));
    }

    /**
     * Corrects an inverse orderbook situation for the specified symbol. Inverse orderbook occurs
     * when the highest bid price is greater than the lowest ask price. This method resolves the situation
     * by removing the top bid and ask orders until the orderbook is no longer inverse.
     * @param symbol - The market symbol for which to correct the inverse orderbook.
     */
    private correctInverseOrderbook(symbol: string): void {
        // Implement logic to correct the inverse orderbook
        // This might involve removing orders or other corrective actions
        // For example, removing the top bid and ask until the orderbook is no longer inverse
        while (this.orderbook[symbol].bids.length > 0 && this.orderbook[symbol].asks.length > 0
        && this.orderbook[symbol].bids[0].price > this.orderbook[symbol].asks[0].price) {
            this.orderbook[symbol].bids.shift();
            this.orderbook[symbol].asks.shift();
        }
    }

    /**
     * Resets the order book to its initial state.
     */
    public cleanupOb(): void {
        this.symbols.forEach(symbol => this.initializeOrderbookDataForSymbol(symbol))
    }
}