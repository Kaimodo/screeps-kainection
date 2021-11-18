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


export class Hauler {
    constructor(private readonly creep: Creep) { }

    public run() {
        // supply spawn/extensions if any capacity in room
        if (this.creep.room.energyAvailable < this.creep.room.energyCapacityAvailable) {
            this.supplySpawn();
        return;
        }

        // fill closest tower if any fall below threshold
        if (this.creep.memory.job == 'tower' || this.findTowersBelowThreshold().length > 0) {
            this.supplyTower();
        return;
        }

        // otherwise supply controller
        this.supplyController();
    }

    private supplyController() {
        const controllerContainer = this.findClosestControllerContainerNotFull();
        const sourceContainer = this.findClosestSourceContainerNotEmpty();
        if (controllerContainer && sourceContainer) {
            CreepTools.updateJob(this.creep, 'upgrade');
            CreepTools.stopWorkingIfEmpty(this.creep);
            CreepTools.startWorkingIfFull(this.creep, '⚡ upgrade');
            CreepTools.workIfCloseToJobsite(this.creep, controllerContainer.pos, 1);

            if (this.creep.memory.working) {
                if (this.creep.transfer(controllerContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(controllerContainer, { range: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            else {
                if (this.creep.withdraw(sourceContainer, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    this.creep.moveTo(sourceContainer, { range: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }

    private supplySpawn(): void {
        const site = CreepTools.findClosestEnergyStorageNotFull(this.creep);
        if (site) {
            CreepTools.consoleLogIfWatched(this.creep, `supply spawn`);
            CreepTools.updateJob(this.creep, 'spawn');
            CreepTools.stopWorkingIfEmpty(this.creep);
            CreepTools.startWorkingIfFull(this.creep, '⚡ spawn');
            CreepTools.workIfCloseToJobsite(this.creep, site.pos, 1);

            if (this.creep.memory.working) {
                if (this.creep.transfer(site, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    CreepTools.consoleLogIfWatched(this.creep, `site out of range: ${site.pos.x},${site.pos.y}`);
                    this.creep.moveTo(site, { range: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
            else {
                this.loadEnergy();
            }
        }
    }
    // TODO: stop supply when tower is full
    // have to calc check at end of tick, or will never be full (tower shoots first)
    // can't rely on getFreeCapacity because it won't update after transfer
    private supplyTower(): void {
        const tower = CreepTools.findClosestTowerNotFull(this.creep);
        if (tower) {
            CreepTools.consoleLogIfWatched(this.creep, `supply tower`);
            CreepTools.updateJob(this.creep, 'tower');
            CreepTools.stopWorkingIfEmpty(this.creep);
            CreepTools.startWorkingIfFull(this.creep, '⚡ tower');
            CreepTools.workIfCloseToJobsite(this.creep, tower.pos, 1);

            if (this.creep.memory.working) {
                let creepStoredEnergy = this.creep.store.getUsedCapacity(RESOURCE_ENERGY);
                const result = this.creep.transfer(tower, RESOURCE_ENERGY);
                if (result == ERR_NOT_IN_RANGE) {
                    CreepTools.consoleLogIfWatched(this.creep, `tower out of range: ${tower.pos.x},${tower.pos.y}`);
                    this.creep.moveTo(tower, { range: 1, visualizePathStyle: { stroke: '#ffffff' } });
                }

                // Stop if tower is full now
                const towerFreeCap = tower.store.getFreeCapacity(RESOURCE_ENERGY);
                creepStoredEnergy = this.creep.store.getUsedCapacity(RESOURCE_ENERGY);
                if (result == OK && towerFreeCap < creepStoredEnergy) {
                    CreepTools.consoleLogIfWatched(this.creep, `tower is full: ${tower.pos.x},${tower.pos.y}`);
                    CreepTools.updateJob(this.creep, 'idle');
                }
            }
            else {
                this.loadEnergy();
            }
        }
        else {
        CreepTools.updateJob(this.creep, 'idle');
        }
    }

    private findClosestControllerContainerNotFull(): StructureContainer | null {
        let containers: StructureContainer[] = [];
        if (this.creep.room.controller) {
            containers = this.creep.room.controller.pos.findInRange(FIND_STRUCTURES, 3, {
                filter: (s) => s.structureType == STRUCTURE_CONTAINER && s.store.getFreeCapacity() > 0
            }) as StructureContainer[];
        }
        return this.creep.pos.findClosestByPath(containers);
    }

    private findClosestSourceContainerNotEmpty(): StructureContainer | null {
        const sources = this.creep.room.find(FIND_SOURCES);
        let containers: StructureContainer[] = [];
        if (sources.length > 0) {
            for (let i = 0; i < sources.length; i++) {
                    const container = sources[i].pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (s) => s.structureType == STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0
                });
                if (container.length > 0) {
                 containers.push(container[0] as StructureContainer);
                }
            }
        }
        return this.creep.pos.findClosestByPath(containers);
    }

    private findClosestSourceContainer(): StructureContainer | null {
        const sources = this.creep.room.find(FIND_SOURCES);
        let containers: StructureContainer[] = [];
        if (sources.length > 0) {
            for (let i = 0; i < sources.length; i++) {
                const container = sources[i].pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType == STRUCTURE_CONTAINER
                });
                if (container.length > 0) {
                containers.push(container[0] as StructureContainer);
                }
            }
        }
        return this.creep.pos.findClosestByPath(containers);
    }

    private findTowersBelowThreshold(): StructureTower[] {
        const towers = CreepTools.findTowers(this.creep) as StructureTower[];
        CreepTools.consoleLogIfWatched(this.creep, `towers: ${towers.length}`);

        const towersNotFull = towers.filter((tower) => {
            return tower.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        });
        CreepTools.consoleLogIfWatched(this.creep, `towers not full: ${towers.length}`);

        const towersBelowThreshold = towersNotFull.filter((tower) => {
            return CreepTools.getEnergyStoreRatioFree(tower) > config.TOWER_RESUPPLY_THRESHOLD;
        });
        CreepTools.consoleLogIfWatched(this.creep, `towers below threshold: ${towersBelowThreshold.length}`);

        return towersBelowThreshold;
    }

    private withdrawAdjacentRuinOrTombEnergy(): ScreepsReturnCode {
        // can't withdraw twice, so prefer emptying tombstones because they decay faster
        let withdrawResult: ScreepsReturnCode = ERR_NOT_FOUND;
        const tombs = this.creep.pos.findInRange(FIND_TOMBSTONES, 1, { filter: (t) => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
        if (tombs.length > 0) {
            withdrawResult = this.creep.withdraw(tombs[0], RESOURCE_ENERGY);
        }
        else {
            const ruins = this.creep.pos.findInRange(FIND_RUINS, 1, { filter: (r) => r.store.getUsedCapacity(RESOURCE_ENERGY) > 0 });
            if (ruins.length > 0) {
                withdrawResult = this.creep.withdraw(ruins[0], RESOURCE_ENERGY);
            }
        }
        return withdrawResult;
    }

    private pickupAdjacentDroppedEnergy() {
        let pickupResult: ScreepsReturnCode = ERR_NOT_FOUND;
        const resources = this.creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: (r) => r.resourceType == RESOURCE_ENERGY });
        if (resources.length > 0) {
            pickupResult = this.creep.pickup(resources[0]);
        }
        return pickupResult;
    }

    private loadEnergy(): void {
        const pickupResult = this.pickupAdjacentDroppedEnergy();
        const result = this.withdrawAdjacentRuinOrTombEnergy();
        // TODO: calc current free capacity here, might should quit loading or move adjacent load calls

        const tombstone = CreepTools.findClosestTombstoneWithEnergy(this.creep);
        const ruin = CreepTools.findClosestRuinsWithEnergy(this.creep);
        const droppedEnergy = CreepTools.findClosestDroppedEnergy(this.creep);

        const container = CreepTools.findClosestContainerWithEnergy(this.creep);
        if (container) {
            CreepTools.consoleLogIfWatched(this.creep, `moving to container: ${container.pos.x},${container.pos.y}`);
            CreepTools.withdrawEnergyFromOrMoveTo(this.creep, container);
            return;
        }

        if (tombstone) {
            CreepTools.consoleLogIfWatched(this.creep, `moving to tombstone: ${tombstone.pos.x},${tombstone.pos.y}`);
            CreepTools.withdrawEnergyFromOrMoveTo(this.creep, tombstone);
            return;
        }

        if (ruin) {
            CreepTools.consoleLogIfWatched(this.creep, `moving to ruin: ${ruin.pos.x},${ruin.pos.y}`);
            CreepTools.withdrawEnergyFromOrMoveTo(this.creep, ruin);
            return;
        }

        if (droppedEnergy) {
            CreepTools.consoleLogIfWatched(this.creep, `moving to ruin: ${droppedEnergy.pos.x},${droppedEnergy.pos.y}`);
            CreepTools.pickupFromOrMoveTo(this.creep, droppedEnergy);
            return;
        }

        const closestSourceContainer = this.findClosestSourceContainer();
        if (closestSourceContainer) {
            CreepTools.consoleLogIfWatched(this.creep, `moving to source container: ${closestSourceContainer.pos.x},${closestSourceContainer.pos.y}`);
            this.creep.moveTo(closestSourceContainer, { range: 1, visualizePathStyle: { stroke: '#ffaa00' } });
            return;
        }

        this.creep.say('🤔');
        CreepTools.consoleLogIfWatched(this.creep, `stumped. Just going to sit here.`);
    }
}
