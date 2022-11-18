## What does this mod do ?

Design philosophy (Or: What is this mod trying to accomplish?)
	This mod makes the AI more difficult, primarily by making them shoot more often and more accurately. It also adds some more raiders and / or PMCs to the maps and adds more mods to the AI weapons. The end goal is not to try and make offline AI that's as difficult to fight as a player, but rather, since players will end up facing 10+ bots in a fairly normal offline raid, to make the combined experience of fighting those 10+ bots a reasonably challenging one.
		
Installation:
	-Drop the unzipped files in your user/mods folder and you should be good to go.

Regarding changes going into AKI 2.0.0:

	Until this notice has been removed, be advised that this readme may not have been fully updated with the changes moving into AKI 2.0.0. Some things in this readme may not be entirely accurate, though the vast majority still are. This document is almost five thousand words long, and updating it is both very time-consuming, and a low priority compared to fixing bugs or tweaking settings.
	
The advanced configs:

	The advanced config files are intended to provide more granular control of various aspects of AKI/EFT. They're generally quite lengthy and detailed, but instructions for each will be included inside the config files themselves.
	
	I will note here, however, things about them that affect how they interact with the regular config file:
		-Enabling the advanced spawn config disables certain options in the spawnChanges section of the config. spawnChanges options that are NOT disabled are:
			-spawnPMCsAsBosses
			-breakUpSpawnWaves
			-allPMCsare[BEARs/USECs]
			-extraWaveSpawnSpeedFactor
		
Difficulty settings:

	Ingame difficulty settings do not affect this mod. Unless the option to disable all AI changes has been enabled, ingame difficulty is ignored, and all difficulty settings must be made via the mod's config files. More details on the specific functioning of the main difficulty settings can be found in the entry for [bot]DifficultyMod_Neg3_3, however, in the most basic sense, higher numbers are harder and lower difficulties are easier.
	
	Automatic difficulty adjustments:
		-If this option (enableAutomaticDifficulty in the config.json) is enabled, your success and failure in raids will be tracked by the mod, and used to automatically adjust your overall difficulty settings. The differences in difficulty between different types of bots will be respected, but the base difficulty value will be completely overwritten.
		-It is *important* to note that difficulty adjustments can only be made upon loading the game. This is a limitation of AKI, and cannot, as far as I am aware, be fixed.
			-This means that you will need to restart your game and server after every raid, in order for difficulty changes to take effect.
	
	Spawn values:
		-Generally speaking, Gluhar's Raiders are the hardest kind of bot you can spawn in, because there's something about them that just makes them hyper-aggressive and gives them an edge that other bots just don't have (Yet. I hope to find the secret sauce, so I can make PMCs behave the same way). PMCs and raiders are about equally hard on Impossible, due to using the same 'class' of difficulty setting, but from Easy->Hard, PMCs are tougher than raiders. Scavs are, of course, the easiest. (This isn't completely true anymore, but I'm leaving it in because it's still /kind've/ true)
		TL;DR: Replace scav spawns with PMCs or raiders for a harder time that doesn't slow your PC down with extra bots, and add in waves of Gluhar's boys if you want an extra challenge.
		
		-scavsFightBEARBots and scavsFightUSECBots, if disabled, will make sure that PMCs aren't getting killed by scavs, and thus will be around to fight *you*, instead.
		
		-allPMCsareBEARs and allPMCsareUSECs: Similar to the above, this keeps PMCs from killing other PMCs, and helps make sure there are more of them around for you to fight.
			I *highly* recommend turning one of these on.

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
	
	Removing weapons: The more automatic weapons bots have, the harder they'll be. Removing pump, bolt and semi-auto weapons from a bot will make it harder.
	
	Armor levels: This one is pretty obvious, but if you want exceptionally tough PMCs, then setting them to a minimum of level 5 and a maximum of level 6 armor makes them pretty beefy.
	
	Ammunition: Removing more good ammo from bots will make them significantly weaker against armor. Conversely, removing less good ammo and more bad ammo can make armor completely worthless.
	
	noHatsOnlyHelmets: This removes all non-armor headgear from the bots, meaning that they're overall more likely (Though not guaranteed) to spawn in with a helmet, which will, of course, make things a bit harder.
	
