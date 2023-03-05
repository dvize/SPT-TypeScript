Instructions (In Game Settings - General Knowledge)
-----------------------------------------
Each generated wave would have this range in which it could appear.
You can use different difficulties in the raid menu, spawns will be set appropriately.
You can use different AI Amounts in the raid menu (like horde mode), and botCounts you set in the respective configs will be multiplied at this rate:

Note: i don't think it takes effect until 2nd raid as bots are generated before you get to raid menu.
same with difficulty, the bots are generated before you get to raid menu so it will take effect 2nd raid.


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
	"medium": aiAmountMultiplier = 1.0
	"high": aiAmountMultiplier = 2.5
	"horde": aiAmountMultiplier = 5.0

"RandomSoloFilePerMap" : Makes it that instead of picking from all patterns it will choose one pattern file to use for a raid randomly.  so you either get all pmcs, all scavs, or all boss waves for a raid.


"waveLimit": set the number of waves to spawn.  It will randomly select a pattern from each (pmc, boss, scav) and generate this amount of waves.  
	If a pattern is made up of multiple types, it will break it up into multiple waves because you can only generate a wave of one type.

"WaveTimerMinInSeconds": set the minimum number of seconds for each wave to be generated.
"WaveTimerMaxInSeconds": set the maximum number of seconds for each wave to be generated.

"UseDefaultSpawns": {
	"Waves": true,
	"Bosses": true,
	"TriggeredWaves": true
		
This is self explanatory.  either clear the spawns that are existing or don't
this only generate waves though so bosses will not have escorts and triggeredWaves will not be generated 
(best to keep default for these).


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


pmgconfig example: 

	[
		{
			"Name": "Raiders of the Lost Cock",
			"botTypes": [
				"assaultgroup",
				"assaultgroup",
				"assaultgroup"
			],
			"botCounts": [2, 1, 2],
			"time_min": -1,
			"time_max": -1,
			"specificTimeOnly": "false"
		},
		{
			"Name": "its a bear party",
			"botTypes": [
				"sptbear"
			],
			"botCounts": [4],
			"time_min": "",
			"time_max": "",
			"specificTimeOnly": "false"
		}
	]

we have a json file here. if you want to add a pattern, copy the exact layout for a pattern and then paste it below.

	[
		{
			"Name": "Raiders of the Lost Cock",
			"botTypes": [
				"assaultgroup",
				"assaultgroup",
				"assaultgroup"
			],
			"botCounts": [2, 1, 2],
			"time_min": -1,
			"time_max": -1,
			"specificTimeOnly": "false"
		},
		{
			"Name": "its a bear party",
			"botTypes": [
				"sptbear"
			],
			"botCounts": [4],
			"time_min": "",
			"time_max": "",
			"specificTimeOnly": "false"
		},									<----- add a comma since we added a row
		{
			"Name": "its a usec party",		<--- make a unique name for this file.
			"botTypes": [					
				"sptusec",					<---- for each new  type, add quotes and a comma except for last
				"sptusec"
			],
			"botCounts": [4, 4],			<---- if you have more than one botType, you must have a botcount
			"time_min": "",							that matches each type. it will be in desc order and bot
			"time_max": "",							count left-> right
			"specificTimeOnly": "false"
		},
	]

New Features:

To set a specific time for a wave (don't mess up this combo or error)
	time_min = fill this in (time in seconds), it should be a number that replaces the quotations.
	time_max = fill this in (time in seconds), it should be a number that replaces the quotations.
	specificTimeOnly  set this true 

If you set time_min = -1 and time_max = -1 that is an instant spawn.



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
		
		Name: unique name in teh boss file. It can match other pattern files if you want to spawn together.
		
		BossName: grab that from list of bots above
		
		bossEscortType must match the supports given (at least i think.. i haven't experimented but they could end up killing eachother then)..
		
		BossEscortAmount: should match the number of support and their escort amounts.  Notice all though there are 3 supports the sum of the bossescortamount adds up to the BossEscortAmount listed above.
		
		Time: this is the time in seconds they spawn... -1 means instant spawn usually.
		
		RandomTimeSpawn:what it means in name.
		
		
		
