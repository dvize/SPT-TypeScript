Instructions (Feature Set)
-----------------------------------------
SWAG now includes the following features:

1. Bots may be grouped together to spawn and settings may be defined that affect the whole group.
	- Spawn Time (min and max)
	- Specify if the Whole Group Randomly Spawns (won't be same time obviously)
	- Specify if the Whole Group is only allowed to spawn once in a Random Pick (If RandomTimeSpawn is set to true)
	- Specify a BotZone (OpenZone) that the whole group will spawn in.

2. Boss spawns stay the same format.  The only new edition is assigning a BossZone (OpenZone)

3. Ability to define Maps in which the patterns take effect (specific map names or all)
	valid maps or options for this MapName are:
	- all
	- bigmap
    - factory4_day
    - factory4_night
    - interchange
    - laboratory
    - lighthouse
    - rezervbase
    - shoreline
    - tarkovstreets
    - woods

4. Create as many pattern files with as many names as you want as long as you follow the template format.
	- This will give you the freedom to organize your spawns however you like or even
	define map specific versions if you want.


Instructions (Config.json)
-------------------------------
In the config file the settings do the following: 

aiDifficulty: sets only the bots from this spawner (does not effect the default)

	options:
	"easy",
	"normal",
	"hard",
	"impossible",
	"random"

aiAmount: multiplies the random amount selected from a types botcount (in a pmcconfig or bossconfig or scavconfig)

	"low": aiAmountMultiplier = 0.5
	"medium": aiAmountMultiplier = 1
	"high": aiAmountMultiplier = 2
	"horde": aiAmountMultiplier = 4

"RandomWaveCount": set the number of waves to spawn in which the RandomTimeSpawn has been set to true.
Keep in mind that patterns are not separated by files anymore..SWAG will read them all in.
So SWAG will choose RandomWaveCount of spawns from all pattern files.  If RandomTimeSpawn is 
set to false, it counts as a static/always spawn so it will spawn regardless of whatever is random.

"SkipOtherBossWavesIfBossWaveSelected": It will skip all other waves related to Random Boss Generation 
if this is set to true.  If you set bosses up with specific times then it will still spawn those regardless.

"WaveTimerMinSec": set the minimum number of seconds for each Random Wave to be generated.

"WaveTimerMaxSec": set the maximum number of seconds for each Random Wave to be generated.

"BossChance": The chance that a Random Boss Wave has to spawn.

"MaxBotCap": The maximum amount of bots allowed and configurable at the map level.

"MaxBotPerZone":  allows you to specify the cap on the amount of bots allowed in an Open Zone.

"UseDefaultSpawns": {
	"Waves": true,
	"Bosses": true,
	"TriggeredWaves": true
		
This is self explanatory.  either clear the spawns that are existing or don't
TriggeredWaves will not be generated (best to keep default for these unless you know what you doing).


Instructions (pmcconfig.json or others)
----------------------------------------
Valid bot types to use:
"assault"
"exusec"
"marksman"
"sptbear" 					<----  use this for pmcs
"sptusec"					<----  use this for pmcs
"sectantpriest"
"sectantwarrior"
"assaultgroup"
"bossbully"
"bosstagilla"
"bossgluhar"
"bosskilla"
"bosssanitar"
"bossZryachiy"
"followerbully"
"followergluharassault"
"followergluharscout"
"followergluharsecurity"
"followergluharsnipe"
"followersanitar"
"followertagilla"
"cursedassault"
"bossknight"
"followerbigpipe"
"followerbirdeye"
"followerZryachiy"

Valid Open Zones to use:
Open Zones for bigmap: ZoneBrige,ZoneCrossRoad,ZoneDormitory,ZoneGasStation,ZoneFactoryCenter,ZoneFactorySide,ZoneOldAZS,ZoneBlockPost,ZoneBlockPost,ZoneTankSquare,ZoneWade,ZoneCustoms

Open Zones for factory4_day: BotZone

Open Zones for factory4_night:

Open Zones for interchange: ZoneCenter,ZoneCenterBot,ZoneOLI,ZoneIDEA,ZoneRoad,ZoneIDEAPark,ZoneGoshan,ZonePowerStation,ZoneTrucks,ZoneOLIPark

Open Zones for laboratory: BotZoneFloor1,BotZoneFloor2

Open Zones for lighthouse: Zone_Containers,Zone_Rocks,Zone_Chalet,Zone_Village,Zone_Bridge,Zone_OldHouse,Zone_LongRoad,Zone_DestroyedHouse,Zone_Island

Open Zones for rezervbase: ZoneRailStrorage,ZonePTOR1,ZonePTOR2,ZoneBarrack,ZoneBunkerStorage,ZoneSubStorage

Open Zones for shoreline: ZoneSanatorium1,ZoneSanatorium2,ZoneIsland,ZoneGasStation,ZoneMeteoStation,ZonePowerStation,ZoneBusStation,ZoneRailWays,ZonePort,ZoneForestTruck,ZoneForestSpawn

Open Zones for tarkovstreets: ZoneSW01,ZoneConstruction,ZoneCarShowroom,ZoneCinema,ZoneFactory,ZoneHotel_1,ZoneHotel_2,ZoneConcordia_1,ZoneConcordiaParking

Open Zones for woods: ZoneClearVill,ZoneHouse,ZoneScavBase2,ZoneHouse,ZoneWoodCutter,ZoneBigRocks,ZoneRoad,ZoneHighRocks,ZoneMiniHouse,ZoneBigRocks


pmgconfig example: 

[
  {
    "MapName": "bigmap",
    "MapGroups": [
      {
        "Name": "Group1",
        "Bots": [
          {
            "BotType": "assault",
            "MaxBotCount": 5
          },
          {
            "BotType": "marksman",
            "MaxBotCount": 5
          }
        ],
        "Time_min": 10,
        "Time_max": 20,
        "RandomTimeSpawn": true,				//if RandomTimeSpawn is set.. time doesn't matter
        "OnlySpawnOnce": true,
        "BotZone": null
      },
      {
        "Name": "Group2",						//Name whatever you want.
        "Bots": [								//notice bots has brackets [] and more curly braces
          {										//inside to separate bot types. Comma on each one
            "BotType": "sptbear",				//except the last curly brace
            "MaxBotCount": 5
          },
          {
            "BotType": "sptusec",
            "MaxBotCount": 5
          }
        ],
        "Time_min": 10,
        "Time_max": 20,
        "RandomTimeSpawn": true,				//notice commas after each one except last entry
        "OnlySpawnOnce": true,
        "BotZone": "ZoneDormitory"				//if no BotZone specified a random one is picked.
      }
    ]


Boss Patterns
-------------------------------------------------------------------------------

Example:

	[
		{
			"Name": "Goon Squad Trio",
			"BossName": "bossknight",
			"BossEscortType": "exusec",
			"BossEscortAmount": "2",
			"Time": -1,
			"Supports": [
				{
				"BossEscortType": "followerbigpipe",
				"BossEscortAmount": "1"
				},
				{
				"BossEscortType": "followerbirdeye",
				"BossEscortAmount": "1"
				},
				{
				"BossEscortType": "followergluharscout",
				"BossEscortAmount": "0"
				}
			],
			"RandomTimeSpawn": true
		}
	]
		
		Name: Name for you to organize however
		
		BossName: grab that from list of bots above
		
		BossEscortType must match the supports given (at least i think.. i haven't experimented but they could end up killing eachother then)..
		
		BossEscortAmount: should match the number of support and their escort amounts.  Notice all though there are 3 supports the sum of the bossescortamount adds up to the BossEscortAmount listed above.
		
		Time: this is the time in seconds they spawn... -1 means instant spawn usually.
		
		RandomTimeSpawn:what it means in name.
		
		
		
