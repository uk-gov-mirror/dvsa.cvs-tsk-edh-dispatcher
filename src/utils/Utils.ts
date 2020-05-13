/**
 * Utils functions
 */
import {Configuration} from "./Configuration";
import {ERROR} from "../models/enums";
import {ITarget, ITargetConfig} from "../models";

export const getTargetFromSourceARN = (arn: string) => {
    // @ts-ignore
    const targets: ITargetConfig = Configuration.getInstance().getTargets();
    console.log("targets: ", targets);
    const validTargets = Object.values(targets).filter((target: ITarget) => arn.includes(target.queue));
    if (validTargets.length !== 1) {
        console.log("valid targets: ", validTargets);
        throw new Error(ERROR.NO_UNIQUE_TARGET);
    }
    console.log("Valid targets: ", validTargets);
    return validTargets[0];
};

// export const debugOnlyLog = async (...args: any) => {
//     if(process.env.DEBUG === "TRUE") {
//         console.log(...args);
//     }
// }
