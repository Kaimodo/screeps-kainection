import { ErrorMapper } from "tools/ErrorMapper";

import * as Profiler from "screeps-profiler";
import { USE_PROFILER } from "config";

import * as Inscribe from "screeps-inscribe";

import * as Logger from "tools/logger/logger";


import * as Tools from "tools/tools"

import { ConsoleCommands } from "tools/consolecommands";

import { Emoji } from "tools/Emoji";

import { CreepTools } from "components/creep-tools";
import { RoadPlan } from "./road-plan";
import { ContainerPlan } from "./cont-plan";
import { ExtensionPlan } from "./ext-plan";

export class Planer {
    constructor(private readonly room: Room) { }

    run(): ScreepsReturnCode {
        this.setupRoomMemory();

        if (this.room.controller && this.room.controller?.level >= 2) {
            console.log(`${this.room.name}: running planning`);

            // place available extensions
            let extensionPlan = new ExtensionPlan(this.room);
            let result = extensionPlan.planExtensionGroup();
            if (result != OK) {
                return result;
            }

            // place source containers
            let containerPlan = new ContainerPlan(this.room);
            result = containerPlan.placeSourceContainer();
            if (result != OK) {
                return result;
            }

            // place controller container
            result = containerPlan.placeControllerContainer();
            if (result != OK) {
                return result;
            }

            // TODO: make controller road come from source with container only
            let roadPlan = new RoadPlan(this.room);
            roadPlan.placeRoadSourceContainerToController();
            if (result != OK) {
                return result;
            }
        }
        return OK;
    }

    public setupRoomMemory() {
        if (!this.room.memory.controllerInfo) {
            this.room.memory.controllerInfo = {};
            if (this.room.controller) {
                const container = this.room.controller.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (c) => c.structureType == STRUCTURE_CONTAINER
                });
            if (container.length > 0) {
                this.room.memory.controllerInfo.containerPos = container[0].pos;
            }
            }
        }
        if (!this.room.memory.sourceInfo) {
            this.room.memory.sourceInfo = {};
            const sources = this.room.find(FIND_SOURCES);
            for (let i = 0; i < sources.length; i++) {
                this.room.memory.sourceInfo[sources[i].id] = {
                controllerRoadComplete: false,
                spawnRoadComplete: false
                };
            }

            // add source container info
            // probably only need this to run once, then remove code
            sources.forEach((s) => {
                const container = s.pos.findInRange(FIND_STRUCTURES, 1, {
                    filter: (c) => c.structureType == STRUCTURE_CONTAINER
                });
                if (container.length > 0) {
                    this.room.memory.sourceInfo[s.id].containerPos = container[0].pos;
                }
            });
        }
    }
}
