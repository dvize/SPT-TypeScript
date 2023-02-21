import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { DependencyContainer, container } from 'tsyringe';
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { DynamicRouterModService } from "@spt-aki/services/mod/dynamicRouter/DynamicRouterModService";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { JsonUtil } from "@spt-aki/utils/JsonUtil";
import { IPmcData } from "@spt-aki/models/eft/common/IPmcData";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { Item, Upd } from '@spt-aki/models/eft/common/tables/IItem';
import { SaveServer } from '@spt-aki/servers/SaveServer';
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { ITemplateItem } from '@spt-aki/models/eft/common/tables/ITemplateItem';
import { LocaleService } from "@spt-aki/services/LocaleService";
import { TradeHelper } from '@spt-aki/helpers/TradeHelper';
import { TraderHelper} from '@spt-aki/helpers/TraderHelper';

let Logger;
let config;
let profileHelper: ProfileHelper;
let hashUtil: HashUtil;
let ragfairPriceService: RagfairPriceService;
let moneyTotal: number;
let jsonUtil: JsonUtil;
let pmcData;
let itemsModList;
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

const modName = "PAutoSell";
let modFolder;

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
		config = require("../config/config.json");
		Logger.info('PAutoSell: SetupInitialValues');
		profileHelper = container.resolve("ProfileHelper");
		hashUtil = container.resolve("HashUtil");
		jsonUtil = container.resolve("JsonUtil");
		saveServer = container.resolve("SaveServer");
		itemHelper = container.resolve("ItemHelper");
		databaseServer = container.resolve("DatabaseServer");
		database = databaseServer.getTables().templates;
		localeService = container.resolve("LocaleService");
		tradeHelper = container.resolve("TradeHelper");
		traderHelper = container.resolve("TraderHelper");

		this.checkContainerRestrictions();
	}

	checkContainerRestrictions() : void
	{

		let validContainerTypesList: string[] = [
			"5795f317245977243854e041", //Common Container
			"5448bf274bdc2dfc2f8b456a", //Portable Container
			"5448e53e4bdc2d60728b4567" //Backpack
		]
		
		let filteredItems = [];
		//convert database.items to array and filter out items that are not in validContainerTypesList
		filteredItems = Object.values(database.items).filter((itemtemp: ITemplateItem) => {
			return validContainerTypesList.includes(itemtemp._parent);
		});

		//go through all items in filteredItems list and remove container restrictions
		if (config.RemoveContainerRestriction === true) 
		{
			for (let i = 0; i < filteredItems.length; i++) 
			{
				let myItem = filteredItems[i];
				myItem._props.Grids[0]._props.filters = [];
				Logger.info(`PAutoSell: Removing Container Restriction from ${myItem._id} (${myItem._name})`);
			}
		}
	}

	//main Top function
	exchangeItems(url, info, sessionId, output) 
	{
		//use save server to set items in profile
		saveServer.saveProfile(sessionId);
		saveServer.loadProfile(sessionId);
		
		pmcData = profileHelper.getPmcProfile(sessionId);
		const items = pmcData.Inventory.items;
		itemsModList = PAutoSell.clone(pmcData.Inventory.items);

		//grab the containers list from config.containers.labels
		containers = [];
		
		for (let contA = 0; contA < items.length; contA++) {
			const myContainer = items[contA];
			if (myContainer.upd && myContainer.upd.Tag && myContainer.upd.Tag.Name) {
				if (config.Containers.Labels.map(label => label.toLowerCase()).includes(myContainer.upd.Tag.Name.toLowerCase())) {
				Logger.info(`PAutoSell: Found Tagged Container: ${myContainer.upd.Tag.Name}`);
				containers.push(myContainer);
				}
			}
		}
		
		//peacekeperp 0 and therapist container 1
		//for each item.parent_id where it matches the _id in the container list, sell the item with its associated currency
		for (let currentContainerPlace = 0; currentContainerPlace < containers.length; currentContainerPlace++) 
		{
			let currentContainer = containers[currentContainerPlace];
			moneyTotal = 0;
			moneyTotalExchanged = 0;
			let firstslotId;
			let firstItemLocation;
			let firstContainerId;
			
			//loop through all the config.containers.labels and set the actualElement to the current container
			for (let i = 0; i < config.Containers.Labels.length; i++)
			{
				if (config.Containers.Labels[i].toLowerCase() === currentContainer.upd.Tag.Name.toLowerCase())
				{
					actualElement = i;
				}
			}

			
			for (let i = 0; i < items.length; i++) 
			{
				let item = items[i];
				//Logger.error(`PAutoSell: Checking Item: ${PAutoSell.getItemName(item._tpl)}`);
				//its detecting if the parent_id of the item is the same as the _id of the container. But 
				if (item.parentId === currentContainer._id) {

					Logger.info(`item.parentId: ${item.parentId} currentContainer._id: ${currentContainer._id}`);

					//if the item._tpl(lowercase) is in the config.containers.IgnoreFollowingItemTPLInContainers list (lowercase), continue the loop without doing anything else
					const ignoreList = config.IgnoreFollowingItemTPLInContainers;
					let found = false;

					for (let it = 0; it < ignoreList.length; it++) {
					if (ignoreList[it].toLowerCase() === item._tpl.toLowerCase()) {
						found = true;
						break;
					}
					}

					//continue to next item in the outer for loop if found is true
					if (found) {
					continue;
					}
					
					//Logger.info(`PAutoSell: Found Item in Container: ${PAutoSell.getItemName(item._tpl)}`);
					//set the slot id of newitem to existing item slot id if it exists
					if (!firstslotId){
						//if item.slotId is not null or undefined and the item.slotId is main, or Pockets, or SecuredContainer, set it to the first slot
						if (item.slotId) {
							firstslotId = item.slotId;
						}
					}
					//set the location of the first item in the container to the new item location
					if (!firstItemLocation) {
						firstItemLocation = item.location;
					}
					
					if(!firstContainerId){
						firstContainerId = currentContainer._id;
					}
					
					//set the currency string var based off the current position in Config.Containers.Currency list
					let tempname = PAutoSell.getItemName(item._tpl);
					Logger.error(`PAutoSell: Trying to Sell Item: ${tempname} , ID: ${item._id}`);
					this.sellItem(item, items, itemsModList, sessionId, actualElement);
				}
			}
			
			let currency: string = config.Containers.Currency[actualElement];
			currency.toLowerCase();

			PAutoSell.replaceCurrency(currency, moneyTotal, items, firstslotId, firstItemLocation, firstContainerId, itemsModList);

			//if there is a trader associated with this container, add selling to the history of the trader
			if(config.Containers.Trader[actualElement] != null && config.Containers.Trader[actualElement] != "")
			{
				Logger.info(`PAutoSell: actualElement is ${actualElement}`);
				Logger.info(`PAutoSell: config.Containers.Trader[actualElement] is ${config.Containers.Trader[actualElement]}`);
				Logger.info(`PAutoSell: traderKey[config.Containers.Trader[actualElement].toLowerCase()] is ${traderKey[config.Containers.Trader[actualElement].toLowerCase()]}`);
				let mytrader = traderHelper.getTrader(traderKey[config.Containers.Trader[actualElement].toLowerCase()], sessionId);
				let newexchangerate = 0;
				 // set current sale sum
				 Logger.info(`PAutoSell: Converting to Trader Currency is ${mytrader.currency}`);

				 //convert moneyTotal to mytrader.currency.  should always be rubles to whatever currency so just * by the exchange rate
				 switch(mytrader.currency)
				 {
					 case "RUB":
						newexchangerate = 1;
						break;
					case "EUR":
						newexchangerate = 1/134;
						break;
					case "USD":
						newexchangerate = 1/121;
						break;
					default:
						newexchangerate = 1;
						break;
				 }

				 let moneyTotalConverted = Math.floor(moneyTotal * newexchangerate);
				 const saleSum = pmcData.TradersInfo[mytrader._id].salesSum + moneyTotalConverted;
				 Logger.info(`PAutoSell: Adding ${moneyTotalConverted} to ${mytrader.nickname} new salesSum (${saleSum})`);
				 pmcData.TradersInfo[mytrader._id].salesSum = saleSum;
				 traderHelper.lvlUp(mytrader._id, sessionId);

				 //save the changes to the pmc profile

				saveServer.saveProfile(sessionId);
				 //Object.assign(output.profileChanges[sessionId].traderRelations, { [mytrader._id]: { "salesSum": saleSum } });
			}

		}

		// need to replace the items in the profile with the new items
		pmcData.Inventory.items = itemsModList;

		saveServer.saveProfile(sessionId);
		saveServer.loadProfile(sessionId);
		
	}

	sellItem(item: Item, items: Item[], itemsModList, sessionId: string, actualElement) {
		//get the price of the item
		let price = PAutoSell.getPrice(item._tpl, items, item, sessionId, actualElement);
		//get the stack of the item if it exists otherwise set it to 1
		let stack = item.upd ? item.upd.StackObjectsCount ? item.upd.StackObjectsCount : 1 : 1;


		//remove the item from the pmcInventory
		PAutoSell.removeItemFromPlayerInventory(items, item, itemsModList);

		// add price * stack to moneyTotal
		moneyTotal +=  price * stack;
		Logger.info(`PAutoSell: moneyTotal: ${moneyTotal}`);
	}

	//replace currency function based on string
	static replaceCurrency(currency: string, moneyTotal: number, items: Item[], firstslotId: any, firstItemLocation: any, firstContainerId: any, itemsModList) {
		Logger.info(`PAutoSell: Replacing Currency: ${currency} , Total: ${moneyTotal}`)
		//define new item to replace values in
		
		let itemtpl: string;
		let total: number;
		let exchangeRate: number;
		

		//if the firstitemlocation is not undefined or null then assign its value to newItem.location
		
			
		switch (currency) {
			case "roubles":
				exchangeRate = 1;
				moneyTotalExchanged = moneyTotal * exchangeRate;

				itemtpl = "5449016a4bdc2d6f028b456f";
				PAutoSell.addItemToPlayerInventory(items, itemtpl, firstItemLocation, firstslotId, firstContainerId, moneyTotalExchanged, itemsModList);
				break;

			case "dollars":
				exchangeRate = 1/121;  //1 dollar = 121 roubles
				moneyTotalExchanged = Math.floor(moneyTotal * exchangeRate);

				itemtpl = "5696686a4bdc2da3298b456a";
				PAutoSell.addItemToPlayerInventory(items, itemtpl, firstItemLocation, firstslotId, firstContainerId, moneyTotalExchanged, itemsModList);
				break;

			case "euros":
				exchangeRate = 1/134;  //1 Euro = 134 roubles
				moneyTotalExchanged = Math.floor(moneyTotal * exchangeRate);

				itemtpl = "569668774bdc2da2298b4568";
				PAutoSell.addItemToPlayerInventory(items, itemtpl, firstItemLocation, firstslotId, firstContainerId, moneyTotalExchanged, itemsModList);
				break;
				
			case "default":
				exchangeRate = 1;
				moneyTotalExchanged = moneyTotal * exchangeRate;

				itemtpl = "5449016a4bdc2d6f028b456f";
				PAutoSell.addItemToPlayerInventory(items, itemtpl, firstItemLocation, firstslotId, firstContainerId, moneyTotalExchanged, itemsModList);
				break;
		}
	
	}

	static getItemName(itemtpl: string) 
	{
		//return localeService.getLocaleDb().templates.items[itemtpl].Name;  //this is the old way of getting the name
		return localeService.getLocaleDb()[`${itemtpl} Name`];  		//this is the new way of getting the name
	}

	static getPrice(itemTpl: string, items, item, sessionId, actualElement): number
	{
		let price: number = 0;

		//check if config.Containers.Trader[actualElement] has a value that is not null, undefined or ""
		if (config.Containers.Trader[actualElement] != null && config.Containers.Trader[actualElement] != undefined && config.Containers.Trader[actualElement] != "") 
		{
			try
			{
				let childIds = itemHelper.findAndReturnChildrenByItems(items, item._id);

				let trader = traderHelper.getTrader(traderKey[config.Containers.Trader[actualElement].toLowerCase()], sessionId);
				Logger.info(`PAutoSell: Trader Found for Container: ${trader.nickname}`);

				//price = traderHelper.getRawItemPrice(pmcData, item);
				//Logger.info(`PAutoSell: Package price for item(s): ${PAutoSell.getItemName(item._tpl)} is ${price}`);
				
				for (let i = 0; i < childIds.length; i++) {
					let childId = childIds[i];
					let childItem = items.find(x => x._id === childId);
					let childPrice = traderHelper.getRawItemPrice(pmcData, childItem);
					price += childPrice;
					Logger.info(`PAutoSell: Trader Price for child item(s): ${PAutoSell.getItemName(childItem._tpl)} is ${childPrice}`);
				}
					
			}
			catch(e){
				Logger.error(`PAutoSell: Error getting price for item: ${itemTpl}`);
				Logger.error(e);
			}

		}
		else {
				try{
					//I think findandreturnchildren includes the original parent item as well.. wierd.
					//price = ragfairPriceService.getFleaPriceForItem(itemTpl);
					//Logger.info(`PAutoSell: Price for item: ${PAutoSell.getItemName(itemTpl)} is ${price}`);
		
					let childIds = itemHelper.findAndReturnChildrenByItems(items, item._id);
		
					//navigate through childIds and sum the price of each item to current price
					for (let i = 0; i < childIds.length; i++) {
						let childId = childIds[i];
						let childItem = items.find(x => x._id === childId);
						let childPrice = ragfairPriceService.getFleaPriceForItem(childItem._tpl);
						price += childPrice;
						Logger.info(`PAutoSell: RagFair Price for child item(s): ${PAutoSell.getItemName(childItem._tpl)} is ${childPrice}`);
					}
						
				}
				catch(e){
					Logger.error(`PAutoSell: Error getting price for item: ${itemTpl}`);
					Logger.error(e);
				}
			}	

		return price;

	}

	static addItemToPlayerInventory(items: Item[], itemtpl, firstItemLocation, firstslotId, firstContainerId, total, itemsModList) 
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

	static removeItemFromPlayerInventory(pmcInventory: Item[], item: Item, itemsModList) {
		
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
				
				
				const recursiveSplice = (childIds, itemsModList) => {
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
	

	static serialize(data: { err: number; errmsg: any; data: any; }, prettify = false) {
		if (prettify) {
			return JSON.stringify(data, null, "\t");
		}
		else {
			return JSON.stringify(data);
		}
	}

	static clone(data: any) {
		return JSON.parse(JSON.stringify(data));
	}

}

module.exports = { mod: new PAutoSell() }