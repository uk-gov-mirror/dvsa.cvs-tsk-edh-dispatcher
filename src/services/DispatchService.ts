import {Configuration} from "../utils/Configuration";
import {ERROR, EVENT_TYPE} from "../models/enums";
import {IBody, ISecretConfig, IStreamRecord, ITarget} from "../models";
import {DispatchDAO} from "./DispatchDAO";
import {AWSError, DynamoDB} from "aws-sdk";
import {SQService} from "./SQService";
import {getTargetFromSourceARN} from "../utils/Utils";
// tslint:disable-next-line
const Enforcer = require("openapi-enforcer");


/**
 * Service class for interfacing with the Simple Queue Service
 */
class DispatchService {
    private readonly config: any;
    private dao: DispatchDAO;
    private sqs: SQService;

    /**
     * Constructor for the ActivityService class
     * @param sqsClient - The Simple Queue Service client
     */
    constructor(dao: DispatchDAO, sqs: SQService) {
        this.config = Configuration.getInstance().getConfig();
        this.dao = dao;
        this.sqs = sqs;
    }

    public processEvent(record: IStreamRecord) {
        const target: ITarget = getTargetFromSourceARN(record.eventSourceARN);
        const eventPayload: IBody = JSON.parse(record.body);
        console.log("eventPayload: ", eventPayload);

        const eventType = eventPayload.eventType; //INSERT, MODIFY or REMOVE

        switch (eventType) {
            case EVENT_TYPE.INSERT:
                return this.sendPost(eventPayload,target);
            case EVENT_TYPE.MODIFY:
                return this.sendPut(eventPayload, target);
            case EVENT_TYPE.REMOVE:
                return this.sendDelete(eventPayload, target);
            default:
                console.error(ERROR.NO_HANDLER_METHOD);
                return this.sendRecordToDLQ(eventPayload, target);
        }
    }

    private async sendPost(event: IBody, target: ITarget): Promise<any> {
        const updateContent = DynamoDB.Converter.unmarshall(event.body.NewImage);
        const path = this.processPath(target.endpoints.INSERT, event.body);
        if(await this.isValidMessageBody(updateContent, target)) {
            try {
                return await this.dao.postMessage(updateContent, path);
            } catch (e) {
                console.log("Failed to send request: ", e);
                if (this.isRetryableError(e)) {
                    return Promise.reject(ERROR.FAILED_TO_SEND);
                } else {
                    return this.sendRecordToDLQ(event, target);
                }
            }
        } else {
            console.log(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
            return this.sendRecordToDLQ(event, target);
        }
    }

    private async sendPut(event: IBody, target: ITarget): Promise<any> {
        const updateContent = DynamoDB.Converter.unmarshall(event.body.NewImage);
        const path = this.processPath(target.endpoints.MODIFY, event.body);
        if(await this.isValidMessageBody(updateContent, target)) {
            try {
                return await this.dao.putMessage(updateContent, path);
            } catch (e) {
                console.log("Failed to send request: ", e);
                if (this.isRetryableError(e)) {
                    return Promise.reject(ERROR.FAILED_TO_SEND);
                } else {
                    return this.sendRecordToDLQ(event, target);
                }
            }
        } else {
            console.log(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
            return this.sendRecordToDLQ(event, target);
        }
    }

    private async sendDelete(event: IBody, target: ITarget): Promise<any> {
        const path = this.processPath(target.endpoints.REMOVE, event.body);
        try {
            return await this.dao.deleteMessage(path);
        } catch (e) {
            console.log("Failed to send request: ", e);
            if (this.isRetryableError(e)) {
                return Promise.reject(ERROR.FAILED_TO_SEND);
            } else {
                return this.sendRecordToDLQ(event, target);
            }
        }
    }

    public processPath(path: string, body: any) {
        const replaceRegex: RegExp = /{(\w+\b):?(\w+\b)?}/g;
        const matches: RegExpMatchArray | null = path.match(replaceRegex);
        console.log("Keys", body.Keys);
        if (matches) {
            matches.forEach((match: string) => {
                const matchString = match.substring(1, match.length - 1);
                // Keys come in as {name: {"S": "100"}} - grab actual value
                const replVal = Object.values(body.Keys[matchString])[0] as string;
                path = path.replace(match, replVal);
            });
        }
        console.log("Processed path: ", path);
        return path;
    }

    public async isValidMessageBody(body: any, target: ITarget) {
        const config: ISecretConfig = await Configuration.getInstance().getSecretConfig();
        if(config.validation) {
            const enforcer = await Enforcer(`./src/resources/${target.swaggerSpecFile}`);
            const schema = enforcer.components.schemas[target.schemaItem];
            const deserialised = schema.deserialize(body);
            const output = schema.validate(deserialised.value);
            if(output) {
                console.log("Record failed validation: ", output);
                return false
            }
        }
        return true;
    }

    public isRetryableError(error: AWSError): boolean {
        return !(error.statusCode >= 400 && error.statusCode < 429);
    }

    public async sendRecordToDLQ(event: IBody, target: ITarget) {
        try {
            await this.sqs.sendMessage(JSON.stringify(event), target.dlQueue);
            return Promise.resolve();
        } catch (e) {
            console.log("Failed to send message to DLQ. ERROR: ", e, " and EVENT: ", event)
            return Promise.reject()
        }
    }
}

export {DispatchService};
