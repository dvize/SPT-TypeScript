
import { DependencyContainer } from "tsyringe";
import {IPostDBLoadMod} from "@spt-aki/models/external/IPostDBLoadMod";
import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";


class ModularNVG implements IPostDBLoadMod
{ 
    postDBLoad(container: DependencyContainer)
	{
        const Logger = container.resolve("WinstonLogger");
        const config = require("../config/config.json");
        const DB = container.resolve("DatabaseServer").getTables();
        const database = DB.templates.items;

        Logger.info("[MOD-NVG] Optimizing Night Optical Devices...");
        
        for (let file in database) {
            let fileData = database[file];
            //GPNVGs
            
            if (fileData._id === "5c0558060db834001b735271" && config.GPNVG.GPNVGenabled == 1) {
                fileData._props.Intensity = config.GPNVG.GPNVGintensity;
                fileData._props.Mask = config.GPNVG.GPNVGmask;
                fileData._props.MaskSize = config.GPNVG.GPNVGmasksize;
                fileData._props.NoiseIntensity = config.GPNVG.GPNVGnoiseintensity;
                fileData._props.NoiseScale = config.GPNVG.GPNVGnoisescale;
                fileData._props.Color = {
                    "r": config.GPNVG.GPNVGredlevel,
                    "g": config.GPNVG.GPNVGgreenlevel,
                    "b": config.GPNVG.GPNVGbluelevel,
                    "a": config.GPNVG.GPNVGalphalevel
                };
                fileData._props.DiffuseIntensity = config.GPNVG.GPNVGdiffuseintensity;
                Logger.info("[MOD-NVG] GPNVG-18 Optimized...");
            }
            //N-15
            if (fileData._id === "5c066e3a0db834001b7353f0" && config.N15.N15enabled == 1) {
                fileData._props.Intensity = config.N15.N15intensity;
                fileData._props.Mask = config.N15.N15mask;
                fileData._props.MaskSize = config.N15.N15masksize;
                fileData._props.NoiseIntensity = config.N15.N15noiseintensity;
                fileData._props.NoiseScale = config.N15.N15noisescale;
                fileData._props.Color = {
                    "r": config.N15.N15redlevel,
                    "g": config.N15.N15greenlevel,
                    "b": config.N15.N15bluelevel,
                    "a": config.N15.N15alphalevel
                };
                fileData._props.DiffuseIntensity = config.N15.N15diffuseintensity;
                Logger.info("[MOD-NVG] N-15 Optimized...");
            }
            //PNV-10T
            if (fileData._id === "5c0696830db834001d23f5da" && config.PNV10T.PNV10Tenabled == 1) {
                fileData._props.Intensity = config.PNV10T.PNV10Tintensity;
                fileData._props.Mask = config.PNV10T.PNV10Tmask;
                fileData._props.MaskSize = config.PNV10T.PNV10Tmasksize;
                fileData._props.NoiseIntensity = config.PNV10T.PNV10Tnoiseintensity;
                fileData._props.NoiseScale = config.PNV10T.PNV10Tnoisescale;
                fileData._props.Color = {
                    "r": config.PNV10T.PNV10Tredlevel,
                    "g": config.PNV10T.PNV10Tgreenlevel,
                    "b": config.PNV10T.PNV10Tbluelevel,
                    "a": config.PNV10T.PNV10Talphalevel
                };
                fileData._props.DiffuseIntensity = config.PNV10T.PNV10Tdiffuseintensity;
                Logger.info("[MOD-NVG] PNV-10T Optimized...");
            }
            //PVS-14
            if (fileData._id === "57235b6f24597759bf5a30f1" && config.PVS14.PVS14enabled == 1) {
                fileData._props.Intensity = config.PVS14.PVS14intensity;
                fileData._props.Mask = config.PVS14.PVS14mask;
                fileData._props.MaskSize = config.PVS14.PVS14masksize;
                fileData._props.NoiseIntensity = config.PVS14.PVS14noiseintensity;
                fileData._props.NoiseScale = config.PVS14.PVS14noisescale;
                fileData._props.Color = {
                    "r": config.PVS14.PVS14redlevel,
                    "g": config.PVS14.PVS14greenlevel,
                    "b": config.PVS14.PVS14bluelevel,
                    "a": config.PVS14.PVS14alphalevel
                };
                fileData._props.DiffuseIntensity = config.PVS14.PVS14diffuseintensity;
                Logger.info("[MOD-NVG] PVS-14 Optimized...");
            }
            //T-7
            if (fileData._id === "5c110624d174af029e69734c" && config.T7.T7enabled == 1) {
                fileData._props.HeatMin = 0.00015;
				fileData._props.MinimumTemperatureValue = 0.25;
                fileData._props.IsNoisy = false;
                fileData._props.NoiseIntensity = 0.0;
                fileData._props.IsMotionBlurred = false;
				fileData._props.RampPalette = config.T7.T7ramppalette;
                fileData._props.Mask = config.T7.T7mask;
                fileData._props.MaskSize = config.T7.T7masksize;
				fileData._props.RampShift = config.T7.T7rampshift;
				fileData._props.MainTexColorCoef = config.T7.T7colorcoef;
				fileData._props.farClipPlane = config.T7.T7farclipplane;
                Logger.info("[MOD-NVG] T-7 Optimized...");
            }
			//N-15 Adapter PNV-10T dovetail adapter
			if (fileData._id === "5c0695860db834001b735461") {
                fileData._props.Slots[0]._props.filters[0].Filter.push("5c066e3a0db834001b7353f0");
				Logger.info("[MOD-NVG] NVG Adapter Retrofitted...");
            }
        }
		Logger.info("[MOD-NVG] Thermal Optics Recalibrated...");
    }
}
module.exports = {mod: new ModularNVG};