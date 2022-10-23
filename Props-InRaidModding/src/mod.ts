
import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { StaticRouterModService } from "@spt-aki/services/mod/staticRouter/StaticRouterModService";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { VFS } from "@spt-aki/utils/VFS";
import { BotGeneratorHelper } from "@spt-aki/helpers/BotGeneratorHelper";
import { BotWeaponGenerator} from "@spt-aki/generators/BotWeaponGenerator";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { Config } from "@spt-aki/models/eft/common/IGlobals";


var databaseServer;
var database;
var logger;
var items;
var JsonUtil;
var RandomUtil;
var HashUtil;
var BotGeneratorHelp;
var BotWeaponGeneratorHelp;
var BotConfig:IBotConfig;
var configserver:ConfigServer;

class ModInRaid implements IPostDBLoadMod
{
	postDBLoad(container: DependencyContainer): void {
		logger = container.resolve<ILogger>("WinstonLogger");
		databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		database = databaseServer.getTables();
		items = database.templates.items;
		BotGeneratorHelp = container.resolve<BotGeneratorHelper>("BotGeneratorHelper");
		BotWeaponGeneratorHelp = container.resolve<BotWeaponGenerator>("BotWeaponGenerator");

		JsonUtil = container.resolve("JsonUtil");
		RandomUtil = container.resolve("RandomUtil");
		HashUtil = container.resolve("HashUtil");
		configserver = container.resolve<ConfigServer>("ConfigServer");
		
		BotConfig = configserver.getConfig<IBotConfig>(ConfigTypes.BOT);
		
		const staticRouterModService = container.resolve<StaticRouterModService>("StaticRouterModService");

		
		//generateModsForItem
		container.afterResolution("BotGeneratorHelper", (_t, result: BotGeneratorHelper) => 
		{
			result.generateModsForEquipment = ModInRaid.generateModsForItem
		}, {frequency: "Always"});
		
		//isWeaponValid
		container.afterResolution("BotWeaponGenerator", (_t, result: BotWeaponGenerator) => 
		{
			result.isWeaponValid = ModInRaid.isWeaponValid
		}, {frequency: "Always"});

		ModInRaid.SetAllModdableProps();
		logger.info("ModInRaid: Registered static routers");
	}


	static SetAllModdableProps() 
	{

		for (let id in items)
		{
			//if undefined raid moddable, make it moddable.
			
			if (items[id]._props.CantRemoveFromSlotsDuringRaid)

			items[id]._props.RaidModdable_old = items[id]._props.RaidModdable;
			items[id]._props.RaidModdable = true;

			for (let slot in items[id]._props.Slots)
			{
				items[id]._props.Slots[slot]._required_old = items[id]._props.Slots[slot]._required;
				items[id]._props.Slots[slot]._required = false;
			}
			

		}
	}
	
	static checkRequired(slot)
	{
		if (slot._Required_old != undefined)
		{
			if (slot._Required_old == true)
				return true
		}
		else
			if (slot._required_old == true)
				return true
		return false
	}

	static isWeaponValid(itemList: Item[]): boolean
    {
        for (const item of itemList)
        {
            const template = databaseServer.getTables().templates.items[item._tpl];
            if (!template._props.Slots || !template._props.Slots.length)
            {
                continue;
            }

            for (const slot of template._props.Slots)
            {
                if (!ModInRaid.checkRequired(slot))
                {
                    continue;
                }

                const slotItem = itemList.find(i => i.parentId === item._id && i.slotId === slot._name);
                if (!slotItem)
                {
                    logger.error(`Required slot '${slot._name}' on ${template._id} was empty`);
                    return false;
                }
            }
        }

        return true;
    }

