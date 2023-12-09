/* eslint-disable @typescript-eslint/no-var-requires */
import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { CustomItemService } from "@spt-aki/services/mod/CustomItemService";
import {
  LocaleDetails,
  NewItemDetails,
} from "@spt-aki/models/spt/mod/NewItemDetails";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { HashUtil } from "@spt-aki/utils/HashUtil";
import { ITemplateItem } from "../types/models/eft/common/tables/ITemplateItem";
import { Money } from "@spt-aki/models/enums/Money";
import { TraderHelper } from "./traderHelpers";
import { FluentAssortConstructor } from "./fluentTraderAssortCreator";
import { ItemsJson } from "./items.type";

let logger: ILogger;

class Mod implements IPostDBLoadMod, IPostAkiLoadMod {
  //declare private variable db of DatabaseServer type
  private db: DatabaseServer;
  private traderHelper: TraderHelper;
  private fluentTraderAssortHelper: FluentAssortConstructor;
  private traderID: string;

  public postDBLoad(container: DependencyContainer): void {
    // Resolve containers
    const CustomItem =
      container.resolve<CustomItemService>("CustomItemService");
    const hashUtil: HashUtil = container.resolve<HashUtil>("HashUtil");
    logger = container.resolve<ILogger>("WinstonLogger");
    this.db = container.resolve<DatabaseServer>("DatabaseServer");
    this.traderHelper = new TraderHelper();
    this.fluentTraderAssortHelper = new FluentAssortConstructor(
      hashUtil,
      logger
    );

    //read the items.json file with type ItemsJson
    const itemsjson = require("../database/templates/items.json") as ItemsJson;

    //set trader id we want to add assort items to
    this.traderID = "5a7c2eca46aef81a7ca2145d"; //existing trader Mechanic

    setupItems(itemsjson, CustomItem);
    handleAssorts(
      CustomItem,
      this.db,
      this.fluentTraderAssortHelper,
      this.traderID
    );
  }

  //Check if our item is in the server or not
  public postAkiLoad(container: DependencyContainer): void {
    // logger.info("DoorBreacher: Added the following items:");
    // logger.info(item["doorbreacher"]._props);
    // logger.info(item["doorbreacherbox"]._props);
    ModifyAmmoPropForWeapons(this.db);
    logger.info("DoorBreacher: Finished Modifying Ammo Properties for Weapons");
  }
}

module.exports = { mod: new Mod() };

function setupItems(itemsjson: ItemsJson, CustomItem: CustomItemService) {
  //make locale for DoorBreacher
  const DoorBreacherLocale: Record<string, LocaleDetails> = {
    en: {
      name: "12/70 Door-Breaching Round",
      shortName: "Breach",
      description:
        "The door-breaching round is designed to destroy deadbolts, locks, and hinges without risking lives by ricocheting or penetrating through doors. These frangible rounds are made of a dense sintered material which can destroy a lock or hinge and then immediately disperse.",
    },
  };

  //add new custom item
  const DoorBreacher: NewItemDetails = {
    newItem: itemsjson.doorbreacher,
    fleaPriceRoubles: 8000,
    handbookPriceRoubles: 10000,
    handbookParentId: "5b47574386f77428ca22b33b",
    locales: DoorBreacherLocale,
  };

  //make locale for DoorBreacherBox
  const DoorBreacherBoxLocale: Record<string, LocaleDetails> = {
    en: {
      name: "12/70 Door-Breaching 5-Round Box",
      shortName: "Breach",
      description:
        "A 5-round box of 12ga door breaching shells. The door-breaching round is designed to destroy deadbolts, locks, and hinges without risking lives by ricocheting or penetrating through doors.  These frangible rounds are made of a dense sintered material which can destroy a lock or hinge and then immediately disperse.",
    },
  };

  //add new custom item
  const DoorBreacherBox: NewItemDetails = {
    newItem: itemsjson.doorbreacherbox,
    fleaPriceRoubles: 40000,
    handbookPriceRoubles: 50000,
    handbookParentId: "5b47574386f77428ca22b33c",
    locales: DoorBreacherBoxLocale,
  };

  //create the items
  CustomItem.createItem(DoorBreacher);
  CustomItem.createItem(DoorBreacherBox);
}

function ModifyAmmoPropForWeapons(db: DatabaseServer) {
  const WeaponProperties = [
    { name: "patron_in_weapon", index: 0 },
    { name: "patron_in_weapon_000", index: 1 },
    { name: "patron_in_weapon_001", index: 2 },
    { name: "Cartridges", index: 3 },
  ];

  const chambersExist = (item) =>
    item._props.Chambers && item._props.Chambers.length > 0;

  const filterIncludes12G = (filterArray) =>
    filterArray.includes("560d5e524bdc2d25448b4571");

  for (const item of Object.values(db.getTables().templates.items)) {
    if (chambersExist(item)) {
      for (const Property of WeaponProperties) {
        const chamberName = Property.name;
        const chambers = item._props.Chambers;

        //check if the chamber name exists in the item
        const isModFilterExist = (Chambers) =>
          Chambers.findIndex((chamber) => chamber._name === chamberName);

        //check if the chamber name exists in the item and if the filter includes 12G
        const indexInChambers = isModFilterExist(chambers);
        if (
          indexInChambers > -1 &&
          filterIncludes12G(chambers[indexInChambers]._props.filters[0].Filter)
        ) {
          //write to console the chamber name and the item.name
          logger.info(
            `DoorBreacher added to: ${item._name} in chamber: ${chamberName}`
          );
          chambers[indexInChambers]._props.filters[0].Filter.push(
            "doorbreacher"
          );
        }
      }
    }
    // check if Cartridges exist in items, it includes 12g slug already, and add doorbreacher to it
    if (
      //make sure there is a cartridge and its length is greater than 0 before checking the filter
      item._props.Cartridges &&
      item._props.Cartridges.length > 0 &&
      filterIncludes12G(item._props.Cartridges[0]._props.filters[0].Filter)
    ) {
      logger.info(`DoorBreacher added to: ${item._name} in Cartridges`);
      item._props.Cartridges[0]._props.filters[0].Filter.push("doorbreacher");
    }
  }
}

function handleAssorts(
  CustomItem: CustomItemService,
  db: DatabaseServer,
  assortHelper: FluentAssortConstructor,
  traderID: string
) {
  const targetTrader = db.getTables().traders[traderID];

  //create assort for doorbreacher. no money, add barter only later
  assortHelper
    .createSingleAssortItem("doorbreacher")
    .addStackCount(100)
    .addUnlimitedStackCount()
    .addLoyaltyLevel(1)
    .addMoneyCost(Money.ROUBLES, 10000)
    .export(targetTrader);

  //create assort for doorbreacherbox
  assortHelper
    .createSingleAssortItem("doorbreacherbox")
    .addStackCount(100)
    .addUnlimitedStackCount()
    .addLoyaltyLevel(1)
    .addMoneyCost(Money.ROUBLES, 50000)
    .export(targetTrader);

  //create barter item for doorbreacher
  const electricWire = "5c06779c86f77426e00dd782";
  assortHelper
    .createSingleAssortItem("doorbreacher")
    .addStackCount(100)
    .addUnlimitedStackCount()
    .addBarterCost(electricWire, 1)
    .addLoyaltyLevel(1)
    .export(targetTrader);

  //create barter item for doorbreacherbox
}
