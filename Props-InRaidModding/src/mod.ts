
import { DependencyContainer } from "tsyringe";
import { IPreAkiLoadMod } from "@spt-aki/models/external/IPreAkiLoadMod";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { Item } from "@spt-aki/models/eft/common/tables/IItem";
import { ItemHelper } from "@spt-aki/helpers/ItemHelper";
import { Mods, ModsChances } from "@spt-aki/models/eft/common/tables/IBotType";
import { BotGeneratorHelper } from "@spt-aki/helpers/BotGeneratorHelper";
import { BotWeaponGenerator} from "@spt-aki/generators/BotWeaponGenerator";
import { ConfigServer } from "@spt-aki/servers/ConfigServer";
import { ConfigTypes } from "@spt-aki/models/enums/ConfigTypes";
import { BaseClasses } from "@spt-aki/models/enums/BaseClasses";
import { ITemplateItem, Slot } from "@spt-aki/models/eft/common/tables/ITemplateItem";
import { IBotConfig } from "@spt-aki/models/spt/config/IBotConfig";
import { ProfileHelper } from "@spt-aki/helpers/ProfileHelper";
import { BotEquipmentFilterService } from "@spt-aki/services/BotEquipmentFilterService";

var databaseServer;
var database;
var logger;
var items;
var BotGeneratorHelp;
var botEquipmentFilterService;
var botConfig:IBotConfig;
var configserver:ConfigServer;
var itemHelper;
var profileHelper;

class ModInRaid implements IPostDBLoadMod, IPreAkiLoadMod
{
	preAkiLoad(container: DependencyContainer): void {
		logger = container.resolve<ILogger>("WinstonLogger");
		BotGeneratorHelp = container.resolve<BotGeneratorHelper>("BotGeneratorHelper");
		profileHelper = container.resolve<ProfileHelper>("ProfileHelper");
		botEquipmentFilterService = container.resolve<BotEquipmentFilterService>("BotEquipmentFilterService");
		itemHelper = container.resolve<ItemHelper>("ItemHelper");
		configserver = container.resolve<ConfigServer>("ConfigServer");
		botConfig = configserver.getConfig<IBotConfig>(ConfigTypes.BOT);
		
		//generateModsForWeapon
		container.afterResolution("BotGeneratorHelper", (_t, result: BotGeneratorHelper) => 
		{
			result.generateModsForWeapon = ModInRaid.generateModsForWeapon;
		}, {frequency: "Always"});
		
		//isWeaponValid
		container.afterResolution("BotWeaponGenerator", (_t, result: BotWeaponGenerator) => 
		{
			result.isWeaponValid = ModInRaid.isWeaponValid
		}, {frequency: "Always"});

	}

	postDBLoad(container: DependencyContainer): void {
		
		databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		database = databaseServer.getTables();
		items = database.templates.items;
		ModInRaid.SetAllModdableProps();
	}


	static SetAllModdableProps() 
	{
		//logger.info(`ModInRaid: Setting all mods to RaidModdable True and Slots.required to false`)
		for (let id in items)
		{
			//if undefined raid moddable, make it moddable.
			
			if (items[id]._props.CantRemoveFromSlotsDuringRaid)

			items[id]._props.RaidModdable_old = items[id]._props.RaidModdable;
			items[id]._props.RaidModdable = true;

			for (let slot in items[id]._props.Slots)
			{
				if(items[id]._props.Slots[slot]._required != undefined)
				{
					items[id]._props.Slots[slot]._required_old = items[id]._props.Slots[slot]._required;
					items[id]._props.Slots[slot]._required = false;
				}
			}
			

		}
	}


	static checkRequired(slot)
	{
		if (slot._required_old != undefined)
		{
			if (slot._required_old == true)
				return true
		}
		else
			if (slot._required == true)
				return true
		return false

	}

	static isWeaponValid(itemList: Item[]): boolean
    {
		//logger.info(`ModInRaid: Check isWeaponValid`);

        for (const item of itemList)
        {
            const template = itemHelper.getItem(item._tpl)[1];;
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

				const allowedTpls = slot._props.filters[0].Filter;
                const slotItem = itemList.find(i => i.parentId === item._id && i.slotId === slot._name);

                if (!slotItem)
                {
                    //logger.error(`Required slot '${slot._name}' on ${template._id} was empty`);
                    return false;
                }

				if (!allowedTpls.includes(slotItem._tpl))
                {
                    //logger.error(`Required slot '${slot._name}' on ${template._name} has an invalid item: ${slotItem._tpl}`);
                    return false;
                }
            }
        }

