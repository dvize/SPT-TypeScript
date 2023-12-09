import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { DependencyContainer } from 'tsyringe';
import { DynamicRouterModService } from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { Item, Location, Upd } from '@spt-aki/models/eft/common/tables/IItem';
import { SaveServer } from '@spt-aki/servers/SaveServer';
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { ITemplateItem } from '@spt-aki/models/eft/common/tables/ITemplateItem';
import { LocaleService } from "@spt-aki/services/LocaleService";
import { TradeHelper } from '@spt-aki/helpers/TradeHelper';
import { TraderHelper} from '@spt-aki/helpers/TraderHelper';
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { RandomUtil } from "@spt-aki/utils/RandomUtil";
import { TraderData, TraderInfo } from "@spt-aki/models/eft/common/tables/IBotBase";
import { ITraderBase } from "@spt-aki/models/eft/common/tables/ITrader";
import { ITrader } from '@spt-aki/models/eft/common/tables/ITrader';
import { Info } from '../types/models/eft/common/tables/IBotBase';
import { AddItem } from '../types/models/eft/inventory/IAddItemRequestData';

let Logger;
let config : Config;
let profileHelper: ProfileHelper;
let hashUtil: HashUtil;
let ragfairPriceService: RagfairPriceService;
let moneyTotal: number;
let pmcData: IPmcData;
let itemsModList: Item[];
let saveServer: SaveServer;
let itemHelper: ItemHelper;
let databaseServer: DatabaseServer;
let database;
let localeService: LocaleService;
let tradeHelper: TradeHelper;
let traderHelper: TraderHelper;
let moneyTotalExchanged: number;
let containers;
let actualElement: number;
let jsonUtil: JsonUtil;
let traderId: string;
let randomUtil: RandomUtil;

const modName = "PAutoSell";
let modFolder: string;

let traderKey =
{
	"mechanic" : "5a7c2eca46aef81a7ca2145d",
	"ragman" : "5ac3b934156ae10c4430e83c",
	"jaeger" : "5c0647fdd443bc2504c2d371",
	"prapor" : "54cb50c76803fa8b248b4571",
	"therapist" : "54cb57776803fa99248b456e",
	"fence" : "579dc571d53a0658a154fbec",
	"lighthousekeeper" : "638f541a29ffd1183d187f57",
	"peacekeeper" : "5935c25fb3acc3127c3d8cd9",
	"skier" : "58330581ace78e27b8b10cee"
}

let traderSellingTable : Record<string, number>;


class PAutoSell implements IPreAkiLoadMod, IPostAkiLoadMod  {

	preAkiLoad(container: DependencyContainer): void {
		Logger = container.resolve("WinstonLogger");
		let dir = __dirname;
		let dirArray = dir.split("\\");
		modFolder = (`${dirArray[dirArray.length - 4]}/${dirArray[dirArray.length - 3]}/${dirArray[dirArray.length - 2]}/`);

		//set config checks early in case i need to not setup dynamic/static routers.
		
		const dynamicRouterModService = container.resolve<DynamicRouterModService>("DynamicRouterModService");
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");
		
		// testing static router but won't show unless logout server.  Testing only so i don't have to run raids.
		/* staticRouterModService.registerStaticRouter(`StaticAkiRaidSave${modName}`, [{
			url: "/singleplayer/settings/raid/menu",
			action: (url, info, sessionID, output) => {
				this.exchangeItems(url, info, sessionID, output);
				return output;
			}
		}], "aki");   */

		//Raid Saving (End of raid)
		staticRouterModService.registerStaticRouter(`StaticAkiRaidSave${modName}`, [{
			url: "/raid/profile/save",
			action: (url, info, sessionID, output) => {
				this.exchangeItems(url, info, sessionID, output);
				return output;
			}
		}], "aki"); 
	}

	postAkiLoad(container: DependencyContainer): void 
	{
		this.setupInitialValues(container);
	}

	setupInitialValues(container: DependencyContainer) {
		
		ragfairPriceService = container.resolve("RagfairPriceService");
		jsonUtil = container.resolve("JsonUtil");
		const fs = require("fs");
		const configPath = `${modFolder}/config/config.json5`;
		const jsonString = fs.readFileSync(configPath, "utf8");
		config = jsonUtil.deserializeJson5(jsonString, configPath);
		Logger.info('PAutoSell: SetupInitialValues');
		profileHelper = container.resolve("ProfileHelper");
		hashUtil = container.resolve("HashUtil");
		saveServer = container.resolve("SaveServer");
		itemHelper = container.resolve("ItemHelper");
		databaseServer = container.resolve("DatabaseServer");
		database = databaseServer.getTables().templates;
		localeService = container.resolve("LocaleService");
		tradeHelper = container.resolve("TradeHelper");
		traderHelper = container.resolve("TraderHelper");
		randomUtil = container.resolve("RandomUtil");

		this.checkContainerRestrictions();
	}

