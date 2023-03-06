## What does this mod do ?

Design philosophy (Or: What is this mod trying to accomplish?)
	This mod makes the AI more difficult, primarily by making them shoot more often and more accurately. It also adds some more raiders and / or PMCs to the maps and adds more mods to the AI weapons. The end goal is not to try and make offline AI that's as difficult to fight as a player, but rather, since players will end up facing 10+ bots in a fairly normal offline raid, to make the combined experience of fighting those 10+ bots a reasonably challenging one.
		
Installation:
	-Drop the unzipped files in your user/mods folder and you should be good to go.

The advanced configs:

	The advanced config files are intended to provide more granular control of various aspects of AKI/EFT. They're generally quite lengthy and detailed, but instructions for each will be included inside the config files themselves.
	
		
Difficulty settings:

	Ingame difficulty settings do not affect this mod. Unless the option to disable all AI changes has been enabled, ingame difficulty is ignored, and all difficulty settings must be made via the mod's config files. More details on the specific functioning of the main difficulty settings can be found in the entry for [bot]DifficultyMod_Neg3_3, however, in the most basic sense, higher numbers are harder and lower difficulties are easier.
	
	Automatic difficulty adjustments:
		-If this option (enableAutomaticDifficulty in the config.json) is enabled, your success and failure in raids will be tracked by the mod, and used to automatically adjust your overall difficulty settings. The differences in difficulty between different types of bots will be respected, but the base difficulty value will be completely overwritten.
		-It is *important* to note that difficulty adjustments can only be made upon loading the game. This is a limitation of AKI, and cannot, as far as I am aware, be fixed.
			-This means that you will need to restart your game and server after every raid, in order for difficulty changes to take effect.
	

	Multipliers:
		
	-health multipliers: These are fairly obvious in function.
		Recommended: 1-2. Setting PMCs to 2 can be quite nice, in particular. It lets them survive fights with the other AIs much more easily.
		
	-overallAIDifficultyMod: This mod gives every bot a number that represents its difficulty settings. This number is the only thing that directly affects bot difficulty values, and is unaffected by ingame difficulty settings (ie. easy, medium, hard, impossible). This config entry sets the base difficulty level for all low, mid and high level AIs.
		Recommended: -4 to 4
		
	-[bot]DifficultyMod_Neg3_3: This mod gives every bot a number that represents its difficulty settings. This number is the only thing that directly affects bot difficulty values, and is unaffected by ingame difficulty settings (ie. easy, medium, hard, impossible). This config entry adds or subtracts to that number to alter the difficulty of a given group of bots. This entry can accept possitive or negative numbers, and will also accept decimals. Please note that extremely high values may break the game. Please note that mid level AIs will have a difficulty 1 higher than the entered value, and high level AIs will have a value 2 higher than the entered value. This modifier is especially useful if you want hard enemies, but also don't want a lot of easy gear off of raiders and PMCs.
		Recommended: -4 to 4
	
	
	Some people have said they've had problems if they set the following values to decimals without a leading digit, ie. .7 instead of 0.7 . If you're having problems, make sure any decimal values have a leading zero. It may help.
	
	-aiAimSpeedMult: This affects how quickly the AI takes aim. Lower numbers make them take aim faster!
		Recommended: 0.5-1
	-aiShotSpreadMult: This affects how far the AI's shots will spread from where they're aiming. Contraty to what you might imagine, having no spread is actually *very* bad for the AI, because of a weird bug where they want to aim to a point just a few inches beside you. Lower numbers mean lower spread, but this particular multiplier also seems to be strangely inconsistent.
		Recommended: 0.8-1
	-aiVisionSpeedMult: This is how fast the AI can spot you. This happens before they take aim, and lower numbers seem to be better.
		Recommended: 0.8-1.3
	-sniperBotAccuracyMult: I believe lower is better, but this just improves how accurate the AI sniper / marksman spawns are.
		Recommended: I have no idea, yet.
	-visibleDistanceMult: Higher is better, and improves the distance the AI is able to see. For reference, on Impossible PMCs and raiders can see 125 meters, and scavs can see 115 meters. This value should multiply that, so higher numbers would be better.
		Recommended: 1
	-semiAutoFireRateMult: Lower is better. Think of this one as "How long should the AI wait between single shots", meaning that 2 would double it, 0.5 would halve it.
		Recommended: 1
	-aiRecoilMult: Lower is better, and reduces the level of recoil the AI 'feels', in all respects.
		Recommended: 0.5-1.5
	-aiHearingMult: Higher is better, and lets the AI hear at a greater distance. Making it too high can cause problems, though, where the AI hears enemies hundreds of meters away and decides it's time to sit still and try and ambush them, which.. Doesn't really work out.
		Recommended: 1
	
	Other settings:
	
	AIbehaviourChanges: Behaviour changing is a relatively new feature for the mod, and comes with a number of drawbacks. The largest drawback is that PMCs will no longer reliably fight scavs, or PMCs of the opposite faction. However, enabling behaviour changes can significantly improve the AI's ability to act and react to you. This option functions based on a series of 'weights' for each class of AI. The higher a behaviour type's weight, the more likely it is that a bot of that class of AI will be assigned that behaviour type. -For instance, if High level AIs have both "Default" and "Sniper" set to 6, and all other options are set to 0, they will have an equal chance of being assigned either their default behaviour, or the "Sniper" behaviour. -If all other options were set to 2, however, then they would be three times more likely to be assigned the "Sniper" role than the "Scout" role, or the "Aggressive" role.
	
	
