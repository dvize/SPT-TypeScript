import type { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import type { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import type { DependencyContainer } from 'tsyringe';
import type { DynamicRouterModService } from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import type { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import type { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import type { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import type { HashUtil } from "@spt-aki/utils/HashUtil";
import type { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import type { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import type { Item, Location, Upd } from '@spt-aki/models/eft/common/tables/IItem';
import type { SaveServer } from '@spt-aki/servers/SaveServer';
import type { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import type { ITemplateItem } from '@spt-aki/models/eft/common/tables/ITemplateItem';
import type { LocaleService } from "@spt-aki/services/LocaleService";
import type { TradeHelper } from '@spt-aki/helpers/TradeHelper';
import type { TraderHelper} from '@spt-aki/helpers/TraderHelper';
import type { JsonUtil } from "@spt-aki/utils/JsonUtil";
import type { RandomUtil } from "@spt-aki/utils/RandomUtil";
import type { AbstractWinstonLogger } from '@spt-aki/utils/logging/AbstractWinstonLogger';
import type { InventoryHelper } from "@spt-aki/helpers/InventoryHelper";
import type { IItemEventRouterResponse } from "@spt-aki/models/eft/itemEvent/IItemEventRouterResponse";
import type { HandbookHelper } from "@spt-aki/helpers/HandbookHelper";
import type { IAddItemDirectRequest } from "@spt-aki/models/eft/inventory/IAddItemDirectRequest";
import type { VFS } from "@spt-aki/utils/VFS";
import { jsonc } from "jsonc";
import path from "node:path";
import type { TProfileChanges } from "@spt-aki/models/eft/itemEvent/IItemEventRouterBase";


interface Config {
    KeepUnsoldItems: boolean;
    PriceMultiplier: number;
    Containers: ContainersConfig;
    RemoveContainerRestriction: boolean;
    IgnoreFollowingItemTPLInContainers: string[];
}

interface ContainersConfig {
    Labels: string[];
}


class PAutoSell implements IPreAkiLoadMod, IPostAkiLoadMod {
    private vfs: VFS;
    private logger: AbstractWinstonLogger;
    private profileHelper: ProfileHelper;
    private hashUtil: HashUtil;
    private ragfairPriceService: RagfairPriceService;
    private saveServer: SaveServer;
	private localeService: LocaleService;
    private itemHelper: ItemHelper;
	private handbookHelper: HandbookHelper;
    private databaseServer: DatabaseServer;
    private tradeHelper: TradeHelper;
    private traderHelper: TraderHelper;
    private jsonUtil: JsonUtil;
	private inventoryHelper: InventoryHelper;
    private randomUtil: RandomUtil;
    private modConfig: Config;
    private itemsDatabase: Record<string, ITemplateItem>;
	private totalRoubles: number; //used to keep track of total roubles earned from selling items after currency conversion
	private itemsToRemove: Item[] = []; //used to keep track of items to remove from inventory

	private validContainerTypesList = [
		"5795f317245977243854e041", // Common Container
		"5448bf274bdc2dfc2f8b456a", // Portable Container
		"5448e53e4bdc2d60728b4567"  // Backpack
	];

    preAkiLoad(container: DependencyContainer): void {
		this.setupRouterServices(container);
        this.setupServices(container);
		this.modConfig = this.loadConfig();
    }

    postAkiLoad(container: DependencyContainer): void {
		this.itemsDatabase = this.databaseServer.getTables().templates.items;
		this.checkContainerRestrictions();
        this.logger.info('PAutoSell: Post Aki Load Setup Complete');
    }

	private setupRouterServices(container: DependencyContainer): void {
		const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
		
		//testing static router but won't show unless logout server.  Testing only so i don't have to run raids.
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

    private setupServices(container: DependencyContainer): void {
        this.logger = container.resolve<AbstractWinstonLogger>("WinstonLogger");
		this.localeService = container.resolve<LocaleService>("LocaleService");
        this.profileHelper = container.resolve<ProfileHelper>("ProfileHelper");
		this.inventoryHelper = container.resolve<InventoryHelper>("InventoryHelper");
        this.hashUtil = container.resolve<HashUtil>("HashUtil");
        this.ragfairPriceService = container.resolve<RagfairPriceService>("RagfairPriceService");
        this.saveServer = container.resolve<SaveServer>("SaveServer");
        this.itemHelper = container.resolve<ItemHelper>("ItemHelper");
		this.handbookHelper = container.resolve<HandbookHelper>("HandbookHelper");
        this.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        this.tradeHelper = container.resolve<TradeHelper>("TradeHelper");
        this.traderHelper = container.resolve<TraderHelper>("TraderHelper");
        this.jsonUtil = container.resolve<JsonUtil>("JsonUtil");
        this.randomUtil = container.resolve<RandomUtil>("RandomUtil");
        this.vfs = container.resolve<VFS>("VFS");
    }

    private loadConfig(): Config {
        const configFile = path.resolve(__dirname, "../config/config.jsonc");
		if(!configFile) {
			this.logger.error(`PAutoSell: Config file not found at ${configFile}`);
			return;
		}

        return jsonc.parse(this.vfs.readFile(configFile));
    }

	checkContainerRestrictions(): void {
		if (!this.modConfig.RemoveContainerRestriction) {
			return;
		}
		
		const filteredItems: ITemplateItem[] = Object.values(this.itemsDatabase).filter((itemtemp: ITemplateItem) =>
			this.validContainerTypesList.includes(itemtemp._parent)
		);

		if (this.modConfig.RemoveContainerRestriction) {
			for (const myItem of filteredItems) {
				myItem._props.Grids[0]._props.filters = [];
				this.logger.info(`PAutoSell: Removing Container Restriction from ${myItem._id} (${myItem._name})`);
			}
		}
	  
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private exchangeItems(url: string, info: any, sessionID: string, output: string): void {
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
		}
		);

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
			const IItemEventRouterResponse: IItemEventRouterResponse = null;
			this.inventoryHelper.removeItem(pmcData, item._id, sessionID, IItemEventRouterResponse);
		}
		);

		// take total roubles (already converted) and add to the stash
		const currency = this.getCurrencyTemplate("RUB");
		const currencyAmount = Math.floor(this.totalRoubles);

		//log total roubles earned
		this.logger.info(`PAutoSell: Total Roubles earned: ${currencyAmount} and sent to stash`);

		//don't create roubles stack if total is 0 or invalid
		if (currencyAmount <= 0) {
			return;
		}
		
		//generate a new item with the currency
		const playerMoney: Item = {
			_id: this.hashUtil.generate(),
			_tpl: currency,
			location: null,
			upd: {
				StackObjectsCount: currencyAmount,
			}
		};
		
		const request: IAddItemDirectRequest = {
                itemWithModsToAdd: [playerMoney],
                foundInRaid: false,
                useSortingTable: false,
                callback: null,
		};

		const output2: IItemEventRouterResponse = {
			warnings: [],
			profileChanges: <TProfileChanges>{
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

	private getAllItemsInContainer(container: Item, allItems: Item[]): Item[] {
		// Process items for containers containing other items as well as just items
		const itemsToProcess: Item[] = [container];
		const containerItems: Item[] = [];
		let isFirstContainer = true; // Flag to check if the current container is the first one processed
	
		while (itemsToProcess.length > 0) {
			
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
						const currentContainer = itemsToProcess.pop()!;
			
			// Only add the container to the list if it is not the first container processed
			if (!isFirstContainer) {
				containerItems.push(currentContainer);
			}

			isFirstContainer = false;
	
			for (const item of allItems) {
				if (item.parentId === currentContainer._id) {
					
					// Check if this item is a container by examining if it has any grids defined
					const itemTemplate = this.itemsDatabase[item._tpl];
					const isContainer = itemTemplate?._props?.Grids && itemTemplate._props.Grids.length > 0;
					if (isContainer) {
						itemsToProcess.push(item); // Add to stack to process later
					} else {
						containerItems.push(item); // Add non-container items to the list to be sold.
					}
				}
			}
		}
	
		return containerItems;
	}

    private shouldItemBeSold(item: Item): boolean {
        return !this.modConfig.IgnoreFollowingItemTPLInContainers.includes(item._tpl.toLowerCase());
    }

    private findAvailableTrader(item: Item): string | null {
		// Get all traders from the database tables
		let traders = Object.keys(this.databaseServer.getTables().traders)
			.filter(traderId => {
				const trader = this.databaseServer.getTables().traders[traderId].base;
				if (!trader.items_buy?.category) return false;
				
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

	private sellItem(item: Item, traderId: string, sessionId: string, itemsModList: Item[]): void {
		//add null check for itemsDatabase, traders, and traderId
		
		if (!this.databaseServer.getTables().traders || !traderId) {
			this.logger.error(`PAutoSell: Database tables or trader not found for traderId: ${traderId}`);
			return;
		}
		
		const trader = this.databaseServer.getTables().traders[traderId].base;

		//apparently price already includes currency conversion to rubles; rounding due to multiplication and decimals
		const priceItem = Math.floor(this.traderHelper.getHighestSellToTraderPrice(item._tpl) * this.modConfig.PriceMultiplier); 

		//item can be stackable (bullets, etc) so we need to multiply by the number in the stack
		const stackObjectCount =  item.upd?.StackObjectsCount ?? 1;
		const price = priceItem * stackObjectCount;

		const itemName = this.getItemName(item._tpl);
		this.logger.info(`Selling item ${itemName} to trader ${trader.nickname} for ${priceItem} RUB (${price} RUB total)`);

		// Update the sales sum for the trader
		this.updateTraderSalesSum(traderId, price, sessionId);

		// Add the money to total roubles ongoing total
		this.totalRoubles += price;

		// Remove the item from the inventory
		this.removeItemFromInventory(item);
	}


	private sellItemForHandbookValue(item: Item, itemsModList: Item[]): void {
        const handbookPrice = this.handbookHelper.getTemplatePrice(item._tpl);
        this.logger.info(`Selling unsold item ${this.getItemName(item._tpl)} for handbook value ${handbookPrice}`);
        
		//add to total roubles instead
		this.totalRoubles += handbookPrice;

		//mark item for removal by removing from itemsModList
		this.removeItemFromInventory(item);
    }

	

    private getCurrencyTemplate(currency: string): string {
        switch (currency.toLowerCase()) {
            case "usd": return "5696686a4bdc2da3298b456a";  // Item ID for Dollars
            case "eur": return "569668774bdc2da2298b4568";  // Item ID for Euros
            default: return "5449016a4bdc2d6f028b456f";  // Item ID for Roubles
        }
    }

    private getCurrencyExchangeRate(currency: string): number {
        switch (currency.toLowerCase()) {
            case "usd": return 121;  // Assuming exchange rate from RUB to USD
            case "eur": return 134;  // Assuming exchange rate from RUB to EUR
            default: return 1;  // Default is RUB, no conversion needed
        }
    }

    private removeItemFromInventory(item: Item): void {
        //search allPlayerItems for the item to remove and store in global ItemsToRemove
		this.itemsToRemove.push(item);
    }

    private updateTraderSalesSum(traderId: string, amount: number, sessionId: string): void {
		//Amount is in roubles; Need to get currency from trader and apply exchange rate
		const trader = this.databaseServer.getTables().traders[traderId].base;
		const currency = trader.currency; // "RUB", "USD", "EUR"
		const exchangeRate = this.getCurrencyExchangeRate(currency);
		let adjustedAmount = Math.floor(amount / exchangeRate);

		//Weird case; if the adjusted amount is less than 0 after conversion, give at least 1 of that currency
		if (amount >= 0 && adjustedAmount <= 0) {
			adjustedAmount = 1; 
		}

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
	
		pmcData.TradersInfo[traderId].salesSum += adjustedAmount;
		this.logger.info(`Updated sales sum for trader ${this.getTraderNickName(traderId)}: ${pmcData.TradersInfo[traderId].salesSum} ${currency}`);
		this.traderHelper.lvlUp(traderId, pmcData);  
	}

	private getItemName(itemtpl: string) 
	{
		return this.localeService.getLocaleDb()[`${itemtpl} Name`];
	}

	private getTraderNickName(traderId: string) 
	{
		return this.localeService.getLocaleDb()[`${traderId} Nickname`];
	}
	
	
}

module.exports = { mod: new PAutoSell() }