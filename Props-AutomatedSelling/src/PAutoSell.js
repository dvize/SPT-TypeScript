"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonc_1 = require("C:/snapshot/project/node_modules/jsonc");
const node_path_1 = __importDefault(require("node:path"));
class PAutoSell {
    vfs;
    logger;
    profileHelper;
    hashUtil;
    ragfairPriceService;
    saveServer;
    localeService;
    itemHelper;
    handbookHelper;
    databaseServer;
    tradeHelper;
    traderHelper;
    jsonUtil;
    inventoryHelper;
    randomUtil;
    modConfig;
    itemsDatabase;
    totalRoubles; //used to keep track of total roubles earned from selling items after currency conversion
    itemsToRemove = []; //used to keep track of items to remove from inventory
    preAkiLoad(container) {
        this.setupRouterServices(container);
        this.setupServices(container);
        this.modConfig = this.loadConfig();
    }
    postAkiLoad(container) {
        this.itemsDatabase = this.databaseServer.getTables().templates.items;
        this.checkContainerRestrictions();
        this.logger.info('PAutoSell: Post Aki Load Setup Complete');
    }
    setupRouterServices(container) {
        const dynamicRouterModService = container.resolve("DynamicRouterModService");
        const staticRouterModService = container.resolve("StaticRouterModService");
        // testing static router but won't show unless logout server.  Testing only so i don't have to run raids.
        // staticRouterModService.registerStaticRouter("StaticAkiRaidSave PAutoSellTesting", [{
        // 	url: "/singleplayer/settings/raid/menu",
        // 	action: (url, info, sessionID, output) => {
        // 		this.exchangeItems(url, info, sessionID, output);
        // 		return output;
        // 	}
        // }], "aki");   
        //Raid Saving (End of raid)
        staticRouterModService.registerStaticRouter("StaticAkiRaidSave PAutoSell", [{
                url: "/raid/profile/save",
                action: (url, info, sessionID, output) => {
                    this.exchangeItems(url, info, sessionID, output);
                    return output;
                }
            }], "aki");
    }
    setupServices(container) {
        this.logger = container.resolve("WinstonLogger");
        this.localeService = container.resolve("LocaleService");
        this.profileHelper = container.resolve("ProfileHelper");
        this.inventoryHelper = container.resolve("InventoryHelper");
        this.hashUtil = container.resolve("HashUtil");
        this.ragfairPriceService = container.resolve("RagfairPriceService");
        this.saveServer = container.resolve("SaveServer");
        this.itemHelper = container.resolve("ItemHelper");
        this.handbookHelper = container.resolve("HandbookHelper");
        this.databaseServer = container.resolve("DatabaseServer");
        this.tradeHelper = container.resolve("TradeHelper");
        this.traderHelper = container.resolve("TraderHelper");
        this.jsonUtil = container.resolve("JsonUtil");
        this.randomUtil = container.resolve("RandomUtil");
        this.vfs = container.resolve("VFS");
    }
    loadConfig() {
        const configFile = node_path_1.default.resolve(__dirname, "../config/config.jsonc");
        if (!configFile) {
            this.logger.error(`PAutoSell: Config file not found at ${configFile}`);
            return;
        }
        return jsonc_1.jsonc.parse(this.vfs.readFile(configFile));
    }
    checkContainerRestrictions() {
        if (!this.modConfig.RemoveContainerRestriction) {
            return;
        }
        const validContainerTypesList = [
            "5795f317245977243854e041", //Common Container
            "5448bf274bdc2dfc2f8b456a", //Portable Container
            "5448e53e4bdc2d60728b4567" //Backpack
        ];
        const filteredItems = Object.values(this.itemsDatabase).filter((itemtemp) => validContainerTypesList.includes(itemtemp._parent));
        if (this.modConfig.RemoveContainerRestriction) {
            for (const myItem of filteredItems) {
                myItem._props.Grids[0]._props.filters = [];
                this.logger.info(`PAutoSell: Removing Container Restriction from ${myItem._id} (${myItem._name})`);
            }
        }
    }
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    exchangeItems(url, info, sessionID, output) {
        const pmcData = this.profileHelper.getPmcProfile(sessionID);
        //reset items to remove each time we run this
        this.itemsToRemove = [];
        this.totalRoubles = 0;
        if (pmcData === null) {
            this.logger.info("PAutoSell: pmcData is null, unable to grab profile");
            return;
        }
        const allPlayerItems = pmcData.Inventory.items;
        // find which containers we can access based on config and tags
        const containers = allPlayerItems.filter(item => {
            const template = this.itemsDatabase[item._tpl];
            if (!template) {
                return false;
            }
            const tags = item.upd?.Tag?.Name;
            if (!tags) {
                return false;
            }
            const containerTags = this.modConfig.Containers.Labels;
            return containerTags.some(tag => tags.includes(tag));
        });
        //log which containers were found with tag label
        // biome-ignore lint/complexity/noForEach: <explanation>
        containers.forEach(container => {
            this.logger.info(`PAutoSell: Found container with label tag: ${container.upd?.Tag.Name}`);
        });
        // for each item that is found in the containers, we will sell them
        // biome-ignore lint/complexity/noForEach: <explanation>
        containers.forEach(container => {
            const containerItems = this.getAllItemsInContainer(container, allPlayerItems);
            // biome-ignore lint/complexity/noForEach: <explanation>
            containerItems.forEach(item => {
                if (this.shouldItemBeSold(item)) {
                    const traderId = this.findAvailableTrader(item);
                    if (traderId) {
                        this.sellItem(item, traderId, sessionID, allPlayerItems);
                    }
                    else {
                        if (!this.modConfig.KeepUnsoldItems) {
                            this.logger.info(`PAutoSell: No trader found for item: ${this.getItemName(item._tpl)}, Selling for handbook value`);
                            this.sellItemForHandbookValue(item, allPlayerItems);
                        }
                        else {
                            this.logger.info(`PAutoSell: Keeping unsold item: ${this.getItemName(item._tpl)}`);
                        }
                    }
                }
            });
        });
        //actually remove/sell items from the inventory
        // biome-ignore lint/complexity/noForEach: <explanation>
        this.itemsToRemove.forEach(item => {
            const IItemEventRouterResponse = null;
            this.inventoryHelper.removeItem(pmcData, item._id, sessionID, IItemEventRouterResponse);
        });
        // take total roubles (already converted) and add to the stash
        const currency = this.getCurrencyTemplate("RUB");
        const currencyAmount = Math.floor(this.totalRoubles);
        //generate a new item with the currency
        const playerMoney = {
            _id: this.hashUtil.generate(),
            _tpl: currency,
            location: null,
            upd: {
                StackObjectsCount: currencyAmount,
            }
        };
        const request = {
            itemWithModsToAdd: [playerMoney],
            foundInRaid: false,
            useSortingTable: false,
            callback: null,
        };
        const output2 = {
            warnings: [],
            profileChanges: {
                [sessionID]: {
                    items: {
                        new: [],
                        change: [],
                        del: []
                    }
                }
            }
        };
        this.inventoryHelper.addItemToStash(sessionID, request, pmcData, output2);
        //save changes to profile.. probably don't need to do this here anymore
        //this.saveServer.saveProfile(sessionID);
    }
    getAllItemsInContainer(container, items) {
        //if the item parent id is equal to the container id, then it is in the container
        const containerItems = items.filter(item => item.parentId === container._id);
        return containerItems;
    }
    shouldItemBeSold(item) {
        return !this.modConfig.IgnoreFollowingItemTPLInContainers.includes(item._tpl.toLowerCase());
    }
    findAvailableTrader(item) {
        // Get all traders from the database tables
        let traders = Object.keys(this.databaseServer.getTables().traders)
            .filter(traderId => {
            const trader = this.databaseServer.getTables().traders[traderId].base;
            if (!trader.items_buy?.category)
                return false;
            // Replace the array of ids with the actual names
            const itemsBuyCategoryIds = trader.items_buy.category;
            //const itemsBuyCategoryNames = trader.items_buy.category.map((id: string) => this.getItemName(id));
            const itemParentId = this.itemsDatabase[item._tpl]._parent;
            //const itemParentName = this.getItemName(itemParentId);
            const itemParentParentId = this.itemsDatabase[itemParentId]._parent;
            //const itemParentParentName = this.getItemName(itemParentParentId);
            // Log the information with item category names and parent name
            // this.logger.info(`PAutoSell: Trader ${this.getTraderNickName(traderId)} buys categories ${itemsBuyCategoryNames.join(", ")}
            // and the item's parent: ${itemParentName} and parent parent: ${itemParentParentName}\n`);
            // Check if the array of names includes the item's parentName or parentParentName
            return itemsBuyCategoryIds.includes(itemParentId) || itemsBuyCategoryIds.includes(itemParentParentId);
        });
        // Remove wierd traders
        const tradersToRemove = new Set([
            "579dc571d53a0658a154fbec", // fence trader ID
            "656f0f98d80a697f855d34b1", // btrDriver
        ]);
        // Filter out the traders that need to be removed
        traders = traders.filter(traderId => !tradersToRemove.has(traderId));
        // Return a random trader ID or null if no traders are found
        return traders.length > 0 ? this.randomUtil.getArrayValue(traders) : null;
    }
    sellItem(item, traderId, sessionId, itemsModList) {
        //add null check for itemsDatabase, traders, and traderId
        if (!this.databaseServer.getTables().traders || !traderId) {
            this.logger.error(`PAutoSell: Database tables or trader not found for traderId: ${traderId}`);
            return;
        }
        const trader = this.databaseServer.getTables().traders[traderId].base;
        const price = this.traderHelper.getHighestSellToTraderPrice(item._tpl) * this.modConfig.PriceMultiplier;
        const itemName = this.getItemName(item._tpl);
        //need to get currency from trader and apply exchange rate
        const currency = trader.currency; // "RUB", "USD", "EUR"
        const exchangeRate = this.getCurrencyExchangeRate(currency);
        const adjustedAmount = Math.floor(price * exchangeRate);
        this.logger.info(`Selling item ${itemName} to trader ${trader.nickname} for ${price} ${trader.currency} \n and after currency exchange adjusted to ${adjustedAmount} roubles`);
        // Update the sales sum for the trader
        this.updateTraderSalesSum(traderId, price, sessionId);
        // Add the money to total roubles ongoing total
        this.totalRoubles += adjustedAmount;
        // Remove the item from the inventory
        this.removeItemFromInventory(item);
    }
    sellItemForHandbookValue(item, itemsModList) {
        const handbookPrice = this.handbookHelper.getTemplatePrice(item._tpl);
        this.logger.info(`Selling unsold item ${this.getItemName(item._tpl)} for handbook value ${handbookPrice}`);
        //add to total roubles instead
        this.totalRoubles += handbookPrice;
        //mark item for removal by removing from itemsModList
        this.removeItemFromInventory(item);
    }
    getCurrencyTemplate(currency) {
        switch (currency.toLowerCase()) {
            case "usd": return "5696686a4bdc2da3298b456a"; // Item ID for Dollars
            case "eur": return "569668774bdc2da2298b4568"; // Item ID for Euros
            default: return "5449016a4bdc2d6f028b456f"; // Item ID for Roubles
        }
    }
    getCurrencyExchangeRate(currency) {
        switch (currency.toLowerCase()) {
            case "usd": return 121; // Assuming exchange rate from RUB to USD
            case "eur": return 134; // Assuming exchange rate from RUB to EUR
            default: return 1; // Default is RUB, no conversion needed
        }
    }
    removeItemFromInventory(item) {
        //search allPlayerItems for the item to remove and store in global ItemsToRemove
        this.itemsToRemove.push(item);
    }
    updateTraderSalesSum(traderId, amount, sessionId) {
        const pmcData = this.profileHelper.getPmcProfile(sessionId);
        if (!pmcData.TradersInfo[traderId]) {
            pmcData.TradersInfo[traderId] = {
                salesSum: 0,
                standing: 1,
                unlocked: true,
                disabled: false,
                loyaltyLevel: 1,
                nextResupply: 0
            };
        }
        pmcData.TradersInfo[traderId].salesSum += amount;
        this.logger.info(`Updated sales sum for trader ${this.getTraderNickName(traderId)}: ${pmcData.TradersInfo[traderId].salesSum}`);
        this.traderHelper.lvlUp(traderId, pmcData);
    }
    getItemName(itemtpl) {
        return this.localeService.getLocaleDb()[`${itemtpl} Name`];
    }
    getTraderNickName(traderId) {
        return this.localeService.getLocaleDb()[`${traderId} Nickname`];
    }
}
module.exports = { mod: new PAutoSell() };
//# sourceMappingURL=PAutoSell.js.map