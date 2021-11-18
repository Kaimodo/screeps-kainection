import { ErrorMapper } from "tools/ErrorMapper";

import * as Profiler from "screeps-profiler";
import { USE_PROFILER } from "config";

import * as Inscribe from "screeps-inscribe";

import * as Logger from "tools/logger/logger";

import * as Tools from "tools/tools"

import { ConsoleCommands } from "tools/consolecommands";

import { Emoji } from "tools/Emoji";

import { CreepTools } from "./creep-tools";
import { Planer } from "./plan/planer";
import { Harvester } from "./roles/harvester";
import { Hauler } from "./roles/hauler";
import { Spawner } from "./roles/spawner";
import { Worker } from "./roles/worker";



export class Kainection {
    public run() {
        // Run each room
        const roomIds = Game.rooms;
        for (const roomId in roomIds) {
            const room = Game.rooms[roomId];

            // Run spawners
            CreepTools.consoleLogIfWatched(room, `running spawns`);
            const spawns = room.find(FIND_MY_SPAWNS);
            for (let i = 0; i < spawns.length; i++) {
                const spawn = spawns[i];
                let spawner = new Spawner(spawn);
                spawner.spawnCreeps();
            }

            CreepTools.consoleLogIfWatched(room, `running towers`);
            this.runTowers(room);

            // Plan each room every 10 ticks
            if (room.controller && Game.time % 10 == 0) {
                const planner = new Planer(room);
                planner.run();
            }
        }

        this.runCreeps();
    }

    public runCreeps(): void {
        for (let name in Game.creeps) {
            let creep = Game.creeps[name];
            const onRoad = creep.pos.lookFor(LOOK_STRUCTURES).filter((s) => s.structureType == STRUCTURE_ROAD).length > 0;
            if (onRoad) {
                CreepTools.touchRoad(creep.pos);
            }

            if (creep.memory.role == 'worker') {
                Worker.run(creep);
            }
            else if (creep.memory.role == 'harvester') {
                let harvester = new Harvester(creep);
                harvester.run();
            }
            else if (creep.memory.role == 'hauler') {
                let hauler = new Hauler(creep);
                hauler.run();
            }
            else {
                console.log(`unknown role: ${creep.memory.role}`);
            }
        }
    }

    // TODO: make a tower wrapper class
    public runTowers(room: Room) {
        const towers = room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_TOWER }) as StructureTower[];
        for (let i = 0; i < towers.length; i++) {
            const tower = towers[i];
            const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
            if (closestHostile) {
                tower.attack(closestHostile);
            }
            else {
                const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                    filter: (structure) => structure.hits < structure.hitsMax && structure.structureType != STRUCTURE_ROAD
                });
                if (closestDamagedStructure) {
                    tower.repair(closestDamagedStructure);
                }
                else {
                    const closestDamagedRoad = tower.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: (structure) => {
                            if (!(structure.structureType == STRUCTURE_ROAD)) return false;
                            const isDamagedRoad = structure.hits < structure.hitsMax;
                            const isUsedRoad = room.memory.roadUseLog[`${structure.pos.x},${structure.pos.y}`] > 0;
                            if (!isUsedRoad && isDamagedRoad) {
                                CreepTools.consoleLogIfWatched(room, `not repairing unused road: ${structure.pos.x},${structure.pos.y}`);
                            }
                            return isDamagedRoad && isUsedRoad;
                        }
                    });
                    if (closestDamagedRoad) {
                        tower.repair(closestDamagedRoad);
                    }
                }
            }
        }
    }
}
