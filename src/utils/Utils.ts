/**
 * Utils functions
 */
import {Configuration} from "./Configuration";
import {ERROR} from "../models/enums";
import {ITargetConfig} from "../models";

export const getTargetFromSourceARN = (arn: string) => {
    const targets = Configuration.getInstance().getTargets();
    const validTargets = targets.filter((target: ITargetConfig) => {
        arn.includes(target[Object.keys(target)[0]].queueName)
    });
    if (validTargets.length !== 1) {
        console.log("valid targets: ", validTargets);
        throw new Error(ERROR.NO_UNIQUE_TARGET);
    }
    return validTargets[0][Object.keys(validTargets[0])[0]]
};
