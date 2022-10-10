/* NVGs.js
 * License: NCSA
 * Copyright: jc980 from Senko's Pub, modified by Props
 * Website: https://www.guilded.gg/senkospub
 * Name: ClearNVGs
 * Description: Clear Night Vision Goggles
 * Version: 1.00
 * Author(s):
 * - jc980
 */

import { DependencyContainer } from "tsyringe";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";

class Mod implements IPostDBLoadMod
{
	postDBLoad(container: DependencyContainer): void {

		const logger = container.resolve<ILogger>("WinstonLogger");
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		var database = databaseServer.getTables();	
		
		let items = database.templates.items;

		for (let currentitem in items) 
		{
       		let fileData = items[currentitem];

			//GPNVGs
			if (fileData._id === "5c0558060db834001b735271") {
				fileData._props.Intensity = 2.0;
				fileData._props.Mask = "Anvis";
				fileData._props.MaskSize = 1.35;
				fileData._props.NoiseIntensity = 0.00;
				fileData._props.NoiseScale = 10;
				fileData._props.Color = {
					"r": 25,
					"g": 150,
					"b": 50,
					"a": 254
				}
				fileData._props.DiffuseIntensity = 0.025;
			}

			//N-15
			if (fileData._id === "5c066e3a0db834001b7353f0") {
				fileData._props.Intensity = 2.0;
				fileData._props.Mask = "Binocular";
				fileData._props.MaskSize = 1.35;
				fileData._props.NoiseIntensity = 0.02;
				fileData._props.NoiseScale = 10;
				fileData._props.Color = {
					"r": 100,
					"g": 100,
					"b": 200,
					"a": 254
				}
				fileData._props.DiffuseIntensity = 0.04;
			}

			//PNV-10T
			if (fileData._id === "5c0696830db834001d23f5da") {
				fileData._props.Intensity = 2.0;
				fileData._props.Mask = "Binocular";
				fileData._props.MaskSize = 1.25;
				fileData._props.NoiseIntensity = 0.01;
				fileData._props.NoiseScale = 10;
				fileData._props.Color = {
					"r": 50,
					"g": 150,
					"b": 100,
					"a": 254
				}
				fileData._props.DiffuseIntensity = 0.05;
			}

			//PVS-14
			if (fileData._id === "57235b6f24597759bf5a30f1") {
				fileData._props.Intensity = 2.0;
				fileData._props.Mask = "OldMonocular";
				fileData._props.MaskSize = 1.50;
				fileData._props.NoiseIntensity = 0.03;
				fileData._props.NoiseScale = 10;
				fileData._props.Color = {
					"r": 25,
					"g": 125,
					"b": 25,
					"a": 254
				}
				fileData._props.DiffuseIntensity = 0.03;
			}
			
			//T-7
			if (fileData._id === "5c110624d174af029e69734c") {
				fileData._props.HeatMin = 0.001;
				fileData._props.IsNoisy = false;
				fileData._props.NoiseIntensity = 0.01;
				fileData._props.IsMotionBlurred = false;
				fileData._props.Mask = "Thermal";
				fileData._props.MaskSize = 1.50;
			}
		}
		
		logger.info("Night Vision Goggles: Goggles Modified");
	}
}

module.exports = { mod: new Mod() }