Config details:

	-grenadePrecisionMult, grenadeThrowRangeMax, grenadeThrowRangeMult: These influence the AI's ability to throw grenades. grenadePrecisionMult determines how accurate they are, with lower values being more accurate and high values being less accurate. grenadeThrowRangeMult multiplies the maximum range at which they can throw grenades, which seems to start at about 15m for the easiest settings, and goes up by about 3m per difficulty level (I say about because this setting is measured in 'power' instead of actual meters, so I can't be sure). Lower grenadeThrowRangeMult values mean shorter maximum throw ranges, higher values mean they can throw farther. grenadeThrowRangeMax is the cap on this setting, so that no bot, no matter how high the difficulty, can go above that value.

	-infiniteAIHealing_PMCs_All_false: This option determines which bots, if any, will be given Sanitar's OP medkit in their secure container (Meaning they can use it to heal, but you can't loot it). This medkit has 3000 HP and can heal all types of injuries. It has a 2 second use time, and bots will only use it when (As far as I can tell) they've been out of combat for a short period of time, and are a certain distance (30+ meters by default) from the player. Healing has a two second animation.
		-Options for this config entry are: "PMCs", "All", or false. (No quotes around false. Keep the quotes for the others.)

	-maxTacticalDevices and maxPrimaryOptics: These both determine how many tacticals / primary optics a bot's weapon is allowed to have. At the moment it seems *pretty* reliable, but I have noticed the occasional mistake slipping through. You can set either of these to a negative number to completely disable the associated functionality.
		-"Primary" optics is meant to include all optics except those mounted on the MPR45 or ontop of something like the HAMR or Bravo scopes. I recommend you leave this at 1.

	-infiniteAIAmmo: If set to true, this gives the AI 100x more ammunition inside their secure containers. This doesn't affect their lootable inventories, but should mean that encountering AIs with no ammunition is much rarer.

	-allowAimAtHead: This toggles whether the AI is allowed to deliberately aim at your head. Recoil and general shot spread can still allow you to be hit in the head.
	
	-visibleAngleMult: This multiplies the AI's cone of vision either up or down, and visibleAngleMax sets the maximum value. Setting visibleAngleMax above 360 has no effect. Default cone of vision settings are [120,150,180,210,240,270] (See the [bot]DifficultyMod_Neg3_3 entry for details of what this means).

	-setTheseBotsToDefaultPlayerHPBeforeMultsAreUsed: This sets all HP values for the bots placed in that list to the player's default level, before the other health multiplier settings are applied. This is relevant because some bots, such as cultists and PMCs, have expanded health pools by default.
	
	-[bot]DifficultyMod_Neg3_3: This changes the difficulty of the indicated type of bot. Positive numbers increase difficulty, and negative numbers decrease it. This can be used to make scavs harder than PMCs, or to make bots harder / easier than the four difficulty selection options (easy, normal, etc.) allow. There is technically no ceiling on this number, and you could raise it higher than 3 if you wanted, but I haven't tested it beyond 3. Values lower than -6 will have no additional effect on any bot, and some will currently bottom out at 0, if playing on easy difficulty.
	
	-botsWillNotSpawnWithTheseThings: This is a blacklist. Anything on this list will not spawn in AI inventories. This affects anything that can appear in the AI's pockets, backpack, rig, secure container, weapon slots, or armor / gear slots. You can remove grenades, guns, armor, balaclavas, ammo, etc.