	static generateModsForItem(items, modPool, parentId, parentTemplate, modSpawnChances, isPmc = false): Item[]
	{
		// Important bit
		////////////////////////////////
		const itemModPool = modPool[parentTemplate._id] ? modPool[parentTemplate._id] : {};
		let missingRequiredMods = parentTemplate._props.Slots.find(i =>	ModInRaid.checkRequired(i) == true && !itemModPool[i._name])
		
		while (missingRequiredMods)
		{
			itemModPool[missingRequiredMods._name] = []
			missingRequiredMods = parentTemplate._props.Slots.find(i =>	ModInRaid.checkRequired(i) == true && !itemModPool[i._name])
		}
	
		if ((!parentTemplate._props.Slots || !parentTemplate._props.Slots.length)
			&& (!parentTemplate._props.Cartridges || !parentTemplate._props.Cartridges.length)
			&& (!parentTemplate._props.Chambers || !parentTemplate._props.Chambers.length))
		{
			logger.error(`Item ${parentTemplate._id} had mods defined, but no slots to support them`);
			return items;
		}

		for (const modSlot in itemModPool)
		{
			// console.log(modSlot)
			let itemSlot;
			switch (modSlot)
			{
				case "patron_in_weapon":
				case "patron_in_weapon_000":
				case "patron_in_weapon_001":
					itemSlot = parentTemplate._props.Chambers.find(c => c._name.includes(modSlot));
					break;
				case "cartridges":
					itemSlot = parentTemplate._props.Cartridges.find(c => c._name === modSlot);
					break;
				default:
					itemSlot = parentTemplate._props.Slots.find(s => s._name === modSlot);
					break;
			}

			if (!itemSlot)
			{
				logger.error(`Slot '${modSlot}' does not exist for item ${parentTemplate._id}`);
				continue;
			}

			const ammoContainers = ["mod_magazine", "patron_in_weapon", "patron_in_weapon_000", "patron_in_weapon_001", "cartridges"];
			const modSpawnChance = ModInRaid.checkRequired(itemSlot) || ammoContainers.includes(modSlot)
				? 100
				: modSpawnChances[modSlot];
			if (RandomUtil.getIntEx(100) > modSpawnChance)
			{
				continue;
			}

			// Filter blacklisted cartridges
			if (isPmc && ammoContainers.includes(modSlot))
			{
				// Array includes mod_magazine which isnt a cartridge, but we need to filter the other 4 items
				const cartridgeBlacklist = BotConfig.pmc.dynamicLoot.blacklist;
				itemModPool[modSlot] = itemModPool[modSlot].filter(x => !cartridgeBlacklist.includes(x));
			}

			const exhaustableModPool = new ExhaustableArray(itemModPool[modSlot]);

			let modTpl;
			let found = false;
			while (exhaustableModPool.hasValues())
			{
				modTpl = exhaustableModPool.getRandomValue();
				if (!BotGeneratorHelp.isItemIncompatibleWithCurrentItems(items, modTpl, modSlot))
				{
					found = true;
					break;
				}
			}
			const parentSlot = parentTemplate._props.Slots.find(i => i._name === modSlot);

			// Find a mod to attach from items db for required slots if none found above
			if (!found && parentSlot !== undefined && ModInRaid.checkRequired(parentSlot) == true)
			{
				// console.log(parentSlot._props.filters[0].Filter)
				modTpl = BotGeneratorHelp.getModTplFromItemDb(modTpl, parentSlot, modSlot, items);
				found = !!modTpl;
			}

			if (!found || !modTpl)
			{
				if (ModInRaid.checkRequired(itemSlot))
				{
					logger.error(`Could not locate any compatible items to fill '${modSlot}' for ${parentTemplate._id}`);
				}
				continue;
			}

			if (!itemSlot._props.filters[0].Filter.includes(modTpl))
			{
				logger.error(`Mod ${modTpl} is not compatible with slot '${modSlot}' for item ${parentTemplate._id}`);
				continue;
			}

			const modTemplate = database.templates.items[modTpl];
			if (!modTemplate)
			{
				logger.error(`Could not find mod item template with tpl ${modTpl}`);
				logger.info(`Item -> ${parentTemplate._id}; Slot -> ${modSlot}`);
				continue;
			}

			// TODO: check if weapon already has sight
			// 'sight' 550aa4154bdc2dd8348b456b 2x parents down
			const parentItem = database.templates.items[modTemplate._parent];
			if (modTemplate._parent === "550aa4154bdc2dd8348b456b" || parentItem._parent === "550aa4154bdc2dd8348b456b")
			{
				// todo, check if another sight is already on gun AND isnt a side-mounted sight
				// if weapon has sight already, skip
			}

			const modId = HashUtil.generate();
			items.push({
				"_id": modId,
				"_tpl": modTpl,
				"parentId": parentId,
				"slotId": modSlot,
				...BotGeneratorHelp.generateExtraPropertiesForItem(modTemplate)
			});

			// I first thought we could use the recursive generateModsForItems as previously for cylinder magazines.
			// However, the recurse doesnt go over the slots of the parent mod but over the modPool which is given by the bot config
			// where we decided to keep cartridges instead of camoras. And since a CylinderMagazine only has one cartridge entry and
			// this entry is not to be filled, we need a special handling for the CylinderMagazine
			if (parentItem._name === "CylinderMagazine")
			{
				// we don't have child mods, we need to create the camoras for the magazines instead
				BotGeneratorHelp.fillCamora(items, modPool, modId, modTemplate);
			}
			else
			{

				if (Object.keys(modPool).includes(modTpl) || (modTemplate._props.Slots && modTemplate._props.Slots.find(i => ModInRaid.checkRequired(i) == true)))
				{
					ModInRaid.generateModsForItem(items, modPool, modId, modTemplate, modSpawnChances, isPmc);
				}
			}
		}
		return items;
	}
	
}

class ExhaustableArray
{
	pool: any;

    constructor(itemPool)
    {
        this.pool = JsonUtil.clone(itemPool);
    }

    getRandomValue()
    {
        if (!this.pool || !this.pool.length)
        {
            return null;
        }

        const index = RandomUtil.getInt(0, this.pool.length - 1);
        const toReturn = JsonUtil.clone(this.pool[index]);
        this.pool.splice(index, 1);
        return toReturn;
    }
	
	getFirstValue()
    {
        if (!this.pool || !this.pool.length)
        {
            return null;
        }

        const index = 0;
        const toReturn = JsonUtil.clone(this.pool[index]);
        this.pool.splice(index, 1);
        return toReturn;
    }

    hasValues()
    {
        if (this.pool && this.pool.length)
        {
            return true;
        }

        return false;
    }

}

module.exports = { mod: new ModInRaid() }