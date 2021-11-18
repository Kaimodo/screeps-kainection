# Helpers

Game.spawns['Spawn1'].spawnCreep([MOVE,CARRY,WORK,MOVE],'Harv1',{memory:{role:'Harvester'}});
Game.spawns['Spawn1'].spawnCreep([MOVE,CARRY,WORK,MOVE],'Upg1',{memory:{role:'Upgrader'}});

([Unicode-table](unicode-table.com))

([Building/screeps Planer](https://screeps.admon.dev/building-planner))

([Screeps-Docs](https://docs.screeps.com/api/))

([Priv server commands](https://wiki.screepspl.us/index.php/Private_Server_Common_Tasks))

Profiler

Screeps Profiler Build Status Coverage Status
The Screeps Profiler is a library that helps to understand where your CPU is being spent in the game of Screeps.

It works by monkey patching functions on the Global game object prototypes, with a function that record how long each function takes. The primary benefit of using this profiler is that you can get a clear picture of where your CPU is being used over time, and optimize some of the heavier functions. While it works best for players that heavily employ prototypes in their code, it should work to some degree for all players.

Setup
Installation
You have two options for installing this script. You can either use npm and a compiler like webpack, or you can copy/paste the screeps-profiler.js file and use the provided screeps require function.

Main.js
Your main.js will will need to be configured like so.

// Any modules that you use that modify the game's prototypes should be require'd
// before you require the profiler.
const profiler = require('screeps-profiler');

// This line monkey patches the global prototypes.
profiler.enable();
module.exports.loop = function() {
  profiler.wrap(function() {
    // Main.js logic should go here.
  });
}
Console API
You can make use of the profiler via the Screeps console.

Game.profiler.profile(ticks, [functionFilter]);
Game.profiler.stream(ticks, [functionFilter]);
Game.profiler.email(ticks, [functionFilter]);
Game.profiler.background([functionFilter]);

// Output current profile data.
Game.profiler.output([lineCount]);

// Reset the profiler, disabling any profiling in the process.
Game.profiler.reset();

Game.profiler.restart();
Note: It can take up to 30 ticks if you're using module.exports.loop for these commands to work without issue.

profile - Will run for the given number of ticks then will output the gathered information to the console.

stream - Will run for the given number of ticks, and will output the gathered information each tick to the console. The can sometimes be useful for seeing spikes in performance.

email - This will run for the given number of ticks, and will email the output to your registered Screeps email address. Very useful for long running profiles.

background - This will run indefinitely, and will only output data when the output console command is run. Very useful for long running profiles with lots of function calls.

output - Print a report based on the current tick. The profiler will continue to operate normally. This is currently the only way to get data from the background profile.

reset - Stops the profiler and resets its memory. This is currently the only way to stop a background profile.

restart - Restarts the profiler using the same options previously used to start it.

In each case, ticks controls how long the profiler should run before stopping, and the optional functionFilter parameter will limit the scope of the profiler to a specific function.
