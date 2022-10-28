"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var databaseServer;
var database;
var logger;
class NoHydroEnergy {
    postDBLoad(container) {
        const config = require("../config/config.json");
        databaseServer = container.resolve("DatabaseServer");
        let databasehealth = databaseServer.getTables().globals.config.Health.Effects;
        logger = container.resolve("WinstonLogger");
        logger.info(`Loading: NoHydroEnergy`);
        databasehealth.Existence.HydrationDamage = config.values.hydrationDrain;
        databasehealth.Existence.EnergyDamage = config.values.energyDrain;
        databasehealth.Regeneration.Hydration = config.values.hydrationRegen;
        databasehealth.Regeneration.Energy = config.values.energyRegen;
    }
}
module.exports = { mod: new NoHydroEnergy() };
