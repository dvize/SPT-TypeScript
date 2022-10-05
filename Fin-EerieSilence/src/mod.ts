// license: NCSA 
// copyright: Fin 
// website: Nada	
// authors: Fin, Props (updated)

import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";


//Code
class Mod implements IPostDBLoadMod
{
	private config = require("../config/config.json");
	
	

	public postDBLoad(container: DependencyContainer): void 
	{	
		//Get DB Server after load.
		let databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		const logger = container.resolve<ILogger>("WinstonLogger");
		
		this.quieterHeadsets(databaseServer, logger);
		
		
	}
		
	public quieterHeadsets(databaseServer, logger): void
	{
		
		const config = require("../config/config.json");
		var database = databaseServer.getTables();	
		
		logger.info('EerieSilence: Searching for Headphone and Deafness Related Items');
		
		for (let itemID in database.templates.items)
		{
			let item = database.templates.items[itemID];
			let itemname = item._name;
			
			//check if the parent is of type headphone
			if (item._parent == "5645bcb74bdc2ded0b8b4578") 
			{
				if (config.full_Stat_Control)
				{
					for (let stat in config.stats){
						item._props[stat] = config.stats[stat];
					}	
					logger.info(`EerieSilence: Setting full stats for ${itemname}`);
				}
				else {

					item._props.Distortion = item._props.Distortion * config.distortion_Multiplier;
					item._props.AmbientVolume = item._props.AmbientVolume * config.ambient_noise_reduction_multiplier;
					logger.info(`EerieSilence: Setting custom Distortion and AmbientVolume for ${itemname}`);
				}
				
				
			}
			
			//also if they item has DeafStrength Property
			if (item._props.DeafStrength && item._parent == "5a341c4086f77401f2541505")
			{
				switch (config.maximum_helmet_deafness)
				{
					case "High":
					{
						item._props.DeafStrength = "Low";
						logger.info(`EerieSilence: Setting Low DeafStrength for ${itemname}`);
						break;
					}
					
					case "Low": 
					{
							item._props.DeafStrength = "Low";
							logger.info(`EerieSilence: Setting Low DeafStrength for ${itemname}`);
							break;
					}
					case "None": 
					{
							item._props.DeafStrength = "None";
							logger.info(`EerieSilence: Setting None DeafStrength for ${itemname}`);
							break;
					}
					default:
					{
						break;
					}
				}
			}
		}
	}
	
}

module.exports = { mod: new Mod() }