        return true;
    }

	static generateModsForWeapon(sessionId: string, weapon: Item[], modPool: Mods, weaponParentId: string, parentWeaponTemplate: ITemplateItem, modSpawnChances: ModsChances, ammoTpl: string, botRole: string): Item[]
	{
		//logger.info(`ModInRaid: generating mods for weapons`);

		const compatibleModsPool = modPool[parentWeaponTemplate._id];
		let missingRequiredMods = parentWeaponTemplate._props.Slots.find(i =>	ModInRaid.checkRequired(i) == true && !compatibleModsPool[i._id]);
		
		while (missingRequiredMods)
		{
			compatibleModsPool[missingRequiredMods._id] = [];
			missingRequiredMods = parentWeaponTemplate._props.Slots.find(i =>	ModInRaid.checkRequired(i) == true && !compatibleModsPool[i._id]);
		}
	
		const pmcProfile = BotGeneratorHelp.profileHelper.getPmcProfile(sessionId);
        const botEquipmentRole = BotGeneratorHelp.getBotEquipmentRole(botRole);
        const modLimits = BotGeneratorHelp.initModLimits(botEquipmentRole);

        const botEquipConfig = BotGeneratorHelp.botConfig.equipment[botEquipmentRole];
        const botEquipBlacklist = BotGeneratorHelp.botEquipmentFilterService.getBotEquipmentBlacklist(botEquipmentRole, pmcProfile.Info.Level);

        if (!parentWeaponTemplate._props.Slots.length
            && !parentWeaponTemplate._props.Cartridges.length
            && !parentWeaponTemplate._props.Chambers.length)
        {
            //BotGeneratorHelp.logger.error(BotGeneratorHelp.localisationService.getText("bot-unable_to_add_mods_to_weapon_missing_ammo_slot", {weaponName: parentWeaponTemplate._name, weaponId: parentWeaponTemplate._id}));

            return weapon;
        }

        // Iterate over mod pool and choose mods to add to item
        for (const modSlot in compatibleModsPool)
        {
            // Check weapon has slot for mod to fit in
            const modsParent = BotGeneratorHelp.getModItemSlot(modSlot, parentWeaponTemplate);
            if (!modsParent)
            {
                //logger.error(BotGeneratorHelp.localisationService.getText("bot-weapon_missing_mod_slot", {modSlot: modSlot, weaponId: parentWeaponTemplate._id, weaponName: parentWeaponTemplate._name}));

                continue;
            }

            // Check spawn chance of mod
            if (!BotGeneratorHelp.shouldModBeSpawned(modsParent, modSlot, modSpawnChances))
            {
                continue;
            }

            const isRandomisableSlot = botEquipConfig.randomisedWeaponModSlots && botEquipConfig.randomisedWeaponModSlots.includes(modSlot);
            const modToAdd = BotGeneratorHelp.chooseModToPutIntoSlot(modSlot, isRandomisableSlot, modsParent, botEquipBlacklist, compatibleModsPool, weapon, ammoTpl, parentWeaponTemplate);

            // Compatible mod not found
            if (!modToAdd)
            {
                continue;
            }

            const modToAddTemplate = modToAdd[1];

            if (!BotGeneratorHelp.isModValidForSlot(modToAdd, modsParent, modSlot, parentWeaponTemplate))
            {
                continue;
            }

            if (BotGeneratorHelp.modHasReachedItemLimit(botEquipmentRole, modToAddTemplate, modLimits))
            {
                continue;
            }

            // If mod_scope/mod_mount is randomly generated, check and add any sub mod_scope objects into the pool of mods
            // This helps fix empty mounts appearing on weapons
            if (isRandomisableSlot && ["mod_scope", "mod_mount"].includes(modSlot.toLowerCase()))
            {
                // mod_mount was picked to be added to weapon, force scope chance to ensure its filled
                if (modToAddTemplate._parent == BaseClasses.MOUNT)
                {
                    modSpawnChances.mod_scope = 100;
                    modSpawnChances["mod_scope_000"] = 100;
                    modSpawnChances["mod_scope_001"] = 100;
                    modSpawnChances["mod_scope_002"] = 100;
                }

                BotGeneratorHelp.addCompatibleModsForProvidedMod("mod_scope", modToAddTemplate, modPool, botEquipBlacklist);
            }

            // If front/rear sight are to be added, set opposite to 100% chance
            if (["mod_sight_front", "mod_sight_rear"].includes(modSlot))
            {
                modSpawnChances.mod_sight_front = 100;
                modSpawnChances.mod_sight_rear = 100;
            }

            const modId = BotGeneratorHelp.hashUtil.generate();
            weapon.push(BotGeneratorHelp.createModItem(modId, modToAddTemplate._id, weaponParentId, modSlot, modToAddTemplate, botRole));
            
            // I first thought we could use the recursive generateModsForItems as previously for cylinder magazines.
            // However, the recurse doesnt go over the slots of the parent mod but over the modPool which is given by the bot config
            // where we decided to keep cartridges instead of camoras. And since a CylinderMagazine only has one cartridge entry and
            // this entry is not to be filled, we need a special handling for the CylinderMagazine
            const modParentItem = BotGeneratorHelp.databaseServer.getTables().templates.items[modToAddTemplate._parent];
            if (BotGeneratorHelp.botWeaponGeneratorHelper.magazineIsCylinderRelated(modParentItem._name))
            {
                // We don't have child mods, we need to create the camoras for the magazines instead
                BotGeneratorHelp.fillCamora(weapon, modPool, modId, modToAddTemplate);
            }
            else
            {
                if (Object.keys(modPool).includes(modToAddTemplate._id) || (modToAddTemplate._props.Slots && modToAddTemplate._props.Slots.find(i => ModInRaid.checkRequired(i) == true)))
                {
                    // Call self recursivly to add mods to this mod
                    ModInRaid.generateModsForWeapon(sessionId, weapon, modPool, modId, modToAddTemplate, modSpawnChances, ammoTpl, botRole);
                }
            }
        }

        return weapon;
	}

}

module.exports = { mod: new ModInRaid() }