import { ErrorMapper } from "tools/ErrorMapper";

import * as Profiler from "screeps-profiler";
import { USE_PROFILER } from "config";

import * as Inscribe from "screeps-inscribe";

import * as Logger from "tools/logger/logger";


import * as Tools from "tools/tools"

import { ConsoleCommands } from "tools/consolecommands";

import { Emoji } from "tools/Emoji";

import config from "../const";
import { CreepTools } from "components/creep-tools";

export class Worker {
    public static run(creep: Creep): void {
        // harvest if any capacity in room
        if (creep.room.energyAvailable < creep.room.energyCapacityAvailable) {
            CreepTools.consoleLogIfWatched(creep, 'harvesting job');
            this.harvest(creep);
            return;
        }

        // supply tower if half empty
        const tower = CreepTools.findClosestTowerNotFull(creep);
        if (tower) {
            const towerPercentFree = CreepTools.getEnergyStoreRatioFree(tower);
            CreepTools.consoleLogIfWatched(creep, `towerPercentFree: ${towerPercentFree}`);
            if (creep.memory.job == 'supply' || towerPercentFree > .5) {
                CreepTools.consoleLogIfWatched(creep, 'supply job');
                this.supply(creep);
                return;
            }
        }

        // build if anything to build
        if (CreepTools.findConstructionSites(creep).length > 0) {
            CreepTools.consoleLogIfWatched(creep, 'building job');
            this.build(creep);
            return;
        }

        const towerCount = CreepTools.findTowers(creep).length;
        const repairSiteCount = CreepTools.findRepairSites(creep).length;
        // repair if no towers to do it
        CreepTools.consoleLogIfWatched(creep, `towers: ${towerCount}, repair sites: ${repairSiteCount}`)
        if (towerCount == 0 && repairSiteCount > 0) {
            CreepTools.consoleLogIfWatched(creep, 'repairing job');
            this.repair(creep);
            return;
        }

        // otherwise upgrade
        CreepTools.consoleLogIfWatched(creep, 'upgrading job');
        this.upgrade(creep);
    }

    private static upgrade(creep: Creep): void {
        if (creep.room.controller) {
            const controller = creep.room.controller;
            CreepTools.updateJob(creep, 'upgrading');
            CreepTools.stopWorkingIfEmpty(creep);
            CreepTools.startWorkingIfFull(creep, '⚡ upgrade');
            CreepTools.workIfCloseToJobsite(creep, creep.room.controller.pos);
            this.workOrHarvest(creep, function () {
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            });
        }
    }

    private static build(creep: Creep): void {
        let site: ConstructionSite | null = null;
        for (let i = 0; !site && i < config.CONSTRUCTION_PRIORITY.length; i++) {
            site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES, {
                filter: (s) => s.structureType == config.CONSTRUCTION_PRIORITY[i]
            });
        }
        if (!site) {
            site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        }

        if (site) {
            CreepTools.updateJob(creep, 'building');
            CreepTools.stopWorkingIfEmpty(creep);
            CreepTools.startWorkingIfFull(creep, '🚧 build');
            CreepTools.workIfCloseToJobsite(creep, site.pos);
            this.workOrHarvest(creep, function () {
                // don't block the source while working
                const closestEnergySource = CreepTools.findClosestActiveEnergySource(creep);
                if (closestEnergySource?.pos && creep.pos.isNearTo(closestEnergySource)) {
                    const path = PathFinder.search(creep.pos, { pos: closestEnergySource.pos, range: 2 }, { flee: true });
                    creep.moveByPath(path.path);
                }
                else if (creep.build(site as ConstructionSite) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(site as ConstructionSite, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            });
        }
    }

    private static repair(creep: Creep): void {
        const site = creep.pos.findClosestByPath(FIND_STRUCTURES, { filter: (structure) => structure.hits < structure.hitsMax });
        if (site) {
            CreepTools.updateJob(creep, 'repairing');
            CreepTools.stopWorkingIfEmpty(creep);
            CreepTools.startWorkingIfFull(creep, '🚧 repair');
            CreepTools.workIfCloseToJobsite(creep, site.pos);
            this.workOrHarvest(creep, function () {
                if (creep.repair(site) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            });
        }
    }

    private static harvest(creep: Creep): void {
        CreepTools.updateJob(creep, 'harvesting');
        CreepTools.stopWorkingIfEmpty(creep);
        CreepTools.startWorkingIfFull(creep, '⚡ transfer');
        this.workOrHarvest(creep, function () {
            const site = CreepTools.findClosestEnergyStorageNotFull(creep);
            if (site) {
                if (creep.transfer(site, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        });
    }

    private static supply(creep: Creep): void {
        CreepTools.updateJob(creep, 'supply');
        CreepTools.stopWorkingIfEmpty(creep);
        CreepTools.startWorkingIfFull(creep, '⚡ supply');
        this.workOrHarvest(creep, function () {
            const site = CreepTools.findClosestTowerNotFull(creep);
            if (site) {
                if (creep.transfer(site, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(site, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            else {
                creep.memory.job = '';
            }
        });
    }

    private static workOrHarvest(creep: Creep, work: Function) {
        if (creep.memory.working) {
            work();
        }
        else {
            CreepTools.harvest(creep);
        }
    }
}
