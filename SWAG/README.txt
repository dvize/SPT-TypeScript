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
	"high": aiAmountMultiplier = 3.0
	"horde": aiAmountMultiplier = 6.0


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
"pmcbot" 					<----  use this for pmcs
"sectantpriest"
"sectantwarrior"
"assaultgroup"
"bossbully"
"bosstagilla"
"bossgluhar"
"bosskilla"
"bosskojaniy"
"bosssanitar"
"followerbully"
"followergluharassault"
"followergluharscout"
"followergluharsecurity"
"followergluharsnipe"
"followerkojaniy" 			<--- this bot is extremely dumb, wouldn't use
"followersanitar"
"followertagilla"
"cursedassault"
"bossknight"
"followerbigpipe"
"followerbirdeye"


pmgconfig example: 

{
	"pmc":{
		"Pattern1":{
			"Name": "All mix",
			"botTypes": [
				"pmcbot"
			],
			"botCounts": [3]
		},
		"Pattern2":{
			"Name": "Ex Usec",
			"botTypes": [
				"exusec"
			],
			"botCounts": [3]
		}
	}
}

we have a json file here. if you want to add a pattern, copy the exact layout for a pattern and then paste it below.

{
	"pmc":{
		"Pattern1":{
			"Name": "All mix",
			"botTypes": [
				"pmcbot"
			],
			"botCounts": [3]
		},
		"Pattern2":{
			"Name": "Ex Usec",
			"botTypes": [
				"exusec"
			],
			"botCounts": [3]
		}, 							<--------- if you add, remember to add this comma
		"Pattern3":{				<--------- this name for pattern must be unique so i just change number 
			"Name": "Ex Usec",		<--------- you can name this pattern whatever you want.
			"botTypes": [
				"exusec",			<--------- I added a line so added a comma
				"pmcbot"			<--------- I added a bot type(all lowercase) and the last line does not have comma (always).
			],
			"botCounts": [3], [2]	<-------- added comma because i added an extra bount count.  the number of botTypes must equal the number of botCounts.
												also last item does not have comma. [3] means up to 3 exusec and [2] means up to 2 pmcbots. They will not be spawned
												at the exact same time but close.. if you want the spawn times to be close, use a closer range between min and max spawn 
												time in the config.
		}
	}
}

The botTypes must have at least one type or it causes an error.
The botCounts are a random chance from 1 to the number thats written.  It may multiply based on the AI Amount selected.
I recommend my AI Limiter if using high bot amounts.

WARNING: in the PMC file if you try to use sptbear, sptusec, bear, or usec it will cause an error. with the logic changes
i guess they handle that on their end so just use pmcbot and exusec for pmc.