Config details:

	-enableProgressiveGear: If set to true, bot gear will automatically increase in quality as the player increases in level. This overrides MANY of the other gear settings, and is intended to create a more punishing, scavenger-y experience.
		-At present, things affected by this option are:
			-Weapon durability
			-Magazine size
			-Armor frequency (NOT class or quality)
				-Both rigs and vests
			-Helmet frequency (NOT class or quality)
		-Things that are currently planned to be implemented:
			-Optics
			-Tactical devices
			-Armor durability
			-Meds
				-Durability, type and quantity
			-Grenades

	-weaponDurability_MAXMin_Max__CURRENTMin_Max and armorDurability_MAXMin_Max__CURRENTMin_Max: These settings have two parts: The first set of square brackets, and the second set. These two options determine bot equipment durability. The first option affects their maximum durability, while the second option affects their current durability, and will be partially based off of whatever the maximum durability ends up being set at.
		-For example: If weaponDurability_MAXMin_Max__CURRENTMin_Max is set to [[25,75][50,100]], then the bot's maximum weapon durability will be between 25% and 75%. -Let's say that, for a particular weapon, the game sets its maximum durability to 66%. Looking at the second set of square brackets, then the weapon's current durability can be anywhere between 50% and 100% of the weapon's maximum durability (66%, in this case), meaning that the weapon's current durability range for this particular weapon is between 33% and 66%

	-magDowngradeChance: This is the chance that any magazine in a bot's inventory, but *not* in their weapon, will be switched out for a magazine of the same or smaller size. This is intented to create more variety in bot loadouts.

	-silenceWeaponGenErrors: This option prevents errors from being logged during weapon generation. This may hide other types of errors from the user, and should be disabled if anything unusual seems to be happening. However, in 99% of use cases, this option will only hide non-critical information from the player and prevent their server log from becoming unecessarily cluttered.

	-cultistsVisibleOnThermals: This gives cultists the same temperature range as normal scavs, which should make them visible on thermals again.

	-AllowAIToUseBothArmoredVestsAndArmoredRigs: This option is designed to work with Ereshkigal's AIO mod. If you've enabled the ability to wear armored rigs ontop of armored vests, *disabling* this option (Setting it to false) will force the AI to equip only one or the other, not both.

	-armorLevelWeights1_6: This allows you to 'weight' the AI towards certain classes of armor. [1,2,4,1,1,1] would make the AI 2x as likely to be equipped with class 2 armor *compared to the default*, and 4x as likely to equip class 3 armor *comapred to the default*. This isn't perfect for various technical reasons, but if you want an AI to lean more towards a certain class of armor, increase its value. If you want it to lean away from a certain class of armor, increase the *other* values. [5,5,1,5,5,5] is much less likely to be equipped with class 3 armor.

	-grenadePrecisionMult, grenadeThrowRangeMax, grenadeThrowRangeMult: These influence the AI's ability to throw grenades. grenadePrecisionMult determines how accurate they are, with lower values being more accurate and high values being less accurate. grenadeThrowRangeMult multiplies the maximum range at which they can throw grenades, which seems to start at about 15m for the easiest settings, and goes up by about 3m per difficulty level (I say about because this setting is measured in 'power' instead of actual meters, so I can't be sure). Lower grenadeThrowRangeMult values mean shorter maximum throw ranges, higher values mean they can throw farther. grenadeThrowRangeMax is the cap on this setting, so that no bot, no matter how high the difficulty, can go above that value.

	-infiniteAIHealing_PMCs_All_false: This option determines which bots, if any, will be given Sanitar's OP medkit in their secure container (Meaning they can use it to heal, but you can't loot it). This medkit has 3000 HP and can heal all types of injuries. It has a 2 second use time, and bots will only use it when (As far as I can tell) they've been out of combat for a short period of time, and are a certain distance (30+ meters by default) from the player. Healing has a two second animation.
		-Options for this config entry are: "PMCs", "All", or false. (No quotes around false. Keep the quotes for the others.)

	-maxTacticalDevices and maxPrimaryOptics: These both determine how many tacticals / primary optics a bot's weapon is allowed to have. At the moment it seems *pretty* reliable, but I have noticed the occasional mistake slipping through. You can set either of these to a negative number to completely disable the associated functionality.
		-"Primary" optics is meant to include all optics except those mounted on the MPR45 or ontop of something like the HAMR or Bravo scopes. I recommend you leave this at 1.

	-infiniteAIAmmo: If set to true, this gives the AI 100x more ammunition inside their secure containers. This doesn't affect their lootable inventories, but should mean that encountering AIs with no ammunition is much rarer.

	-allowAimAtHead: This toggles whether the AI is allowed to deliberately aim at your head. Recoil and general shot spread can still allow you to be hit in the head.
	
	-visibleAngleMult: This multiplies the AI's cone of vision either up or down, and visibleAngleMax sets the maximum value. Setting visibleAngleMax above 360 has no effect. Default cone of vision settings are [120,150,180,210,240,270] (See the [bot]DifficultyMod_Neg3_3 entry for details of what this means).

	-timeAcceleration: This controls how quickly time passes ingame. The default on Live is 7, meaning time passes seven times as quickly as it does IRL.

	-evenlySpaceAllSpawnTimes option does pretty much what it says on the tin: If you had 45 waves set to spawn, then it would spawn one every minute. -90 waves, and it would spawn one every thirty seconds (This is independant of the actual ingame length of a raid. It's set to assume all raids are 45 minutes long, except for Factory which is set for about 15)
	
	-spawnExtraWavesImmediately sets all waves in the extraWaves section of the config to spawn at the start of the raid, instead of at a random time.
	
	-backpackSizeMin_Max: Setting the 'min' value to a negative number tells the mod to look for the smallest backpack in the bot's default loadout, and use that as the minimum size value.

	-setTheseBotsToDefaultPlayerHPBeforeMultsAreUsed: This sets all HP values for the bots placed in that list to the player's default level, before the other health multiplier settings are applied. This is relevant because some bots, such as cultists and PMCs, have expanded health pools by default.
	
	-spawnPMCsAsBosses: This sets PMCs to spawn using the boss spawn entries, instead of the regular wave entries. It seems to improve their ability to work as a unit.
	
	-breakUpSpawnWaves: enabling this fixes some strange issues with spawning waves in AKI/EFT. By default, with 'As Online' rate of spawns, the game will spawn extra waves of any bot scheduled to spawn in the 'waves' entry of a given map. Specifically, it will spawn a wave with the same min and max spawn times, bot type, and potential locations, but with a wave size equal to the parent wave's size times 0.5, truncated. IE: One wave of 5 scavs will actually be spawned in as a wave of 5, and a wave of 2. 10 would become 10 and 5. 3 would become 3 and 1. Etc. Enabling this breaks each wave of X bots into X waves of one bot, with the same timing and location that the group had.
	
	-[bot]DifficultyMod_Neg3_3: This changes the difficulty of the indicated type of bot. Positive numbers increase difficulty, and negative numbers decrease it. This can be used to make scavs harder than PMCs, or to make bots harder / easier than the four difficulty selection options (easy, normal, etc.) allow. There is technically no ceiling on this number, and you could raise it higher than 3 if you wanted, but I haven't tested it beyond 3. Values lower than -6 will have no additional effect on any bot, and some will currently bottom out at 0, if playing on easy difficulty.
	
	-COD_mode: Enabling this sets the HP of all your bodyparts to 200, and gives you a special injector that will reduce all non-headshot damage taken by 50% and heal you for 25 HP per second for 24 IRL hours.
		-COD mode cannot be applied to newly-created characters. Once you've made your character (Picked a name, face, voice and faction), you need to exit the game and restart the server for everything to work properly.
	
	-botsWillNotSpawnWithTheseThings: This is a blacklist. Anything on this list will not spawn in AI inventories. This affects anything that can appear in the AI's pockets, backpack, rig, secure container, weapon slots, or armor / gear slots. You can remove grenades, guns, armor, balaclavas, ammo, etc.
	
	-removeWeaponTypesSemiAutoPumpBolt: The available options are "pump", "bolt", "semi", and "auto", and all weapons of that type will be removed from that bot type's inventory.
	
	-extraWaveSpawnSpeedFactor: This value's effect is not linear, but the higher it is the earlier extra waves of bots will spawn in your raids. This value causes spawn times to asymptotically approach an average spawn time of 350 seconds (Just under six minutes) into the raid. I would advise setting it between 1-5, and making it lower the more extra waves you have set to spawn in. Remember: The more bots in your raid, the slower the game will run.
		-Sidenote: If you set this to a negative number, this effect is completely disabled, and your spawn times will (For the most part, there are some things like cultists and certain types of PMC spawns that will have different mins and maxes) all be between 30 and 2700 seconds in to a raid, or 30 and 1350 seconds on Factory.
		-Sidenode 2: This option is also disabled is spawnExtraWavesImmediately or spawnALLwavesImmediately are enabled
		
	-extraWaveSpawnSpeedFactorMaxTime: This determines the maximum time at which a bot could spawn if extraWaveSpawnSpeedFactor were set to an infinitely high value. In practical terms, this is where the absolute max time will 'cap out' at. Actual spawn times will average out to approximately 1/4 of this value.
	
	-Saving and loading bot inventories: Setting saveGearToFile to true will set the mod to, once it has finished generating the inventories of its bots, save their inventories to files in bot_inventories. Setting loadGearFromFile to true tells the mod to access these files, and skip the usual steps in generating a bot's inventory. This allows you to make manual changes to the generated inventories, such as removing specific weapons or mods, or can be used if you want to skip bot generation for some other reason. If all nine (Currently. More may be added if I set the mod to alter more bot inventories) inventory files are not present and loadGearFromFile is enabled, the mod will not function properly. If you screw these files up, it can cause errors, but you can always just set saveGearToFile to true, run the server, and it will generate new, working files.
		-saveGearToFile does not work if loadGearFromFile is set to true. It's one or the other at a time!
		-optimizedLoading automatically checks to see if either the gear section of the config, the player's list of mods (By the names of the folders in their mod directory), or the bot's main (non-mod) inventory has changed, and if they haven't it loads the bot from its file instead of generating it from scratch. If you're customizing the weapon mods a bot can use, turn this off, but otherwise it should only ever be a good thing.
	
	-extraScavsPerDefaultWave: This increases the minimum number of scavs that will spawn in the game's default waves (Not the waves you add with the config). If you set this to a negative value, it will decrease the scavs spawned in via the game's regular waves. It will never reduce these spawns below 1.
	
	-modFrequency0_2: This is intended to go from 0 (Basically no mods), to 2 (Double the normal number of mods), but you can crank this one all the way to 100 if you want *loads* of mods, and absolutely crazy weapons.
		-Setting this value to a negative number will disable all changes to AI gear chance values. This is intented to be used primarily if one is altering these values either through manual changes to AI files, or via another mod.
	
	-modQuality0_10: This value should be from 0 to 10. A value of 10 means all mods are made available, and 0 means only the mods available in the vanilla SPTarkov experience will appear on enemy weapons, with the possible exception of things like the AK night iron sights, and other very low-qualiy mods that aren't on the vanilla lists.
		-magQuality0_10 functions in the same way, but for magazines. If you don't want a bot using high-capacity magazines, set it low.
	
	-allPMCsareBEARs and allPMCsareUSECs: Enabling one of these will force all PMC bots to be of the specified faction. If you set both of these to true, the mod will default to making BEARs the default AI PMC faction.
	
	-Configuring ammunition (ammoRemovePCTGood_Bad): This is more complicated than in older versions, but it now performs its job much more effectively. This option accepts percentage values in its array. It then looks at the lowest-penetration round available for a given caliber, and the highest-penetration round for that caliber. Using 5.56x45 as an example, this would be Warmage and SSA AP, with penetration values of 3 and 56, respectively. If you set this option to [30, 50], it would  look for anything in the top 30% of that penetration range (Anything above 37.1 penetration), and would remove it from the bot's inventory. Then it would look for anything in the bottom 50% of that penetration range (anything below 26.5) and remove that, as well, leaving only ammunition with penetration values between 26.5 and 37.1, which in this example would be 855 and 856A1. If there are no ammunition options within this range, the mod will pick the highest-penetration round available that is still below the maximum allowed penetration. If there are no such rounds (Such as if you set it to [100, whatever]), then it will select the lowest-penetration round.
	
	-Configuring AI loadouts: You can select the maximum and minimum level of armor for a bot, the relative minimum and maximum rarity of their armor and weapons (This is based on an algorithm inside the mod that looks at both price and spawn chance for the item, and it's been tuned to work in a 0-50 range (Pistols are weird though. Most pistols are available between 0 and 10, but there are some like the threaded Makarov that the algoritm happens to classify as super rare, around 36 if I remember correctly), with a setting of 50 giving bots access to all vanilla armors and weapons. Player-added weapons and armors may be placed outside this range, depending on what their creators set their value and spawn chance as). In addition, you can add specific weapons to their list of options, regardless of that weapon's price.
		-removeVanillaBotWeapons: Setting this to true will clear out the AI's weapon list *BEFORE* it adds weapons based on the rarity settings. This allows you to remove low-quality weapons from bot loadouts if they are in the bot's loadout list by default.
		-removeVanillaBotArmor is the same, but for armor.
	
	-"doNotChangeTheseSPECIFICMaps": Entering a map's name into the list will prevent extra waves of raiders or PMCs from being spawned, and will also prevent regular scav waves from being changed into raiders. Basically, doing this means you'll be playing that map with the vanilla spawns, unless other mods change it.
	
	-scavReplaceWith___AffectsOnlyVanillaWaves: determines whether or not the ​scavReplaceWithRaidersPCT0_100 and scavReplaceWithPMCsPCT0_100 options will affect only vanilla waves (IE: Waves that are present in default AKI) or if it will affect waves added by this mod as well.
		If you want it to affect the advanced spawn config, then enter "advanced" (quotes included) instead of true or false.
	
	-"​scavReplaceWithRaidersPCT0_100": this is the percent chance (0 to 100) that a wave of regular scavs will be replaced with raiders. In addition, because it's random, any chance less than 100 could theoretically result in *no* scavs being replaced, and any value above 0 could result in *all* your scavs being replaced. You have been warned!
	
	-"scavReplaceWithPMCsPCT0_100": this is the exact same thing as above, but it happens *after* scavs are replaced with raiders. This means that if you replace 50% of scavs with raiders, then try and replace 50% of scavs with PMCs as well, you'll end up with about 50% raiders, 25% PMCs, and 25% scavs.
	
	-"raiderWaves" is the number of *extra* waves of raiders you want spawned in at random points within the first 45 minutes of the raid, it can't remove raider waves that are in the game by default (ie on labs and reserve). The min and max values are for how many raiders you want per wave, and the raider waves will not be evenly spaced throughout that 45 minutes. It's totally random.
	
	-"PMCWaves" is the same thing, but for extra PMCs. ..Ditto for the other kinds of 'waves' entries.
	
	-"pumpkinCultists": This gives all cultist enemies the halloween pumpkin helmets. It's enabled by default purely because I think it's cute, even though it does make the game easier.
	
	-"gravestone": If set to true, an ASCII gravestone will appear in your server after every death. Specifically, it will appear once you've left the death screen and returned to the main menu.
	
	-"factionIdentifiers": If set to true, bots will wear armbands that correspond to what type of bot they are.
		-USEC = blue
		-BEAR = red
		-Scav = green
		-Raider = yellow
		-Gluhar's Raiders = white
		-Other boss minions = purple

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