	checkContainerRestrictions(): void {
		const validContainerTypesList = [
			"5795f317245977243854e041", //Common Container
			"5448bf274bdc2dfc2f8b456a", //Portable Container
			"5448e53e4bdc2d60728b4567" //Backpack
		];
		
		const filteredItems = Object.values(database.items).filter((itemtemp: ITemplateItem) =>
		  validContainerTypesList.includes(itemtemp._parent)
		);
	  
		if (config.RemoveContainerRestriction) {
		  filteredItems.forEach((myItem : ITemplateItem) => {
			myItem._props.Grids[0]._props.filters = [];
			Logger.info(`PAutoSell: Removing Container Restriction from ${myItem._id} (${myItem._name})`);
		  });
		}
	  }

	  exchangeItems(url: string, info, sessionId: string, output) {
		this.setupProfile(sessionId);

		//reset moneyTotal to 0
		traderSellingTable = {
			"5a7c2eca46aef81a7ca2145d" : 0,
			"5ac3b934156ae10c4430e83c" : 0,
			"5c0647fdd443bc2504c2d371" : 0,
			"54cb50c76803fa8b248b4571" : 0,
			"54cb57776803fa99248b456e" : 0,
			"579dc571d53a0658a154fbec" : 0,
			"638f541a29ffd1183d187f57" : 0,
			"5935c25fb3acc3127c3d8cd9" : 0,
			"58330581ace78e27b8b10cee" : 0,
		};

		const pmcData = profileHelper.getPmcProfile(sessionId);
		const items = pmcData.Inventory.items;
		const itemsModList = PAutoSell.clone(items);
	
		const containers = this.findTaggedContainers(items);
	
		for (const container of containers) {
			actualElement = this.findActualElement(container);
	
			for (const item of items) {
				if (item.parentId === container._id) {
					const itemTpl = item._tpl.toLowerCase();
	
					if (config.IgnoreFollowingItemTPLInContainers.map(i => i.toLowerCase()).includes(itemTpl)) {
						continue;
					}
	
					traderId = PAutoSell.FindAvailableTrader(item);
					this.sellItem(item, items, itemsModList, sessionId, actualElement, traderId);
				}
			}

			const currency = config.Containers.Currency[actualElement].toLowerCase();
			this.processMoneyExchange(container, items, itemsModList, sessionId, traderId);
		}
	
		pmcData.Inventory.items = itemsModList;
	
		saveServer.saveProfile(sessionId);
	}
	
	setupProfile(sessionId: string) {
		saveServer.saveProfile(sessionId);
		saveServer.loadProfile(sessionId);
	}
	
	findTaggedContainers(items) {
		return items.filter(item => {
			const tagName = (item.upd?.Tag?.Name || '').toLowerCase();
			return config.Containers.Labels.map(label => label.toLowerCase()).includes(tagName);
		});
	}
	
	findActualElement(container) {
		const actualElement = config.Containers.Labels.findIndex(label => label.toLowerCase() === container.upd.Tag.Name.toLowerCase());
		Logger.info(`actualElement: ${actualElement}`);
		return config.Containers.Labels.findIndex(label => label.toLowerCase() === container.upd.Tag.Name.toLowerCase());
	}
	
	sellItem(item, items, itemsModList, sessionId, actualElement, traderId) {
		//increment selling table for trader based on item, the config.priceMultiplier, and the stack size

		const stack = item.upd?.StackObjectsCount || 1;
		traderSellingTable[traderId] += Math.floor(PAutoSell.getPrice(item._tpl, items, item, sessionId, traderId) * stack * config.PriceMultiplier);

		PAutoSell.removeItemFromPlayerInventory(items, item, itemsModList);
	}

	//find traders that the item's parent is in the buy list for and then return one of them randomly from traderKey
	private static FindAvailableTrader(item: Item) : string {
		let listofTraders : ITraderBase[] = [];
		let iitem : [boolean, ITemplateItem] = itemHelper.getItem(item._tpl);

		Logger.info(`PAutoSell: Finding Trader for Item: ${PAutoSell.getItemName(item._tpl)}`);
		// Get an array of traderKey values
		const traderValues = Object.values(traderKey);

		for (const traderId of traderValues) {
			const trader: ITraderBase = databaseServer.getTables().traders[traderId]?.base;
			Logger.info(`PAutoSell: Checking item against Trader: ${trader.nickname}`);
			if (trader) {
				// Check if the item parent/category is contained within the trader's buy list
				if (itemHelper.doesItemOrParentsIdMatch(item._tpl, trader.items_buy.category)) {
					// Add them to the list of traders that will buy the item
					Logger.info(`PAutoSell: Trader ${trader.nickname} Found for Item: ${PAutoSell.getItemName(item._tpl)}`);
					listofTraders.push(trader);
				}
			}
		}

		//pick a random trader from the list of traders that will buy the item
		let traderToUse : ITraderBase = randomUtil.getArrayValue(listofTraders);
		Logger.info(`PAutoSell: Final Trader Found for Item: ${traderToUse.nickname}`);
		return traderToUse._id;
	}

