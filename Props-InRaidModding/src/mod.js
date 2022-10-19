"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modName = "Props In-Raid Modding";
class ModInRaid {
    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const databaseServer = container.resolve("DatabaseServer");
        let database = databaseServer.getTables();
        let items = database.templates.items;
        logger.info("In-Raid Modding Loop Started");
        this.SetAllModdableProps(logger, items);
        logger.info("In-Raid Modding Loop Finished");
    }
    SetAllModdableProps(logger, items) {
        for (let id in items) {
            //if undefined raid moddable, make it moddable.
            items[id]._props.RaidModdable = true;
            //if undefined tool moddable, made it tool moddable.
            items[id]._props.ToolModdable = true;
            //if it has slots make sure they are all set no requirements
            for (let slot in items[id]._props.Slots) {
                items[id]._props.Slots[slot]._required = false;
            }
        }
    }
}
module.exports = { mod: new ModInRaid() };
