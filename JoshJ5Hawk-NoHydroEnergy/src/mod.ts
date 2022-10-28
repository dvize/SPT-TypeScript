
import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";

var databaseServer;
var database;
var logger;

class NoHydroEnergy implements IPostDBLoadMod
{

	postDBLoad(container: DependencyContainer): void {
		const config = require("../config/config.json");
		databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		let databasehealth = databaseServer.getTables().globals.config.Health.Effects;
		logger = container.resolve<ILogger>("WinstonLogger");
		
		logger.info(`Loading: NoHydroEnergy`);
		
		databasehealth.Existence.HydrationDamage = config.values.hydrationDrain;
		databasehealth.Existence.EnergyDamage = config.values.energyDrain;
		databasehealth.Regeneration.Hydration = config.values.hydrationRegen;
		databasehealth.Regeneration.Energy = config.values.energyRegen;
	}

}

module.exports = { mod: new NoHydroEnergy() }