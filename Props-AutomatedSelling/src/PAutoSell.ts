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
import { Item, Upd } from '@spt-aki/models/eft/common/tables/IItem';
import { SaveServer } from '@spt-aki/servers/SaveServer';
import { InventoryController } from '@spt-aki/controllers/InventoryController';
import { Inventory } from '@spt-aki/models/eft/common/tables/IBotBase';
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";

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

const modName = "PAutoSell";
let modFolder;

class PAutoSell implements IPreAkiLoadMod, IPostAkiLoadMod {

	preAkiLoad(container: DependencyContainer): void {
		Logger = container.resolve("WinstonLogger")
		ragfairPriceService = container.resolve("RagfairPriceService");
		config = require("../config/config.json");

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
		}], "aki");  */

		//Raid Saving (End of raid)
		staticRouterModService.registerStaticRouter(`StaticAkiRaidSave${modName}`, [{
			url: "/raid/profile/save",
			//url: "/client/match/offline/end",
			action: (url, info, sessionID, output) => {
				this.exchangeItems(url, info, sessionID, output);
				return output;
			}
		}], "aki"); 
	}

	postAkiLoad(container: DependencyContainer): void {
		this.setupInitialValues(container);

	}

	setupInitialValues(container) {
		Logger.info('PAutoSell: SetupInitialValues');
		profileHelper = container.resolve("ProfileHelper");
		hashUtil = container.resolve("HashUtil");
		jsonUtil = container.resolve("JsonUtil");
		saveServer = container.resolve("SaveServer");
		itemHelper = container.resolve("ItemHelper");
	}

	//main Top function
	exchangeItems(url, info, sessionId, output) {
		//use save server to set items in profile
		saveServer.saveProfile(sessionId);
		saveServer.loadProfile(sessionId);
		
		pmcData = profileHelper.getPmcProfile(sessionId);
		const items = pmcData.Inventory.items;
		itemsModList = PAutoSell.clone(pmcData.Inventory.items);
		//grab the containers list from config.containers.labels
		let containers = [];
		
		for (let k = 0; k < items.length; k++) {
			const myContainer = items[k];
			if (myContainer.upd && myContainer.upd.Tag && myContainer.upd.Tag.Name) {
				if (config.Containers.Labels.map(label => label.toLowerCase()).includes(myContainer.upd.Tag.Name.toLowerCase())) {
				Logger.info(`PAutoSell: Found Tagged Container: ${myContainer.upd.Tag.Name}`);
				containers.push(myContainer);
				}
			}
		}
		
		//for each item.parent_id where it matches the _id in the container list, sell the item with its associated currency
		for (let j = 0; j < containers.length; j++) {
			let container = containers[j];
			moneyTotal = 0;
			let firstslotId;
			let firstItemLocation;
			let firstContainerId;
			
			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				Logger.error(`PAutoSell: Checking Item: ${itemHelper.getItemName(item._tpl)}`);
				if (item.parentId === container._id) {
					Logger.info(`PAutoSell: Found Item in Container: ${itemHelper.getItemName(item._tpl)}`);
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
						firstContainerId = container._id;
					}
					
					//set the currency string var based off the current position in Config.Containers.Currency list
					let tempname = itemHelper.getItemName(item._tpl);
					Logger.info(`PAutoSell: Trying to Sell Item: ${tempname} , ID: ${item._id}`);
					this.sellItem(item, items, itemsModList);
				}
			}
			
			let currency = String(config.Containers.Currency[j]).toLowerCase();
			PAutoSell.replaceCurrency(currency, moneyTotal, items, firstslotId, firstItemLocation, firstContainerId, itemsModList);
			//Logger.info(`PAutoSell: Replaced Items with Currency`);
		}

		// need to replace the items in the profile with the new items
		pmcData.Inventory.items = itemsModList;

		saveServer.saveProfile(sessionId);
		saveServer.loadProfile(sessionId);
		
	}

	sellItem(item: Item, items: Item[], itemsModList) {
		//get the price of the item
		let price = PAutoSell.getPrice(item._tpl);
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
		
		//define new item to replace values in
		let newItem: Item;
		let itemtpl: string;
		let total: number;
		let exchangeRate: number;
		

		//if the firstitemlocation is not undefined or null then assign its value to newItem.location
		
			
		switch (currency) {
			case "roubles":
				exchangeRate = 1;
				total = moneyTotal * exchangeRate;

				itemtpl = "5449016a4bdc2d6f028b456f";
				PAutoSell.addItemToPlayerInventory(items, newItem, itemtpl, firstItemLocation, firstslotId, firstContainerId, total, itemsModList);
				break;

			case "dollars":
				exchangeRate = 1/121;  //1 dollar = 121 roubles
				total = Math.floor(moneyTotal * exchangeRate);

				itemtpl = "5696686a4bdc2da3298b456a";
				PAutoSell.addItemToPlayerInventory(items, newItem, itemtpl, firstItemLocation, firstslotId, firstContainerId, total, itemsModList);
				break;

			case "euros":
				exchangeRate = 1/134;  //1 Euro = 134 roubles
				total = Math.floor(moneyTotal * exchangeRate);

				itemtpl = "569668774bdc2da2298b4568";
				PAutoSell.addItemToPlayerInventory(items, newItem, itemtpl, firstItemLocation, firstslotId, firstContainerId, total, itemsModList);
				break;
				
			case "default":
				break;
		}
	
	}

	static getPrice(itemTpl: string): number
	{
		let price: number;

		try{
			price = ragfairPriceService.getFleaPriceForItem(itemTpl);
			Logger.info(`PAutoSell: Price for item: ${itemTpl} is ${price}`);
		}
		catch(e){
			Logger.error(`PAutoSell: Error getting price for item: ${itemTpl}`);
			Logger.error(e);
		}
		return price;

	}

	static addItemToPlayerInventory(items: Item[], item: Item, itemtpl, firstItemLocation, firstslotId, firstContainerId, total, itemsModList) 
	{
		let idForItemToAdd: string = hashUtil.generate();
		let upd: Upd = { StackObjectsCount: total };
		// push to final item array
		item = {
			_id: idForItemToAdd,
			_tpl: itemtpl,
			parentId: firstContainerId,
			slotId: firstslotId,
			location: firstItemLocation,
			upd: upd
		};

		try{
			//push to the profile data
			itemsModList.push(item);
			let tempname = itemHelper.getItemName(itemtpl);
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
					Logger.info(`PAutoSell: Removing Item from Player Inventory: ${itemHelper.getItemName(item._tpl)} with itemid of ${item._id}`)
				}
				
				/* for (let childId of childIds)
				{
					// We expect that each inventory item and each insured item has unique "_id", respective "itemId".
					// Therefore we want to use a NON-Greedy function and escape the iteration as soon as we find requested item.
					let inventoryIndex = inventoryItems.findIndex(myitem2 => myitem2._id === childId);
					if (inventoryIndex > -1)
					{
						inventoryItems.splice(inventoryIndex, 1);
						Logger.info(`PAutoSell: Removing ChildItem from Player Inventory: ${itemHelper.getItemName(item._tpl)} with itemid of ${item._id}`)
					}
				} */
				
				const recursiveSplice = (childIds, itemsModList) => {
					if (childIds.length === 0) return;
				  
					let childId = childIds.shift();
					let inventoryIndex = itemsModList.findIndex(myitem2 => myitem2._id === childId);
					if (inventoryIndex > -1) {
						itemsModList.splice(inventoryIndex, 1);
					  Logger.info(`PAutoSell: Removing ChildItem from Player Inventory: ${itemHelper.getItemName(item._tpl)} with itemid of ${item._id}`)
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