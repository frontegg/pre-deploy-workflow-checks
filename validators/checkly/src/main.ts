import * as core from "@actions/core";
import axios from "axios";
import { Check, CheckStatus } from "./types";

const client = axios.create({
  baseURL: "https://api.checklyhq.com/v1",
  headers: {
    "x-checkly-account": core.getInput("${{ inputs.checkly-account-id }}"),
    Authorization: `Bearer ${core.getInput("${{ inputs.checkly-api-key }}")}`,
  },
});

const getAllChecksStatus = async (): Promise<CheckStatus[]> => {
  const { data } = await client.get<CheckStatus[]>("/check-statuses");

  return data;
};

const getAllChecks = async (): Promise<Check[]> => {
  const limit = 100;
  let allChecks: Check[] = [];
  let page = 1;
  let hasMoreData = true;

  while (hasMoreData) {
    const { data } = await client.get<Check[]>("/checks", {
      params: {
        page,
        limit,
      },
    });

    allChecks = [...allChecks, ...data];
    hasMoreData = data.length === limit;
    page++;
  }

  return allChecks;
};

const main = async (): Promise<void> => {
  const checks = await getAllChecks();
  const checksStatus = await getAllChecksStatus();
  const environment = core.getInput("${{ inputs.environment }}");

  const failedOrDegradedCheck = checksStatus.find(
    (checkStatus) =>
      (checkStatus.hasFailures || checkStatus.isDegraded) &&
      checks
        .find((check) => check.id === checkStatus.checkId)
        ?.tags?.includes(environment)
  );

  if (failedOrDegradedCheck) {
    core.setOutput("result", "failure");
    return;
  }

  core.setOutput("result", "success");
};

main().catch((error) =>
  core.setFailed(
    JSON.stringify({ message: error.message, data: error.response?.data })
  )
);
