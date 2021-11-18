import { ErrorMapper } from "tools/ErrorMapper";

import * as Profiler from "screeps-profiler";
import { USE_PROFILER } from "config";

import * as Inscribe from "screeps-inscribe";

import * as Logger from "tools/logger/logger";


import * as Tools from "tools/tools"

import { ConsoleCommands } from "tools/consolecommands";

import { Emoji } from "tools/Emoji";

import  config  from "../const";

import { CreepTools } from "components/creep-tools";
import { PlanerTools } from "./plan-tools";
import { StructurePlan } from "./struct-plan";

export class ExtensionPlan {
    constructor(private readonly room: Room) { }

    public planExtensionGroup(): ScreepsReturnCode {
      const numAvailableExtensions = this.getNumAvailableExtensions();
      if (numAvailableExtensions >= 5) {
        const structurePlan = PlanerTools.findSiteForPattern(config.STRUCTURE_PLAN_EXTENSION_GROUP, this.room);
        return this.placeStructurePlan(structurePlan);
      }
      return OK;
    }

    private placeStructurePlan(structurePlan: StructurePlan): ScreepsReturnCode {
        if (structurePlan.plan) {
            for (let i = 0; i < structurePlan.plan.length; i++) {
                const planPosition = structurePlan.plan[i];
                const result = this.room.createConstructionSite(planPosition.pos, planPosition.structure);
                if (result != OK) {
                    CreepTools.roomMemoryLog(this.room, `${planPosition.structure} failed: ${result}, pos: ${planPosition}`);
                    return result;
                }
            }
        }
        return ERR_NOT_FOUND;
    }

    private getNumAvailableExtensions(): number {
        const conLevel = this.room.controller?.level;
        if (conLevel) {
            const maxExtens = CONTROLLER_STRUCTURES.extension[conLevel];
            const builtExtens = this.room.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType === STRUCTURE_EXTENSION }).length;
            const placedExtensions = this.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: (s) => s.structureType === STRUCTURE_EXTENSION }).length;
            return maxExtens - builtExtens - placedExtensions;
        }
        return 0;
    }
}
