import {Callback, Context, Handler} from "aws-lambda";
import {AWSError, SQS} from "aws-sdk";
import {DispatchService} from "../services/DispatchService";
import {PromiseResult} from "aws-sdk/lib/request";
import {SendMessageResult} from "aws-sdk/clients/sqs";
import {GetRecordsOutput} from "aws-sdk/clients/dynamodbstreams";
import {getTargetFromSourceARN} from "../utils/Utils";
import {IBody, IStreamRecord} from "../models";
import {DispatchDAO} from "../services/DispatchDAO";
import requestPromise from "request-promise";

/**
 * λ function to process a DynamoDB stream of test results into a queue for certificate generation.
 * @param event - DynamoDB Stream event
 * @param context - λ Context
 * @param callback - callback function
 */
const edhDispatcher: Handler = async (event: GetRecordsOutput, context?: Context, callback?: Callback): Promise<void | Array<PromiseResult<SendMessageResult, AWSError>>> => {
    if (!event) {
        console.error("ERROR: event is not defined.");
        return;
    }
    const records = event.Records as IStreamRecord[];
    if (!records || !records.length) {
        console.error("ERROR: No Records in event: ", event);
        return;
    }

    // Instantiate the Simple Queue Service
    const dispatchService: DispatchService = new DispatchService(new DispatchDAO(requestPromise));
    const sendMessagePromises: Array<Promise<any>> = [];
    console.log("Records: ", records);

    records.forEach((record: IStreamRecord) => {
        console.log("Record: ", record);
        const target = getTargetFromSourceARN(record.eventSourceARN);
        const eventBody: IBody = JSON.parse(record.body);
        const call = dispatchService.processEvent(eventBody, target) as Promise<any>;
        console.log("Output: ", call);
        sendMessagePromises.push(call);
    });

    return Promise.all(sendMessagePromises)
    .then((resp) => {
        console.log("Response", resp)
        return resp;
    })
    .catch((error: AWSError) => {
        console.error(error);
        throw error;
    });
};

export {edhDispatcher};
