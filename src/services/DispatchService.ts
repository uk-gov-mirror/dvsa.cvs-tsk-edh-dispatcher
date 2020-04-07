import SQS, {GetQueueUrlResult, MessageBodyAttributeMap, SendMessageResult} from "aws-sdk/clients/sqs";
import {Configuration} from "../utils/Configuration";
import {PromiseResult} from "aws-sdk/lib/request";
import {AWSError, config as AWSConfig} from "aws-sdk";
import {ERROR, EVENT_TYPE} from "../models/enums";
import {RequestPromise} from "request-promise";
import {ITarget, ITargetConfig} from "../models";
import {DispatchDAO} from "./DispatchDAO";
// tslint:disable-next-line
const AWSXRay = require("aws-xray-sdk");


/**
 * Service class for interfacing with the Simple Queue Service
 */
class DispatchService {
    private readonly config: any;
    private dao: DispatchDAO;

    /**
     * Constructor for the ActivityService class
     * @param sqsClient - The Simple Queue Service client
     */
    constructor(dao: DispatchDAO) {
        this.config = Configuration.getInstance().getConfig();
        this.dao = dao;
    }

    public processEvent(eventPayload: any,  target: ITarget) {
        const eventType = eventPayload.eventType; //INSERT, MODIFY or REMOVE
        const eventBody = eventPayload.body;
        let path: string;

        let updateContent;

        switch (eventType) {
            case EVENT_TYPE.INSERT:
                updateContent = eventBody.NewImage;
                path = this.processPath(target.endpoints.INSERT, eventBody);
                return this.dao.postMessage(eventBody, path);
            case EVENT_TYPE.MODIFY:
                updateContent = eventBody.NewImage;
                path = this.processPath(target.endpoints.MODIFY, eventBody);
                return this.dao.putMessage(eventBody, path);
            case EVENT_TYPE.REMOVE:
                path = this.processPath(target.endpoints.REMOVE, eventBody);
                return this.dao.deleteMessage(eventBody, path);
            default:
                console.error(ERROR.NO_HANDLER_METHOD);
                break;
        }
    }

    // /**
    //  * Send a message to the specified queue (the AWS SQS queue URL is resolved based on the queueName for each message )
    //  * @param messageBody - A string message body
    //  * @param messageAttributes - A MessageAttributeMap
    //  * @param queueName - The queue name
    //  */
    // public async sendMessage(messageBody: string, queueName: string, messageAttributes?: MessageBodyAttributeMap): Promise<PromiseResult<SendMessageResult, AWSError>> {
    //     // Get the queue URL for the provided queue name
    //     const queueUrlResult: GetQueueUrlResult = await this.sqsClient.getQueueUrl({ QueueName: queueName })
    //     .promise();
    //
    //     const params = {
    //         QueueUrl: queueUrlResult.QueueUrl,
    //         MessageBody: messageBody
    //     };
    //
    //     if (messageAttributes) {
    //         Object.assign(params, { MessageAttributes: messageAttributes });
    //     }
    //
    //     // Send a message to the queue
    //     return this.sqsClient.sendMessage(params as SQS.Types.SendMessageRequest).promise();
    // }

    public processPath(path: string, body: any) {
        const replaceRegex: RegExp = /\${(\w+\b):?(\w+\b)?}/g;
        const matches: RegExpMatchArray | null = path.match(replaceRegex);

        if (matches) {
            matches.forEach((match: string) => {
                const matchString = match.substring(2, match.length - 1);

                // Insert the environment variable if available. If not, insert placeholder. If no placeholder, leave it as is.
                path = path.replace(match, body.Keys[matchString]);
            });
        }
        return path;
    };

}

export {DispatchService};
