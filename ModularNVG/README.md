Modular NVG for SPT-AKI

This was updated for 3.3.+

I decided to update this incase of incompatibility with the previous version that Yim released. (which was a redux of my original mod)

===============================================================================================================================================================================================================

FAILURE TO READ THIS WILL RESULT IN BROKEN NVGS/NVGS THAT YOU CAN'T SEE SHIT OUT OF.

IF YOU DON'T READ THIS AND START WILDLY CHANGING STUFF IN CONFIGS, I CAN'T HELP YOU.

Clear NVGs Redux is a slightly tweaked version of JC980's Clear NVGs, with the added benefit of configurability.

I won't lie; you're probably not gonna wanna change the default stats from their current state, but here it is:

	"GPNVG": {
		"GPNVGintensity": 1.0,
		"GPNVGmask": "Anvis",
		"GPNVGmasksize": 1.35,
		"GPNVGnoiseintensity": 0.00,
		"GPNVGnoisescale": 10,
		"GPNVGdiffuseintensity": 0.025,

		"GPNVGredlevel": 25,
		"GPNVGgreenlevel": 150,
		"GPNVGbluelevel": 50,
		"GPNVGalphalevel": 254
	},

    INTENSITY: How intense is the overall effect? I set it to 1.0 because I like video-gamey NVGs, but to stay more in-line with Tarkov's aesthetic, 2.0 is ideal.
    MASK: What is the overlay? Anvis seems to be none at all, but you can swap between them at your leisure. Tell me if this doesn't work.
    MASK SIZE: How big is the overlay? Higher number = you can see more without the vignette getting in the way.
    NOISE INTENSITY: How much noise? Leave it at a number close to 0 for complete visual clarity.
    NOISE SCALE: Honestly, don't know. Maybe the size of the noise grain? Pointless if so, given the above stat.
    DIFFUSE INTENSITY: How much light messes with the particular set of NVGs? Not sure. Sorry.

    RED LEVEL: How red is the overall picture? On a scale of 1 - 255. Use an online tool to figure out what colour you want.
    GREEN LEVEL: How green is the overall picture? On a scale of 1 - 255. Use an online tool to figure out what colour you want.
    BLUE LEVEL: How blue is the overall picture? On a scale of 1 - 255. Use an online tool to figure out what colour you want.
    ALPHA LEVEL: Controls the transparency of the colour. I assume, at 255, you can't see anything, while at 1, it'll be almost like nightvision.