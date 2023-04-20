import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import { DependencyContainer } from "tsyringe";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import JSON5 from "json5";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { ITemplateItem } from "@spt-aki/models/eft/common/tables/ITemplateItem";
import * as ammoTypes from "@spt-aki/models/enums/AmmoTypes";
import { Info } from "../types/models/eft/common/tables/IBotBase";

class tracer implements IPostAkiLoadMod {
  postAkiLoad(container: DependencyContainer): void {
    const logger = container.resolve<ILogger>("WinstonLogger");
    const databaseServer: DatabaseServer = container.resolve("DatabaseServer");
    const items: Record<string, ITemplateItem> =
      databaseServer.getTables().templates.items;

    let modFolder = __dirname.split("\\").slice(0, -1).join("\\");

    const config: TracerConfig = JSON5.parse(
      require("fs").readFileSync(`${modFolder}/cfg/cfg.json5`, "utf8")
    ) as TracerConfig;

    //loop through all items in dictionary

    for (const [key, value] of Object.entries(itemDictionary)) {
      //logger.info("Key value is " + key + ", the value: " + value);
      //check if item exists
      if (!config.AddNoTracer.includes(value)) {
        //add tracer if its undefined or change it if its not

        //logger.info(`Adding tracer to ${value} : ${items[value]._name}`);

        items[value]._props.TracerColor = config.TracerColor;
        items[value]._props.Tracer = true;
        items[value]._props.TracerDistance = 50000;
        items[value]._props.ShowBullet = true;
      }
    }
  }
}

interface ItemDictionary {
  [key: string]: string;
}

interface TracerConfig {
  AddNoTracer: string[];
  TracerColor: string;
}

const itemDictionary: ItemDictionary = {
  ...ammoTypes.Grenade,
  ...ammoTypes.Ammo762x51,
  ...ammoTypes.Ammo762x54,
  ...ammoTypes.Ammo86x70,
  ...ammoTypes.Ammo46x30,
  ...ammoTypes.Ammo57x28,
  ...ammoTypes.Ammo762x25,
  ...ammoTypes.Ammo9x18,
  ...ammoTypes.Ammo9x19,
  ...ammoTypes.Ammo9x21,
  ...ammoTypes.Ammo9x33R,
  ...ammoTypes.Ammo1143x23ACP,
  ...ammoTypes.Ammo545x39,
  ...ammoTypes.Ammo556x45,
  ...ammoTypes.Ammo762x35,
  ...ammoTypes.Ammo762x39,
  ...ammoTypes.Ammo9x39,
  ...ammoTypes.Ammo366TKM,
  ...ammoTypes.Ammo127x55,
  ...ammoTypes.Ammo12Gauge,
  ...ammoTypes.Ammo20Gauge,
  ...ammoTypes.Ammo23x75,
  ...ammoTypes.Ammo30x29,
  ...ammoTypes.Ammo127x108,
  ...ammoTypes.Ammo26x75,
};

module.exports = { mod: new tracer() };