	//process for all traders at the end
	processMoneyExchange(container, items, itemsModList, sessionId, traderId) {
		
		//we have finished selling all items so actually process transaction from trader selling table
		//loop through tradersellingtable values

		let moneyTotal : number = 0;

		for (const [key, value] of Object.entries(traderSellingTable)) {
			const trader = traderHelper.getTrader(key, sessionId);

			Logger.info(`PAutoSell: Trader ${trader.nickname} has ${value} to process`);

			//update trader sales history by value
			if(value > 0){
				this.updateTraderSalesSum(value, trader);
				moneyTotal += value;
			}
		}

		// grab the money total and check if currency exchange is needed
		const currency = config.Containers.Currency[actualElement].toLowerCase();

		//method checks currency
		PAutoSell.addMoneyToInventory(items, currency, moneyTotal, container.slotId, container.location, container._id, itemsModList);

		saveServer.saveProfile(sessionId);
	}
	
	updateTraderSalesSum(moneyTotal, myTrader : ITraderBase) {
		// Check if pmcData, tradersinfo, and the specific trader exists
		if (pmcData.TradersInfo[myTrader._id]) {
			const newExchangeRate = this.getExchangeRate(myTrader.currency);
			let moneyTotalConverted = Math.floor(moneyTotal * newExchangeRate);

			const saleSum = pmcData.TradersInfo[myTrader._id].salesSum + moneyTotalConverted;

			pmcData.TradersInfo[myTrader._id].salesSum = saleSum;
			traderHelper.lvlUp(myTrader._id, pmcData);

		} else {
			// Need to create that trade data for the trader in the profile

			Logger.info(`PAutoSell: Creating Trader Data for ${myTrader.nickname} since it does not exist`)
			let newTraderData: Record<string, TraderInfo> = {
				[myTrader._id]: {
					salesSum: 0,
					standing: 1,
					unlocked: true,
					disabled: false,
					loyaltyLevel: 1,
					nextResupply: 0
				} as TraderInfo
			};

			let cloneData = PAutoSell.clone(pmcData.TradersInfo);
			cloneData[myTrader._id] = newTraderData[myTrader._id];
			
			//add the newTraderData to the pmcData.TradersInfo dictionary
			pmcData.TradersInfo = cloneData;

			//recursively call updateTraderSalesSum to update the trader sales sum
			this.updateTraderSalesSum(moneyTotal, myTrader);
		}
	}
	
	getExchangeRate(currency) {
		switch (currency) {
			case "EUR": return 1 / 134;
			case "USD": return 1 / 121;
			default: return 1;
		}
	}

	static addMoneyToInventory(items, currency, moneyTotal, firstslotId, firstItemLocation, firstContainerId, itemsModList) {
		let itemtpl;
		let total;
		let exchangeRate;
	
		switch (currency) {
			case "roubles":
				exchangeRate = 1;
				moneyTotalExchanged = moneyTotal * exchangeRate;
				itemtpl = "5449016a4bdc2d6f028b456f";
				break;
	
			case "dollars":
				exchangeRate = 1 / 121;
				moneyTotalExchanged = Math.floor(moneyTotal * exchangeRate);
				itemtpl = "5696686a4bdc2da3298b456a";
				break;
	
			case "euros":
				exchangeRate = 1 / 134;
				moneyTotalExchanged = Math.floor(moneyTotal * exchangeRate);
				itemtpl = "569668774bdc2da2298b4568";
				break;
	
			default:
				exchangeRate = 1;
				moneyTotalExchanged = moneyTotal * exchangeRate;
				itemtpl = "5449016a4bdc2d6f028b456f";
				break;
		}
	
		PAutoSell.addItemToPlayerInventory(items, itemtpl, firstItemLocation, firstslotId, firstContainerId, moneyTotalExchanged, itemsModList);
	}
	
	
	static getItemName(itemtpl: string) 
	{
		//return localeService.getLocaleDb().templates.items[itemtpl].Name;  //this is the old way of getting the name
		return localeService.getLocaleDb()[`${itemtpl} Name`];  		//this is the new way of getting the name
	}

