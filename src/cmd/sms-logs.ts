//npx tsc && node dist/cmd/sms-logs.js -path /home/amr/projects/message_logs.json //

import { Command } from "commander";
import fs from "node:fs";
import readline from "readline";
import { z } from "zod";
import codesJson from "../utils/codes.json";

const SMSEventLogSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  contact: z.string(),
  error_code: z.number().optional(),
  reason: z.string().optional(),
});

type ErrorCodeInfo = {
  description?: string;
  possibleSolution?: string;
};

type SMSEventLog = typeof SMSEventLogSchema._type;

const errorCodesInfoMap = new Map(Object.entries(codesJson));

const errorCodesMap = new Map<
  string,
  {
    count: number;
    info?: ErrorCodeInfo;
  }
>();

const program = new Command();

const smsLogs: SMSEventLog[] = [];

program
  .name("SMS Errors")
  .description("script to aggregate customer sms errors")
  .requiredOption("-path, --path to logs file <path>", "must path to logs file")
  .version("0.0.0");

program.parse();

const options = program.opts();

const fileStream = fs.createReadStream(options.path);

const lineReader = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

lineReader.on("line", (line) => {
  try {
    const smsLogLineJson = JSON.parse(line);
    const smsLog = SMSEventLogSchema.parse(smsLogLineJson);
    smsLogs.push(smsLog);

    if (smsLog.error_code) {
      const errorCode = errorCodesMap.get(smsLog.error_code?.toString());
      const errorCodeInfo = errorCodesInfoMap.get(smsLog.error_code.toString());

      errorCodesMap.set(smsLog.error_code.toString(), {
        count:
          errorCode?.count && errorCode?.count >= 1 ? errorCode.count + 1 : 1,
        info: errorCodeInfo,
      });
    }
  } catch (error) {
    console.log(error);
    process.exit();
  }
});

lineReader.on("close", () => {
  errorCodesMap.forEach(function (errorInfo, errorCode) {
    console.log(
      "Error with Status code: " +
        errorCode +
        " occurred " +
        errorInfo.count +
        " times",
      "\n"
    );

    console.log(
      "The description for this error is " +
        errorInfo.info?.description +
        " And the possible solution is " +
        errorInfo.info?.possibleSolution,
      "\n"
    );

    console.log("--------------------", "\n");
  });
});
