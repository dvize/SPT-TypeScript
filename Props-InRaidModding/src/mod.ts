
import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import type { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import type { ILogger } from "@spt-aki/models/spt/utils/ILogger";

class ModInRaid implements IPostDBLoadMod
{
	postDBLoad(container: DependencyContainer): void {
		const logger = container.resolve<ILogger>("WinstonLogger");
		const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		let database = databaseServer.getTables();
		let items = database.templates.items;
		
		logger.info("In-Raid Modding Loop Started");
		this.SetAllModdableProps(logger, items)
		logger.info("In-Raid Modding Loop Successfully Finished");
	}

	SetAllModdableProps(logger, items): void{

		for (let id in items)
		{
			//if undefined raid moddable, make it moddable.
			items[id]._props.RaidModdable = true;
			
			//if undefined tool moddable, made it tool moddable.
			items[id]._props.ToolModdable = true;
			
		}
	}
	
	
}


module.exports = { mod: new ModInRaid() }