	static getPrice(itemTpl: string, items: Item[], item: Item, sessionId: string, traderId: string): number 
	{
		let price: number = 0;

		//check if config.Containers.Trader[actualElement] has a value that is not null, undefined or ""
		if (traderId != null && traderId != undefined && traderId != "") 
		{
			try {
				let childIds = itemHelper.findAndReturnChildrenByItems(items, item._id);
				let trader = traderHelper.getTrader(traderId, sessionId);
	
			//price = traderHelper.getRawItemPrice(pmcData, item);
			//Logger.info(`PAutoSell: Package price for item(s): ${PAutoSell.getItemName(item._tpl)} is ${price}`);
			
				for (let i = 0; i < childIds.length; i++) {
					let childId = childIds[i];
					let childItem = items.find(x => x._id === childId);
					let childPrice = traderHelper.getHighestTraderPriceRouble(childItem._tpl);
					if (Number.isNaN(childPrice) || childPrice == undefined || childPrice == null){
						childPrice = ragfairPriceService.getFleaPriceForItem(childItem._tpl);
						if(childPrice == undefined || childPrice == null){
							childPrice = 1;
						}
						Logger.info(`PAutoSell: Using Ragfair Price for child item since NaN: ${PAutoSell.getItemName(childItem._tpl)} is ${childPrice}`)
					}
					else{
						Logger.info(`PAutoSell: Trader Price for child item(s): ${PAutoSell.getItemName(childItem._tpl)} is ${childPrice}`);
					}
					
					price += childPrice;
				}
					
			}
			catch(e)
			{
				Logger.error(`PAutoSell: Error getting price for item: ${itemTpl}`);
			}
		}
		else 
		{
					Logger.error(`PAutoSell: Error getting price as no trader for item: ${itemTpl}`);
		}

		return price;
	}

	static addItemToPlayerInventory(items: Item[], itemtpl: string, firstItemLocation: number | Location, firstslotId: string, firstContainerId: string, total: number, itemsModList: Item[]) 
	{
		Logger.info(`PAutoSell: Adding Item to Player Inventory: ${PAutoSell.getItemName(itemtpl)} with money count of ${total}`);
		let newItem: Item;
		let idForItemToAdd: string = hashUtil.generate();
		let upd: Upd = { StackObjectsCount: total };
		
		// push to final item array
		newItem = {
			_id: idForItemToAdd,
			_tpl: itemtpl,
			parentId: firstContainerId,
			slotId: firstslotId,
			location: firstItemLocation,
			upd: upd
		};

		try{
			//push to the profile data
			itemsModList.push(newItem);
			let tempname = PAutoSell.getItemName(itemtpl);
			Logger.info(`PAutoSell: Adding Item to Player Inventory: ${tempname} with money count of ${total} and itemid of ${idForItemToAdd}`);
		}
		catch(e)
		{
			Logger.error(`PAutoSell: Error adding item to player inventory`);
			Logger.error(e);
		}
		

	}

	static removeItemFromPlayerInventory(pmcInventory: Item[], item: Item, itemsModList: Item[]) {
		
		// search player pmcInventory and splice the given item
		
		try{
				let inventoryItems = pmcInventory;

				//should be ok to look at untouuched list since we are removing items from the list in copy?
				let childIds = itemHelper.findAndReturnChildrenByItems(inventoryItems, item._id);

				let parentItemInventoryIndex = itemsModList.findIndex(myitem => myitem._id === item._id);
				//do extra check so it doesn't get rid of default inventory, pockets, or a secure container.
				if (parentItemInventoryIndex > -1 && (item._tpl != "5857a8bc2459772bad15db29" && item._tpl != "55d7217a4bdc2d86028b456d" && item._tpl != "627a4e6b255f7527fb05a0f6"))
				{
					itemsModList.splice(parentItemInventoryIndex, 1);
					//Logger.info(`PAutoSell: Removing Item from Player Inventory: ${PAutoSell.getItemName(item._tpl)} with itemid of ${item._id}`)
				}
				
				
				const recursiveSplice = (childIds: string[], itemsModList: Item[]) => {
					if (childIds.length === 0) return;
				  
					let childId = childIds.shift();
					let inventoryIndex = itemsModList.findIndex(myitem2 => myitem2._id === childId);
					if (inventoryIndex > -1) {
						itemsModList.splice(inventoryIndex, 1);
					  //Logger.info(`PAutoSell: Removing ChildItem from Player Inventory: ${PAutoSell.getItemName(item._tpl)} with itemid of ${item._id}`)
					}
				  
					return recursiveSplice(childIds, itemsModList);
				  };
				  
				  recursiveSplice(childIds, itemsModList);
			}	
			catch(e)
			{
				Logger.error(`PAutoSell: Error removing item from player inventory`);
				Logger.error(e);
			}
	
	}
	
	static clone(data: any) {
		return JSON.parse(JSON.stringify(data));
	}

}

module.exports = { mod: new PAutoSell() }

interface Config {
    PriceMultiplier: number;
    Containers: {
        Labels: string[];
        Currency: string[];
    };
    RemoveContainerRestriction: boolean;
    IgnoreFollowingItemTPLInContainers: string[];
}