Debugging:
	
	showSpawns, showBosses, showBossPMCs: These can be set to "all", a map name (You can find the valid map names at the top of the config), or false (no quote marks).
		-If saveDebugFiles is set to true, these will update files in donottouch/debug/ that describe the spawns of the indicated map(s). They are updated once when the game begins, and then again right before your raid begins, meaning that the spawns shown on server startup ARE NOT the exact spawns you'll see when you load into a raid. Timings, locations and squad sizes may have changed.
		-If saveDebugFiles is set to false, and an option has been set to a specific map's name (Not "all", in other words), then you'll see a server printout of the relevant information, broken into both a "BEFORE" and "AFTER" section. The "BEFORE" section is what the spawns for that map looked like before this mod made its changes, and the "AFTER" section is what the spawns look like afterwards. If saveDebugFiles is set to false there will be no additional server printouts before or after raids.
	
	showGuns, showAmmo, showArmor: These can be set to a specific bot's name (You can find the valid bot names at the top of the config), or to false.
		-If saveDebugFiles is set to true, these have no effect, as it seemed to cause issues with newer versions of AKI. This functionality may be re-enabled later. This option DOES NOT effect any files inside of the bot_loadouts folder.
		-If saveDebugFiles is set to false, and an option has been set to a specific bot's name (Not "all", in other words), then you'll see a server printout of the relevant information.
	
	reportWavesBeforeRaid: This option displays some basic information about your waves before a raid begins. At the moment it has some issues, and is not entirely reliable.
	
	Most people won't ever need to use the debug area, this is mostly to make my life easier when people come to me with problems.
	
Notes:
There are a few quirks to the mod, at the moment:
	
	Player health:
		-If you want to modify the player's default health, any modifications made need to be made inside of Aki_Data\Server\database\globals.json, inside the PlayerHealthFactors section. Specifically, you need to change the 'Maximum' values. If this is *not* done, any changes made to the player's profile file will be reset by this mod upon starting the game.
			-This is done because of COD_mode. Without forcibly setting the player's health via an external reference upon beginning the game, if the player's game were to crash while using COD_mode their health would be permanently increased.
			-I know this is likely to cause issues with some other mods, and I'll see if I can come up with a better way of handling COD_mode, but for now this is just going to add another step to modifying player HP values.
	AI Talking:
		-If *any* AIs are prevented from talking, the others will get noticably less talkative as well. There is not a way to fix this, as far as I can tell. The other bots will still talk a little bit, but not as much as before. If you allow *all* bots to talk, though, they will all talk the normal amount again.
	Spawning in large waves:
		-If you tell the game to spawn in very large waves (7+ or so) it doesn't seem to like doing this. Sometimes it seems to spread those extra spawns into neighbouring zones, but you're better off telling it to spawn in a larger number of smaller waves.
	Randomized gear:
		-This *WILL* give you errors, because the randomization isn't perfect (yet). These errors aren't serious, as far as I've seen, and they usually amount to "Something went wrong making a custom weapon, so this bot is being given a default weapon intead."
			-Also: I tried to make sure this wouldn't happen anymore, but in my tests the AI would sometimes spawn in with things like mounted .50 MGs and the AGL launcher. That shouldn't happen anymore, but just.. Y'know. If that happens, I'm sorry. I'll fix it.	
	
My programming is extremely messy and still (currently) flooded with notes and reminders, but if you want to brave it, go right ahead. I've left comments to help you noble souls, and you can feel free to copy and use whatever you like in your own projects.